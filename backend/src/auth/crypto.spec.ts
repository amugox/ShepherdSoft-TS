import { generateSalt, generateToken, hashPassword, isPasswordValid } from './crypto';

describe('crypto', () => {
  it('hashPassword is deterministic for a given salt', () => {
    const a = hashPassword('Test@123', 'somesalt');
    const b = hashPassword('Test@123', 'somesalt');
    expect(a).toBe(b);
    expect(a).toHaveLength(44); // base64 of 32 bytes
  });

  it('isPasswordValid round-trips a freshly hashed password', () => {
    const salt = generateSalt(16);
    const hash = hashPassword('hunter2', salt);
    expect(isPasswordValid('hunter2', hash, salt)).toBe(true);
    expect(isPasswordValid('hunter3', hash, salt)).toBe(false);
  });

  it('matches the seed admin hash', () => {
    // From Scripts/Data Scrpts.sql — Admin1 / users table.
    expect(hashPassword('password', 'wYxa3jlohehTIIu8'))
      .toBe('B1FMnzth5r/N/UEiAf0GMoM/VZ4zgi0YuOTwjip9EN0=');
  });

  it('generateToken returns the requested length', () => {
    expect(generateToken(50)).toHaveLength(50);
  });
});
