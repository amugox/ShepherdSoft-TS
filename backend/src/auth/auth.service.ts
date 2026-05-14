import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';

import type { ApiAppContext, ChangePasswordPayload, UserData, UserLoginPayload } from '@shepherd/shared';

import { PrismaService } from '../db/prisma.service';
import { SecuritySp } from '../db/sp/security.sp';
import { generateToken, hashPassword, isPasswordValid } from './crypto';
import { TokenService } from './token.service';

export interface LoginResult {
  user: UserData;
  jwt: string;
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly security: SecuritySp,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Mark the current session row as closed so the .NET admin (which inspects
   * `user_sessions.sess_stat`) sees a coordinated logout. Best-effort — we
   * still clear cookies even if the row update fails.
   */
  async logout(sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;
    try {
      await this.prisma.user_sessions.updateMany({
        where: { sess_id: sessionId, sess_stat: 0 },
        data:  { sess_stat: 1 },
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

    const userCode  = Number(verify.data1);
    const storedHash = String(verify.data2 ?? '');
    const salt       = String(verify.data3 ?? '');

    if (!isPasswordValid(payload.Password, storedHash, salt)) {
      await this.security.userLogin(userCode, 1, '', '');
      throw new UnauthorizedException('Invalid username and/or password.');
    }

    const rawToken  = generateToken(50);
    const tokenHash = hashPassword(rawToken, salt);
    const sessionId = randomUUID().replace(/-/g, '');

    const loginRow = await this.security.userLogin(userCode, 0, tokenHash, sessionId);
    if (!loginRow || loginRow.resp_status !== 0) {
      throw new UnauthorizedException(loginRow?.resp_message ?? 'Login failed.');
    }

    const fullNames  = String(loginRow.data1 ?? '');
    const userRole   = String(loginRow.data2 ?? '');
    const changePass = String(loginRow.data3 ?? '') === '1';
    const branchName = String(loginRow.data4 ?? '');

    const ctx: ApiAppContext = {
      UserCode:   userCode,
      BranchCode: payload.BranchCode,
      Token:      rawToken,
      SessionID:  sessionId,
      Username:   payload.Username,
      FullNames:  fullNames,
      UserRole:   userRole,
    };
    const jwt = this.tokens.createToken(ctx);

    return {
      jwt,
      user: {
        ucode:    userCode,
        uname:    payload.Username,
        fnames:   fullNames,
        sno:      sessionId,
        br_code:  payload.BranchCode,
        br_name:  branchName,
        tkn:      jwt,
        role:     userRole,
        cpass:    changePass,
        ltm:      new Date().toISOString(),
      },
    };
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
    const salt       = String(verify.data3 ?? '');

    if (!isPasswordValid(payload.OldPassword, storedHash, salt)) {
      await this.security.userLogin(userCode, 1, '', '');
      throw new UnauthorizedException('Invalid current password.');
    }

    const newHash = hashPassword(payload.NewPassword, salt);
    const result  = await this.security.changeUserPwd(userCode, newHash);
    if (!result || result.resp_status !== 0) {
      throw new BadRequestException(result?.resp_message ?? 'Failed to change password.');
    }
    return { msg: result.resp_message };
  }
}
