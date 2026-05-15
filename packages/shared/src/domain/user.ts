/**
 * Wire-format login + user types.  Field names match the .NET
 * `[JsonPropertyName]` attributes on ShepherdSoft.DBL.Models verbatim.
 */

/**
 * ShepherdSoft.DBL.Models.UserLoginModel — login request payload.
 * Properties have **no** [JsonPropertyName] attributes on the .NET side, so the
 * wire keys are the C# PascalCase names.
 */
export interface UserLoginPayload {
  Username: string;
  Password: string;
  BranchCode: number;
  RememberMe?: boolean;
}

/**
 * ShepherdSoft.DBL.Models.UserDataModel — login response payload.
 * Field aliases from [JsonPropertyName(...)]:
 *   fnames  → FullNames
 *   uname   → UserName
 *   sno     → SessionNo
 *   ucode   → UserCode
 *   br_code → BranchCode
 *   br_name → BranchName
 *   tkn     → AuthToken
 *   ltm     → LoginTime
 *   role    → UserRole
 *   cpass   → ChangePass (must reset password on next login)
 */
export interface UserData {
  fnames?: string;
  uname?: string;
  sno?: string;
  ucode: number;
  br_code: number;
  br_name?: string;
  tkn?: string;
  ltm?: string;
  role?: string;
  cpass?: boolean;
  s2fa?: boolean;
}

/**
 * ShepherdSoft.DBL.Models.ChangeUserPassModel — also has no JsonPropertyName.
 */
export interface ChangePasswordPayload {
  OldPassword: string;
  NewPassword: string;
  ConfirmPassword: string;
}

/** System-wide 2FA toggle state. */
export interface System2FaState {
  enabled: boolean;
}

/** Update payload for system-wide 2FA toggle. */
export interface SetSystem2FaPayload {
  enabled: boolean;
}

/**
 * Payload stored inside the JWT's "userData" claim. Matches
 * ShepherdSoft.DBL.Models.ApiAppModel field shape so a token issued by either
 * stack is interpretable.
 */
export interface ApiAppContext {
  UserCode: number;
  BranchCode: number;
  Token?: string;
  SessionID?: string;
  Username?: string;
  FullNames?: string;
  UserRole?: string;
  Title?: string;
}
