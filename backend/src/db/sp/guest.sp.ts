import { Injectable } from '@nestjs/common';

import type { Guest, GuestFilter, GuestPromotePayload, GuestStats } from '@shepherd/shared';

import { MySqlService } from '../mysql.service';
import { PrismaService } from '../prisma.service';
import { normRow, normRows, type SpRow } from './types';

const GUEST_SELECT = `
  SELECT
    guest_code        AS code,
    guest_id          AS gid,
    br_code           AS br_code,
    u_code            AS u_code,
    is_returning      AS returning,
    first_name        AS fname,
    other_names       AS onames,
    phone_no          AS pno,
    email             AS email,
    gender            AS gdr,
    grp_code          AS grp_code,
    phy_address       AS padd,
    heard_via         AS heard,
    heard_via_remarks AS heard_rmk,
    visit_date        AS vdt,
    place_origin      AS porigin,
    born_again        AS ba,
    sprt_stage        AS sstage,
    visit_type        AS vtype,
    origin_ref        AS oref,
    ministry          AS ministry,
    comments          AS remarks,
    feedback          AS feedback,
    needs_follow_up   AS followup,
    follow_up_date    AS followup_dt,
    reg_date          AS rdt,
    is_promoted       AS promoted,
    visit_count       AS visit_count,
    br_name           AS br_name,
    reg_by            AS reg_by,
    grp_name          AS grp_name
  FROM vw_guests
`;

@Injectable()
export class GuestSp {
  constructor(
    private readonly mysql: MySqlService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * sp_CreateGuest(24) — see information_schema for the exact param list.
   * Success returns `(resp_code, resp_status, resp_message)`;
   * Error returns `(resp_status, resp_message, resp_code)`.
   * mysql2 preserves the names, so either order parses identically.
   */
  async createGuest(g: Guest): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_CreateGuest', [
      g.gid ?? null,
      g.br_code ?? 0,
      g.u_code ?? 0,
      g.fname,
      g.onames ?? null,
      g.pno ?? null,
      g.email ?? null,
      g.returning ?? false,
      g.gdr ?? 0,
      g.grp_code ?? 0,
      g.padd ?? null,
      g.heard ?? 0,
      g.heard_rmk ?? null,
      g.vdt,
      g.porigin ?? null,
      g.ba ?? 0,
      g.sstage ?? 0,
      g.vtype ?? 0,
      g.oref ?? null,
      g.ministry ?? null,
      g.remarks ?? null,
      g.feedback ?? null,
      g.followup ?? false,
      g.followup_dt ?? null,
    ]);
    return normRow<SpRow>(row);
  }

  /** sp_PromoteGuestToMember(p_GuestCode, p_ID, p_CommName, p_Grp, p_Dob, p_JoinDate). */
  async promoteToMember(p: GuestPromotePayload, memberId: string): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_PromoteGuestToMember', [
      p.g_code,
      memberId,
      p.cname,
      p.grp,
      p.dob,
      p.jdt,
    ]);
    return normRow<SpRow>(row);
  }

  /** sp_DeleteGuest(p_GuestCode). */
  async deleteGuest(code: number): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_DeleteGuest', [code]);
    return normRow<SpRow>(row);
  }

  async getGuest(code: number, branchCode?: number): Promise<Guest | null> {
    const rows = await this.prisma.$queryRawUnsafe(
      `${GUEST_SELECT} WHERE guest_code = ? ${typeof branchCode === 'number' ? 'AND br_code = ?' : ''} LIMIT 1`,
      code,
      ...(typeof branchCode === 'number' ? [branchCode] : []),
    ) as unknown[];
    return (normRows<Guest>(rows)[0] as Guest) ?? null;
  }

  async findGuests(f: GuestFilter, branchCode?: number): Promise<Guest[]> {
    const stxt = f.stxt ?? '';
    const like = `%${stxt}%`;
    const vtype = f.vtype ?? null;
    const sstage = f.sstage ?? null;
    const fuStat = f.fu_stat ?? null;

    const rows = await this.prisma.$queryRawUnsafe(
      `
      SELECT g.*
      FROM (${GUEST_SELECT}) g
      LEFT JOIN (
        SELECT guest_code, MAX(followup_status) AS latest_status
        FROM guest_follow_ups
        GROUP BY guest_code
      ) fu ON fu.guest_code = g.code
      WHERE (? = '' OR CONCAT_WS(' ', g.fname, g.onames, g.pno, g.email) LIKE ?)
        AND (? IS NULL OR g.vtype = ?)
        AND (? IS NULL OR g.sstage = ?)
        AND (? IS NULL OR fu.latest_status = ?)
        AND (? IS NULL OR g.br_code = ?)
      ORDER BY g.vdt DESC, g.code DESC
      LIMIT 100
      `,
      stxt,
      like,
      vtype,
      vtype,
      sstage,
      sstage,
      fuStat,
      fuStat,
      branchCode ?? null,
      branchCode ?? null,
    ) as unknown[];
    return normRows<Guest>(rows) as Guest[];
  }

  async getStats(): Promise<GuestStats> {
    const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM guests
          WHERE YEAR(reg_date)  = YEAR(CURDATE())
            AND MONTH(reg_date) = MONTH(CURDATE()))                       AS guests_mo,
        (SELECT COUNT(*) FROM guest_follow_ups
          WHERE followup_status = 0)                                       AS pending_fu,
        (SELECT COUNT(*) FROM guest_follow_ups
          WHERE followup_status = 0
            AND followup_date < CURDATE())                                 AS overdue_fu,
        (SELECT COUNT(*) FROM guests
          WHERE is_promoted = 1
            AND YEAR(promoted_date)  = YEAR(CURDATE())
            AND MONTH(promoted_date) = MONTH(CURDATE()))                   AS promoted_mo
    `) as Array<{ guests_mo: number | bigint; pending_fu: number | bigint; overdue_fu: number | bigint; promoted_mo: number | bigint }>;
    const row = rows[0] ?? { guests_mo: 0, pending_fu: 0, overdue_fu: 0, promoted_mo: 0 };
    return {
      guests_mo:   Number(row.guests_mo),
      pending_fu:  Number(row.pending_fu),
      overdue_fu:  Number(row.overdue_fu),
      promoted_mo: Number(row.promoted_mo),
    };
  }
}
