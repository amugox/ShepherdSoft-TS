import { ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EnvelopeInterceptor } from '../src/common/interceptors/envelope.interceptor';

/**
 * Bootstraps the full Nest app exactly like main.ts, but with the throttler
 * relaxed so the e2e suite can fire as many requests as it needs.
 */
export async function bootstrapTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(ThrottlerModule)
    .useModule(ThrottlerModule.forRoot([{ name: 'fixed', ttl: 60_000, limit: 10_000 }]))
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new EnvelopeInterceptor());

  await app.init();
  return app;
}

export const envelope = (act: number, content: unknown = {}): {
  tsp: string; ver: number; act: number; content: unknown; caller: null;
} => ({
  tsp: new Date().toISOString(),
  ver: 1,
  act,
  content,
  caller: null,
});

/** Parse Set-Cookie headers into `{ cookieHeader, csrfToken }` for double-submit. */
export const authFromLogin = (
  setCookie: string | string[] | undefined,
): { cookieHeader: string; csrfToken: string } => {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookieHeader = list.map((c) => c.split(';')[0]).join('; ');
  const csrfEntry = list.find((c) => c.startsWith('BS-XSRF-TOKEN='));
  const csrfToken = csrfEntry ? csrfEntry.split(';')[0]!.split('=')[1] ?? '' : '';
  return { cookieHeader, csrfToken };
};
