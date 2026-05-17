import { describe, expect, it } from 'vitest';

import { isAdminRole, isSuperAdminRole } from './roles';

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
});
