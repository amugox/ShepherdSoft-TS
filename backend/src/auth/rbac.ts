import { ForbiddenException } from '@nestjs/common';

import { UserRoleCode } from '@shepherd/shared';

export const Permission = {
  UserRead: 'user:read',
  UserWrite: 'user:write',
  UserDeactivate: 'user:deactivate',
  UserReset: 'user:reset',
  SecurityManage: 'security:manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const rolePermissions: Record<number, Permission[]> = {
  [UserRoleCode.SuperAdmin]: [
    Permission.UserRead,
    Permission.UserWrite,
    Permission.UserDeactivate,
    Permission.UserReset,
    Permission.SecurityManage,
  ],
  [UserRoleCode.Admin]: [
    Permission.UserRead,
    Permission.UserWrite,
    Permission.UserDeactivate,
    Permission.UserReset,
    Permission.SecurityManage,
  ],
  [UserRoleCode.Standard]: [Permission.UserRead],
  [UserRoleCode.Viewer]: [Permission.UserRead],
};

const toRoleCode = (raw: string | number | undefined): number => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (!raw) return UserRoleCode.Viewer;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized.includes('super')) return UserRoleCode.SuperAdmin;
  if (normalized.includes('admin')) return UserRoleCode.Admin;
  if (normalized.includes('view')) return UserRoleCode.Viewer;
  const maybeNum = Number(normalized);
  if (Number.isFinite(maybeNum)) return maybeNum;
  return UserRoleCode.Standard;
};

export const hasPermission = (role: string | number | undefined, permission: Permission): boolean => {
  const roleCode = toRoleCode(role);
  return (rolePermissions[roleCode] ?? []).includes(permission);
};

export const assertPermission = (
  role: string | number | undefined,
  permission: Permission,
  message = 'You do not have permission for this action.',
): void => {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenException(message);
  }
};
