import { Injectable } from '@nestjs/common';

import type { MessagingRecipient } from '@shepherd/shared';

import { PrismaService } from '../prisma.service';

@Injectable()
export class MessagingSp {
  constructor(private readonly prisma: PrismaService) {}

  async findFellowshipRecipients(fellowshipCodes: number[], branchCode = 0): Promise<MessagingRecipient[]> {
    if (!fellowshipCodes.length) return [];
    const placeholders = fellowshipCodes.map(() => '?').join(', ');
    const branchFilter = branchCode > 0 ? 'AND br_code = ?' : '';
    const args: unknown[] = [...fellowshipCodes];
    if (branchCode > 0) args.push(branchCode);

    const rows = await this.prisma.$queryRawUnsafe(
      `
      SELECT
        member_code AS mcode,
        grp_code AS fcode,
        grp_name AS fname,
        phone_no AS pno,
        TRIM(CONCAT_WS(' ', first_name, other_names, comm_name)) AS mname
      FROM vw_members
      WHERE grp_code IN (${placeholders})
        ${branchFilter}
        AND phone_no IS NOT NULL
        AND TRIM(phone_no) <> ''
      ORDER BY grp_name, first_name, other_names
      `,
      ...args,
    ) as Array<{
      mcode: number | string;
      fcode: number | string;
      fname: string | null;
      pno: string;
      mname: string | null;
    }>;

    return rows.map((row) => ({
      pno: row.pno,
      source: 'fellowship',
      mcode: Number(row.mcode),
      mname: row.mname ?? '',
      fcode: Number(row.fcode),
      fname: row.fname ?? '',
    }));
  }
}
