/**
 * Wire-format types for Member + Family.
 * Property names match the .NET `[JsonPropertyName]` attributes on
 * ShepherdSoft.DBL.Entities.Member / Family verbatim.
 */

/**
 * ShepherdSoft.DBL.Entities.Member
 *   code   → Member_Code
 *   mid    → Member_Id
 *   mno    → Member_No
 *   br_code→ Br_Code
 *   fname  → First_Name
 *   onames → Other_Names
 *   cname  → Comm_Name
 *   pno    → Phone_No
 *   email  → Email
 *   rdt    → Reg_Date
 *   padd   → Phy_Address
 *   dob    → Dob
 *   gdr    → Gender
 *   stat   → Member_Stat
 *   rmk    → Remarks
 *   gdr_name → Gender_Name
 *   stat_name→ Stat_Name (this column is actually `Stat_Name` PascalCase in vw_members)
 *   grp    → Grp_Code
 *   jdt    → Join_Date
 *   exdt   → Exit_Date
 *   grpn   → Grp_Name
 *   br_name→ Br_Name
 */
export interface Member {
  code?: number;
  mid?: string;
  mno?: string;
  br_code: number;
  fname: string;
  onames?: string;
  cname?: string;
  pno?: string;
  email?: string;
  rdt?: string;
  padd?: string;
  dob?: string;
  gdr?: number;
  stat?: number;
  rmk?: string;
  gdr_name?: string;
  stat_name?: string;
  grp?: number;
  jdt?: string;
  exdt?: string;
  grpn?: string;
  br_name?: string;
}

/**
 * ShepherdSoft.DBL.Entities.Family
 *   code  → Fam_Code
 *   mcode → Member_Code
 *   fname → Fam_Name
 *   mname → Member_Name
 *   cname → Member_Comm_Name
 */
export interface Family {
  code?: number;
  mcode: number;
  fname: string;
  mname?: string;
  cname?: string;
}
