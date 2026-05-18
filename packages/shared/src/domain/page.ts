/**
 * Pagination contract shared by every list endpoint that backs a DataTable.
 * Request side: filters extend `PageParams`. Response side: list endpoints
 * return `PageResult<T>` so the client always knows the total and can render
 * a paging footer without a second round-trip.
 */

export interface PageParams {
  /** 1-based page number. Defaults to 1 server-side. */
  page?: number;
  /** Rows per page. Defaults to PAGE_SIZE_DEFAULT and is server-clamped to PAGE_SIZE_MAX. */
  pageSize?: number;
}

export interface PageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const PAGE_SIZE_DEFAULT = 25;
export const PAGE_SIZE_MAX = 100;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
