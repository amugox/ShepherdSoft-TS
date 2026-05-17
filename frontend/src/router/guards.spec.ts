import { beforeEach, describe, expect, it, vi } from 'vitest';

import { globalAuthGuard } from './guards';

const hydrateFromStorage = vi.fn();
const mockAuth = {
  hydrateFromStorage,
  isAuthenticated: true,
  user: { role: 'Admin' },
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuth,
}));

describe('globalAuthGuard', () => {
  beforeEach(() => {
    hydrateFromStorage.mockClear();
    mockAuth.isAuthenticated = true;
    mockAuth.user = { role: 'Admin' };
  });

  it('redirects unauthenticated users to login', () => {
    mockAuth.isAuthenticated = false;
    const result = globalAuthGuard({
      fullPath: '/admin/users',
      meta: { requiresAuth: true },
    } as never);
    expect(result).toEqual({ path: '/auth/login', query: { return: '/admin/users' } });
  });

  it('blocks non-admin users from admin routes', () => {
    mockAuth.user = { role: 'Viewer' };
    const result = globalAuthGuard({
      fullPath: '/admin/users',
      meta: { requiresAuth: true, requiresAdmin: true },
    } as never);
    expect(result).toEqual({ path: '/' });
  });

  it('blocks admin users from super-admin-only routes', () => {
    mockAuth.user = { role: 'Admin' };
    const result = globalAuthGuard({
      fullPath: '/admin/branches',
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    } as never);
    expect(result).toEqual({ path: '/' });
  });

  it('allows super-admin-only routes for super admin', () => {
    mockAuth.user = { role: 'Super Admin' };
    const result = globalAuthGuard({
      fullPath: '/admin/branches',
      meta: { requiresAuth: true, requiresSuperAdmin: true },
    } as never);
    expect(result).toBe(true);
  });
});
