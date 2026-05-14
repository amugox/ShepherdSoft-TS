import axios, { type AxiosInstance } from 'axios';

const CSRF_COOKIE = 'BS-XSRF-TOKEN';

const readCookie = (name: string): string | undefined => {
  const target = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return undefined;
};

export const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  // Only attach the CSRF token on state-changing methods; the guard skips
  // GET/HEAD/OPTIONS anyway and an extra header on every preflight is noise.
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) {
      config.headers.set('BS-XSRF-TOKEN', csrf);
    }
  }
  return config;
});

/**
 * 401 handler is installed from the auth store (which has access to the router
 * to redirect). See stores/auth.ts.
 */
export const install401Handler = (onUnauthorized: () => void): void => {
  client.interceptors.response.use(
    (resp) => resp,
    (err: unknown) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status === 401
      ) {
        // Don't trigger the redirect when the 401 IS the login attempt —
        // otherwise a failed login recursively pushes /auth/login?return=...
        const requestUrl =
          (err as { config?: { url?: string } }).config?.url ?? '';
        if (!requestUrl.endsWith('/auth/login')) {
          onUnauthorized();
        }
      }
      return Promise.reject(err);
    },
  );
};
