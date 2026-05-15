import { randomBytes } from 'node:crypto';

import {
  ForbiddenException,
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import {
  AUTH_API_ACTION,
  type ChangePasswordPayload,
  type UserLoginPayload,
} from '@shepherd/shared';

import type { AppConfig } from '../config/configuration';
import { Caller } from '../common/decorators/caller.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiRequestDto, RequestHeaderDto } from '../common/envelope/api-request.dto';
import { rawEnvelope } from '../common/envelope/api-response';
import { CallerInterceptor } from '../common/interceptors/caller.interceptor';
import type { RequestWithCaller } from '../common/envelope/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

const AUTH_GET_SYSTEM_2FA = 102;
const AUTH_SET_SYSTEM_2FA = 103;

interface SetSystem2FaPayload {
  enabled: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /**
   * POST /api/v1/auth/login
   * Public. Body is an ApiRequestDto<UserLoginPayload>.
   * Sets HttpOnly cookie + non-HttpOnly CSRF cookie; also returns the
   * UserDataModel payload in the response body for backwards-compat.
   */
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: ApiRequestDto<UserLoginPayload>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    const content = body.content;
    if (!content) {
      return rawEnvelope({ stat: 1, msg: 'Missing login payload.', err_no: 'ERR-AUTH-01' });
    }
    const result = await this.auth.login(content);
    this.setAuthCookies(res, result.jwt);
    return result.user;
  }

  /**
   * POST /api/v1/auth/service
   * Requires auth. Dispatches on `act`:
   *   - AUTH_API_ACTION.AUTH_CHANGE_PASS → change current user's password
   *   - logout (act = 0)                → clear cookies
   */
  @Post('service')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CallerInterceptor)
  async service(
    @Body() body: ApiRequestDto,
    @Caller() caller: RequestHeaderDto,
    @Res({ passthrough: true }) res: Response,
    @Req() _req: RequestWithCaller,
  ): Promise<unknown> {
    switch (body.act) {
      case AUTH_API_ACTION.AUTH_LOGOUT: {
        await this.auth.logout(caller.sid);
        this.clearAuthCookies(res);
        return rawEnvelope({ stat: 0, msg: 'Logged out.' });
      }
      case AUTH_API_ACTION.AUTH_CHANGE_PASS: {
        const result = await this.auth.changePassword(caller.ucode, body.content as ChangePasswordPayload);
        return rawEnvelope({ stat: 0, msg: result.msg });
      }
      case AUTH_GET_SYSTEM_2FA: {
        const result = await this.auth.getSystem2FaState();
        return rawEnvelope({ stat: 0, msg: 'OK', data: result });
      }
      case AUTH_SET_SYSTEM_2FA: {
        this.assertAdmin(caller.url);
        const content = body.content as SetSystem2FaPayload | undefined;
        if (!content || typeof content.enabled !== 'boolean') {
          return rawEnvelope({ stat: 1, msg: 'Missing system 2FA payload.', err_no: 'ERR-AUTH-02' });
        }
        const result = await this.auth.setSystem2FaState(content.enabled, caller.ucode);
        return rawEnvelope({ stat: 0, msg: 'System 2FA updated.', data: result });
      }
      default:
        return rawEnvelope({ stat: 1, msg: 'Unsupported action.', err_no: 'ERR-01' });
    }
  }

  private assertAdmin(role: string | undefined): void {
    if (!this.isAdminRole(role)) {
      throw new ForbiddenException('Only administrators can change system 2FA settings.');
    }
  }

  private isAdminRole(role: string | undefined): boolean {
    if (!role) return false;
    const normalized = role.trim().toLowerCase();
    if (normalized.includes('admin')) return true;
    const asNumber = Number(normalized);
    return Number.isFinite(asNumber) && (asNumber === 0 || asNumber === 1);
  }

  private setAuthCookies(res: Response, jwt: string): void {
    const cfg = this.config.get('jwt', { infer: true });
    const maxAge = cfg.expiresMin * 60 * 1000;
    res.cookie(cfg.cookieName, jwt, {
      httpOnly: true,
      secure: cfg.cookieSecure,
      sameSite: cfg.cookieSameSite,
      path: '/',
      maxAge,
    });
    // Double-submit CSRF cookie — readable by JS so the SPA can echo it.
    res.cookie(cfg.csrfCookieName, randomBytes(24).toString('base64url'), {
      httpOnly: false,
      secure: cfg.cookieSecure,
      sameSite: cfg.cookieSameSite,
      path: '/',
      maxAge,
    });
  }

  private clearAuthCookies(res: Response): void {
    const cfg = this.config.get('jwt', { infer: true });
    res.clearCookie(cfg.cookieName, { path: '/' });
    res.clearCookie(cfg.csrfCookieName, { path: '/' });
  }
}
