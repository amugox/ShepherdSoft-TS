/**
 * Unlock the test branch user (Admin1) after a failed-login lockout.
 * Sets user_stat=0 and attempts=0 so the next login isn't rejected.
 */
import mysql from 'mysql2/promise';

const url = new URL(process.env.DATABASE_URL ?? 'mysql://root:Password%40123@127.0.0.1:3306/shep_soft');

void (async () => {
  const conn = await mysql.createConnection({
    host:     url.hostname,
    port:     url.port ? Number(url.port) : 3306,
    user:     decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  });
  try {
    const [r] = await conn.query(
      'UPDATE branch_users SET user_stat=0, attempts=0 WHERE user_name=? AND br_code=?',
      ['Admin1', 10],
    );
    console.log('Unlocked:', JSON.stringify(r));
  } finally {
    await conn.end();
  }
})();
