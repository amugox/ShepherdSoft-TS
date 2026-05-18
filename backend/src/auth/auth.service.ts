import { randomInt, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type {
  ApiAppContext,
  ChangePasswordPayload,
  LoginOtpChallenge,
  PasswordResetCompletePayload,
  PasswordResetRequestPayload,
  UserData,
  UserLoginPayload,
} from '@shepherd/shared';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../db/prisma.service';
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
  private static readonly SYSTEM_2FA_SETTING_KEY = 'SYSTEM_2FA_ENABLED';
  private static readonly SYSTEM_2FA_SETTING_DESC = 'System-wide 2FA toggle';
  private securityTablesEnsured = false;

  constructor(
    private readonly security: SecuritySp,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
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

      const newHash = hashPassword(payload.NewPassword, user.salt);
      await this.prisma.users.update({
        where: { user_code: userCode },
        data: {
          pwd: newHash,
          attempts: 0,
          change_pwd: false,
          pwd_change_date: new Date(),
        },
      });
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

    const newHash = hashPassword(payload.NewPassword, salt);
    const result = await this.security.changeUserPwd(userCode, newHash);
    if (!result || result.resp_status !== 0) {
      throw new BadRequestException(result?.resp_message ?? 'Failed to change password.');
    }
    return { msg: result.resp_message };
  }

  async getSystem2FaState(): Promise<{ enabled: boolean }> {
    return { enabled: await this.getSystem2FaEnabled() };
  }

  async setSystem2FaState(enabled: boolean, actorCode: number): Promise<{ enabled: boolean }> {
    const current = await this.getSystem2FaEnabled();
    await this.prisma.app_setts.upsert({
      where: { item_name: AuthService.SYSTEM_2FA_SETTING_KEY },
      create: {
        item_name: AuthService.SYSTEM_2FA_SETTING_KEY,
        item_val: enabled ? '1' : '0',
        descr: AuthService.SYSTEM_2FA_SETTING_DESC,
      },
      update: {
        item_val: enabled ? '1' : '0',
      },
    });

    if (current !== enabled) {
      await this.auditEvent('auth.system_2fa', actorCode, 0, `from=${current ? 1 : 0};to=${enabled ? 1 : 0}`);
    }

    return { enabled };
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
    if (payload.newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters.');
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

    const inputHash = hashPassword(payload.code, row.salt);
    if (inputHash !== row.code_hash) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE user_password_resets SET attempts = attempts + 1 WHERE id = ?`,
        row.id,
      );
      throw new BadRequestException('Reset code is invalid or expired.');
    }

    if (Number(row.user_type) === SYSTEM_ADMIN_USER_TYPE) {
      const user = await this.prisma.users.findUnique({ where: { user_code: Number(row.user_code) } });
      if (!user) {
        throw new BadRequestException('User not found for reset.');
      }
      const newHash = hashPassword(payload.newPassword, user.salt);
      await this.prisma.users.update({
        where: { user_code: Number(row.user_code) },
        data: {
          pwd: newHash,
          attempts: 0,
          change_pwd: false,
          pwd_change_date: new Date(),
        },
      });
    } else {
      const verify = await this.security.verifyUserByCode(Number(row.user_code));
      if (!verify || verify.resp_status !== 0) {
        throw new BadRequestException('User not found for reset.');
      }
      const userSalt = String(verify.data3 ?? '');
      const newHash = hashPassword(payload.newPassword, userSalt);
      const result = await this.security.changeUserPwd(Number(row.user_code), newHash);
      if (!result || result.resp_status !== 0) {
        throw new BadRequestException(result?.resp_message ?? 'Failed to reset password.');
      }
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE user_password_resets
       SET used = 1, used_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      row.id,
    );

    await this.auditEvent('auth.password_reset.complete', Number(row.user_code), Number(row.user_code), `reset_id=${row.reset_id}`);
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

    const system2FaEnabled = await this.getSystem2FaEnabled();
    if (system2FaEnabled) {
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

    const loginRow = await this.security.userLogin(userCode, 0, tokenHash, sessionId);
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
        cpass: changePass,
        s2fa: system2FaEnabled,
        ltm: new Date().toISOString(),
      },
    };
  }

  private async loginSystemAdmin(payload: UserLoginPayload): Promise<LoginResult> {
    const admin = await this.prisma.users.findUnique({ where: { user_name: payload.Username } });
    if (!admin || admin.user_stat !== 0) {
      throw new UnauthorizedException('Invalid username and/or password.');
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

    const system2FaEnabled = await this.getSystem2FaEnabled();
    if (system2FaEnabled) {
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
    const nextSessionCode = await this.allocateSessionCode();
    await this.prisma.user_sessions.create({
      data: {
        sess_code: nextSessionCode,
        sess_id: sessionId,
        user_code: admin.user_code,
        token: tokenHash,
        sess_stat: 0,
        user_type: SYSTEM_ADMIN_USER_TYPE,
      },
    });

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
        cpass: Boolean(admin.change_pwd),
        s2fa: system2FaEnabled,
        ltm: new Date().toISOString(),
      },
    };
  }

  private async allocateSessionCode(): Promise<number> {
    const rows = await this.prisma.$queryRawUnsafe(
      'SELECT COALESCE(MAX(sess_code), 0) + 1 AS next_code FROM user_sessions',
    ) as Array<{ next_code: number }>;
    const rawCode = rows[0]?.next_code;
    if (!rawCode) {
      throw new BadRequestException('Failed to allocate session code.');
    }
    return Number(rawCode);
  }

  private async getSystem2FaEnabled(): Promise<boolean> {
    const setting = await this.prisma.app_setts.findUnique({
      where: { item_name: AuthService.SYSTEM_2FA_SETTING_KEY },
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
      ALTER TABLE user_login_otp_challenges
      ADD COLUMN IF NOT EXISTS user_type INT NOT NULL DEFAULT 0 AFTER user_code
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
      ALTER TABLE user_password_resets
      ADD COLUMN IF NOT EXISTS user_type INT NOT NULL DEFAULT 0 AFTER user_code
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
}
