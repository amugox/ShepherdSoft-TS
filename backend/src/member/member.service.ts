import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import {
  HTTP_API_ACTION,
  type Family,
  type Member,
  type SearchPayload,
} from '@shepherd/shared';

import { ApiRequestDto, RequestHeaderDto } from '../common/envelope/api-request.dto';
import { dispatch, type ActionMap } from '../common/envelope/action-dispatcher';
import { rawEnvelope } from '../common/envelope/api-response';
import { MemberSp } from '../db/sp/member.sp';

@Injectable()
export class MemberService {
  constructor(private readonly sp: MemberSp) {}

  handle(req: ApiRequestDto): Promise<unknown> {
    const handlers: ActionMap = {
      [HTTP_API_ACTION.MEMBER_FIND]: (r) => this.find(r.content as SearchPayload),
      [HTTP_API_ACTION.MEMBER_GET]: (r) => this.get(r.content as SearchPayload),
      [HTTP_API_ACTION.MEMBER_ADD]: (r) => this.add(r.content as Member, r.caller),
      [HTTP_API_ACTION.MEMBER_FAM_ADD]: (r) => this.addFamily(r.content as Family),
      [HTTP_API_ACTION.MEMBER_FAM_GET]: (r) => this.getFamily(r.content as SearchPayload),
      [HTTP_API_ACTION.MEMBER_FAM_FIND]: (r) => this.findFamilies(r.content as SearchPayload),
    };
    return dispatch(req, handlers);
  }

  private async find(p?: SearchPayload): Promise<unknown> {
    return this.sp.findMembers(p?.stxt ?? '');
  }

  private async get(p?: SearchPayload): Promise<unknown> {
    if (!p?.code) throw new BadRequestException('Missing member code.');
    return this.sp.getMember(p.code);
  }

  private async add(m?: Member, caller?: RequestHeaderDto | null): Promise<unknown> {
    if (!m) throw new BadRequestException('Missing member payload.');
    const branched: Member = {
      ...m,
      br_code: caller?.br_code ?? m.br_code ?? 0,
      mid:     m.mid ?? randomUUID().replace(/-/g, ''),
    };
    const row = await this.sp.createMember(branched);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to add member.' });
    }
    return rawEnvelope({ stat: 0, msg: row.resp_message });
  }

  private async addFamily(f?: Family): Promise<unknown> {
    if (!f) throw new BadRequestException('Missing family payload.');
    const row = await this.sp.createFamily(f);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to add family.' });
    }
    return rawEnvelope({ stat: 0, msg: row.resp_message });
  }

  private async getFamily(p?: SearchPayload): Promise<unknown> {
    if (!p?.code) throw new BadRequestException('Missing family code.');
    return this.sp.getFamily(p.code);
  }

  private async findFamilies(p?: SearchPayload): Promise<unknown> {
    return this.sp.findFamilies(p?.stxt ?? '');
  }
}
