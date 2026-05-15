import { ForbiddenException } from '@nestjs/common';

import { Permission, assertPermission, hasPermission } from './rbac';

describe('rbac', () => {
  it('grants admin security permission', () => {
    expect(hasPermission('Admin', Permission.SecurityManage)).toBe(true);
    expect(hasPermission('1', Permission.SecurityManage)).toBe(true);
  });

  it('denies viewer write permission', () => {
    expect(hasPermission('Viewer', Permission.UserWrite)).toBe(false);
    expect(() => assertPermission('Viewer', Permission.UserWrite)).toThrow(ForbiddenException);
  });
});
