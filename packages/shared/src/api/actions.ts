/**
 * Mirrors ShepherdSoft.DBL.Consts.HTTP_API_ACTION verbatim.
 * Do not renumber — both stacks must agree.
 */
export const HTTP_API_ACTION = {
  // Data
  DATA_GET_LIST: 1,
  DATA_GET_LIST_GROUP: 2,

  // Member
  MEMBER_FIND: 100,
  MEMBER_GET: 101,
  MEMBER_ADD: 102,
  MEMBER_FAM_ADD: 103,
  MEMBER_FAM_GET: 104,
  MEMBER_FAM_FIND: 105,

  // Guest
  GUEST_FIND: 200,
  GUEST_GET: 201,
  GUEST_ADD: 202,
  GUEST_FOLLOWUP_ADD: 203,
  GUEST_FOLLOWUP_FIND: 204,
  GUEST_FOLLOWUP_COMPLETE: 205,
  GUEST_FOLLOWUP_CANCEL: 206,
  GUEST_PROMOTE: 207,
  GUEST_GET_STATS: 208,
  GUEST_DELETE: 209,

  // Messaging
  MESSAGING_PREVIEW_RECIPIENTS: 300,
  MESSAGING_SEND_SMS: 301,
} as const;

export type HttpApiAction = (typeof HTTP_API_ACTION)[keyof typeof HTTP_API_ACTION];

/** Auth-area action codes (kept separate because /auth/service shares numbers with admin). */
export const AUTH_API_ACTION = {
  AUTH_LOGOUT: 0,
  AUTH_CHANGE_PASS: 101,
  AUTH_GET_SYSTEM_2FA: 102,
  AUTH_SET_SYSTEM_2FA: 103,
} as const;

export type AuthApiAction = (typeof AUTH_API_ACTION)[keyof typeof AUTH_API_ACTION];
