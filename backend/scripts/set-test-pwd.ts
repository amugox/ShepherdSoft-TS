/**
 * Set a known plaintext password on a branch user so backend smoke tests can
 * exercise the real /auth/login path.
 *
 * Usage:
 *   pnpm -F backend exec ts-node --project tsconfig.json \
 *     scripts/set-test-pwd.ts <user_name> <br_code> <plaintext>
 */
import { createHash, randomBytes } from 'node:crypto';

import { PrismaClient } from '@prisma/client';

const userName = process.argv[2];
const brCode   = Number(process.argv[3]);
const plain    = process.argv[4];

if (!userName || !brCode || !plain) {
  console.error('usage: set-test-pwd <user_name> <br_code> <plaintext>');
  process.exit(2);
}

const salt = randomBytes(12).toString('base64').slice(0, 16);
const hash = createHash('sha256').update(plain + salt, 'utf8').digest('base64');

const p = new PrismaClient();

async function main(): Promise<void> {
  const upd = await p.$executeRawUnsafe(
    'UPDATE branch_users SET pwd = ?, salt = ?, attempts = 0, change_pwd = 0 WHERE user_name = ? AND br_code = ?',
    hash, salt, userName, brCode,
  );
  console.log(`updated ${upd} row(s)`);
  console.log(`user_name=${userName} br_code=${brCode} pwd=${plain}`);
  console.log(`(hash=${hash}, salt=${salt})`);
  await p.$disconnect();
}

main().catch((err: unknown) => { console.error(err); process.exit(1); });
