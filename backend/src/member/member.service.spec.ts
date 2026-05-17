import { BadRequestException } from '@nestjs/common';

import { HTTP_API_ACTION } from '@shepherd/shared';

import { MemberSp } from '../db/sp/member.sp';
import { MemberService } from './member.service';

describe('MemberService branch isolation', () => {
  let service: MemberService;
  let sp: jest.Mocked<Pick<MemberSp, 'findMembers' | 'getMember' | 'createMember' | 'createFamily' | 'getFamily' | 'findFamilies'>>;

  beforeEach(() => {
    sp = {
      findMembers: jest.fn().mockResolvedValue([]),
      getMember: jest.fn().mockResolvedValue(null),
      createMember: jest.fn(),
      createFamily: jest.fn(),
      getFamily: jest.fn().mockResolvedValue(null),
      findFamilies: jest.fn().mockResolvedValue([]),
    };
    service = new MemberService(sp as unknown as MemberSp);
  });

  it('scopes member find to caller branch for non-super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.MEMBER_FIND,
      content: { stxt: 'john' },
      caller: { br_code: 10, url: 'Admin' },
    } as any);

    expect(sp.findMembers).toHaveBeenCalledWith('john', 10);
  });

  it('scopes family find to caller branch for non-super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.MEMBER_FAM_FIND,
      content: { stxt: 'fam' },
      caller: { br_code: 22, url: 'Admin' },
    } as any);

    expect(sp.findFamilies).toHaveBeenCalledWith('fam', 22);
  });

  it('allows cross-branch member get for super-admin', async () => {
    await service.handle({
      act: HTTP_API_ACTION.MEMBER_GET,
      content: { code: 9 },
      caller: { br_code: 10, url: 'Super Admin' },
    } as any);

    expect(sp.getMember).toHaveBeenCalledWith(9, undefined);
  });

  it('rejects family get when non-super-admin caller branch is missing', async () => {
    await expect(
      service.handle({
        act: HTTP_API_ACTION.MEMBER_FAM_GET,
        content: { code: 3 },
        caller: { br_code: 0, url: 'Admin' },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
