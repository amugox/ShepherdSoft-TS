/**
 * Discover the password hash algorithm by trying common (algorithm × password)
 * combinations against a known stored hash + salt.
 *
 * Override CALIB_PASSWORD env to test a specific plaintext only.
 *
 * Run with: pnpm -F backend exec ts-node --project tsconfig.json scripts/calibrate-hash.ts
 */
import { createHash, pbkdf2Sync } from 'node:crypto';

const STORED = process.env.CALIB_STORED_HASH ?? '';
const SALT   = process.env.CALIB_SALT ?? '';
const SINGLE_PWD = process.env.CALIB_PASSWORD;

interface Target {
  label: string;
  hash: string;
  salt: string;
}

const targets: Target[] = STORED
  ? [{ label: 'override', hash: STORED, salt: SALT }]
  : [
      // Seed admins (users table)
      { label: 'users.Admin1',        hash: 'B1FMnzth5r/N/UEiAf0GMoM/VZ4zgi0YuOTwjip9EN0=', salt: 'wYxa3jlohehTIIu8' },
      // Branch users (branch_users table)
      { label: 'branch_users.Admin1', hash: 'b3XKXAVuHP3eUHnd8MWYCzZnkwRU5fy8Q0dghUaq5v8=', salt: '53Iil18I94hZUZH1LXyw9KDF3e0Mjmo7hw==' },
      { label: 'branch_users.amugo',  hash: 'f5sjuDltKUzH3UR2YSY1AirOeOpnqnINRS16vxZ4c40=', salt: 'x9gZuSCFVAEpTaQMxtPBXN7bYP7Tg2BJjg==' },
    ];

const passwords: string[] = SINGLE_PWD
  ? [SINGLE_PWD]
  : [
      'password', 'Password', 'Password@123', 'password123',
      'Admin@123', 'Admin123', 'admin123', 'Admin1', 'admin', 'admin1',
      'Bmat@123', 'Bmat123', 'bmat', 'Bmat',
      'shepherd', 'Shepherd', 'Shepherd@123',
      '123456', '12345678', 'qwerty',
      'Test@123', 'P@ssw0rd', 'Welcome@123',
      'Admin', 'Admin@1', 'changeme', 'ChangeMe',
    ];

interface Variant {
  name: string;
  compute: (pwd: string, salt: string) => string;
}

const b64 = (buf: Buffer): string => buf.toString('base64');
const tryDecodeSaltBase64 = (s: string): Buffer => {
  try { return Buffer.from(s, 'base64'); } catch { return Buffer.from(s, 'utf8'); }
};

const variants: Variant[] = [
  { name: 'sha256(pwd+salt) b64',           compute: (p, s) => b64(createHash('sha256').update(p + s, 'utf8').digest()) },
  { name: 'sha256(salt+pwd) b64',           compute: (p, s) => b64(createHash('sha256').update(s + p, 'utf8').digest()) },
  { name: 'sha256(pwd+saltB64bytes) b64',   compute: (p, s) => b64(createHash('sha256').update(Buffer.concat([Buffer.from(p, 'utf8'), tryDecodeSaltBase64(s)])).digest()) },
  { name: 'sha256(saltB64bytes+pwd) b64',   compute: (p, s) => b64(createHash('sha256').update(Buffer.concat([tryDecodeSaltBase64(s), Buffer.from(p, 'utf8')])).digest()) },
  { name: 'sha512(pwd+salt) b64',           compute: (p, s) => b64(createHash('sha512').update(p + s, 'utf8').digest()) },
];

for (const iters of [1000, 5000, 10_000, 100_000]) {
  variants.push({ name: `PBKDF2-SHA256 ${iters} 32B (saltUtf8)`,
    compute: (p, s) => b64(pbkdf2Sync(p, s, iters, 32, 'sha256')) });
  variants.push({ name: `PBKDF2-SHA256 ${iters} 32B (saltB64)`,
    compute: (p, s) => b64(pbkdf2Sync(p, tryDecodeSaltBase64(s), iters, 32, 'sha256')) });
  variants.push({ name: `PBKDF2-SHA1   ${iters} 32B (saltUtf8)`,
    compute: (p, s) => b64(pbkdf2Sync(p, s, iters, 32, 'sha1')) });
}

let found = 0;
for (const t of targets) {
  for (const pwd of passwords) {
    for (const v of variants) {
      const out = v.compute(pwd, t.salt);
      if (out === t.hash) {
        console.log(`MATCH  target=${t.label}  pwd='${pwd}'  algo='${v.name}'`);
        found++;
      }
    }
  }
}
if (found === 0) {
  console.log('No matches. Try expanding the password list (set CALIB_PASSWORD env) or add more algorithm variants.');
  process.exit(1);
} else {
  console.log(`\n${found} match(es) found. Pick one and update backend/src/auth/crypto.ts.`);
}
