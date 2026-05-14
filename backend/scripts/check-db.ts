/**
 * Smoke-test DB connectivity + SP availability.
 * Run with: pnpm -F backend exec ts-node --project tsconfig.json scripts/check-db.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load .env from backend root if DATABASE_URL isn't already set.
if (!process.env.DATABASE_URL) {
  try {
    const text = readFileSync(join(__dirname, '..', '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (!key || val === undefined) continue;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env optional — caller may have set env vars directly.
  }
}

import { PrismaClient } from '@prisma/client';

interface ListRow {
  ItemValue: number;
  ItemName: string;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const rows = await prisma.$queryRawUnsafe<ListRow[]>('CALL bfp_GetListData(?, ?)', 1, 0);
    console.log(`bfp_GetListData(1,0) -> ${rows.length} rows`);
    // Prisma SP-call returns positional keys (f0, f1, ...).
    for (const r of rows.slice(0, 10)) {
      const obj = r as unknown as Record<string, unknown>;
      console.log(`  ${obj.f0 ?? obj.ItemValue}\t${obj.f1 ?? obj.ItemName}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('check-db failed:', err);
  process.exit(1);
});
