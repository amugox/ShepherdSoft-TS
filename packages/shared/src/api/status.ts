export const API_STATUS = {
  Ok: 0,
  Error: 1,
} as const;

export type ApiStatus = (typeof API_STATUS)[keyof typeof API_STATUS];
