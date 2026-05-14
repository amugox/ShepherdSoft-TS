import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

import type { AppConfig } from '../../config/configuration';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const CSRF_HEADER = 'bs-xsrf-token';

const safeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

/**
 * Double-submit-cookie CSRF check.
 *
 * On every authenticated state-changing request the client must echo the
 * BS-XSRF-TOKEN cookie back as a header. Skipped for @Public() handlers (login
 * — no auth cookie yet to abuse) and for safe methods (GET/HEAD/OPTIONS).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const method = (req.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    // If there is no auth cookie, this request isn't authenticated yet —
    // let the JWT guard reject with 401 rather than masking that with 403.
    const cookies = (req.cookies as Record<string, string | undefined> | undefined) ?? {};
    const authCookieName = this.config.get('jwt.cookieName', { infer: true });
    if (!cookies[authCookieName]) return true;

    const cookieName = this.config.get('jwt.csrfCookieName', { infer: true });
    const cookie = cookies[cookieName];
    const header = req.headers[CSRF_HEADER];
    const headerValue = Array.isArray(header) ? header[0] : header;

    if (!cookie || !headerValue || !safeEqual(cookie, headerValue)) {
      throw new ForbiddenException({
        stat: 1,
        msg: 'CSRF token missing or invalid.',
        err_no: 'ERR-CSRF-01',
      });
    }
    return true;
  }
}
