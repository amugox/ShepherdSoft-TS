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
  OtpCode?: string;
  OtpChallengeId?: string;
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

export interface LoginOtpChallenge {
  requiresOtp: true;
  challengeId: string;
  expiresInSec: number;
  maskedEmail?: string;
}

export type LoginResponse = UserData | LoginOtpChallenge;

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

export const UserRoleCode = {
  SuperAdmin: 0,
  Admin: 1,
  Standard: 2,
  Viewer: 3,
} as const;
export type UserRoleCode = (typeof UserRoleCode)[keyof typeof UserRoleCode];

export interface UserRoleItem {
  code: UserRoleCode;
  name: string;
}

export interface UserAdminRecord {
  user_code: number;
  br_code: number;
  user_name: string;
  member_code: number;
  email?: string | null;
  full_name?: string | null;
  user_stat: number;
  user_role: number;
  change_pwd?: boolean | null;
  last_login?: string | null;
  reg_date?: string | null;
}

export interface UserAdminListPayload {
  searchText?: string;
}

export interface UserAdminGetPayload {
  userCode: number;
}

export interface UserAdminCreatePayload {
  user_name: string;
  member_code: number;
  email: string;
  user_role: number;
  sendReset: boolean;
}

export interface UserAdminUpdatePayload {
  user_code: number;
  member_code?: number;
  email?: string;
  user_role?: number;
  user_stat?: number;
}

export interface UserAdminDeactivatePayload {
  user_code: number;
}

export interface PasswordResetRequestPayload {
  userNameOrEmail: string;
}

export interface PasswordResetCompletePayload {
  resetId: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

/** Profile data returned by AUTH_GET_PROFILE. */
export interface UserProfileData {
  user_code: number;
  user_name: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  branch_name: string | null;
  last_login: string | null;
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
