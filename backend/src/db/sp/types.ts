/**
 * SP row shape. All callers now go through mysql2 (see MySqlService), which
 * preserves named columns from `SELECT … AS foo` aliases inside each SP.
 *
 * Two SPs (`sp_CreateGuest`, `sp_AddGuestFollowUp`) emit columns in *different*
 * orders for their success vs error branches — keeping names is the only
 * non-fragile way to read them.
 */
export interface SpRow {
  resp_status: number;
  resp_message: string;
  resp_code?: number | string | null;
  data1?: string | number | null;
  data2?: string | number | null;
  data3?: string | number | null;
  data4?: string | number | null;
  data5?: string | number | null;
  data6?: string | number | null;
  data7?: string | number | null;
  data8?: string | number | null;
  data9?: string | number | null;
  data10?: string | number | null;
}

export const okSp = (row: SpRow | undefined): boolean => row?.resp_status === 0;

/**
 * Some SPs use PascalCase aliases (`RespStatus`, `Data1`); others use
 * snake_case (`resp_status`, `data1`). Fold both into the snake_case shape so
 * downstream code can rely on `row.resp_status` regardless.
 *
 *   RespStatus  → resp_status
 *   RespMessage → resp_message
 *   Data1       → data1
 *   resp_status → resp_status  (idempotent)
 */
const toSnake = (key: string): string =>
  key.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();

/** Coerce BIGINT-typed columns (Prisma returns these as BigInt) for JSON safety. */
const coerce = (v: unknown): unknown => {
  if (typeof v === 'bigint') {
    if (v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)) {
      return Number(v);
    }
    return v.toString();
  }
  return v;
};

export const normRow = <T>(row: unknown): T | undefined => {
  if (!row || typeof row !== 'object') return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    out[toSnake(k)] = coerce(v);
  }
  return out as T;
};

export const normRows = <T>(rows: unknown[]): T[] =>
  rows.map((r) => normRow<T>(r)).filter((r): r is T => r !== undefined);
