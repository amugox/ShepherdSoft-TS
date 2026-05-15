import { Injectable } from '@nestjs/common';

import type { ListGroupItem, ListItem } from '@shepherd/shared';

import { MySqlService } from '../mysql.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DataSp {
  constructor(
    private readonly mysql: MySqlService,
    private readonly prisma: PrismaService,
  ) {}

  /** bfp_GetListData(p_Type, p_ItemCode) → [{ itemvalue, itemname }]. */
  async getList(type: number, itemCode: number): Promise<ListItem[]> {
    const rows = await this.mysql.call<Record<string, unknown>>('bfp_GetListData', [type, itemCode]);
    return rows.map((r) => ({
      itemvalue: Number((r.ItemValue ?? r.itemvalue) as number),
      itemname:  String(r.ItemName ?? r.itemname ?? ''),
    }));
  }

  /** bfp_GetListGroup(p_Type, p_ItemCode) → [{ groupcode, itemvalue, itemname }]. */
  async getListGroup(type: number, itemCode: number): Promise<ListGroupItem[]> {
    const rows = await this.mysql.call<Record<string, unknown>>('bfp_GetListGroup', [type, itemCode]);
    return rows.map((r) => ({
      groupcode: Number((r.GroupCode ?? r.groupcode) as number),
      itemvalue: Number((r.ItemValue ?? r.itemvalue) as number),
      itemname:  String(r.ItemName ?? r.itemname ?? ''),
    }));
  }

  /** fn_GenMemberNo(p_BrCode) — utility scalar function. */
  async genMemberNo(brCode: number): Promise<string> {
    const rows = await this.prisma.$queryRawUnsafe(
      'SELECT fn_GenMemberNo(?) AS no',
      brCode,
    ) as Array<{ no: string }>;
    return rows[0]?.no ?? '';
  }
}
