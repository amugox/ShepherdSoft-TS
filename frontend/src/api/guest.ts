import {
  HTTP_API_ACTION,
  type Guest,
  type GuestFilter,
  type GuestFollowUp,
  type GuestFollowUpCompletePayload,
  type GuestFollowUpPayload,
  type GuestFollowUpReschedulePayload,
  type GuestPagedResult,
  type GuestPromotePayload,
  type GuestStats,
  type PageResult,
  type SearchPayload,
} from '@shepherd/shared';

import { call } from './envelope';

export const guestApi = {
<<<<<<< HEAD
  find: (filter: GuestFilter): Promise<GuestPagedResult | undefined> =>
    call<GuestPagedResult>('guest', HTTP_API_ACTION.GUEST_FIND, filter),
=======
  find: (filter: GuestFilter): Promise<PageResult<Guest> | undefined> =>
    call<PageResult<Guest>>('guest', HTTP_API_ACTION.GUEST_FIND, filter),
>>>>>>> a7445f1 (feat: add server-side pagination to DataTable list views)

  get: (code: number): Promise<Guest | undefined> =>
    call<Guest>('guest', HTTP_API_ACTION.GUEST_GET, { code }),

  add: (guest: Guest): Promise<unknown> => call('guest', HTTP_API_ACTION.GUEST_ADD, guest),

  update: (code: number, guest: Guest): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_UPDATE, { ...guest, code }),

  stats: (): Promise<GuestStats | undefined> =>
    call<GuestStats>('guest', HTTP_API_ACTION.GUEST_GET_STATS),

  remove: (code: number): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_DELETE, { code }),

  promote: (payload: GuestPromotePayload): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_PROMOTE, payload),

  addFollowUp: (payload: GuestFollowUpPayload): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_ADD, payload),

  findFollowUps: (payload: SearchPayload = { code: 0 }): Promise<PageResult<GuestFollowUp> | undefined> =>
    call<PageResult<GuestFollowUp>>('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_FIND, payload),

  completeFollowUp: (payload: GuestFollowUpCompletePayload): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_COMPLETE, payload),

  cancelFollowUp: (code: number): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_CANCEL, { code }),

  rescheduleFollowUp: (payload: GuestFollowUpReschedulePayload): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_RESCHEDULE, payload),
};
