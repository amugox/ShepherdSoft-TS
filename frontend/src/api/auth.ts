import {
  AUTH_API_ACTION,
  type ChangePasswordPayload,
  type SetSystem2FaPayload,
  type System2FaState,
  type UserData,
  type UserLoginPayload,
} from '@shepherd/shared';

import { call, callLogin } from './envelope';

export const authApi = {
  login: (payload: UserLoginPayload): Promise<UserData> => callLogin<UserData>(payload),

  changePassword: (payload: ChangePasswordPayload): Promise<unknown> =>
    call('auth', AUTH_API_ACTION.AUTH_CHANGE_PASS, payload),

  logout: (): Promise<unknown> => call('auth', AUTH_API_ACTION.AUTH_LOGOUT),

  getSystem2FaState: (): Promise<System2FaState | undefined> =>
    call<System2FaState>('auth', AUTH_API_ACTION.AUTH_GET_SYSTEM_2FA),

  setSystem2FaState: (payload: SetSystem2FaPayload): Promise<System2FaState | undefined> =>
    call<System2FaState>('auth', AUTH_API_ACTION.AUTH_SET_SYSTEM_2FA, payload),
};
