import { Injectable } from '@nestjs/common';

import type { Family, Member } from '@shepherd/shared';

import { MySqlService } from '../mysql.service';
import { PrismaService } from '../prisma.service';
import { normRow, normRows, type SpRow } from './types';

const MEMBER_SELECT = `
  SELECT
    member_code  AS code,
    member_id    AS mid,
    member_no    AS mno,
    br_code      AS br_code,
    first_name   AS fname,
    other_names  AS onames,
    comm_name    AS cname,
    phone_no     AS pno,
    email        AS email,
    reg_date     AS rdt,
    phy_address  AS padd,
    dob          AS dob,
    gender       AS gdr,
    member_stat  AS stat,
    remarks      AS rmk,
    grp_code     AS grp,
    join_date    AS jdt,
    exit_date    AS exdt,
    br_name      AS br_name,
    grp_name     AS grpn,
    gender_name  AS gdr_name,
    \`Stat_Name\` AS stat_name
  FROM vw_members
`;

const FAM_SELECT = `
  SELECT
    fam_code         AS code,
    member_code      AS mcode,
    fam_name         AS fname,
    member_name      AS mname,
    member_comm_name AS cname
  FROM vw_fams
`;

@Injectable()
export class MemberSp {
  constructor(
    private readonly mysql: MySqlService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * sp_CreateMember(p_ID, p_FName, p_ONames, p_CommName, p_Phone, p_PhyAdd,
   *                 p_BrCode, p_Email, p_Dob, p_Gender, p_Grp, p_JoinDate)
   */
  async createMember(m: Member): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_CreateMember', [
      m.mid ?? null,
      m.fname,
      m.onames ?? null,
      m.cname ?? null,
      m.pno ?? null,
      m.padd ?? null,
      m.br_code,
      m.email ?? null,
      m.dob ?? null,
      m.gdr ?? 0,
      m.grp ?? 0,
      m.jdt ?? null,
    ]);
    return normRow<SpRow>(row);
  }

  /** sp_CreateFamily(p_FamName, p_MemberCode). */
  async createFamily(f: Family): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_CreateFamily', [f.fname, f.mcode]);
    return normRow<SpRow>(row);
  }

  async getMember(code: number): Promise<Member | null> {
    const rows = await this.prisma.$queryRawUnsafe(
      `${MEMBER_SELECT} WHERE member_code = ? LIMIT 1`,
      code,
    ) as unknown[];
    return (normRows<Member>(rows)[0] as Member) ?? null;
  }

  async findMembers(searchText: string): Promise<Member[]> {
    const like = `%${searchText}%`;
    const rows = await this.prisma.$queryRawUnsafe(
      `${MEMBER_SELECT}
       WHERE (? = '' OR CONCAT_WS(' ', first_name, other_names, comm_name, phone_no) LIKE ?)
       ORDER BY first_name, other_names
      LIMIT 20`,
      searchText,
      like,
    ) as unknown[];
    return normRows<Member>(rows) as Member[];
  }

  async getFamily(code: number): Promise<Family | null> {
    const rows = await this.prisma.$queryRawUnsafe(
      `${FAM_SELECT} WHERE fam_code = ? LIMIT 1`,
      code,
    ) as unknown[];
    return (normRows<Family>(rows)[0] as Family) ?? null;
  }

  async findFamilies(searchText: string): Promise<Family[]> {
    const like = `%${searchText}%`;
    const rows = await this.prisma.$queryRawUnsafe(
      `${FAM_SELECT}
       WHERE (? = '' OR fam_name LIKE ? OR member_name LIKE ?)
       ORDER BY fam_name
       LIMIT 20`,
      searchText,
      like,
      like,
    ) as unknown[];
    return normRows<Family>(rows) as Family[];
  }
}
