import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';

import {
  ADMIN_API_ACTION,
  type AdminUserCreatePayload,
  type AdminUserDeactivatePayload,
  type AdminUserGetPayload,
  type AdminUserListPayload,
  type AdminUserRecord,
  type AdminUserUpdatePayload,
  type BranchAdminCreatePayload,
  type BranchAdminDeactivatePayload,
  type BranchAdminGetPayload,
  type BranchAdminListPayload,
  type BranchAdminRecord,
  type BranchAdminUpdatePayload,
  type UserAdminCreatePayload,
  type UserAdminDeactivatePayload,
  type UserAdminGetPayload,
  type UserAdminListPayload,
  type UserAdminRecord,
  type UserAdminUpdatePayload,
} from '@shepherd/shared';

import { AuthService } from '../auth/auth.service';
import { Permission, assertPermission } from '../auth/rbac';
import { generateToken, hashPassword } from '../auth/crypto';
import { ApiRequestDto, RequestHeaderDto } from '../common/envelope/api-request.dto';
import { dispatch, type ActionMap } from '../common/envelope/action-dispatcher';
import { rawEnvelope } from '../common/envelope/api-response';
import { PrismaService } from '../db/prisma.service';

const SYSTEM_ADMIN_USER_TYPE = 1;
type BranchAdminRow = Omit<BranchAdminRecord, 'users_count'> & { users_count?: number | bigint | null };

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  handle(req: ApiRequestDto): Promise<unknown> {
    const handlers: ActionMap = {
      [ADMIN_API_ACTION.ADMIN_BRANCH_LIST]: (r) => this.listBranches(r.content as BranchAdminListPayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_GET]: (r) => this.getBranch(r.content as BranchAdminGetPayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_CREATE]: (r) => this.createBranch(r.content as BranchAdminCreatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_UPDATE]: (r) => this.updateBranch(r.content as BranchAdminUpdatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_DEACTIVATE]: (r) => this.deactivateBranch(r.content as BranchAdminDeactivatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_USER_LIST]: (r) => this.listBranchUsers(r.content as UserAdminListPayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_USER_GET]: (r) => this.getBranchUser(r.content as UserAdminGetPayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_USER_CREATE]: (r) => this.createBranchUser(r.content as UserAdminCreatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_USER_UPDATE]: (r) => this.updateBranchUser(r.content as UserAdminUpdatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_USER_DEACTIVATE]: (r) => this.deactivateBranchUser(r.content as UserAdminDeactivatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_USER_RESET_PASSWORD_REQUEST]: (r) => this.triggerBranchUserReset(r.content as UserAdminGetPayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_BRANCH_USER_ROLES_LIST]: async (r) => this.roles(r.caller),
      [ADMIN_API_ACTION.ADMIN_USER_LIST]: (r) => this.listAdmins(r.content as AdminUserListPayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_USER_GET]: (r) => this.getAdmin(r.content as AdminUserGetPayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_USER_CREATE]: (r) => this.createAdmin(r.content as AdminUserCreatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_USER_UPDATE]: (r) => this.updateAdmin(r.content as AdminUserUpdatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_USER_DEACTIVATE]: (r) => this.deactivateAdmin(r.content as AdminUserDeactivatePayload, r.caller),
      [ADMIN_API_ACTION.ADMIN_USER_RESET_PASSWORD_REQUEST]: (r) => this.triggerAdminReset(r.content as AdminUserGetPayload, r.caller),
    };
    return dispatch(req, handlers);
  }

  private async listBranches(payload: BranchAdminListPayload | undefined, caller?: RequestHeaderDto | null): Promise<BranchAdminRecord[]> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.BranchRead, 'Only administrators can view branches.');
    const includeInactive = Boolean(payload?.includeInactive);
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT b.br_code, b.br_name, b.stat, COUNT(bu.user_code) AS users_count
       FROM branches b
       LEFT JOIN branch_users bu ON bu.br_code = b.br_code
       WHERE (? = 1 OR b.stat = 0)
       GROUP BY b.br_code, b.br_name, b.stat
       ORDER BY b.br_name ASC`,
      includeInactive ? 1 : 0,
    ) as BranchAdminRow[];
    return rows.map((row) => this.toBranchRecord(row));
  }

  private async getBranch(payload: BranchAdminGetPayload | undefined, caller?: RequestHeaderDto | null): Promise<BranchAdminRecord | undefined> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.BranchRead, 'Only administrators can view branches.');
    if (!payload?.br_code) throw new BadRequestException('Missing branch code.');
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT b.br_code, b.br_name, b.stat, COUNT(bu.user_code) AS users_count
       FROM branches b
       LEFT JOIN branch_users bu ON bu.br_code = b.br_code
       WHERE b.br_code = ?
       GROUP BY b.br_code, b.br_name, b.stat`,
      payload.br_code,
    ) as BranchAdminRow[];
    return rows[0] ? this.toBranchRecord(rows[0]) : undefined;
  }

  private async createBranch(payload: BranchAdminCreatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.BranchWrite, 'Only super administrators can create branches.');
    const name = payload?.br_name?.trim();
    if (!name) throw new BadRequestException('Branch name is required.');

    const existing = await this.prisma.branches.findFirst({ where: { br_name: name } });
    if (existing) throw new BadRequestException('Branch name already exists.');

    const nextCodeRows = await this.prisma.$queryRawUnsafe(
      'SELECT COALESCE(MAX(br_code), 0) + 1 AS next_code FROM branches',
    ) as Array<{ next_code: number }>;
    const nextCode = nextCodeRows[0]?.next_code;
    if (!nextCode) throw new BadRequestException('Failed to allocate branch code.');

    await this.prisma.branches.create({
      data: {
        br_code: nextCode,
        br_name: name,
        stat: 0,
      },
    });
    await this.audit('admin.branch.create', caller?.ucode ?? 0, nextCode, `name=${name}`);
    return rawEnvelope({ stat: 0, msg: 'Branch created.' });
  }

  private async updateBranch(payload: BranchAdminUpdatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.BranchWrite, 'Only super administrators can update branches.');
    if (!payload?.br_code) throw new BadRequestException('Missing branch code.');

    const existing = await this.prisma.branches.findUnique({ where: { br_code: payload.br_code } });
    if (!existing) throw new BadRequestException('Branch not found.');

    const nextName = payload.br_name?.trim();
    if (nextName) {
      const duplicate = await this.prisma.branches.findFirst({
        where: {
          br_name: nextName,
          br_code: { not: payload.br_code },
        },
      });
      if (duplicate) throw new BadRequestException('Branch name already exists.');
    }

    const nextStat = payload.stat ?? existing.stat;
    await this.prisma.branches.update({
      where: { br_code: payload.br_code },
      data: {
        br_name: nextName ?? existing.br_name,
        stat: nextStat,
      },
    });
    await this.audit('admin.branch.update', caller?.ucode ?? 0, payload.br_code, `name=${nextName ?? existing.br_name};stat=${nextStat}`);
    return rawEnvelope({ stat: 0, msg: 'Branch updated.' });
  }

  private async deactivateBranch(payload: BranchAdminDeactivatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.BranchDeactivate, 'Only super administrators can deactivate branches.');
    if (!payload?.br_code) throw new BadRequestException('Missing branch code.');
    const existing = await this.prisma.branches.findUnique({ where: { br_code: payload.br_code } });
    if (!existing) throw new BadRequestException('Branch not found.');

    await this.prisma.branches.update({
      where: { br_code: payload.br_code },
      data: { stat: 1 },
    });
    await this.audit('admin.branch.deactivate', caller?.ucode ?? 0, payload.br_code, 'stat=1');
    return rawEnvelope({ stat: 0, msg: 'Branch deactivated.' });
  }

  private async listBranchUsers(payload: UserAdminListPayload | undefined, caller?: RequestHeaderDto | null): Promise<UserAdminRecord[]> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserRead, 'Only authorized users can view branch users.');

    const searchText = (payload?.searchText ?? '').trim();
    const includeInactive = Boolean(payload?.includeInactive);
    const roleCode = typeof payload?.roleCode === 'number' ? payload.roleCode : null;
    const branchCode = typeof payload?.branchCode === 'number' && payload.branchCode > 0 ? payload.branchCode : null;

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, bu.br_code, b.br_name, bu.user_name, bu.member_code,
              bu.user_stat, bu.user_role,
              CASE bu.user_role
                WHEN 0 THEN 'Super Admin'
                WHEN 1 THEN 'Admin'
                WHEN 2 THEN 'Standard User'
                WHEN 3 THEN 'Viewer'
                ELSE 'Unknown'
              END AS role_name,
              bu.change_pwd,
              DATE_FORMAT(bu.last_login, '%Y-%m-%d %H:%i:%s') AS last_login,
              DATE_FORMAT(bu.reg_date, '%Y-%m-%d %H:%i:%s') AS reg_date,
              m.email AS email,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name
       FROM branch_users bu
       LEFT JOIN members m ON m.member_code = bu.member_code
       LEFT JOIN branches b ON b.br_code = bu.br_code
       WHERE (? = '' OR bu.user_name LIKE ? OR m.email LIKE ? OR CONCAT_WS(' ', m.first_name, m.other_names) LIKE ?)
         AND (? IS NULL OR bu.user_role = ?)
         AND (? = 1 OR bu.user_stat = 0)
         AND (? IS NULL OR bu.br_code = ?)
       ORDER BY b.br_name ASC, bu.user_name ASC`,
      searchText,
      `%${searchText}%`,
      `%${searchText}%`,
      `%${searchText}%`,
      roleCode,
      roleCode,
      includeInactive ? 1 : 0,
      branchCode,
      branchCode,
    ) as UserAdminRecord[];

    return rows;
  }

  private async getBranchUser(payload: UserAdminGetPayload | undefined, caller?: RequestHeaderDto | null): Promise<UserAdminRecord | undefined> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserRead, 'Only authorized users can view branch users.');
    if (!payload?.userCode) throw new BadRequestException('Missing user code.');
    const users = await this.listBranchUsers({ includeInactive: true }, caller);
    return users.find((u) => Number(u.user_code) === Number(payload.userCode));
  }

  private async createBranchUser(payload: UserAdminCreatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserWrite, 'Only administrators can create users.');
    if (!payload) throw new BadRequestException('Missing user payload.');
    if (!payload.user_name || !payload.member_code || !payload.email || !payload.br_code) {
      throw new BadRequestException('Branch, username, member, and email are required.');
    }

    const branch = await this.prisma.branches.findUnique({ where: { br_code: payload.br_code } });
    if (!branch) throw new BadRequestException('Invalid branch code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_name: payload.user_name } });
    if (existing) throw new BadRequestException('Username is already in use.');

    const nextCodeRows = await this.prisma.$queryRawUnsafe(
      'SELECT COALESCE(MAX(user_code), 0) + 1 AS next_code FROM branch_users',
    ) as Array<{ next_code: number }>;
    const nextCode = nextCodeRows[0]?.next_code;
    if (!nextCode) throw new BadRequestException('Failed to allocate user code.');

    const salt = generateToken(20);
    const tempPassword = generateToken(12);
    const pwd = hashPassword(tempPassword, salt);

    await this.prisma.branch_users.create({
      data: {
        user_code: nextCode,
        br_code: payload.br_code,
        user_name: payload.user_name.trim(),
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

    await this.audit('admin.branch_user.create', caller?.ucode ?? 0, nextCode, `branch=${payload.br_code};role=${payload.user_role}`);
    return rawEnvelope({ stat: 0, msg: 'Branch user created.' });
  }

  private async updateBranchUser(payload: UserAdminUpdatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserWrite, 'Only administrators can update users.');
    if (!payload?.user_code) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_code: payload.user_code } });
    if (!existing) throw new BadRequestException('User not found.');

    let targetBranch = existing.br_code;
    if (typeof payload.br_code === 'number' && payload.br_code > 0) {
      const target = await this.prisma.branches.findUnique({ where: { br_code: payload.br_code } });
      if (!target) throw new BadRequestException('Invalid branch code.');
      targetBranch = payload.br_code;
    }

    await this.prisma.branch_users.update({
      where: { user_code: payload.user_code },
      data: {
        br_code: targetBranch,
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

    await this.audit(
      'admin.branch_user.update',
      caller?.ucode ?? 0,
      payload.user_code,
      `branch=${targetBranch};role=${payload.user_role ?? existing.user_role};stat=${payload.user_stat ?? existing.user_stat}`,
    );
    return rawEnvelope({ stat: 0, msg: 'Branch user updated.' });
  }

  private async deactivateBranchUser(payload: UserAdminDeactivatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserDeactivate, 'Only administrators can deactivate users.');
    if (!payload?.user_code) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_code: payload.user_code } });
    if (!existing) throw new BadRequestException('User not found.');

    await this.prisma.branch_users.update({
      where: { user_code: payload.user_code },
      data: { user_stat: 1 },
    });

    await this.audit('admin.branch_user.deactivate', caller?.ucode ?? 0, payload.user_code, 'stat=1');
    return rawEnvelope({ stat: 0, msg: 'Branch user deactivated.' });
  }

  private async triggerBranchUserReset(payload: UserAdminGetPayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserReset, 'Only administrators can trigger resets.');
    if (!payload?.userCode) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.branch_users.findUnique({ where: { user_code: payload.userCode } });
    if (!existing) throw new BadRequestException('User not found.');

    const result = await this.auth.requestPasswordResetForUser(payload.userCode, caller?.ucode ?? 0);
    return rawEnvelope({ stat: 0, msg: result.msg });
  }

  private async listAdmins(payload: AdminUserListPayload | undefined, caller?: RequestHeaderDto | null): Promise<AdminUserRecord[]> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserRead, 'Only administrators can view admins.');
    const searchText = (payload?.searchText ?? '').trim();
    const includeInactive = Boolean(payload?.includeInactive);
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT u.user_code, u.user_name, u.full_names, u.phone_no, u.email,
              u.user_stat, u.user_role,
              CASE u.user_role
                WHEN 0 THEN 'Super Admin'
                WHEN 1 THEN 'Admin'
                ELSE CAST(u.user_role AS CHAR)
              END AS role_name,
              u.change_pwd,
              DATE_FORMAT(u.last_login, '%Y-%m-%d %H:%i:%s') AS last_login,
              DATE_FORMAT(u.reg_date, '%Y-%m-%d %H:%i:%s') AS reg_date
       FROM users u
       WHERE (? = '' OR u.user_name LIKE ? OR u.full_names LIKE ? OR u.email LIKE ? OR u.phone_no LIKE ?)
         AND (? = 1 OR u.user_stat = 0)
       ORDER BY u.full_names ASC, u.user_name ASC`,
      searchText,
      `%${searchText}%`,
      `%${searchText}%`,
      `%${searchText}%`,
      `%${searchText}%`,
      includeInactive ? 1 : 0,
    ) as AdminUserRecord[];
    return rows;
  }

  private async getAdmin(payload: AdminUserGetPayload | undefined, caller?: RequestHeaderDto | null): Promise<AdminUserRecord | undefined> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserRead, 'Only administrators can view admins.');
    if (!payload?.userCode) throw new BadRequestException('Missing user code.');
    const admins = await this.listAdmins({ includeInactive: true }, caller);
    return admins.find((u) => Number(u.user_code) === Number(payload.userCode));
  }

  private async createAdmin(payload: AdminUserCreatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserWrite, 'Only administrators can create admins.');
    if (!payload) throw new BadRequestException('Missing admin payload.');
    if (!payload.user_name || !payload.full_names || !payload.phone_no || !payload.email) {
      throw new BadRequestException('Username, full names, phone, and email are required.');
    }

    const existing = await this.prisma.users.findUnique({ where: { user_name: payload.user_name.trim() } });
    if (existing) throw new BadRequestException('Username is already in use.');

    const nextCodeRows = await this.prisma.$queryRawUnsafe(
      'SELECT COALESCE(MAX(user_code), 0) + 1 AS next_code FROM users',
    ) as Array<{ next_code: number }>;
    const nextCode = nextCodeRows[0]?.next_code;
    if (!nextCode) throw new BadRequestException('Failed to allocate user code.');

    const salt = generateToken(20);
    const tempPassword = generateToken(12);
    const pwd = hashPassword(tempPassword, salt);

    await this.prisma.users.create({
      data: {
        user_code: nextCode,
        user_name: payload.user_name.trim(),
        full_names: payload.full_names.trim(),
        phone_no: payload.phone_no.trim(),
        email: payload.email.trim(),
        pwd,
        salt,
        user_stat: 0,
        user_role: payload.user_role,
        attempts: 0,
        change_pwd: true,
        pwd_change_date: new Date(),
      },
    });

    if (payload.sendReset) {
      await this.auth.requestPasswordResetForAdmin(nextCode, caller?.ucode ?? 0);
    }

    await this.audit('admin.user.create', caller?.ucode ?? 0, nextCode, `role=${payload.user_role}`);
    return rawEnvelope({ stat: 0, msg: 'Admin created.' });
  }

  private async updateAdmin(payload: AdminUserUpdatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserWrite, 'Only administrators can update admins.');
    if (!payload?.user_code) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.users.findUnique({ where: { user_code: payload.user_code } });
    if (!existing) throw new BadRequestException('Admin not found.');

    await this.prisma.users.update({
      where: { user_code: payload.user_code },
      data: {
        full_names: payload.full_names?.trim() ?? existing.full_names,
        phone_no: payload.phone_no?.trim() ?? existing.phone_no,
        email: payload.email?.trim() ?? existing.email,
        user_role: payload.user_role ?? existing.user_role,
        user_stat: payload.user_stat ?? existing.user_stat,
      },
    });

    await this.audit(
      'admin.user.update',
      caller?.ucode ?? 0,
      payload.user_code,
      `role=${payload.user_role ?? existing.user_role};stat=${payload.user_stat ?? existing.user_stat}`,
    );
    return rawEnvelope({ stat: 0, msg: 'Admin updated.' });
  }

  private async deactivateAdmin(payload: AdminUserDeactivatePayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserDeactivate, 'Only administrators can deactivate admins.');
    if (!payload?.user_code) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.users.findUnique({ where: { user_code: payload.user_code } });
    if (!existing) throw new BadRequestException('Admin not found.');

    await this.prisma.users.update({
      where: { user_code: payload.user_code },
      data: { user_stat: 1 },
    });

    await this.audit('admin.user.deactivate', caller?.ucode ?? 0, payload.user_code, 'stat=1');
    return rawEnvelope({ stat: 0, msg: 'Admin deactivated.' });
  }

  private async triggerAdminReset(payload: AdminUserGetPayload | undefined, caller?: RequestHeaderDto | null): Promise<unknown> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserReset, 'Only administrators can trigger resets.');
    if (!payload?.userCode) throw new BadRequestException('Missing user code.');

    const existing = await this.prisma.users.findUnique({ where: { user_code: payload.userCode } });
    if (!existing) throw new BadRequestException('Admin not found.');

    const result = await this.auth.requestPasswordResetForAdmin(payload.userCode, caller?.ucode ?? 0);
    return rawEnvelope({ stat: 0, msg: result.msg });
  }

  private roles(caller?: RequestHeaderDto | null): Array<{ code: number; name: string }> {
    this.assertAdminCaller(caller);
    assertPermission(caller?.url, Permission.UserRead, 'Only authorized users can view roles.');
    return [
      { code: 0, name: 'Super Admin' },
      { code: 1, name: 'Admin' },
      { code: 2, name: 'Standard User' },
      { code: 3, name: 'Viewer' },
    ];
  }

  private assertAdminCaller(caller?: RequestHeaderDto | null): void {
    if ((caller?.user_type ?? 0) !== SYSTEM_ADMIN_USER_TYPE) {
      throw new ForbiddenException('Only system administrators can access the admin area.');
    }
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

  private toBranchRecord(row: BranchAdminRow): BranchAdminRecord {
    return {
      br_code: row.br_code,
      br_name: row.br_name,
      stat: row.stat,
      ...(row.users_count === undefined || row.users_count === null ? {} : { users_count: Number(row.users_count) }),
    };
  }
}
