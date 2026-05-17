import { ForbiddenException } from '@nestjs/common';

import { Permission, assertPermission, hasPermission } from './rbac';

describe('rbac', () => {
  it('grants admin security permission', () => {
    expect(hasPermission('Admin', Permission.SecurityManage)).toBe(true);
    expect(hasPermission('1', Permission.SecurityManage)).toBe(true);
  });

  it('allows branch read for admin and branch write for super admin only', () => {
    expect(hasPermission('Admin', Permission.BranchRead)).toBe(true);
    expect(hasPermission('Admin', Permission.BranchWrite)).toBe(false);
    expect(hasPermission('Super Admin', Permission.BranchWrite)).toBe(true);
  });

  it('denies viewer write permission', () => {
    expect(hasPermission('Viewer', Permission.UserWrite)).toBe(false);
    expect(() => assertPermission('Viewer', Permission.UserWrite)).toThrow(ForbiddenException);
  });
});
