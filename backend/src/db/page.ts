import {
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  type PageParams,
  type PageResult,
} from '@shepherd/shared';

export interface ClampedPage {
  page: number;
  pageSize: number;
  offset: number;
}

export function clampPage(p?: PageParams | null): ClampedPage {
  const rawPage = typeof p?.page === 'number' ? Math.floor(p.page) : 1;
  const rawSize = typeof p?.pageSize === 'number' ? Math.floor(p.pageSize) : PAGE_SIZE_DEFAULT;
  const page = Math.max(rawPage, 1);
  const pageSize = Math.min(Math.max(rawSize, 1), PAGE_SIZE_MAX);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function pageResult<T>(
  rows: T[],
  total: number,
  { page, pageSize }: ClampedPage,
): PageResult<T> {
  return { rows, total, page, pageSize };
}
