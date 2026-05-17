import { ForbiddenException } from '@nestjs/common';

import { ADMIN_API_ACTION } from '@shepherd/shared';

import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prisma = {
    $queryRawUnsafe: jest.fn(),
    branches: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    branch_users: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    members: {
      updateMany: jest.fn(),
    },
    db_logs: {
      create: jest.fn(),
    },
  };
  const auth = {
    requestPasswordResetForUser: jest.fn().mockResolvedValue({ msg: 'ok' }),
  };

  const service = new AdminService(
    prisma as unknown as ConstructorParameters<typeof AdminService>[0],
    auth as unknown as ConstructorParameters<typeof AdminService>[1],
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRawUnsafe.mockResolvedValue([]);
    prisma.branches.findUnique.mockResolvedValue({ br_code: 10, br_name: 'Main', stat: 0 });
    prisma.branches.findFirst.mockResolvedValue(null);
    prisma.branch_users.findUnique.mockResolvedValue(null);
    prisma.branches.create.mockResolvedValue({});
    prisma.branches.update.mockResolvedValue({});
    prisma.branch_users.create.mockResolvedValue({});
    prisma.branch_users.update.mockResolvedValue({});
    prisma.members.updateMany.mockResolvedValue({});
    prisma.db_logs.create.mockResolvedValue({});
  });

  it('rejects branch creation for non-super-admin', async () => {
    await expect(service.handle({
      act: ADMIN_API_ACTION.ADMIN_BRANCH_CREATE,
      content: { br_name: 'North' },
      caller: { br_code: 10, ucode: 1, url: 'Admin' },
      ver: 1,
    })).rejects.toThrow(ForbiddenException);
  });

  it('scopes branch-user list to caller branch for non-super-admin', async () => {
    await service.handle({
      act: ADMIN_API_ACTION.ADMIN_BRANCH_USER_LIST,
      content: { branchCode: 88, searchText: '' },
      caller: { br_code: 10, ucode: 1, url: 'Admin' },
      ver: 1,
    });

    expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    const args = prisma.$queryRawUnsafe.mock.calls[0] as unknown[];
    expect(args[8]).toBe(10);
    expect(args[9]).toBe(10);
  });

  it('rejects cross-branch user creation for non-super-admin', async () => {
    await expect(service.handle({
      act: ADMIN_API_ACTION.ADMIN_BRANCH_USER_CREATE,
      content: {
        br_code: 22,
        user_name: 'new.user',
        member_code: 100,
        email: 'new@x.com',
        user_role: 2,
        sendReset: false,
      },
      caller: { br_code: 10, ucode: 1, url: 'Admin' },
      ver: 1,
    })).rejects.toThrow('You can only create users in your branch.');
  });

  it('allows branch creation for super-admin', async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ next_code: 55 }]);

    await service.handle({
      act: ADMIN_API_ACTION.ADMIN_BRANCH_CREATE,
      content: { br_name: 'North' },
      caller: { br_code: 1, ucode: 1, url: 'Super Admin' },
      ver: 1,
    });

    expect(prisma.branches.create).toHaveBeenCalledWith({
      data: { br_code: 55, br_name: 'North', stat: 0 },
    });
  });
});
