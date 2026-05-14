import {
  AUTH_API_ACTION,
  type ChangePasswordPayload,
  type UserData,
  type UserLoginPayload,
} from '@shepherd/shared';

import { call, callLogin } from './envelope';

export const authApi = {
  login: (payload: UserLoginPayload): Promise<UserData> => callLogin<UserData>(payload),

  changePassword: (payload: ChangePasswordPayload): Promise<unknown> =>
    call('auth', AUTH_API_ACTION.AUTH_CHANGE_PASS, payload),

  logout: (): Promise<unknown> => call('auth', AUTH_API_ACTION.AUTH_LOGOUT),
};
