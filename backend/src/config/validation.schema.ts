import { z } from 'zod';

const schema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  JWT_KEY: z.string().min(16, 'JWT_KEY must be >= 16 chars'),
  JWT_SUB: z.string().optional(),
  JWT_EXPIRES_MIN: z.string().optional(),
  COOKIE_NAME: z.string().optional(),
  COOKIE_SECURE: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  CSRF_COOKIE_NAME: z.string().optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.string().optional(),
  MAIL_NAME: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_USE_SSL: z.string().optional(),
  MAIL_APP_NAME: z.string().optional(),
  MAIL_APP_URL: z.string().optional(),
  MAIL_SUPPORT_EMAIL: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
});

export const validateConfig = (raw: Record<string, unknown>): Record<string, unknown> => {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.errors.map((e) => ` - ${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return raw;
};
