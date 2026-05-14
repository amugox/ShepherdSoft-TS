import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { ApiAppContext } from '@shepherd/shared';

import type { AppConfig } from '../config/configuration';

/**
 * Mirrors ShepherdSoft.Api/Services/TokenService.cs.
 * Claims: sub, jti, iat, userData (JSON-stringified ApiAppContext).
 * Algorithm: HS256.  Expiry: 30 min (configurable).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  createToken(user: ApiAppContext): string {
    const jwtCfg = this.config.get('jwt', { infer: true });
    const payload = {
      sub: jwtCfg.sub,
      jti: randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      userData: JSON.stringify(user),
    };
    return this.jwt.sign(payload, {
      issuer: jwtCfg.issuer,
      audience: jwtCfg.audience,
      expiresIn: `${jwtCfg.expiresMin}m`,
    });
  }
}
