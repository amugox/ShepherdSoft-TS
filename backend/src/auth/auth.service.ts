import { randomInt, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type {
  ApiAppContext,
  AudiencePasswordPolicy,
  ChangePasswordPayload,
  LoginOtpChallenge,
  PasswordPolicy,
  PasswordResetCompletePayload,
  PasswordResetRequestPayload,
  UserData,
  UserLoginPayload,
} from '@shepherd/shared';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../db/prisma.service';
import { MySqlService } from '../db/mysql.service';
import { SecuritySp } from '../db/sp/security.sp';
import { generateToken, hashPassword, isPasswordValid } from './crypto';
import { TokenService } from './token.service';

const BRANCH_USER_TYPE = 0;
const SYSTEM_ADMIN_USER_TYPE = 1;

interface UserIdentity {
  user_code: number;
  user_type: number;
  br_code: number;
  user_name: string;
  member_code: number | null;
  email: string | null;
  full_name: string | null;
  user_role: number;
}

interface UserProfile {
  user_code: number;
  user_name: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  branch_name: string | null;
  last_login: string | null;
}

interface OtpChallengeRow {
  id: number;
  challenge_id: string;
  user_code: number;
  user_type: number;
  br_code: number;
  salt: string;
  otp_hash: string;
  expires_at: Date;
  attempts: number;
  max_attempts: number;
  used: number;
}

interface PasswordResetRow {
  id: number;
  reset_id: string;
  user_code: number;
  user_type: number;
  br_code: number;
  salt: string;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  max_attempts: number;
  used: number;
}

export interface LoginResult {
  user?: UserData;
  jwt?: string;
  challenge?: LoginOtpChallenge;
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);
  private readonly loginOtpTtlMinutes = 10;
  private readonly loginOtpMaxAttempts = 5;
  private readonly resetTtlMinutes = 20;
  private readonly resetMaxAttempts = 5;
  /** System-admin accounts lock after this many consecutive failed logins. */
  private readonly adminMaxLoginAttempts = 5;
  private static readonly SESSION_LOCK_NAME = 'shp_sess_alloc';
  private static readonly BRANCH_USER_2FA_KEY = 'BRANCH_USER_2FA_ENABLED';
  private static readonly BRANCH_USER_2FA_DESC = 'Branch-user login 2FA toggle';
  private static readonly ADMIN_2FA_KEY = 'ADMIN_2FA_ENABLED';
  private static readonly ADMIN_2FA_DESC = 'System-admin login 2FA toggle';
  private static readonly BRANCH_PWD_POLICY_KEY = 'BRANCH_PWD_POLICY';
  private static readonly ADMIN_PWD_POLICY_KEY = 'ADMIN_PWD_POLICY';
  private static readonly DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
    minLength: 8,
    requireUpper: true,
    requireLower: true,
    requireNumber: true,
    requireSpecial: false,
    maxAgeDays: 0,
    historyCount: 0,
  };
  private securityTablesEnsured = false;

  constructor(
    private readonly security: SecuritySp,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly mysql: MySqlService,
  ) {}

  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;
    try {
      await this.prisma.user_sessions.updateMany({
        where: { sess_id: sessionId, sess_stat: 0 },
        data: { sess_stat: 1 },
      });
    } catch (err) {
      this.log.warn(`Failed to close session ${sessionId}: ${(err as Error).message}`);
    }
  }

  async login(payload: UserLoginPayload): Promise<LoginResult> {
    if (!payload.Username || !payload.Password) {
      throw new BadRequestException('Username and password are required.');
    }

    if (payload.AdminOnly) {
      return this.loginSystemAdmin(payload);
    }

    if (!payload.BranchCode) {
      throw new BadRequestException('Branch is required.');
    }

    return this.loginBranchUser(payload);
  }

  async getProfile(userCode: number, brCode: number, userType = BRANCH_USER_TYPE): Promise<UserProfile> {
    if (userType === SYSTEM_ADMIN_USER_TYPE || brCode === 0) {
      const admin = await this.prisma.users.findUnique({ where: { user_code: userCode } });
      if (!admin) throw new BadRequestException('User not found.');
      return {
        user_code: admin.user_code,
        user_name: admin.user_name,
        full_name: admin.full_names,
        email: admin.email,
        role: this.getRoleName(admin.user_role),
        branch_name: null,
        last_login: this.formatDateTime(admin.last_login),
      };
    }

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, bu.user_name,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name,
              m.email AS email,
              CASE bu.user_role
                WHEN 0 THEN 'Super Admin'
                WHEN 1 THEN 'Admin'
                WHEN 2 THEN 'Standard User'
                WHEN 3 THEN 'Viewer'
                ELSE CAST(bu.user_role AS CHAR)
              END AS role,
              b.br_name AS branch_name,
              DATE_FORMAT(bu.last_login, '%Y-%m-%d %H:%i:%s') AS last_login
       FROM branch_users bu
       LEFT JOIN members m ON m.member_code = bu.member_code
       LEFT JOIN branches b ON b.br_code = bu.br_code
       WHERE bu.user_code = ? AND bu.br_code = ?
       LIMIT 1`,
      userCode,
      brCode,
    ) as UserProfile[];
    const row = rows[0];
    if (!row) throw new BadRequestException('User not found.');
    return row;
  }

  async changePassword(
    userCode: number,
    brCode: number,
    payload: ChangePasswordPayload,
    userType = BRANCH_USER_TYPE,
  ): Promise<{ msg: string }> {
    if (!payload.OldPassword || !payload.NewPassword) {
      throw new BadRequestException('Old and new password are required.');
    }

    const policy = await this.getAudiencePolicy(userType);
    const complexityError = this.validatePasswordComplexity(payload.NewPassword, policy);
    if (complexityError) throw new BadRequestException(complexityError);

    if (userType === SYSTEM_ADMIN_USER_TYPE || brCode === 0) {
      const user = await this.prisma.users.findUnique({ where: { user_code: userCode } });
      if (!user) throw new UnauthorizedException('User not found.');
      if (!isPasswordValid(payload.OldPassword, user.pwd, user.salt)) {
        await this.prisma.users.update({
          where: { user_code: userCode },
          data: { attempts: { increment: 1 } },
        });
        throw new UnauthorizedException('Invalid current password.');
      }

      await this.checkPasswordHistory(userCode, SYSTEM_ADMIN_USER_TYPE, payload.NewPassword, policy.historyCount);
      const newHash = hashPassword(payload.NewPassword, user.salt);
      await this.prisma.users.update({
        where: { user_code: userCode },
        data: { pwd: newHash, attempts: 0, change_pwd: false, pwd_change_date: new Date() },
      });
      await this.recordPasswordChange(userCode, SYSTEM_ADMIN_USER_TYPE, newHash, user.salt);
      return { msg: 'Password changed successfully.' };
    }

    const verify = await this.security.verifyUserByCode(userCode);
    if (!verify || verify.resp_status !== 0) {
      throw new UnauthorizedException(verify?.resp_message ?? 'User not found.');
    }
    const storedHash = String(verify.data2 ?? '');
    const salt = String(verify.data3 ?? '');

    if (!isPasswordValid(payload.OldPassword, storedHash, salt)) {
      await this.security.userLogin(userCode, 1, '', '');
      throw new UnauthorizedException('Invalid current password.');
    }

    await this.checkPasswordHistory(userCode, BRANCH_USER_TYPE, payload.NewPassword, policy.historyCount);
    const newHash = hashPassword(payload.NewPassword, salt);
    const result = await this.security.changeUserPwd(userCode, newHash);
    if (!result || result.resp_status !== 0) {
      throw new BadRequestException(result?.resp_message ?? 'Failed to change password.');
    }
    await this.recordPasswordChange(userCode, BRANCH_USER_TYPE, newHash, salt);
    return { msg: result.resp_message };
  }

  async getSystem2FaState(): Promise<{ branchUser: boolean; admin: boolean }> {
    const [branchUser, admin] = await Promise.all([
      this.getBranchUser2FaEnabled(),
      this.getAdmin2FaEnabled(),
    ]);
    return { branchUser, admin };
  }

  async setSystem2FaState(
    payload: { branchUser: boolean; admin: boolean },
    actorCode: number,
  ): Promise<{ branchUser: boolean; admin: boolean }> {
    const [currentBranchUser, currentAdmin] = await Promise.all([
      this.getBranchUser2FaEnabled(),
      this.getAdmin2FaEnabled(),
    ]);

    await Promise.all([
      this.prisma.app_setts.upsert({
        where: { item_name: AuthService.BRANCH_USER_2FA_KEY },
        create: { item_name: AuthService.BRANCH_USER_2FA_KEY, item_val: payload.branchUser ? '1' : '0', descr: AuthService.BRANCH_USER_2FA_DESC },
        update: { item_val: payload.branchUser ? '1' : '0' },
      }),
      this.prisma.app_setts.upsert({
        where: { item_name: AuthService.ADMIN_2FA_KEY },
        create: { item_name: AuthService.ADMIN_2FA_KEY, item_val: payload.admin ? '1' : '0', descr: AuthService.ADMIN_2FA_DESC },
        update: { item_val: payload.admin ? '1' : '0' },
      }),
    ]);

    if (currentBranchUser !== payload.branchUser) {
      await this.auditEvent('auth.system_2fa.branch_user', actorCode, 0, `from=${currentBranchUser ? 1 : 0};to=${payload.branchUser ? 1 : 0}`);
    }
    if (currentAdmin !== payload.admin) {
      await this.auditEvent('auth.system_2fa.admin', actorCode, 0, `from=${currentAdmin ? 1 : 0};to=${payload.admin ? 1 : 0}`);
    }

    return { branchUser: payload.branchUser, admin: payload.admin };
  }

  async getPasswordPolicy(): Promise<AudiencePasswordPolicy> {
    const [branchUser, admin] = await Promise.all([
      this.readPasswordPolicy(AuthService.BRANCH_PWD_POLICY_KEY),
      this.readPasswordPolicy(AuthService.ADMIN_PWD_POLICY_KEY),
    ]);
    return { branchUser, admin };
  }

  async setPasswordPolicy(payload: AudiencePasswordPolicy, actorCode: number): Promise<AudiencePasswordPolicy> {
    const branchJson = JSON.stringify(this.clampPolicy(payload.branchUser));
    const adminJson  = JSON.stringify(this.clampPolicy(payload.admin));

    await Promise.all([
      this.prisma.app_setts.upsert({
        where: { item_name: AuthService.BRANCH_PWD_POLICY_KEY },
        create: { item_name: AuthService.BRANCH_PWD_POLICY_KEY, item_val: branchJson, descr: 'Branch-user password policy (JSON)' },
        update: { item_val: branchJson },
      }),
      this.prisma.app_setts.upsert({
        where: { item_name: AuthService.ADMIN_PWD_POLICY_KEY },
        create: { item_name: AuthService.ADMIN_PWD_POLICY_KEY, item_val: adminJson, descr: 'System-admin password policy (JSON)' },
        update: { item_val: adminJson },
      }),
    ]);

    await this.auditEvent('auth.pwd_policy', actorCode, 0, 'policy updated');
    return { branchUser: this.clampPolicy(payload.branchUser), admin: this.clampPolicy(payload.admin) };
  }

  async requestPasswordReset(payload: PasswordResetRequestPayload): Promise<{ msg: string }> {
    const identifier = payload.userNameOrEmail?.trim();
    if (!identifier) {
      throw new BadRequestException('Username or email is required.');
    }

    const user = payload.adminOnly
      ? await this.findAdminByIdentifier(identifier)
      : await this.findBranchUserByIdentifier(identifier);
    if (!user?.email) {
      return { msg: 'If the account exists, a reset code has been sent.' };
    }

    await this.issuePasswordResetCode(user, 0);
    return { msg: 'If the account exists, a reset code has been sent.' };
  }

  async requestPasswordResetForUser(userCode: number, actorCode: number): Promise<{ msg: string }> {
    const user = await this.findBranchUserIdentity(userCode);
    if (!user?.email) {
      throw new BadRequestException('Target user has no email configured.');
    }

    await this.issuePasswordResetCode(user, actorCode);
    return { msg: 'Reset code sent.' };
  }

  async requestPasswordResetForAdmin(userCode: number, actorCode: number): Promise<{ msg: string }> {
    const user = await this.findAdminIdentity(userCode);
    if (!user?.email) {
      throw new BadRequestException('Target admin has no email configured.');
    }

    await this.issuePasswordResetCode(user, actorCode);
    return { msg: 'Reset code sent.' };
  }

  async completePasswordReset(payload: PasswordResetCompletePayload): Promise<{ msg: string }> {
    if (!payload.resetId || !payload.code || !payload.newPassword || !payload.confirmPassword) {
      throw new BadRequestException('Reset payload is incomplete.');
    }
    if (payload.newPassword !== payload.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    await this.ensureSecurityTables();
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT *
       FROM user_password_resets
       WHERE reset_id = ?
       LIMIT 1`,
      payload.resetId,
    ) as PasswordResetRow[];
    const row = rows[0];
    if (!row || row.used || Number(row.max_attempts) <= Number(row.attempts) || new Date(row.expires_at) <= new Date()) {
      throw new BadRequestException('Reset code is invalid or expired.');
    }

    const resetUserType = Number(row.user_type);
    const resetUserCode = Number(row.user_code);
    const policy = await this.getAudiencePolicy(resetUserType);
    const complexityError = this.validatePasswordComplexity(payload.newPassword, policy);
    if (complexityError) throw new BadRequestException(complexityError);

    const inputHash = hashPassword(payload.code, row.salt);
    if (inputHash !== row.code_hash) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE user_password_resets SET attempts = attempts + 1 WHERE id = ?`,
        row.id,
      );
      throw new BadRequestException('Reset code is invalid or expired.');
    }

    await this.checkPasswordHistory(resetUserCode, resetUserType, payload.newPassword, policy.historyCount);

    if (resetUserType === SYSTEM_ADMIN_USER_TYPE) {
      const user = await this.prisma.users.findUnique({ where: { user_code: resetUserCode } });
      if (!user) {
        throw new BadRequestException('User not found for reset.');
      }
      const newHash = hashPassword(payload.newPassword, user.salt);
      await this.prisma.users.update({
        where: { user_code: resetUserCode },
        data: { pwd: newHash, attempts: 0, change_pwd: false, pwd_change_date: new Date() },
      });
      await this.recordPasswordChange(resetUserCode, SYSTEM_ADMIN_USER_TYPE, newHash, user.salt);
    } else {
      const verify = await this.security.verifyUserByCode(resetUserCode);
      if (!verify || verify.resp_status !== 0) {
        throw new BadRequestException('User not found for reset.');
      }
      const userSalt = String(verify.data3 ?? '');
      const newHash = hashPassword(payload.newPassword, userSalt);
      const result = await this.security.changeUserPwd(resetUserCode, newHash);
      if (!result || result.resp_status !== 0) {
        throw new BadRequestException(result?.resp_message ?? 'Failed to reset password.');
      }
      await this.recordPasswordChange(resetUserCode, BRANCH_USER_TYPE, newHash, userSalt);
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE user_password_resets SET used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?`,
      row.id,
    );

    await this.auditEvent('auth.password_reset.complete', resetUserCode, resetUserCode, `reset_id=${row.reset_id}`);
    return { msg: 'Password reset completed.' };
  }

  private async loginBranchUser(payload: UserLoginPayload): Promise<LoginResult> {
    const branchCode = Number(payload.BranchCode);
    const verify = await this.security.verifyUser(payload.Username, branchCode);
    if (!verify || verify.resp_status !== 0) {
      throw new UnauthorizedException(verify?.resp_message ?? 'Invalid username and/or password.');
    }

    const userCode = Number(verify.data1);
    const storedHash = String(verify.data2 ?? '');
    const salt = String(verify.data3 ?? '');

    if (!isPasswordValid(payload.Password, storedHash, salt)) {
      await this.security.userLogin(userCode, 1, '', '');
      throw new UnauthorizedException('Invalid username and/or password.');
    }

    const branchPolicy = await this.getAudiencePolicy(BRANCH_USER_TYPE);
    const branchPwdExpired = branchPolicy.maxAgeDays > 0 && await this.checkPasswordExpiry(userCode, BRANCH_USER_TYPE, branchPolicy.maxAgeDays);

    const branchUser2FaEnabled = await this.getBranchUser2FaEnabled();
    if (branchUser2FaEnabled) {
      const identity = await this.findBranchUserIdentity(userCode, branchCode);
      if (!identity?.email) {
        throw new BadRequestException('2FA is enabled but no user email is configured. Contact an administrator.');
      }

      const hasProvidedOtp = Boolean(payload.OtpCode?.trim()) && Boolean(payload.OtpChallengeId?.trim());
      if (!hasProvidedOtp) {
        const challenge = await this.issueOtpChallenge(identity);
        return { challenge };
      }

      await this.verifyOtpChallenge(identity, payload.OtpChallengeId!, payload.OtpCode!);
    }

    const rawToken = generateToken(50);
    const tokenHash = hashPassword(rawToken, salt);
    const sessionId = randomUUID().replace(/-/g, '');

    const loginRow = await this.mysql.withNamedLock(
      AuthService.SESSION_LOCK_NAME,
      (conn) => this.security.userLoginOnConn(conn, userCode, 0, tokenHash, sessionId),
    );
    if (!loginRow || loginRow.resp_status !== 0) {
      throw new UnauthorizedException(loginRow?.resp_message ?? 'Login failed.');
    }

    const fullNames = String(loginRow.data1 ?? '');
    const userRole = String(loginRow.data2 ?? '');
    const changePass = String(loginRow.data3 ?? '') === '1';
    const branchName = String(loginRow.data4 ?? '');

    const ctx: ApiAppContext = {
      UserCode: userCode,
      BranchCode: branchCode,
      UserType: BRANCH_USER_TYPE,
      Token: rawToken,
      SessionID: sessionId,
      Username: payload.Username,
      FullNames: fullNames,
      UserRole: userRole,
    };
    const jwt = this.tokens.createToken(ctx);

    return {
      jwt,
      user: {
        ucode: userCode,
        uname: payload.Username,
        fnames: fullNames,
        sno: sessionId,
        br_code: branchCode,
        br_name: branchName,
        tkn: jwt,
        role: userRole,
        user_type: BRANCH_USER_TYPE,
        cpass: changePass || branchPwdExpired,
        s2fa: branchUser2FaEnabled,
        ltm: new Date().toISOString(),
      },
    };
  }

  private async loginSystemAdmin(payload: UserLoginPayload): Promise<LoginResult> {
    const admin = await this.prisma.users.findUnique({ where: { user_name: payload.Username } });
    if (!admin || admin.user_stat !== 0) {
      throw new UnauthorizedException('Invalid username and/or password.');
    }

    // Reject locked accounts before checking the password — branch users are
    // locked by their stored procedures; admin users need this guard so the
    // account cannot be brute-forced indefinitely. Cleared on a successful
    // login or password change/reset (attempts set back to 0).
    if ((admin.attempts ?? 0) >= this.adminMaxLoginAttempts) {
      throw new UnauthorizedException(
        'Account locked due to too many failed attempts. Contact an administrator.',
      );
    }

    if (!isPasswordValid(payload.Password, admin.pwd, admin.salt)) {
      await this.prisma.users.update({
        where: { user_code: admin.user_code },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid username and/or password.');
    }

    const identity = await this.findAdminIdentity(admin.user_code);
    if (!identity) {
      throw new UnauthorizedException('Invalid username and/or password.');
    }

    const adminPolicy = await this.getAudiencePolicy(SYSTEM_ADMIN_USER_TYPE);
    const adminPwdExpired = adminPolicy.maxAgeDays > 0 && await this.checkPasswordExpiry(admin.user_code, SYSTEM_ADMIN_USER_TYPE, adminPolicy.maxAgeDays);

    const admin2FaEnabled = await this.getAdmin2FaEnabled();
    if (admin2FaEnabled) {
      if (!identity.email) {
        throw new BadRequestException('2FA is enabled but no user email is configured. Contact an administrator.');
      }

      const hasProvidedOtp = Boolean(payload.OtpCode?.trim()) && Boolean(payload.OtpChallengeId?.trim());
      if (!hasProvidedOtp) {
        const challenge = await this.issueOtpChallenge(identity);
        return { challenge };
      }

      await this.verifyOtpChallenge(identity, payload.OtpChallengeId!, payload.OtpCode!);
    }

    const rawToken = generateToken(50);
    const tokenHash = hashPassword(rawToken, admin.salt);
    const sessionId = randomUUID().replace(/-/g, '');
    await this.createAdminSession(sessionId, admin.user_code, tokenHash);

    await this.prisma.users.update({
      where: { user_code: admin.user_code },
      data: {
        attempts: 0,
        last_login: new Date(),
      },
    });

    const ctx: ApiAppContext = {
      UserCode: admin.user_code,
      BranchCode: 0,
      UserType: SYSTEM_ADMIN_USER_TYPE,
      Token: rawToken,
      SessionID: sessionId,
      Username: admin.user_name,
      FullNames: admin.full_names,
      UserRole: String(admin.user_role),
    };
    const jwt = this.tokens.createToken(ctx);

    await this.auditEvent('auth.login.admin', admin.user_code, admin.user_code, `role=${admin.user_role}`);

    return {
      jwt,
      user: {
        ucode: admin.user_code,
        uname: admin.user_name,
        fnames: admin.full_names,
        sno: sessionId,
        br_code: 0,
        br_name: '',
        tkn: jwt,
        role: String(admin.user_role),
        user_type: SYSTEM_ADMIN_USER_TYPE,
        cpass: Boolean(admin.change_pwd) || adminPwdExpired,
        s2fa: admin2FaEnabled,
        ltm: new Date().toISOString(),
      },
    };
  }

  /**
   * Allocate the next `sess_code` and insert the session row atomically.
   * The `SELECT MAX(..)+1` is racy on its own — two concurrent admin logins
   * could read the same value. Running it with `FOR UPDATE` inside the same
   * transaction as the INSERT holds the lock until commit, serializing
   * concurrent allocations.
   */
  private async createAdminSession(
    sessionId: string,
    userCode: number,
    tokenHash: string,
  ): Promise<void> {
    await this.mysql.withNamedLock(AuthService.SESSION_LOCK_NAME, async () => {
      await this.prisma.$transaction(async (tx) => {
        const rows = (await tx.$queryRawUnsafe(
          'SELECT COALESCE(MAX(sess_code), 0) + 1 AS next_code FROM user_sessions FOR UPDATE',
        )) as Array<{ next_code: number }>;
        const nextSessionCode = Number(rows[0]?.next_code);
        if (!nextSessionCode) {
          throw new BadRequestException('Failed to allocate session code.');
        }
        await tx.user_sessions.create({
          data: {
            sess_code: nextSessionCode,
            sess_id: sessionId,
            user_code: userCode,
            token: tokenHash,
            sess_stat: 0,
            user_type: SYSTEM_ADMIN_USER_TYPE,
          },
        });
      });
    });
  }

  private async getBranchUser2FaEnabled(): Promise<boolean> {
    const setting = await this.prisma.app_setts.findUnique({
      where: { item_name: AuthService.BRANCH_USER_2FA_KEY },
      select: { item_val: true },
    });
    return this.toBoolean(setting?.item_val);
  }

  private async getAdmin2FaEnabled(): Promise<boolean> {
    const setting = await this.prisma.app_setts.findUnique({
      where: { item_name: AuthService.ADMIN_2FA_KEY },
      select: { item_val: true },
    });
    return this.toBoolean(setting?.item_val);
  }

  private toBoolean(raw: string | undefined): boolean {
    if (!raw) return false;
    const normalized = raw.trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  private async findBranchUserByIdentifier(identifier: string): Promise<UserIdentity | undefined> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, ${BRANCH_USER_TYPE} AS user_type, bu.br_code, bu.user_name, bu.member_code,
              m.email AS email,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name,
              bu.user_role
       FROM branch_users bu
       LEFT JOIN members m ON m.member_code = bu.member_code
       WHERE bu.user_name = ? OR m.email = ?
       LIMIT 1`,
      identifier,
      identifier,
    ) as UserIdentity[];
    return rows[0];
  }

  private async findAdminByIdentifier(identifier: string): Promise<UserIdentity | undefined> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT u.user_code, ${SYSTEM_ADMIN_USER_TYPE} AS user_type, 0 AS br_code, u.user_name,
              NULL AS member_code,
              u.email AS email,
              u.full_names AS full_name,
              u.user_role
       FROM users u
       WHERE u.user_name = ? OR u.email = ?
       LIMIT 1`,
      identifier,
      identifier,
    ) as UserIdentity[];
    return rows[0];
  }

  private async findBranchUserIdentity(userCode: number, branchCode?: number): Promise<UserIdentity | undefined> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, ${BRANCH_USER_TYPE} AS user_type, bu.br_code, bu.user_name, bu.member_code,
              m.email AS email,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name,
              bu.user_role
       FROM branch_users bu
       LEFT JOIN members m ON m.member_code = bu.member_code
       WHERE bu.user_code = ? ${typeof branchCode === 'number' ? 'AND bu.br_code = ?' : ''}
       LIMIT 1`,
      ...(typeof branchCode === 'number' ? [userCode, branchCode] : [userCode]),
    ) as UserIdentity[];
    return rows[0];
  }

  private async findAdminIdentity(userCode: number): Promise<UserIdentity | undefined> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT u.user_code, ${SYSTEM_ADMIN_USER_TYPE} AS user_type, 0 AS br_code, u.user_name,
              NULL AS member_code,
              u.email AS email,
              u.full_names AS full_name,
              u.user_role
       FROM users u
       WHERE u.user_code = ?
       LIMIT 1`,
      userCode,
    ) as UserIdentity[];
    return rows[0];
  }

  private async issueOtpChallenge(user: UserIdentity): Promise<LoginOtpChallenge> {
    await this.ensureSecurityTables();

    const code = this.generateNumericCode();
    const challengeId = randomUUID().replace(/-/g, '');
    const salt = generateToken(20);
    const otpHash = hashPassword(code, salt);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO user_login_otp_challenges
        (challenge_id, user_code, user_type, br_code, email, salt, otp_hash, expires_at, attempts, max_attempts, used)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), 0, ?, 0)`,
      challengeId,
      user.user_code,
      user.user_type,
      user.br_code,
      user.email,
      salt,
      otpHash,
      this.loginOtpTtlMinutes,
      this.loginOtpMaxAttempts,
    );

    const delivered = await this.mail.sendOtpCode({
      to: user.email!,
      toName: user.full_name ?? undefined,
      code,
      expiresInMin: this.loginOtpTtlMinutes,
    });

    await this.auditEvent(
      'auth.otp.issue',
      user.user_code,
      user.user_code,
      `challenge=${challengeId};type=${user.user_type};delivered=${delivered ? 1 : 0}`,
    );

    if (!delivered) {
      throw new BadRequestException('Unable to deliver OTP email. Please try again.');
    }

    return {
      requiresOtp: true,
      challengeId,
      expiresInSec: this.loginOtpTtlMinutes * 60,
      maskedEmail: this.maskEmail(user.email),
    };
  }

  private async verifyOtpChallenge(user: UserIdentity, challengeId: string, code: string): Promise<void> {
    await this.ensureSecurityTables();

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM user_login_otp_challenges
       WHERE challenge_id = ? AND user_code = ? AND user_type = ? AND br_code = ?
       LIMIT 1`,
      challengeId,
      user.user_code,
      user.user_type,
      user.br_code,
    ) as OtpChallengeRow[];
    const row = rows[0];
    if (!row || row.used || Number(row.max_attempts) <= Number(row.attempts) || new Date(row.expires_at) <= new Date()) {
      await this.auditEvent('auth.otp.verify', user.user_code, user.user_code, `challenge=${challengeId};result=invalid`);
      throw new UnauthorizedException('OTP code is invalid or expired.');
    }

    const inputHash = hashPassword(code, row.salt);
    if (inputHash !== row.otp_hash) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE user_login_otp_challenges SET attempts = attempts + 1 WHERE id = ?`,
        row.id,
      );
      await this.auditEvent('auth.otp.verify', user.user_code, user.user_code, `challenge=${challengeId};result=failed`);
      throw new UnauthorizedException('OTP code is invalid or expired.');
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE user_login_otp_challenges
       SET used = 1, used_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      row.id,
    );
    await this.auditEvent('auth.otp.verify', user.user_code, user.user_code, `challenge=${challengeId};result=ok`);
  }

  private async issuePasswordResetCode(user: UserIdentity, actorCode: number): Promise<void> {
    await this.ensureSecurityTables();

    const code = this.generateNumericCode();
    const resetId = randomUUID().replace(/-/g, '');
    const salt = generateToken(20);
    const codeHash = hashPassword(code, salt);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO user_password_resets
        (reset_id, user_code, user_type, br_code, email, salt, code_hash, expires_at, attempts, max_attempts, used)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), 0, ?, 0)`,
      resetId,
      user.user_code,
      user.user_type,
      user.br_code,
      user.email,
      salt,
      codeHash,
      this.resetTtlMinutes,
      this.resetMaxAttempts,
    );

    const delivered = await this.mail.sendPasswordResetCode({
      to: user.email!,
      toName: user.full_name ?? undefined,
      code,
      expiresInMin: this.resetTtlMinutes,
    });

    await this.auditEvent(
      'auth.password_reset.issue',
      actorCode || user.user_code,
      user.user_code,
      `reset_id=${resetId};type=${user.user_type};delivered=${delivered ? 1 : 0}`,
    );

    if (!delivered) {
      throw new BadRequestException('Unable to deliver reset code email. Please try again.');
    }
  }

  private generateNumericCode(): string {
    return String(randomInt(100000, 1000000));
  }

  private maskEmail(email: string | null | undefined): string | undefined {
    if (!email) return undefined;
    const [local, domain] = email.split('@');
    if (!local || !domain) return undefined;
    if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
    return `${local[0]}${'*'.repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}@${domain}`;
  }

  private formatDateTime(value: Date | null | undefined): string | null {
    if (!value) return null;
    const iso = value.toISOString();
    return iso.slice(0, 19).replace('T', ' ');
  }

  private getRoleName(role: number): string {
    switch (role) {
      case 0:
        return 'Super Admin';
      case 1:
        return 'Admin';
      case 2:
        return 'Standard User';
      case 3:
        return 'Viewer';
      default:
        return String(role);
    }
  }

  private async ensureSecurityTables(): Promise<void> {
    if (this.securityTablesEnsured) return;

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_login_otp_challenges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challenge_id VARCHAR(64) NOT NULL,
        user_code INT NOT NULL,
        user_type INT NOT NULL DEFAULT 0,
        br_code INT NOT NULL,
        email VARCHAR(100) NULL,
        salt VARCHAR(128) NOT NULL,
        otp_hash VARCHAR(256) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        UNIQUE KEY uk_user_login_otp_challenges_id (challenge_id),
        KEY ix_user_login_otp_user (user_code, user_type, br_code)
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reset_id VARCHAR(64) NOT NULL,
        user_code INT NOT NULL,
        user_type INT NOT NULL DEFAULT 0,
        br_code INT NOT NULL,
        email VARCHAR(100) NULL,
        salt VARCHAR(128) NOT NULL,
        code_hash VARCHAR(256) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        UNIQUE KEY uk_user_password_resets_id (reset_id),
        KEY ix_user_password_resets_user (user_code, user_type, br_code)
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_password_history (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        user_code  INT NOT NULL,
        user_type  TINYINT(1) NOT NULL DEFAULT 0,
        pwd_hash   VARCHAR(512) NOT NULL,
        salt       VARCHAR(128) NOT NULL,
        changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY ix_pwd_history_user (user_code, user_type, changed_at)
      )
    `);

    this.securityTablesEnsured = true;
  }

  private async auditEvent(event: string, actorCode: number, targetCode: number, msg: string): Promise<void> {
    try {
      await this.prisma.db_logs.create({
        data: {
          log_type: 0,
          obj_name: event,
          err_line: -1,
          log_msg: `actor=${actorCode};target=${targetCode};${msg}`,
        },
      });
    } catch (err) {
      this.log.warn(`Failed to write audit event ${event}: ${(err as Error).message}`);
    }
  }

  // ── Password-policy helpers ────────────────────────────────────────────────

  private async readPasswordPolicy(key: string): Promise<PasswordPolicy> {
    const setting = await this.prisma.app_setts.findUnique({
      where: { item_name: key },
      select: { item_val: true },
    });
    if (!setting?.item_val) return { ...AuthService.DEFAULT_PASSWORD_POLICY };
    try {
      const parsed = JSON.parse(setting.item_val) as Partial<PasswordPolicy>;
      return {
        minLength: typeof parsed.minLength === 'number' ? Math.max(6, Math.min(64, parsed.minLength)) : AuthService.DEFAULT_PASSWORD_POLICY.minLength,
        requireUpper: typeof parsed.requireUpper === 'boolean' ? parsed.requireUpper : AuthService.DEFAULT_PASSWORD_POLICY.requireUpper,
        requireLower: typeof parsed.requireLower === 'boolean' ? parsed.requireLower : AuthService.DEFAULT_PASSWORD_POLICY.requireLower,
        requireNumber: typeof parsed.requireNumber === 'boolean' ? parsed.requireNumber : AuthService.DEFAULT_PASSWORD_POLICY.requireNumber,
        requireSpecial: typeof parsed.requireSpecial === 'boolean' ? parsed.requireSpecial : AuthService.DEFAULT_PASSWORD_POLICY.requireSpecial,
        maxAgeDays: typeof parsed.maxAgeDays === 'number' ? Math.max(0, parsed.maxAgeDays) : AuthService.DEFAULT_PASSWORD_POLICY.maxAgeDays,
        historyCount: typeof parsed.historyCount === 'number' ? Math.max(0, Math.min(24, parsed.historyCount)) : AuthService.DEFAULT_PASSWORD_POLICY.historyCount,
      };
    } catch {
      return { ...AuthService.DEFAULT_PASSWORD_POLICY };
    }
  }

  private clampPolicy(p: PasswordPolicy): PasswordPolicy {
    return {
      minLength: Math.max(6, Math.min(64, p.minLength)),
      requireUpper: Boolean(p.requireUpper),
      requireLower: Boolean(p.requireLower),
      requireNumber: Boolean(p.requireNumber),
      requireSpecial: Boolean(p.requireSpecial),
      maxAgeDays: Math.max(0, Math.min(3650, p.maxAgeDays)),
      historyCount: Math.max(0, Math.min(24, p.historyCount)),
    };
  }

  private async getAudiencePolicy(userType: number): Promise<PasswordPolicy> {
    const key = userType === SYSTEM_ADMIN_USER_TYPE
      ? AuthService.ADMIN_PWD_POLICY_KEY
      : AuthService.BRANCH_PWD_POLICY_KEY;
    return this.readPasswordPolicy(key);
  }

  private validatePasswordComplexity(password: string, policy: PasswordPolicy): string | null {
    if (password.length < policy.minLength) {
      return `Password must be at least ${policy.minLength} characters.`;
    }
    if (policy.requireUpper && !/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (policy.requireLower && !/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter.';
    }
    if (policy.requireNumber && !/[0-9]/.test(password)) {
      return 'Password must contain at least one number.';
    }
    if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      return 'Password must contain at least one special character (e.g. !@#$%).';
    }
    return null;
  }

  private async checkPasswordHistory(
    userCode: number,
    userType: number,
    newPassword: string,
    historyCount: number,
  ): Promise<void> {
    if (historyCount <= 0) return;
    await this.ensureSecurityTables();
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT pwd_hash, salt FROM user_password_history
       WHERE user_code = ? AND user_type = ?
       ORDER BY changed_at DESC
       LIMIT ?`,
      userCode,
      userType,
      historyCount,
    ) as Array<{ pwd_hash: string; salt: string }>;

    for (const row of rows) {
      if (isPasswordValid(newPassword, row.pwd_hash, row.salt)) {
        throw new BadRequestException(
          `This password has been used recently. Please choose one of your last ${historyCount} passwords has not been used.`,
        );
      }
    }
  }

  private async recordPasswordChange(
    userCode: number,
    userType: number,
    hash: string,
    salt: string,
  ): Promise<void> {
    await this.ensureSecurityTables();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO user_password_history (user_code, user_type, pwd_hash, salt) VALUES (?, ?, ?, ?)`,
      userCode,
      userType,
      hash,
      salt,
    );
  }

  private async checkPasswordExpiry(
    userCode: number,
    userType: number,
    maxAgeDays: number,
  ): Promise<boolean> {
    if (maxAgeDays <= 0) return false;

    let lastChangedAt: Date | null = null;

    if (userType === SYSTEM_ADMIN_USER_TYPE) {
      const user = await this.prisma.users.findUnique({
        where: { user_code: userCode },
        select: { pwd_change_date: true },
      });
      lastChangedAt = user?.pwd_change_date ?? null;
    } else {
      await this.ensureSecurityTables();
      const rows = await this.prisma.$queryRawUnsafe(
        `SELECT changed_at FROM user_password_history
         WHERE user_code = ? AND user_type = ?
         ORDER BY changed_at DESC
         LIMIT 1`,
        userCode,
        userType,
      ) as Array<{ changed_at: Date }>;
      lastChangedAt = rows[0]?.changed_at ?? null;
    }

    if (!lastChangedAt) return false;
    const ageMs = Date.now() - new Date(lastChangedAt).getTime();
    return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
  }
}
