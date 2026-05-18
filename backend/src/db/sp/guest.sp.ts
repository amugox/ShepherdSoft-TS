import { Injectable } from '@nestjs/common';

import type { Guest, GuestFilter, GuestPromotePayload, GuestStats, PageResult } from '@shepherd/shared';

import { clampPage, pageResult } from '../page';

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
    member_code       AS member_code,
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

  /** Update editable guest fields directly via Prisma.
   *  Scoped to `branchCode` for non-super-admin callers.
   */
  async updateGuest(code: number, g: Guest, branchCode?: number): Promise<boolean> {
    const result = await this.prisma.guests.updateMany({
      where: {
        guest_code: code,
        ...(branchCode !== undefined ? { br_code: branchCode } : {}),
      },
      data: {
        first_name:        g.fname,
        other_names:       g.onames ?? '',
        phone_no:          g.pno ?? null,
        email:             g.email ?? null,
        gender:            g.gdr ?? 0,
        grp_code:          g.grp_code ?? 0,
        phy_address:       g.padd ?? null,
        heard_via:         g.heard ?? 0,
        heard_via_remarks: g.heard_rmk ?? null,
        visit_date:        g.vdt ? new Date(g.vdt) : undefined,
        visit_type:        g.vtype ?? 0,
        place_origin:      g.porigin ?? null,
        born_again:        g.ba ?? 0,
        sprt_stage:        g.sstage ?? 0,
        origin_ref:        g.oref ?? null,
        ministry:          g.ministry ?? null,
        comments:          g.remarks ?? null,
        feedback:          g.feedback ?? null,
        needs_follow_up:   g.followup ?? false,
      },
    });
    return result.count > 0;
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

  async findGuests(f: GuestFilter, branchCode?: number): Promise<PageResult<Guest>> {
    const stxt    = f.stxt ?? '';
    const like    = `%${stxt}%`;
    const vtype   = f.vtype   ?? null;
    const sstage  = f.sstage  ?? null;
    const fuStat  = f.fu_stat ?? null;
    const vdtFrom = f.vdt_from ?? null;
    const vdtTo   = f.vdt_to   ?? null;
    const heard   = f.heard    ?? null;
    const ba      = f.ba       ?? null;
    const clamped = clampPage(f);

    const FROM_WHERE = `
      FROM (${GUEST_SELECT}) g
      LEFT JOIN (
        SELECT guest_code, MAX(followup_status) AS latest_status
        FROM guest_follow_ups
        GROUP BY guest_code
      ) fu ON fu.guest_code = g.code
      WHERE (? = '' OR CONCAT_WS(' ', g.fname, g.onames, g.pno, g.email) LIKE ?)
        AND (? IS NULL OR g.vtype  = ?)
        AND (? IS NULL OR g.sstage = ?)
        AND (? IS NULL OR fu.latest_status = ?)
        AND (? IS NULL OR g.br_code = ?)
        AND (? IS NULL OR g.vdt >= ?)
        AND (? IS NULL OR g.vdt <= ?)
        AND (? IS NULL OR g.heard  = ?)
        AND (? IS NULL OR g.ba     = ?)
    `;
    const filterParams = [
      stxt, like,
      vtype, vtype,
      sstage, sstage,
      fuStat, fuStat,
      branchCode ?? null, branchCode ?? null,
      vdtFrom, vdtFrom,
      vdtTo, vdtTo,
      heard, heard,
      ba, ba,
    ];

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRawUnsafe(
        `SELECT g.* ${FROM_WHERE} ORDER BY g.vdt DESC, g.code DESC LIMIT ? OFFSET ?`,
        ...filterParams,
        clamped.pageSize,
        clamped.offset,
      ) as Promise<unknown[]>,
      this.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS total ${FROM_WHERE}`,
        ...filterParams,
      ) as Promise<unknown[]>,
    ]);

    const total = Number((countRows[0] as { total?: bigint | number })?.total ?? 0);
    return pageResult(normRows<Guest>(rows) as Guest[], total, clamped);
  }

  async getStats(branchCode?: number): Promise<GuestStats> {
    const br = branchCode ?? null;
    const rows = await this.prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*) FROM guests
          WHERE YEAR(reg_date)  = YEAR(CURDATE())
            AND MONTH(reg_date) = MONTH(CURDATE())
            AND (? IS NULL OR br_code = ?))                       AS guests_mo,
        (SELECT COUNT(*) FROM guest_follow_ups gfu
          INNER JOIN guests g ON g.guest_code = gfu.guest_code
          WHERE gfu.followup_status = 0
            AND (? IS NULL OR g.br_code = ?))                     AS pending_fu,
        (SELECT COUNT(*) FROM guest_follow_ups gfu
          INNER JOIN guests g ON g.guest_code = gfu.guest_code
          WHERE gfu.followup_status = 0
            AND gfu.followup_date < CURDATE()
            AND (? IS NULL OR g.br_code = ?))                     AS overdue_fu,
        (SELECT COUNT(*) FROM guests
          WHERE is_promoted = 1
            AND YEAR(promoted_date)  = YEAR(CURDATE())
            AND MONTH(promoted_date) = MONTH(CURDATE())
            AND (? IS NULL OR br_code = ?))                       AS promoted_mo,
        ROUND(
          100.0 * (SELECT COUNT(*) FROM guest_follow_ups gfu
            INNER JOIN guests g ON g.guest_code = gfu.guest_code
            WHERE gfu.followup_status = 1 AND gfu.guest_responded = 1
              AND (? IS NULL OR g.br_code = ?))
          / NULLIF((SELECT COUNT(*) FROM guest_follow_ups gfu
            INNER JOIN guests g ON g.guest_code = gfu.guest_code
            WHERE gfu.followup_status = 1
              AND (? IS NULL OR g.br_code = ?)), 0)
        , 1)                                                       AS response_rate,
        ROUND(
          100.0 * (SELECT COUNT(*) FROM guests
            WHERE is_promoted = 1
              AND (? IS NULL OR br_code = ?))
          / NULLIF((SELECT COUNT(*) FROM guests
            WHERE (? IS NULL OR br_code = ?)), 0)
        , 1)                                                       AS conversion_rate
    `,
      br, br,   // guests_mo
      br, br,   // pending_fu
      br, br,   // overdue_fu
      br, br,   // promoted_mo
      br, br,   // response_rate numerator
      br, br,   // response_rate denominator
      br, br,   // conversion_rate numerator
      br, br,   // conversion_rate denominator
    ) as Array<{
      guests_mo:       number | bigint;
      pending_fu:      number | bigint;
      overdue_fu:      number | bigint;
      promoted_mo:     number | bigint;
      response_rate:   number | null;
      conversion_rate: number | null;
    }>;
    const row = rows[0] ?? {
      guests_mo: 0, pending_fu: 0, overdue_fu: 0, promoted_mo: 0,
      response_rate: null, conversion_rate: null,
    };
    return {
      guests_mo:       Number(row.guests_mo),
      pending_fu:      Number(row.pending_fu),
      overdue_fu:      Number(row.overdue_fu),
      promoted_mo:     Number(row.promoted_mo),
      response_rate:   row.response_rate   !== null ? Number(row.response_rate)   : 0,
      conversion_rate: row.conversion_rate !== null ? Number(row.conversion_rate) : 0,
    };
  }
}
