/**
 * Wire-format types for Guest + Follow-up.
 * Property names match the .NET `[JsonPropertyName]` attributes on
 * ShepherdSoft.DBL.Entities.Guest / GuestFollowUp verbatim.
 */

/**
 * ShepherdSoft.DBL.Entities.Guest
 *   code        → Guest_Code
 *   gid         → Guest_Id
 *   br_code     → Br_Code
 *   u_code      → User_Code (who registered)
 *   returning   → Is_Returning
 *   fname       → First_Name
 *   onames      → Other_Names
 *   pno         → Phone_No
 *   email       → Email
 *   gdr         → Gender
 *   grp_code    → Grp_Code
 *   padd        → Phy_Address
 *   heard       → Heard_Via
 *   heard_rmk   → Heard_Via_Remarks
 *   vdt         → Visit_Date
 *   porigin     → Place_Origin
 *   ba          → Born_Again
 *   sstage      → Sprt_Stage
 *   vtype       → Visit_Type
 *   oref        → Origin_Ref
 *   ministry    → Ministry
 *   remarks     → Comments (NB: wire key is "remarks", not "comments")
 *   feedback    → Feedback
 *   followup    → Needs_Follow_Up
 *   followup_dt → Follow_Up_Date
 *   rdt         → Reg_Date
 *   br_name     → Br_Name (denormalised, view-only)
 *   reg_by      → Reg_By  (denormalised, view-only)
 *   promoted    → Is_Promoted
 *   visit_count → Visit_Count
 *   grp_name    → Grp_Name (denormalised, view-only)
 */
export interface Guest {
  code?: number;
  gid?: string;
  br_code?: number;
  u_code?: number;
  returning?: boolean;
  fname: string;
  onames?: string;
  pno?: string;
  email?: string;
  gdr?: number;
  grp_code?: number;
  padd?: string;
  heard?: number;
  heard_rmk?: string;
  vdt: string;
  porigin?: string;
  ba?: number;
  sstage?: number;
  vtype?: number;
  oref?: string;
  ministry?: string;
  remarks?: string;
  feedback?: string;
  followup?: boolean;
  followup_dt?: string | null;
  rdt?: string;
  br_name?: string;
  reg_by?: string;
  promoted?: boolean;
  visit_count?: number;
  grp_name?: string;
}

/** GuestFilterModel — already short-keyed in ApiModels.cs. */
export interface GuestFilter {
  stxt?: string;
  vtype?: number | null;
  sstage?: number | null;
  fu_stat?: number | null;
}

/** GuestFollowUpModel — short-keyed payload for GUEST_FOLLOWUP_ADD. */
export interface GuestFollowUpPayload {
  g_code: number;
  ftype: number;
  fdt: string;
  notes?: string;
  assigned_to: number;
}

/** GuestFollowUpCompleteModel — payload for GUEST_FOLLOWUP_COMPLETE. */
export interface GuestFollowUpCompletePayload {
  code: number;
  responded: boolean;
  outcome?: string;
}

/** GuestPromoteModel — payload for GUEST_PROMOTE. */
export interface GuestPromotePayload {
  g_code: number;
  cname: string;
  grp: number;
  /** YYYY-MM-DD. Optional — omit (don't send empty string) if not provided. */
  dob?: string;
  jdt: string;
}

/** GuestStatModel — response from GUEST_GET_STATS. */
export interface GuestStats {
  guests_mo: number;
  pending_fu: number;
  overdue_fu: number;
  promoted_mo: number;
}

/**
 * ShepherdSoft.DBL.Entities.GuestFollowUp
 *   code          → FollowUp_Code
 *   g_code        → Guest_Code
 *   ftype         → FollowUp_Type
 *   fdt           → FollowUp_Date
 *   fstat         → FollowUp_Status
 *   responded     → Guest_Responded
 *   outcome       → Outcome
 *   notes         → Notes
 *   rdt           → Reg_Date
 *   done_dt       → Done_Date
 *   assigned_to   → Assigned_To
 *   assigned_name → Assigned_To_Name
 *   fname         → Guest_First_Name (view-only)
 *   onames        → Guest_Other_Names (view-only)
 *   pno           → Guest_Phone (view-only)
 *   streak        → No_Response_Streak (view-only)
 */
export interface GuestFollowUp {
  code: number;
  g_code: number;
  ftype: number;
  fdt: string;
  fstat: number;
  responded?: boolean;
  outcome?: string;
  notes?: string;
  rdt?: string | null;
  done_dt?: string | null;
  assigned_to?: number;
  assigned_name?: string;
  fname?: string;
  onames?: string;
  pno?: string;
  streak?: number;
}
