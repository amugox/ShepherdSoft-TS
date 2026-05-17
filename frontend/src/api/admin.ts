import {
  ADMIN_API_ACTION,
  type BranchAdminCreatePayload,
  type BranchAdminDeactivatePayload,
  type BranchAdminGetPayload,
  type BranchAdminListPayload,
  type BranchAdminRecord,
  type BranchAdminUpdatePayload,
  type UserAdminCreatePayload,
  type UserAdminDeactivatePayload,
  type UserAdminGetPayload,
  type UserAdminListPayload,
  type UserAdminRecord,
  type UserAdminUpdatePayload,
  type UserRoleItem,
} from '@shepherd/shared';

import { call } from './envelope';

export const adminApi = {
  listBranches: (payload: BranchAdminListPayload = { includeInactive: true }): Promise<BranchAdminRecord[] | undefined> =>
    call<BranchAdminRecord[]>('admin', ADMIN_API_ACTION.ADMIN_BRANCH_LIST, payload),

  getBranch: (payload: BranchAdminGetPayload): Promise<BranchAdminRecord | undefined> =>
    call<BranchAdminRecord>('admin', ADMIN_API_ACTION.ADMIN_BRANCH_GET, payload),

  createBranch: (payload: BranchAdminCreatePayload): Promise<unknown> =>
    call('admin', ADMIN_API_ACTION.ADMIN_BRANCH_CREATE, payload),

  updateBranch: (payload: BranchAdminUpdatePayload): Promise<unknown> =>
    call('admin', ADMIN_API_ACTION.ADMIN_BRANCH_UPDATE, payload),

  deactivateBranch: (payload: BranchAdminDeactivatePayload): Promise<unknown> =>
    call('admin', ADMIN_API_ACTION.ADMIN_BRANCH_DEACTIVATE, payload),

  listBranchUsers: (payload: UserAdminListPayload): Promise<UserAdminRecord[] | undefined> =>
    call<UserAdminRecord[]>('admin', ADMIN_API_ACTION.ADMIN_BRANCH_USER_LIST, payload),

  getBranchUser: (payload: UserAdminGetPayload): Promise<UserAdminRecord | undefined> =>
    call<UserAdminRecord>('admin', ADMIN_API_ACTION.ADMIN_BRANCH_USER_GET, payload),

  createBranchUser: (payload: UserAdminCreatePayload): Promise<unknown> =>
    call('admin', ADMIN_API_ACTION.ADMIN_BRANCH_USER_CREATE, payload),

  updateBranchUser: (payload: UserAdminUpdatePayload): Promise<unknown> =>
    call('admin', ADMIN_API_ACTION.ADMIN_BRANCH_USER_UPDATE, payload),

  deactivateBranchUser: (payload: UserAdminDeactivatePayload): Promise<unknown> =>
    call('admin', ADMIN_API_ACTION.ADMIN_BRANCH_USER_DEACTIVATE, payload),

  triggerBranchUserReset: (userCode: number): Promise<unknown> =>
    call('admin', ADMIN_API_ACTION.ADMIN_BRANCH_USER_RESET_PASSWORD_REQUEST, { userCode }),

  listRoles: (): Promise<UserRoleItem[] | undefined> =>
    call<UserRoleItem[]>('admin', ADMIN_API_ACTION.ADMIN_BRANCH_USER_ROLES_LIST),
};
