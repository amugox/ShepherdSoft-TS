import { describe, expect, it } from 'vitest';

import { isAdminRole, isSuperAdminRole, isSystemAdminUser, isSystemSuperAdminUser } from './roles';

describe('role helpers', () => {
  it('detects super admin role', () => {
    expect(isSuperAdminRole('Super Admin')).toBe(true);
    expect(isSuperAdminRole('0')).toBe(true);
    expect(isSuperAdminRole('Admin')).toBe(false);
  });

  it('detects admin role', () => {
    expect(isAdminRole('Admin')).toBe(true);
    expect(isAdminRole('1')).toBe(true);
    expect(isAdminRole('Super Admin')).toBe(true);
    expect(isAdminRole('Viewer')).toBe(false);
  });

  it('requires system-admin user type for admin area access', () => {
    expect(isSystemAdminUser({ role: 'Admin', user_type: 1 })).toBe(true);
    expect(isSystemAdminUser({ role: 'Admin', user_type: 0 })).toBe(false);
    expect(isSystemSuperAdminUser({ role: 'Super Admin', user_type: 1 })).toBe(true);
    expect(isSystemSuperAdminUser({ role: 'Super Admin', user_type: 0 })).toBe(false);
  });
});
