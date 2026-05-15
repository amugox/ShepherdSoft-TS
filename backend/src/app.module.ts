import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { configuration } from './config/configuration';
import { validateConfig } from './config/validation.schema';
import { DataModule } from './data/data.module';
import { PrismaModule } from './db/prisma.module';
import { GuestModule } from './guest/guest.module';
import { LoggingModule } from './logging/logging.module';
import { MailModule } from './mail/mail.module';
import { MemberModule } from './member/member.module';
import { MessagingModule } from './messaging/messaging.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateConfig,
      cache: true,
    }),
    // Matches the existing fixed-window limiter (10 req / 10 s).
    ThrottlerModule.forRoot([{ name: 'fixed', ttl: 10_000, limit: 10 }]),
    LoggingModule,
    PrismaModule,
    MailModule,
    AuthModule,
    DataModule,
    GuestModule,
    MemberModule,
    MessagingModule,
    UserModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
