import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router';

import { isAdminRole, isSuperAdminRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** Default true. Set to false on /auth/login (and other anonymous routes). */
    requiresAuth?: boolean;
    /** Set to true on routes that should bounce *away* if already logged in (login page). */
    publicOnly?: boolean;
    /** Restrict route to admin/super-admin users. */
    requiresAdmin?: boolean;
    /** Restrict route to super-admin users only. */
    requiresSuperAdmin?: boolean;
  }
}

export const globalAuthGuard: NavigationGuardWithThis<undefined> = (
  to: RouteLocationNormalized,
): true | { path: string; query?: Record<string, string> } => {
  const auth = useAuthStore();
  auth.hydrateFromStorage();

  if (to.meta.publicOnly && auth.isAuthenticated) {
    return { path: '/' };
  }
  // Default: every route requires auth unless explicitly marked otherwise.
  const requiresAuth = to.meta.requiresAuth ?? true;
  if (requiresAuth && !auth.isAuthenticated) {
    return { path: '/auth/login', query: { return: to.fullPath } };
  }
  if (to.meta.requiresAdmin) {
    if (!isAdminRole(auth.user?.role)) return { path: '/' };
  }
  if (to.meta.requiresSuperAdmin) {
    if (!isSuperAdminRole(auth.user?.role)) return { path: '/' };
  }
  return true;
};
