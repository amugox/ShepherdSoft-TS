import type { UserData } from '@shepherd/shared';

export const isSuperAdminRole = (role: string | number | null | undefined): boolean => {
  const normalized = String(role ?? '').trim().toLowerCase();
  return normalized === '0' || normalized.includes('super');
};

export const isAdminRole = (role: string | number | null | undefined): boolean => {
  const normalized = String(role ?? '').trim().toLowerCase();
  return isSuperAdminRole(normalized) || normalized.includes('admin') || normalized === '1';
};

export const isSystemAdminUser = (user: Pick<UserData, 'role' | 'user_type'> | null | undefined): boolean =>
  (user?.user_type ?? 0) === 1 && isAdminRole(user?.role);

export const isSystemSuperAdminUser = (user: Pick<UserData, 'role' | 'user_type'> | null | undefined): boolean =>
  (user?.user_type ?? 0) === 1 && isSuperAdminRole(user?.role);
