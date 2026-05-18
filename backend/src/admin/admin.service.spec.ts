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
    users: {
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
    requestPasswordResetForAdmin: jest.fn().mockResolvedValue({ msg: 'ok' }),
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
    prisma.users.findUnique.mockResolvedValue(null);
    prisma.branches.create.mockResolvedValue({});
    prisma.branches.update.mockResolvedValue({});
    prisma.branch_users.create.mockResolvedValue({});
    prisma.branch_users.update.mockResolvedValue({});
    prisma.users.create.mockResolvedValue({});
    prisma.users.update.mockResolvedValue({});
    prisma.members.updateMany.mockResolvedValue({});
    prisma.db_logs.create.mockResolvedValue({});
  });

  it('rejects admin area access for branch-user tokens', async () => {
    await expect(service.handle({
      act: ADMIN_API_ACTION.ADMIN_BRANCH_LIST,
      content: {},
      caller: { br_code: 10, ucode: 1, url: 'Admin', user_type: 0 },
      ver: 1,
    })).rejects.toThrow(ForbiddenException);
  });

  it('allows branch-user list for system admins without caller branch scoping', async () => {
    await service.handle({
      act: ADMIN_API_ACTION.ADMIN_BRANCH_USER_LIST,
      content: { branchCode: 88, searchText: '' },
      caller: { br_code: 0, ucode: 1, url: 'Admin', user_type: 1 },
      ver: 1,
    });

    expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    const args = prisma.$queryRawUnsafe.mock.calls[0] as unknown[];
    expect(args[8]).toBe(88);
    expect(args[9]).toBe(88);
  });

  it('allows branch-user creation for system admins with explicit branch', async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ next_code: 101 }]);

    await service.handle({
      act: ADMIN_API_ACTION.ADMIN_BRANCH_USER_CREATE,
      content: {
        br_code: 22,
        user_name: 'new.user',
        member_code: 100,
        email: 'new@x.com',
        user_role: 2,
        sendReset: false,
      },
      caller: { br_code: 0, ucode: 1, url: 'Admin', user_type: 1 },
      ver: 1,
    });

    expect(prisma.branch_users.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ br_code: 22, user_name: 'new.user' }),
    }));
  });

  it('creates system admins from the users table', async () => {
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ next_code: 55 }]);

    await service.handle({
      act: ADMIN_API_ACTION.ADMIN_USER_CREATE,
      content: {
        user_name: 'sys.admin',
        full_names: 'System Admin',
        phone_no: '5551234',
        email: 'sys@example.com',
        user_role: 1,
        sendReset: false,
      },
      caller: { br_code: 0, ucode: 1, url: 'Super Admin', user_type: 1 },
      ver: 1,
    });

    expect(prisma.users.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        user_code: 55,
        user_name: 'sys.admin',
        full_names: 'System Admin',
      }),
    }));
  });

  it('triggers admin password resets through admin auth flow', async () => {
    prisma.users.findUnique.mockResolvedValue({ user_code: 77, user_name: 'sys.admin' });

    await service.handle({
      act: ADMIN_API_ACTION.ADMIN_USER_RESET_PASSWORD_REQUEST,
      content: { userCode: 77 },
      caller: { br_code: 0, ucode: 1, url: 'Admin', user_type: 1 },
      ver: 1,
    });

    expect(auth.requestPasswordResetForAdmin).toHaveBeenCalledWith(77, 1);
  });
});
