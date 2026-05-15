import { BadRequestException, Injectable } from '@nestjs/common';

import {
  USER_API_ACTION,
  type UserAdminCreatePayload,
  type UserAdminDeactivatePayload,
  type UserAdminGetPayload,
  type UserAdminListPayload,
  type UserAdminRecord,
  type UserAdminUpdatePayload,
} from '@shepherd/shared';

import { ApiRequestDto, RequestHeaderDto } from '../common/envelope/api-request.dto';
import { dispatch, type ActionMap } from '../common/envelope/action-dispatcher';
import { rawEnvelope } from '../common/envelope/api-response';
import { PrismaService } from '../db/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Permission, assertPermission } from '../auth/rbac';
import { generateToken, hashPassword } from '../auth/crypto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  handle(req: ApiRequestDto): Promise<unknown> {
    const handlers: ActionMap = {
      [USER_API_ACTION.USER_LIST]: (r) => this.list(r.content as UserAdminListPayload, r.caller),
      [USER_API_ACTION.USER_GET]: (r) => this.get(r.content as UserAdminGetPayload, r.caller),
      [USER_API_ACTION.USER_CREATE]: (r) => this.create(r.content as UserAdminCreatePayload, r.caller),
      [USER_API_ACTION.USER_UPDATE]: (r) => this.update(r.content as UserAdminUpdatePayload, r.caller),
      [USER_API_ACTION.USER_DEACTIVATE]: (r) => this.deactivate(r.content as UserAdminDeactivatePayload, r.caller),
      [USER_API_ACTION.USER_RESET_PASSWORD_REQUEST]: (r) => this.triggerReset(r.content as UserAdminGetPayload, r.caller),
      [USER_API_ACTION.USER_ROLES_LIST]: async (r) => this.roles(r.caller),
    };
    return dispatch(req, handlers);
  }

  private async list(payload: UserAdminListPayload | undefined, caller?: RequestHeaderDto | null): Promise<UserAdminRecord[]> {
    assertPermission(caller?.url, Permission.UserRead, 'Only authorized users can view users.');

    const searchText = (payload?.searchText ?? '').trim();
    const isSuperAdmin = this.isSuperAdmin(caller?.url);
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, bu.br_code, bu.user_name, bu.member_code,
              bu.user_stat, bu.user_role, bu.change_pwd,
              DATE_FORMAT(bu.last_login, '%Y-%m-%d %H:%i:%s') AS last_login,
              DATE_FORMAT(bu.reg_date, '%Y-%m-%d %H:%i:%s') AS reg_date,
              m.email AS email,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name
       FROM branch_users bu
       LEFT JOIN members m ON m.member_code = bu.member_code
       WHERE (? = '' OR bu.user_name LIKE ? OR m.email LIKE ? OR CONCAT_WS(' ', m.first_name, m.other_names) LIKE ?)
         ${isSuperAdmin ? '' : 'AND bu.br_code = ?'}
       ORDER BY bu.user_name ASC`,
      searchText,
      `%${searchText}%`,
      `%${searchText}%`,
      `%${searchText}%`,
      ...(isSuperAdmin ? [] : [caller?.br_code ?? 0]),
    ) as UserAdminRecord[];

    return rows;
  }

  private async get(payload: UserAdminGetPayload | undefined, caller?: RequestHeaderDto | null): Promise<UserAdminRecord | undefined> {
    assertPermission(caller?.url, Permission.UserRead, 'Only authorized users can view users.');
    if (!payload?.userCode) throw new BadRequestException('Missing user code.');

    const users = await this.list({ searchText: '' }, caller);
    return users.find((u) => Number(u.user_code) === Number(payload.userCode));
  }

  private async create(payload: UserAdminCreatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    assertPermission(caller?.url, Permission.UserWrite, 'Only administrators can create users.');
    if (!payload) throw new BadRequestException('Missing user payload.');
    if (!payload.user_name || !payload.member_code || !payload.email) {
      throw new BadRequestException('Username, member, and email are required.');
    }

    const brCode = caller?.br_code ?? 0;
    if (!brCode) throw new BadRequestException('Missing caller branch code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_name: payload.user_name } });
    if (existing) throw new BadRequestException('Username is already in use.');

    const nextCodeRows = await this.prisma.$queryRawUnsafe(
      `SELECT COALESCE(MAX(user_code), 0) + 1 AS next_code FROM branch_users`,
    ) as Array<{ next_code: number }>;
    const nextCode = nextCodeRows[0]?.next_code;
    if (!nextCode) throw new BadRequestException('Failed to allocate user code.');

    const salt = generateToken(20);
    const tempPassword = generateToken(12);
    const pwd = hashPassword(tempPassword, salt);

    await this.prisma.branch_users.create({
      data: {
        user_code: nextCode,
        br_code: brCode,
        user_name: payload.user_name,
        member_code: payload.member_code,
        user_stat: 0,
        pwd,
        salt,
        user_role: payload.user_role,
        attempts: 0,
        change_pwd: true,
      },
    });

    if (payload.sendReset) {
      await this.auth.requestPasswordResetForUser(nextCode, caller?.ucode ?? 0);
    }

    await this.audit('user.create', caller?.ucode ?? 0, nextCode, `role=${payload.user_role}`);
    return rawEnvelope({ stat: 0, msg: 'User created.' });
  }

  private async update(payload: UserAdminUpdatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    assertPermission(caller?.url, Permission.UserWrite, 'Only administrators can update users.');
    if (!payload?.user_code) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_code: payload.user_code } });
    if (!existing) throw new BadRequestException('User not found.');
    if (!this.isSuperAdmin(caller?.url) && existing.br_code !== (caller?.br_code ?? 0)) {
      throw new BadRequestException('You can only manage users in your branch.');
    }

    await this.prisma.branch_users.update({
      where: { user_code: payload.user_code },
      data: {
        member_code: payload.member_code ?? existing.member_code,
        user_role: payload.user_role ?? existing.user_role,
        user_stat: payload.user_stat ?? existing.user_stat,
      },
    });

    if (payload.email) {
      await this.prisma.members.updateMany({
        where: { member_code: payload.member_code ?? existing.member_code },
        data: { email: payload.email },
      });
    }

    await this.audit('user.update', caller?.ucode ?? 0, payload.user_code, `role=${payload.user_role ?? existing.user_role};stat=${payload.user_stat ?? existing.user_stat}`);
    return rawEnvelope({ stat: 0, msg: 'User updated.' });
  }

  private async deactivate(payload: UserAdminDeactivatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    assertPermission(caller?.url, Permission.UserDeactivate, 'Only administrators can deactivate users.');
    if (!payload?.user_code) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_code: payload.user_code } });
    if (!existing) throw new BadRequestException('User not found.');
    if (!this.isSuperAdmin(caller?.url) && existing.br_code !== (caller?.br_code ?? 0)) {
      throw new BadRequestException('You can only manage users in your branch.');
    }

    await this.prisma.branch_users.update({
      where: { user_code: payload.user_code },
      data: { user_stat: 1 },
    });

    await this.audit('user.deactivate', caller?.ucode ?? 0, payload.user_code, 'status=1');
    return rawEnvelope({ stat: 0, msg: 'User deactivated.' });
  }

  private async triggerReset(payload: UserAdminGetPayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    assertPermission(caller?.url, Permission.UserReset, 'Only administrators can trigger resets.');
    if (!payload?.userCode) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_code: payload.userCode } });
    if (!existing) throw new BadRequestException('User not found.');
    if (!this.isSuperAdmin(caller?.url) && existing.br_code !== (caller?.br_code ?? 0)) {
      throw new BadRequestException('You can only manage users in your branch.');
    }

    const result = await this.auth.requestPasswordResetForUser(payload.userCode, caller?.ucode ?? 0);
    return rawEnvelope({ stat: 0, msg: result.msg });
  }

  private roles(caller?: RequestHeaderDto | null): Array<{ code: number; name: string }> {
    assertPermission(caller?.url, Permission.UserRead, 'Only authorized users can view roles.');
    return [
      { code: 0, name: 'Super Admin' },
      { code: 1, name: 'Admin' },
      { code: 2, name: 'Standard User' },
      { code: 3, name: 'Viewer' },
    ];
  }

  private isSuperAdmin(role: string | undefined): boolean {
    const normalized = (role ?? '').trim().toLowerCase();
    return normalized === '0' || normalized.includes('super');
  }

  private async audit(event: string, actorCode: number, targetCode: number, message: string): Promise<void> {
    await this.prisma.db_logs.create({
      data: {
        log_type: 0,
        obj_name: event,
        err_line: -1,
        log_msg: `actor=${actorCode};target=${targetCode};${message}`,
      },
    });
  }
}
