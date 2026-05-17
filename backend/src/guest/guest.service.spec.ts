import { BadRequestException } from '@nestjs/common';

import { HTTP_API_ACTION } from '@shepherd/shared';

import { FollowUpSp } from '../db/sp/followup.sp';
import { GuestSp } from '../db/sp/guest.sp';
import { GuestService } from './guest.service';

describe('GuestService branch isolation', () => {
  let service: GuestService;
  let guests: jest.Mocked<Pick<GuestSp, 'findGuests' | 'getGuest' | 'createGuest' | 'promoteToMember' | 'getStats' | 'deleteGuest'>>;
  let followups: jest.Mocked<Pick<FollowUpSp, 'addFollowUp' | 'findByGuest' | 'findPending' | 'completeFollowUp' | 'cancelFollowUp'>>;

  beforeEach(() => {
    guests = {
      findGuests: jest.fn().mockResolvedValue([]),
      getGuest: jest.fn().mockResolvedValue(null),
      createGuest: jest.fn(),
      promoteToMember: jest.fn(),
      getStats: jest.fn(),
      deleteGuest: jest.fn(),
    };
    followups = {
      addFollowUp: jest.fn(),
      findByGuest: jest.fn(),
      findPending: jest.fn(),
      completeFollowUp: jest.fn(),
      cancelFollowUp: jest.fn(),
    };
    service = new GuestService(guests as unknown as GuestSp, followups as unknown as FollowUpSp);
  });

  it('scopes guest find to caller branch for non-super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_FIND,
      content: { stxt: 'john' },
      caller: { br_code: 10, url: 'Admin' },
    } as any);

    expect(guests.findGuests).toHaveBeenCalledWith({ stxt: 'john' }, 10);
  });

  it('allows cross-branch guest find for super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.GUEST_FIND,
      content: { stxt: 'john' },
      caller: { br_code: 10, url: 'Super Admin' },
    } as any);

    expect(guests.findGuests).toHaveBeenCalledWith({ stxt: 'john' }, undefined);
  });

  it('rejects guest get when non-super-admin caller branch is missing', async () => {
    await expect(
      service.handle({
        act: HTTP_API_ACTION.GUEST_GET,
        content: { code: 1 },
        caller: { br_code: 0, url: 'Admin' },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
