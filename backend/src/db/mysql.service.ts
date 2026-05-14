import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { URL } from 'node:url';

import type { AppConfig } from '../config/configuration';

/**
 * Direct mysql2 pool, used **only** for stored-procedure CALLs.
 *
 * Prisma's MySQL driver returns SP-call results as positional `f0..fN` keys
 * (column names are lost across the CALL boundary). mysql2 preserves the
 * named aliases from the SP's `SELECT … AS foo` clauses, which is critical
 * for the two SPs in this codebase whose success and error branches emit
 * columns in *different* orders (`sp_CreateGuest`, `sp_AddGuestFollowUp`).
 *
 * For SELECT-from-view queries we keep Prisma — the column-name issue only
 * affects CALL.
 */
@Injectable()
export class MySqlService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(MySqlService.name);
  private pool!: Pool;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    const url = new URL(this.config.get('database.url', { infer: true }));
    this.pool = mysql.createPool({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // BigInt → Number when safe; keeps JSON.stringify happy.
      supportBigNumbers: true,
      bigNumberStrings: false,
      dateStrings: false,
    });
    this.log.log('mysql2 pool ready');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Call a stored procedure. mysql2 returns `[results, fields]`; for CALLs,
   * `results` is `[[row1, row2, ...], <okPacket>]` — the first element is the
   * actual rows from the SP's SELECT.
   *
   * Coerces every `bigint` to `Number` (or string if outside Number.MAX_SAFE_INTEGER).
   */
  async call<T extends Record<string, unknown> = Record<string, unknown>>(
    proc: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<T[]> {
    const placeholders = params.map(() => '?').join(', ');
    const sql = placeholders.length === 0 ? `CALL ${proc}()` : `CALL ${proc}(${placeholders})`;
    const [results] = await this.pool.query<RowDataPacket[][] | RowDataPacket[]>(sql, params as unknown[]);
    // mysql2 returns:
    //   - SP with SELECT: [[row, row, ...], <okPacket>]  (nested array first)
    //   - SP with SELECT, single result set: [row, row, ...] (flat array)
    //   - SP with no SELECT (write-only): an OkPacket object (not an array)
    if (!Array.isArray(results)) {
      // No result set — return empty array. Callers that need rows will treat
      // this as "no resp_status row" and surface a generic failure.
      return [];
    }
    const rows = Array.isArray(results[0])
      ? (results[0] as RowDataPacket[])
      : (results as RowDataPacket[]);
    return rows.map((r) => this.coerceRow(r) as T);
  }

  /** Convenience: first row only. */
  async callOne<T extends Record<string, unknown> = Record<string, unknown>>(
    proc: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<T | undefined> {
    const rows = await this.call<T>(proc, params);
    return rows[0];
  }

  private coerceRow(row: RowDataPacket): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'bigint') {
        if (v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)) {
          out[k] = Number(v);
        } else {
          out[k] = v.toString();
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  }
}
