import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from '../../config/configuration';
import type { PrismaService } from '../../db/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const makeStrategy = (active = true): JwtStrategy => {
    const config = {
      get: (key: string) => {
        if (key === 'jwt') {
          return {
            cookieName: 'shp_jwt',
            key: 'secret',
            issuer: 'issuer',
            audience: 'audience',
          };
        }
        return undefined;
      },
    } as unknown as ConfigService<AppConfig, true>;
    const prisma = {
      user_sessions: {
        findFirst: jest.fn().mockResolvedValue(active ? { id: 1 } : null),
      },
    } as unknown as PrismaService;
    return new JwtStrategy(config, prisma);
  };

  it('accepts payloads with an active session row', async () => {
    const strategy = makeStrategy(true);
    const out = await strategy.validate({} as never, {
      sub: 'abc',
      jti: 'jti-1',
      userData: JSON.stringify({ UserCode: 10, BranchCode: 10, SessionID: 'sess-1' }),
    });
    expect(out.sub).toBe('abc');
    expect(out.jti).toBe('jti-1');
    expect(out.userData.UserCode).toBe(10);
  });

  it('rejects payloads when the session row is inactive/missing', async () => {
    const strategy = makeStrategy(false);
    await expect(strategy.validate({} as never, {
      sub: 'abc',
      jti: 'jti-1',
      userData: JSON.stringify({ UserCode: 10, BranchCode: 10, SessionID: 'sess-1' }),
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
