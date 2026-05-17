import { BadRequestException } from '@nestjs/common';

import { HTTP_API_ACTION } from '@shepherd/shared';

import { FollowUpSp } from '../db/sp/followup.sp';
import { GuestSp } from '../db/sp/guest.sp';
import { GuestService } from './guest.service';

describe('GuestService branch isolation', () => {
  let service: GuestService;
  let guests: jest.Mocked<Pick<GuestSp, 'findGuests' | 'getGuest' | 'createGuest' | 'updateGuest' | 'promoteToMember' | 'getStats' | 'deleteGuest'>>;
  let followups: jest.Mocked<Pick<FollowUpSp, 'addFollowUp' | 'findByGuest' | 'findPending' | 'completeFollowUp' | 'cancelFollowUp' | 'rescheduleFollowUp'>>;
  type GuestRequest = Parameters<GuestService['handle']>[0];

  beforeEach(() => {
    guests = {
      findGuests:     jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, page_size: 100 }),
      getGuest:       jest.fn().mockResolvedValue(null),
      createGuest:    jest.fn(),
      updateGuest:    jest.fn().mockResolvedValue(true),
      promoteToMember: jest.fn(),
      getStats:       jest.fn().mockResolvedValue({ guests_mo: 0, pending_fu: 0, overdue_fu: 0, promoted_mo: 0, response_rate: 0, conversion_rate: 0 }),
      deleteGuest:    jest.fn(),
    };
    followups = {
      addFollowUp:          jest.fn(),
      findByGuest:          jest.fn(),
      findPending:          jest.fn(),
      completeFollowUp:     jest.fn(),
      cancelFollowUp:       jest.fn(),
      rescheduleFollowUp:   jest.fn().mockResolvedValue(true),
    };
    service = new GuestService(guests as unknown as GuestSp, followups as unknown as FollowUpSp);
  });

  it('scopes guest find to caller branch for non-super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_FIND,
      content: { stxt: 'john' },
      caller: { br_code: 10, url: 'Admin' },
    } as unknown as GuestRequest);

    expect(guests.findGuests).toHaveBeenCalledWith({ stxt: 'john' }, 10);
  });

  it('allows cross-branch guest find for super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_FIND,
      content: { stxt: 'john' },
      caller: { br_code: 10, url: 'Super Admin' },
    } as unknown as GuestRequest);

    expect(guests.findGuests).toHaveBeenCalledWith({ stxt: 'john' }, undefined);
  });

  it('rejects guest get when non-super-admin caller branch is missing', async () => {
    await expect(
      service.handle({
        act: HTTP_API_ACTION.GUEST_GET,
        content: { code: 1 },
        caller: { br_code: 0, url: 'Admin' },
      } as unknown as GuestRequest),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes getStats to caller branch for non-super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_GET_STATS,
      content: {},
      caller: { br_code: 5, url: 'Admin' },
    } as unknown as GuestRequest);

    expect(guests.getStats).toHaveBeenCalledWith(5);
  });

  it('passes undefined branch to getStats for super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_GET_STATS,
      content: {},
      caller: { br_code: 5, url: 'Super Admin' },
    } as unknown as GuestRequest);

    expect(guests.getStats).toHaveBeenCalledWith(undefined);
  });

  it('scopes pending follow-ups to caller branch for non-super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_FOLLOWUP_FIND,
      content: { code: 0 },
      caller: { br_code: 7, url: 'Admin' },
    } as unknown as GuestRequest);

    expect(followups.findPending).toHaveBeenCalledWith(7);
  });

  it('scopes guest update to caller branch for non-super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_UPDATE,
      content: { code: 42, fname: 'Updated', vdt: '2024-01-01' },
      caller: { br_code: 10, url: 'Admin' },
    } as unknown as GuestRequest);

    expect(guests.updateGuest).toHaveBeenCalledWith(42, expect.objectContaining({ fname: 'Updated' }), 10);
  });
});
