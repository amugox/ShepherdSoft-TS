import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Port of Bmat.Tools.Lite.SecurityManager.
 *
 * The original algorithm lives in a closed-source internal NuGet. The seed admin
 * hash 'B1FMnzth5r/N/UEiAf0GMoM/VZ4zgi0YuOTwjip9EN0=' is 44 base64 chars = 32
 * bytes, which fits SHA-256. The simplest matching algorithm is:
 *
 *     Base64(SHA-256(UTF8(password + salt)))
 *
 * If logins fail against the live DB, run scripts/calibrate-hash.ts to discover
 * the correct variant (SHA-512, PBKDF2 with N iterations, salt+pwd ordering,
 * etc.) and adjust hashPassword/isPasswordValid here.
 */

const SALT_BYTES = 12; // 16 base64 chars (matches observed 'wYxa3jlohehTIIu8')
const TOKEN_BYTES = 38; // 50 base64 chars (matches GenerateSalt(50))

const sha256B64 = (input: string): string =>
  createHash('sha256').update(input, 'utf8').digest('base64');

export const hashPassword = (password: string, salt: string): string =>
  sha256B64(password + salt);

export const isPasswordValid = (password: string, storedHash: string, salt: string): boolean => {
  const candidate = hashPassword(password, salt);
  const a = Buffer.from(candidate);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const generateSalt = (lengthChars = 16): string => {
  // 16 base64 chars ≈ 12 raw bytes; scale up for longer outputs.
  const bytes = Math.ceil((lengthChars * 3) / 4);
  return randomBytes(bytes).toString('base64').slice(0, lengthChars);
};

export const generateToken = (lengthChars = 50): string => {
  const bytes = Math.ceil((lengthChars * 3) / 4);
  return randomBytes(bytes).toString('base64').slice(0, lengthChars);
};

export const generateSimplePassword = (): string => {
  // 8 chars, alphanumeric, no ambiguous (0/O/1/l).
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const buf = randomBytes(8);
  for (const byte of buf) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
};

// Re-exported constants so calibrate-hash.ts can verify these are sane defaults.
export const __DEFAULT_SIZES = { SALT_BYTES, TOKEN_BYTES };
