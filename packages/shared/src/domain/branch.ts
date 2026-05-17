/**
 * Wire-format types — JSON property names match the .NET
 * `[JsonPropertyName]` attributes on ShepherdSoft.DBL.Entities verbatim.
 * Do NOT rename these casually — the .NET frontend / API are also wired to
 * these exact keys.
 */

/** ShepherdSoft.DBL.Entities.Branch */
export interface Branch {
  /** Br_Code */     code: number;
  /** Br_Name */     name: string;
  /** Stat */        stat?: number;
  /** Stat_Name */   statn?: string;
}

/** ShepherdSoft.DBL.Entities.Dept */
export interface Dept {
  /** Dept_Code */   code: number;
  /** Dept_Name */   name: string;
  stat?: number;
  statn?: string;
}

/** ShepherdSoft.DBL.Entities.MemberGrp */
export interface MemberGrp {
  /** Grp_Code */    code: number;
  /** Grp_Name */    name: string;
}

/** Reference list returned by DATA_GET_LIST (`bfp_GetListData`). */
export interface ListItem {
  itemvalue: number;
  itemname: string;
}

/** Reference list returned by DATA_GET_LIST_GROUP (`bfp_GetListGroup`). */
export interface ListGroupItem {
  groupcode: number;
  itemvalue: number;
  itemname: string;
}

/**
 * ShepherdSoft.DBL.Models.SearchModel — generic search/filter envelope.
 *  - typ:  list type / sub-type discriminator
 *  - code: target item code (or 0 for global)
 *  - stxt: free-text search
 */
export interface SearchPayload {
  typ?: number;
  code?: number;
  stxt?: string;
}

export interface BranchAdminRecord {
  br_code: number;
  br_name: string;
  stat: number;
  users_count?: number;
}

export interface BranchAdminListPayload {
  includeInactive?: boolean;
}

export interface BranchAdminGetPayload {
  br_code: number;
}

export interface BranchAdminCreatePayload {
  br_name: string;
}

export interface BranchAdminUpdatePayload {
  br_code: number;
  br_name?: string;
  stat?: number;
}

export interface BranchAdminDeactivatePayload {
  br_code: number;
}
