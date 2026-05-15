import {
  USER_API_ACTION,
  type UserAdminCreatePayload,
  type UserAdminGetPayload,
  type UserAdminListPayload,
  type UserAdminRecord,
  type UserAdminUpdatePayload,
  type UserRoleItem,
} from '@shepherd/shared';

import { call } from './envelope';

export const userApi = {
  list: (payload: UserAdminListPayload): Promise<UserAdminRecord[] | undefined> =>
    call<UserAdminRecord[]>('user', USER_API_ACTION.USER_LIST, payload),

  get: (payload: UserAdminGetPayload): Promise<UserAdminRecord | undefined> =>
    call<UserAdminRecord>('user', USER_API_ACTION.USER_GET, payload),

  create: (payload: UserAdminCreatePayload): Promise<unknown> =>
    call('user', USER_API_ACTION.USER_CREATE, payload),

  update: (payload: UserAdminUpdatePayload): Promise<unknown> =>
    call('user', USER_API_ACTION.USER_UPDATE, payload),

  deactivate: (userCode: number): Promise<unknown> =>
    call('user', USER_API_ACTION.USER_DEACTIVATE, { user_code: userCode }),

  triggerReset: (userCode: number): Promise<unknown> =>
    call('user', USER_API_ACTION.USER_RESET_PASSWORD_REQUEST, { userCode }),

  listRoles: (): Promise<UserRoleItem[] | undefined> =>
    call<UserRoleItem[]>('user', USER_API_ACTION.USER_ROLES_LIST),
};
