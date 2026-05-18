import {
  HTTP_API_ACTION,
  type Family,
  type Member,
  type PageResult,
  type SearchPayload,
} from '@shepherd/shared';

import { call } from './envelope';

export const memberApi = {
  find: (payload: SearchPayload = {}): Promise<PageResult<Member> | undefined> =>
    call<PageResult<Member>>('member', HTTP_API_ACTION.MEMBER_FIND, payload),

  get: (code: number): Promise<Member | undefined> =>
    call<Member>('member', HTTP_API_ACTION.MEMBER_GET, { code }),

  add: (member: Member): Promise<unknown> =>
    call('member', HTTP_API_ACTION.MEMBER_ADD, member),

  famFind: (payload: SearchPayload = {}): Promise<PageResult<Family> | undefined> =>
    call<PageResult<Family>>('member', HTTP_API_ACTION.MEMBER_FAM_FIND, payload),

  famGet: (code: number): Promise<Family | undefined> =>
    call<Family>('member', HTTP_API_ACTION.MEMBER_FAM_GET, { code }),

  famAdd: (family: Family): Promise<unknown> =>
    call('member', HTTP_API_ACTION.MEMBER_FAM_ADD, family),
};
