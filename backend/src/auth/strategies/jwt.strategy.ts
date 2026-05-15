import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy, type StrategyOptionsWithRequest } from 'passport-jwt';

import type { ApiAppContext } from '@shepherd/shared';

import type { AppConfig } from '../../config/configuration';
import type { JwtUser } from '../../common/envelope/types';
import { PrismaService } from '../../db/prisma.service';

interface RawJwtPayload {
  sub?: string;
  jti?: string;
  userData?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly prisma: PrismaService,
  ) {
    const jwtCfg = config.get('jwt', { infer: true });
    const cookieName = jwtCfg.cookieName;
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const raw = (req.cookies as Record<string, string> | undefined)?.[cookieName];
          return raw ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtCfg.key,
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(_req: Request, payload: RawJwtPayload): Promise<JwtUser> {
    if (!payload.userData) {
      throw new UnauthorizedException('Token missing userData claim');
    }
    let userData: ApiAppContext;
    try {
      userData = JSON.parse(payload.userData) as ApiAppContext;
    } catch {
      throw new UnauthorizedException('Malformed userData claim');
    }
    if (!userData.SessionID || !userData.UserCode) {
      throw new UnauthorizedException('Token missing session details');
    }
    const activeSession = await this.prisma.user_sessions.findFirst({
      where: {
        sess_id: userData.SessionID,
        user_code: userData.UserCode,
        sess_stat: 0,
      },
      select: { id: true },
    });
    if (!activeSession) {
      throw new UnauthorizedException('Session is no longer active');
    }
    return {
      sub: payload.sub ?? '',
      jti: payload.jti ?? '',
      userData,
    };
  }
}
