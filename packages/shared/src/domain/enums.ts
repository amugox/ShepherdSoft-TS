/**
 * Domain enums mirroring ShepherdSoft.DBL.Enums.
 * Values are the integer codes stored in MySQL.
 */

export const Gender = {
  Male: 1,
  Female: 2,
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const BornAgainStatus = {
  Unknown: 0,
  Yes: 1,
  No: 2,
} as const;
export type BornAgainStatus = (typeof BornAgainStatus)[keyof typeof BornAgainStatus];

export const SpiritualStage = {
  Unknown: 0,
  New: 1,
  Growing: 2,
  Mature: 3,
  Exploring: 4,
} as const;
export type SpiritualStage = (typeof SpiritualStage)[keyof typeof SpiritualStage];

export const HeardVia = {
  SocialMedia: 1,
  SignPost: 2,
  GoogleMap: 3,
  Invited: 4,
  Other: 5,
} as const;
export type HeardVia = (typeof HeardVia)[keyof typeof HeardVia];

export const VisitType = {
  OneTime: 1,
  Joining: 2,
} as const;
export type VisitType = (typeof VisitType)[keyof typeof VisitType];

export const FollowUpStatus = {
  Pending: 0,
  Complete: 1,
  Cancelled: 2,
} as const;
export type FollowUpStatus = (typeof FollowUpStatus)[keyof typeof FollowUpStatus];

export const FollowUpType = {
  Call: 1,
  Sms: 2,
  Visit: 3,
} as const;
export type FollowUpType = (typeof FollowUpType)[keyof typeof FollowUpType];

/** ListItemType / ListGroupType used by DATA_GET_LIST(_GROUP). */
export const ListItemType = {
  Branch: 1,
  MemberGroup: 2,
} as const;
export type ListItemType = (typeof ListItemType)[keyof typeof ListItemType];

export const ListGroupType = {
  CreateUser: 1,
  CreateMember: 2,
  AddGuest: 3,
} as const;
export type ListGroupType = (typeof ListGroupType)[keyof typeof ListGroupType];
