import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { type Logger } from 'pino';

import type { AppConfig } from '../config/configuration';

export const APP_LOGGER = Symbol('APP_LOGGER');

@Global()
@Module({
  providers: [
    {
      provide: APP_LOGGER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): Logger => {
        const level = config.get('log.level', { infer: true });
        const isDev = config.get('server.nodeEnv', { infer: true }) === 'development';
        return pino({
          level,
          ...(isDev
            ? {
                transport: {
                  target: 'pino-pretty',
                  options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
                },
              }
            : {}),
        });
      },
    },
  ],
  exports: [APP_LOGGER],
})
export class LoggingModule {}
