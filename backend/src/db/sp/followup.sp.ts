import { Injectable } from '@nestjs/common';

import type { GuestFollowUp, GuestFollowUpPayload, PageResult, SearchPayload } from '@shepherd/shared';

import { clampPage, pageResult } from '../page';
import { MySqlService } from '../mysql.service';
import { PrismaService } from '../prisma.service';
import { normRow, normRows, type SpRow } from './types';

const FU_SELECT = `
  SELECT
    followup_code      AS code,
    guest_code         AS g_code,
    followup_type      AS ftype,
    followup_date      AS fdt,
    followup_status    AS fstat,
    guest_responded    AS responded,
    outcome            AS outcome,
    notes              AS notes,
    reg_date           AS rdt,
    done_date          AS done_dt,
    assigned_to        AS assigned_to,
    assigned_to_name   AS assigned_name,
    guest_first_name   AS fname,
    guest_other_names  AS onames,
    guest_phone        AS pno,
    no_response_streak AS streak
  FROM vw_guestfollowups
`;

@Injectable()
export class FollowUpSp {
  constructor(
    private readonly mysql: MySqlService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * sp_AddGuestFollowUp(p_GuestCode, p_Type, p_Date, p_Notes, p_AssignedTo, p_AssignedToName)
   * Success and error branches emit columns in different orders — mysql2's
   * named-column return preserves both correctly.
   */
  async addFollowUp(p: GuestFollowUpPayload): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_AddGuestFollowUp', [
      p.g_code,
      p.ftype,
      p.fdt,
      p.notes ?? null,
      p.assigned_to,
      null, // assigned-to-name resolved server-side
    ]);
    return normRow<SpRow>(row);
  }

  /** sp_CompleteGuestFollowUp(p_Code, p_Responded, p_Outcome). */
  async completeFollowUp(
    code: number,
    responded: boolean,
    outcome?: string,
  ): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_CompleteGuestFollowUp', [
      code,
      responded,
      outcome ?? null,
    ]);
    return normRow<SpRow>(row);
  }

  /** sp_CancelGuestFollowUp(p_Code). */
  async cancelFollowUp(code: number): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_CancelGuestFollowUp', [code]);
    return normRow<SpRow>(row);
  }

  /** Reschedule a pending follow-up to a new date, with optional reassignment. */
  async rescheduleFollowUp(
    code: number,
    newDate: string,
    assignedTo?: number,
  ): Promise<boolean> {
    const data: { followup_date: Date; assigned_to?: number } = {
      followup_date: new Date(newDate),
    };
    if (assignedTo !== undefined && assignedTo > 0) {
      data.assigned_to = assignedTo;
    }
    const result = await this.prisma.guest_follow_ups.updateMany({
      where: { followup_code: code, followup_status: 0 },
      data,
    });
    return result.count > 0;
  }

  async findByGuest(guestCode: number): Promise<GuestFollowUp[]> {
    const rows = await this.prisma.$queryRawUnsafe(
      `${FU_SELECT} WHERE guest_code = ? ORDER BY followup_date DESC, followup_code DESC`,
      guestCode,
    ) as unknown[];
    return normRows<GuestFollowUp>(rows) as GuestFollowUp[];
  }

<<<<<<< HEAD
  async findPending(branchCode?: number): Promise<GuestFollowUp[]> {
    const rows = await this.prisma.$queryRawUnsafe(
      `${FU_SELECT}
       WHERE followup_status = 0
         AND (? IS NULL OR guest_code IN (
           SELECT guest_code FROM guests WHERE br_code = ?
         ))
       ORDER BY followup_date ASC, followup_code ASC
       LIMIT 200`,
      branchCode ?? null,
      branchCode ?? null,
    ) as unknown[];
    return normRows<GuestFollowUp>(rows) as GuestFollowUp[];
=======
  async findPending(p?: SearchPayload): Promise<PageResult<GuestFollowUp>> {
    const clamped = clampPage(p);
    const WHERE = `WHERE followup_status = 0`;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRawUnsafe(
        `${FU_SELECT} ${WHERE}
         ORDER BY followup_date ASC, followup_code ASC
         LIMIT ? OFFSET ?`,
        clamped.pageSize,
        clamped.offset,
      ) as Promise<unknown[]>,
      this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS total FROM vw_guestfollowups ${WHERE}`,
      ) as Promise<unknown[]>,
    ]);

    const total = Number((countRows[0] as { total?: bigint | number })?.total ?? 0);
    return pageResult(normRows<GuestFollowUp>(rows) as GuestFollowUp[], total, clamped);
>>>>>>> a7445f1 (feat: add server-side pagination to DataTable list views)
  }
}
