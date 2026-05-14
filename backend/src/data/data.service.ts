import { BadRequestException, Injectable } from '@nestjs/common';

import { HTTP_API_ACTION, type SearchPayload } from '@shepherd/shared';

import { ApiRequestDto } from '../common/envelope/api-request.dto';
import { dispatch, type ActionMap } from '../common/envelope/action-dispatcher';
import { DataSp } from '../db/sp/data.sp';

@Injectable()
export class DataService {
  constructor(private readonly sp: DataSp) {}

  handle(req: ApiRequestDto): Promise<unknown> {
    const handlers: ActionMap = {
      [HTTP_API_ACTION.DATA_GET_LIST]: (r) => this.getList(r.content as SearchPayload),
      [HTTP_API_ACTION.DATA_GET_LIST_GROUP]: (r) => this.getListGroup(r.content as SearchPayload),
    };
    return dispatch(req, handlers);
  }

  private async getList(payload?: SearchPayload): Promise<unknown> {
    if (!payload || payload.typ === undefined) {
      throw new BadRequestException('Missing list type.');
    }
    return this.sp.getList(payload.typ, payload.code ?? 0);
  }

  private async getListGroup(payload?: SearchPayload): Promise<unknown> {
    if (!payload || payload.typ === undefined) {
      throw new BadRequestException('Missing list group type.');
    }
    return this.sp.getListGroup(payload.typ, payload.code ?? 0);
  }
}
