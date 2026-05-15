import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AUTH_API_ACTION } from '@shepherd/shared';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authMock = {
    login: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    getSystem2FaState: jest.fn(),
    setSystem2FaState: jest.fn(),
  } as unknown as jest.Mocked<AuthService>;

  const configMock = {
    get: jest.fn().mockReturnValue({
      expiresMin: 60,
      cookieName: 'shp_jwt',
      csrfCookieName: 'BS-XSRF-TOKEN',
      cookieSecure: false,
      cookieSameSite: 'lax',
    }),
  } as unknown as ConfigService;

  const controller = new AuthController(authMock, configMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns system 2FA state for AUTH_GET_SYSTEM_2FA', async () => {
    authMock.getSystem2FaState.mockResolvedValue({ enabled: true });

    const response = await controller.service(
      { act: AUTH_API_ACTION.AUTH_GET_SYSTEM_2FA } as never,
      { ucode: 1, url: 'Admin' } as never,
      {} as never,
      {} as never,
    );

    expect(authMock.getSystem2FaState).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({
      stat: 0,
      data: { enabled: true },
    });
  });

  it('blocks non-admin users from AUTH_SET_SYSTEM_2FA', async () => {
    await expect(controller.service(
      { act: AUTH_API_ACTION.AUTH_SET_SYSTEM_2FA, content: { enabled: true } } as never,
      { ucode: 2, url: 'User' } as never,
      {} as never,
      {} as never,
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(authMock.setSystem2FaState).not.toHaveBeenCalled();
  });
});
