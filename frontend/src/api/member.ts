import {
  HTTP_API_ACTION,
  type Family,
  type Member,
} from '@shepherd/shared';

import { call } from './envelope';

export const memberApi = {
  find: (searchText = ''): Promise<Member[] | undefined> =>
    call<Member[]>('member', HTTP_API_ACTION.MEMBER_FIND, { stxt: searchText }),

  get: (code: number): Promise<Member | undefined> =>
    call<Member>('member', HTTP_API_ACTION.MEMBER_GET, { code }),

  add: (member: Member): Promise<unknown> =>
    call('member', HTTP_API_ACTION.MEMBER_ADD, member),

  famFind: (searchText = ''): Promise<Family[] | undefined> =>
    call<Family[]>('member', HTTP_API_ACTION.MEMBER_FAM_FIND, { stxt: searchText }),

  famGet: (code: number): Promise<Family | undefined> =>
    call<Family>('member', HTTP_API_ACTION.MEMBER_FAM_GET, { code }),

  famAdd: (family: Family): Promise<unknown> =>
    call('member', HTTP_API_ACTION.MEMBER_FAM_ADD, family),
};
