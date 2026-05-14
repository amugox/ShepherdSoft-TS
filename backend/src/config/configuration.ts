export interface AppConfig {
  server: {
    port: number;
    nodeEnv: 'development' | 'production' | 'test';
    allowedOrigins: string[];
  };
  database: {
    url: string;
  };
  jwt: {
    issuer: string;
    audience: string;
    key: string;
    sub: string;
    expiresMin: number;
    cookieName: string;
    cookieSecure: boolean;
    cookieSameSite: 'lax' | 'strict' | 'none';
    csrfCookieName: string;
  };
  mail: {
    host: string;
    port: number;
    fromName: string;
    fromEmail: string;
    user: string;
    pass: string;
    useSsl: boolean;
  };
  log: {
    level: string;
  };
}

const toBool = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

const toInt = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) {
    // validateConfig (zod) catches this earlier in normal boot, but throw
    // here so the config object is never built with empty secrets if the
    // schema is ever skipped (e.g. a test harness).
    throw new Error(`Required env var ${name} is missing.`);
  }
  return v;
};

export const configuration = (): AppConfig => ({
  server: {
    port: toInt(process.env.PORT, 3000),
    nodeEnv: (process.env.NODE_ENV as AppConfig['server']['nodeEnv']) ?? 'development',
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  database: {
    url: required('DATABASE_URL'),
  },
  jwt: {
    issuer: process.env.JWT_ISSUER ?? 'https://bmatsolutions.com/',
    audience: process.env.JWT_AUDIENCE ?? 'https://bmatsolutions.com/',
    key: required('JWT_KEY'),
    sub: process.env.JWT_SUB ?? 'ShepherdSoftBranchUser',
    expiresMin: toInt(process.env.JWT_EXPIRES_MIN, 30),
    cookieName: process.env.COOKIE_NAME ?? 'shp_jwt',
    cookieSecure: toBool(process.env.COOKIE_SECURE, false),
    cookieSameSite: ((): 'lax' | 'strict' | 'none' => {
      const raw = (process.env.COOKIE_SAMESITE ?? 'lax').toLowerCase();
      return raw === 'strict' || raw === 'none' ? raw : 'lax';
    })(),
    csrfCookieName: process.env.CSRF_COOKIE_NAME ?? 'BS-XSRF-TOKEN',
  },
  mail: {
    host: process.env.MAIL_HOST ?? 'smtp.gmail.com',
    port: toInt(process.env.MAIL_PORT, 587),
    fromName: process.env.MAIL_NAME ?? 'ShepherdSoft',
    fromEmail: process.env.MAIL_FROM ?? '',
    user: process.env.MAIL_USER ?? '',
    pass: process.env.MAIL_PASS ?? '',
    useSsl: toBool(process.env.MAIL_USE_SSL, true),
  },
  log: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
});
