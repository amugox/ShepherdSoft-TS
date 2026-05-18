import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { hashPassword } from './crypto';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const makeService = () => {
    const security = {
      verifyUser: jest.fn(),
      verifyUserByCode: jest.fn(),
      userLogin: jest.fn(),
      userLoginOnConn: jest.fn(),
      changeUserPwd: jest.fn(),
    };
    const tokens = {
      createToken: jest.fn().mockReturnValue('jwt-token'),
    };
    const prisma = {
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn(),
      app_setts: {
        findUnique: jest.fn().mockResolvedValue({ item_val: '0' }),
        upsert: jest.fn(),
      },
      user_sessions: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      users: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      db_logs: {
        create: jest.fn(),
      },
    };
    // $transaction runs the callback with the same mock acting as the tx client.
    prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(prisma));
    const mail = {
      sendOtpCode: jest.fn().mockResolvedValue(true),
      sendPasswordResetCode: jest.fn().mockResolvedValue(true),
    };
    const mysql = {
      withNamedLock: jest.fn().mockImplementation(
        (_name: string, fn: (conn: object) => unknown) => fn({}),
      ),
    };

    const service = new AuthService(
      security as never,
      tokens as never,
      prisma as never,
      mail as never,
      mysql as never,
    );

    return { service, security, tokens, prisma, mail };
  };

  it('requires a branch for branch-user logins', async () => {
    const { service } = makeService();

    await expect(service.login({ Username: 'branch.user', Password: 'secret' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('logs branch users in through the branch-user security flow', async () => {
    const { service, security, tokens } = makeService();
    const salt = 'branch-salt';
    security.verifyUser.mockResolvedValue({ resp_status: 0, data1: 10, data2: hashPassword('secret', salt), data3: salt });
    security.userLoginOnConn.mockResolvedValue({ resp_status: 0, data1: 'Branch User', data2: '2', data3: '0', data4: 'Main' });

    const result = await service.login({ Username: 'branch.user', Password: 'secret', BranchCode: 8 });

    expect(security.verifyUser).toHaveBeenCalledWith('branch.user', 8);
    expect(tokens.createToken).toHaveBeenCalledWith(expect.objectContaining({ UserCode: 10, BranchCode: 8, UserType: 0 }));
    expect(result.user).toMatchObject({ ucode: 10, br_code: 8, user_type: 0 });
  });

  it('logs system admins in from the users table without a branch', async () => {
    const { service, prisma, tokens } = makeService();
    const salt = 'admin-salt';
    prisma.users.findUnique.mockResolvedValue({
      user_code: 44,
      user_name: 'sys.admin',
      full_names: 'System Admin',
      email: 'sys@example.com',
      pwd: hashPassword('secret', salt),
      salt,
      user_stat: 0,
      user_role: 1,
      change_pwd: false,
    });
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{
        user_code: 44,
        user_type: 1,
        br_code: 0,
        user_name: 'sys.admin',
        member_code: null,
        email: 'sys@example.com',
        full_name: 'System Admin',
        user_role: 1,
      }])
      .mockResolvedValueOnce([{ next_code: 91 }]);

    const result = await service.login({ Username: 'sys.admin', Password: 'secret', AdminOnly: true });

    expect(prisma.users.findUnique).toHaveBeenCalledWith({ where: { user_name: 'sys.admin' } });
    expect(prisma.user_sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ user_code: 44, user_type: 1 }),
    }));
    expect(tokens.createToken).toHaveBeenCalledWith(expect.objectContaining({ UserCode: 44, BranchCode: 0, UserType: 1 }));
    expect(result.user).toMatchObject({ ucode: 44, br_code: 0, user_type: 1 });
  });

  it('routes admin password reset requests to the users table', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRawUnsafe.mockResolvedValueOnce([
      {
        user_code: 44,
        user_type: 1,
        br_code: 0,
        user_name: 'sys.admin',
        member_code: null,
        email: 'sys@example.com',
        full_name: 'System Admin',
        user_role: 1,
      },
    ]);

    await service.requestPasswordReset({ userNameOrEmail: 'sys.admin', adminOnly: true });

    expect(prisma.$queryRawUnsafe.mock.calls[0]?.[0]).toContain('FROM users u');
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
  });

  it('rejects invalid admin passwords', async () => {
    const { service, prisma } = makeService();
    prisma.users.findUnique.mockResolvedValue({
      user_code: 44,
      user_name: 'sys.admin',
      full_names: 'System Admin',
      email: 'sys@example.com',
      pwd: hashPassword('secret', 'admin-salt'),
      salt: 'admin-salt',
      user_stat: 0,
      user_role: 1,
      change_pwd: false,
    });

    await expect(service.login({ Username: 'sys.admin', Password: 'wrong', AdminOnly: true })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { user_code: 44 },
      data: { attempts: { increment: 1 } },
    });
  });

  it('rejects login for a locked-out admin even with the correct password', async () => {
    const { service, prisma } = makeService();
    prisma.users.findUnique.mockResolvedValue({
      user_code: 44,
      user_name: 'sys.admin',
      full_names: 'System Admin',
      email: 'sys@example.com',
      pwd: hashPassword('secret', 'admin-salt'),
      salt: 'admin-salt',
      user_stat: 0,
      user_role: 1,
      change_pwd: false,
      attempts: 5,
    });

    await expect(
      service.login({ Username: 'sys.admin', Password: 'secret', AdminOnly: true }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    // Locked out before the password is even checked — no increment.
    expect(prisma.users.update).not.toHaveBeenCalled();
  });
});
