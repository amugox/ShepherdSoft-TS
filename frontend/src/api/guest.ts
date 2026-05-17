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
} from '@shepherd/shared';

import { call } from './envelope';

export const guestApi = {
  find: (filter: GuestFilter): Promise<GuestPagedResult | undefined> =>
    call<GuestPagedResult>('guest', HTTP_API_ACTION.GUEST_FIND, filter),

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

  findFollowUps: (guestCode = 0): Promise<GuestFollowUp[] | undefined> =>
    call<GuestFollowUp[]>('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_FIND, { code: guestCode }),

  completeFollowUp: (payload: GuestFollowUpCompletePayload): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_COMPLETE, payload),

  cancelFollowUp: (code: number): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_CANCEL, { code }),

  rescheduleFollowUp: (payload: GuestFollowUpReschedulePayload): Promise<unknown> =>
    call('guest', HTTP_API_ACTION.GUEST_FOLLOWUP_RESCHEDULE, payload),
};
