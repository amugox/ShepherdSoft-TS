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

interface UserIdentity {
  user_code: number;
  br_code: number;
  user_name: string;
  member_code: number;
  email: string | null;
  full_name: string | null;
}

interface OtpChallengeRow {
  id: number;
  challenge_id: string;
  user_code: number;
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

    const verify = await this.security.verifyUser(payload.Username, payload.BranchCode);
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
      const identity = await this.findUserIdentity(userCode, payload.BranchCode);
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
      BranchCode: payload.BranchCode,
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
        br_code: payload.BranchCode,
        br_name: branchName,
        tkn: jwt,
        role: userRole,
        cpass: changePass,
        s2fa: system2FaEnabled,
        ltm: new Date().toISOString(),
      },
    };
  }

  async getProfile(userCode: number, brCode: number): Promise<UserIdentity & { role: string; branch_name: string; last_login: string | null }> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, bu.br_code, bu.user_name, bu.member_code,
              m.email AS email,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name,
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
    ) as Array<UserIdentity & { role: string; branch_name: string; last_login: string | null }>;
    const row = rows[0];
    if (!row) throw new BadRequestException('User not found.');
    return row;
  }

  async changePassword(userCode: number, payload: ChangePasswordPayload): Promise<{ msg: string }> {
    if (!payload.OldPassword || !payload.NewPassword) {
      throw new BadRequestException('Old and new password are required.');
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

    const user = await this.findUserByIdentifier(identifier);
    if (!user?.email) {
      return { msg: 'If the account exists, a reset code has been sent.' };
    }

    await this.issuePasswordResetCode(user, 0);
    return { msg: 'If the account exists, a reset code has been sent.' };
  }

  async requestPasswordResetForUser(userCode: number, actorCode: number): Promise<{ msg: string }> {
    const user = await this.findUserIdentity(userCode);
    if (!user?.email) {
      throw new BadRequestException('Target user has no email configured.');
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

    await this.prisma.$executeRawUnsafe(
      `UPDATE user_password_resets
       SET used = 1, used_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      row.id,
    );

    await this.auditEvent('auth.password_reset.complete', Number(row.user_code), Number(row.user_code), `reset_id=${row.reset_id}`);
    return { msg: 'Password reset completed.' };
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

  private async findUserByIdentifier(identifier: string): Promise<UserIdentity | undefined> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, bu.br_code, bu.user_name, bu.member_code,
              m.email AS email,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name
       FROM branch_users bu
       LEFT JOIN members m ON m.member_code = bu.member_code
       WHERE bu.user_name = ? OR m.email = ?
       LIMIT 1`,
      identifier,
      identifier,
    ) as UserIdentity[];
    return rows[0];
  }

  private async findUserIdentity(userCode: number, branchCode?: number): Promise<UserIdentity | undefined> {
    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT bu.user_code, bu.br_code, bu.user_name, bu.member_code,
              m.email AS email,
              CONCAT_WS(' ', m.first_name, m.other_names) AS full_name
       FROM branch_users bu
       LEFT JOIN members m ON m.member_code = bu.member_code
       WHERE bu.user_code = ? ${typeof branchCode === 'number' ? 'AND bu.br_code = ?' : ''}
       LIMIT 1`,
      ...(typeof branchCode === 'number' ? [userCode, branchCode] : [userCode]),
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
        (challenge_id, user_code, br_code, email, salt, otp_hash, expires_at, attempts, max_attempts, used)
       VALUES
        (?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), 0, ?, 0)`,
      challengeId,
      user.user_code,
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
      `challenge=${challengeId};delivered=${delivered ? 1 : 0}`,
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
       WHERE challenge_id = ? AND user_code = ? AND br_code = ?
       LIMIT 1`,
      challengeId,
      user.user_code,
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
        (reset_id, user_code, br_code, email, salt, code_hash, expires_at, attempts, max_attempts, used)
       VALUES
        (?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? MINUTE), 0, ?, 0)`,
      resetId,
      user.user_code,
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
      `reset_id=${resetId};delivered=${delivered ? 1 : 0}`,
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

  private async ensureSecurityTables(): Promise<void> {
    if (this.securityTablesEnsured) return;

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_login_otp_challenges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        challenge_id VARCHAR(64) NOT NULL,
        user_code INT NOT NULL,
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
        KEY ix_user_login_otp_user (user_code, br_code)
      )
    `);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS user_password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reset_id VARCHAR(64) NOT NULL,
        user_code INT NOT NULL,
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
        KEY ix_user_password_resets_user (user_code, br_code)
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
}
