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
  AUTH_REQUEST_PASSWORD_RESET: 104,
  AUTH_ADMIN_TRIGGER_PASSWORD_RESET: 105,
} as const;

export type AuthApiAction = (typeof AUTH_API_ACTION)[keyof typeof AUTH_API_ACTION];

/** User-management action codes routed via /user/service. */
export const USER_API_ACTION = {
  USER_LIST: 400,
  USER_GET: 401,
  USER_CREATE: 402,
  USER_UPDATE: 403,
  USER_DEACTIVATE: 404,
  USER_RESET_PASSWORD_REQUEST: 405,
  USER_PASSWORD_RESET_COMPLETE: 406,
  USER_ROLES_LIST: 407,
} as const;

export type UserApiAction = (typeof USER_API_ACTION)[keyof typeof USER_API_ACTION];
