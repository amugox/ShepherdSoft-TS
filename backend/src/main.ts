import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfig, true>);

  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.enableCors({
    origin: config.get('server.allowedOrigins', { infer: true }),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'BS-XSRF-TOKEN'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      // `content` is typed as `unknown` by design (shape differs per action
      // code), so we can't enable `whitelist: true` at the envelope level
      // without stripping every action's payload — per-act content shape is
      // validated inside each service via type narrowing instead.
      whitelist: false,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());

  const port = config.get('server.port', { infer: true });
  await app.listen(port);

   
  console.log(`[shepherd-backend] listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
