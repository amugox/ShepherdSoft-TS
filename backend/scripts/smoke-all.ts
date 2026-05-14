/**
 * Exercise every in-scope action code against a running backend.
 *
 * Usage:
 *   1. Start the backend in one shell:  pnpm -F backend start
 *   2. In another shell:                pnpm -F backend exec ts-node --project tsconfig.json scripts/smoke-all.ts
 *
 * Logs in as Admin1/Test@123/br=10 (KINOO), captures the shp_jwt cookie,
 * then walks every action code with realistic payloads. Synthetic records are
 * named smoke_<timestamp> and torn down at the end.
 *
 * Exit 0 = all green. Exit 1 = first failure.
 */
import { request as httpRequest } from 'node:http';
import { URL } from 'node:url';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000/api/v1';

interface ApiResponse<T = unknown> {
  stat: number;
  msg?: string;
  ext?: string;
  err_no?: string;
  data?: T;
}

class SmokeFailure extends Error {}

let cookieJar = '';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const csrfFromJar = (): string | undefined => {
  for (const part of cookieJar.split(';')) {
    const t = part.trim();
    if (t.startsWith('BS-XSRF-TOKEN=')) return t.slice('BS-XSRF-TOKEN='.length);
  }
  return undefined;
};

const postOnce = async <T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> => {
  const url = new URL(`${BASE}${path}`);
  const payload = JSON.stringify(body);
  const csrf = csrfFromJar();
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: url.hostname,
        port:     url.port,
        path:     url.pathname,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(payload).toString(),
          ...(cookieJar ? { Cookie: cookieJar } : {}),
          ...(csrf ? { 'BS-XSRF-TOKEN': csrf } : {}),
        },
      },
      (res) => {
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          const next = setCookie.map((c) => c.split(';')[0]).join('; ');
          cookieJar = cookieJar ? `${cookieJar}; ${next}` : next;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try { resolve(JSON.parse(text) as ApiResponse<T>); }
          catch { reject(new Error(`Non-JSON response from ${path}: ${text.slice(0, 200)}`)); }
        });
      },
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
};

const post = async <T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> => {
  // Stay safely under the backend throttler (10 req / 10 s).
  await sleep(1100);
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await postOnce<T>(path, body);
    if (r.stat === 1 && typeof r.msg === 'string' && r.msg.includes('Too Many Requests')) {
      await sleep(2500);
      continue;
    }
    return r;
  }
  throw new SmokeFailure(`gave up after 8 retries on ${path}`);
};

const envelope = (act: number, content: unknown = {}): { tsp: string; ver: number; act: number; content: unknown; caller: null } => ({
  tsp:     new Date().toISOString(),
  ver:     1,
  act,
  content,
  caller:  null,
});

const assert = (label: string, cond: boolean, detail?: unknown): void => {
  if (!cond) {
    const tail = detail ? ` :: ${JSON.stringify(detail)}` : '';
    throw new SmokeFailure(`✗ ${label}${tail}`);
  }
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${label}`);
};

const expectOk = <T>(label: string, r: ApiResponse<T>, extra?: (data: T) => boolean): T => {
  assert(`${label} :: stat=0`, r.stat === 0, r);
  if (extra && r.data !== undefined && !extra(r.data)) {
    throw new SmokeFailure(`✗ ${label} :: extra check failed :: ${JSON.stringify(r.data)}`);
  }
  return r.data as T;
};

// p_FName / first_name is varchar(25). Keep synthetic prefixes short enough that
// even derivative names ("…_promo") stay under the cap.
const TS = Date.now().toString().slice(-8);
const SYN_GUEST_FNAME  = `sg_${TS}`;
const SYN_MEMBER_FNAME = `sm_${TS}`;
const SYN_FAM_NAME     = `sfam_${TS}`;

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[smoke] base = ${BASE}`);

  // ---- AUTH: login ----
  const login = await post<{ ucode: number; br_code: number; br_name: string; tkn: string }>(
    '/auth/login',
    envelope(0, { Username: 'Admin1', Password: 'Test@123', BranchCode: 10 }),
  );
  expectOk('AUTH login', login, (d) =>
    typeof d.ucode === 'number' && typeof d.br_code === 'number' && typeof d.tkn === 'string',
  );
  const ucode = login.data!.ucode;
  assert('cookie captured', cookieJar.includes('shp_jwt='));

  // ---- DATA ----
  const branches = await post<Array<{ itemvalue: number; itemname: string }>>(
    '/data/service', envelope(1, { typ: 1, code: 0 }),
  );
  expectOk('DATA_GET_LIST branches', branches, (d) => Array.isArray(d) && d.length > 0);

  const groups = await post<Array<{ itemvalue: number; itemname: string }>>(
    '/data/service', envelope(1, { typ: 2, code: 0 }),
  );
  expectOk('DATA_GET_LIST member groups', groups, (d) => Array.isArray(d) && d.length > 0);
  const memberGrpCode = groups.data![0]!.itemvalue;

  const formGroups = await post<Array<{ groupcode: number; itemvalue: number; itemname: string }>>(
    '/data/service', envelope(2, { typ: 3, code: 0 }),
  );
  expectOk('DATA_GET_LIST_GROUP add-guest', formGroups, (d) => Array.isArray(d));

  // ---- MEMBER ----
  const memberFindEmpty = await post<unknown[]>('/member/service', envelope(100, { stxt: '' }));
  expectOk('MEMBER_FIND (empty)', memberFindEmpty, (d) => Array.isArray(d));

  await post('/member/service', envelope(102, {
    br_code: 10,
    fname:   SYN_MEMBER_FNAME,
    onames:  'Probe',
    cname:   SYN_MEMBER_FNAME,
    pno:     '+254700000000',
    email:   'smoke@example.com',
    padd:    'Smoke Town',
    dob:     '1990-01-01',
    gdr:     1,
    grp:     memberGrpCode,
    jdt:     new Date().toISOString().slice(0, 10),
  })).then((r) => expectOk('MEMBER_ADD', r));

  const memberFind = await post<Array<{ code: number; fname: string }>>(
    '/member/service', envelope(100, { stxt: SYN_MEMBER_FNAME }),
  );
  expectOk('MEMBER_FIND (synthetic)', memberFind, (d) =>
    Array.isArray(d) && d.some((m) => m.fname === SYN_MEMBER_FNAME),
  );
  const synMemberCode = memberFind.data!.find((m) => m.fname === SYN_MEMBER_FNAME)!.code;

  const memberGet = await post<{ code: number; fname: string }>(
    '/member/service', envelope(101, { code: synMemberCode }),
  );
  expectOk('MEMBER_GET', memberGet, (d) => d.code === synMemberCode);

  await post('/member/service', envelope(103, { mcode: synMemberCode, fname: SYN_FAM_NAME }))
    .then((r) => expectOk('MEMBER_FAM_ADD', r));

  const famFind = await post<Array<{ code: number; fname: string; mcode: number }>>(
    '/member/service', envelope(105, { stxt: SYN_FAM_NAME }),
  );
  expectOk('MEMBER_FAM_FIND', famFind, (d) =>
    Array.isArray(d) && d.some((f) => f.fname === SYN_FAM_NAME),
  );
  const synFamCode = famFind.data!.find((f) => f.fname === SYN_FAM_NAME)!.code;

  await post('/member/service', envelope(104, { code: synFamCode }))
    .then((r) => expectOk('MEMBER_FAM_GET', r));

  // ---- GUEST ----
  const guestFind = await post<unknown[]>('/guest/service', envelope(200, { stxt: '' }));
  expectOk('GUEST_FIND', guestFind, (d) => Array.isArray(d));

  const guestAdd = await post('/guest/service', envelope(202, {
    fname:    SYN_GUEST_FNAME,
    onames:   'Probe',
    pno:      '+254711111111',
    email:    'smoke_guest@example.com',
    gdr:      1,
    padd:     'Smoke Town',
    vdt:      new Date().toISOString().slice(0, 10),
    vtype:    1,
    ba:       1,
    sstage:   1,
    grp_code: memberGrpCode,
    heard:    1,
    ministry: 'smoke',
    feedback: 'great',
  }));
  expectOk('GUEST_ADD', guestAdd);

  // Recover the new guest_code via FIND.
  const guestLookup = await post<Array<{ code: number; fname: string }>>(
    '/guest/service', envelope(200, { stxt: SYN_GUEST_FNAME }),
  );
  expectOk('GUEST_FIND (synthetic)', guestLookup, (d) =>
    Array.isArray(d) && d.some((g) => g.fname === SYN_GUEST_FNAME),
  );
  const synGuestCode = guestLookup.data!.find((g) => g.fname === SYN_GUEST_FNAME)!.code;

  const guestGet = await post<{ code: number }>('/guest/service', envelope(201, { code: synGuestCode }));
  expectOk('GUEST_GET', guestGet, (d) => d.code === synGuestCode);

  await post('/guest/service', envelope(203, {
    g_code:      synGuestCode,
    ftype:       1,
    fdt:         new Date().toISOString().slice(0, 10),
    notes:       `smoke note ${TS}`,
    assigned_to: ucode,
  })).then((r) => expectOk('GUEST_FOLLOWUP_ADD', r));

  // Add a second follow-up so we can complete one + cancel the other.
  await post('/guest/service', envelope(203, {
    g_code:      synGuestCode,
    ftype:       2,
    fdt:         new Date().toISOString().slice(0, 10),
    notes:       `smoke cancel ${TS}`,
    assigned_to: ucode,
  })).then((r) => expectOk('GUEST_FOLLOWUP_ADD (second)', r));

  const followUps = await post<Array<{ code: number; notes?: string }>>(
    '/guest/service', envelope(204, { code: synGuestCode }),
  );
  expectOk('GUEST_FOLLOWUP_FIND', followUps, (d) => Array.isArray(d) && d.length >= 2);
  const [fu1, fu2] = followUps.data!;

  await post('/guest/service', envelope(205, {
    code:      fu1!.code,
    responded: true,
    outcome:   `smoke outcome ${TS}`,
  })).then((r) => expectOk('GUEST_FOLLOWUP_COMPLETE', r));

  await post('/guest/service', envelope(206, { code: fu2!.code }))
    .then((r) => expectOk('GUEST_FOLLOWUP_CANCEL', r));

  const stats = await post<{ guests_mo: number; pending_fu: number; overdue_fu: number; promoted_mo: number }>(
    '/guest/service', envelope(208, {}),
  );
  expectOk('GUEST_GET_STATS', stats, (d) =>
    typeof d.guests_mo === 'number' && typeof d.pending_fu === 'number' &&
    typeof d.overdue_fu === 'number' && typeof d.promoted_mo === 'number',
  );

  // GUEST_PROMOTE needs its own throw-away guest (promoted guests can't be deleted via sp_DeleteGuest).
  await post('/guest/service', envelope(202, {
    fname:    `${SYN_GUEST_FNAME}_promo`,
    onames:   'Promote',
    pno:      '+254722222222',
    gdr:      1,
    padd:     'Smoke Town',
    vdt:      new Date().toISOString().slice(0, 10),
    vtype:    2,
    ba:       1,
    sstage:   1,
    grp_code: memberGrpCode,
    heard:    1,
  })).then((r) => expectOk('GUEST_ADD (promote target)', r));

  const promoCands = await post<Array<{ code: number; fname: string }>>(
    '/guest/service', envelope(200, { stxt: `${SYN_GUEST_FNAME}_promo` }),
  );
  expectOk('GUEST_FIND (promote target)', promoCands);
  const promoCode = promoCands.data!.find((g) => g.fname === `${SYN_GUEST_FNAME}_promo`)!.code;

  await post('/guest/service', envelope(207, {
    g_code: promoCode,
    cname:  `${SYN_GUEST_FNAME}_promo`,
    grp:    memberGrpCode,
    dob:    '1995-05-05',
    jdt:    new Date().toISOString().slice(0, 10),
  })).then((r) => expectOk('GUEST_PROMOTE', r));

  await post('/guest/service', envelope(209, { code: synGuestCode }))
    .then((r) => expectOk('GUEST_DELETE', r));

  // ---- AUTH: change pass (round-trip back to Test@123) ----
  await post('/auth/service', envelope(101, {
    OldPassword:     'Test@123',
    NewPassword:     'Test@456',
    ConfirmPassword: 'Test@456',
  })).then((r) => expectOk('AUTH_CHANGE_PASS (forward)', r));

  // Roll the password back so the harness stays usable next run.
  const reLogin = await post<{ tkn: string }>('/auth/login',
    envelope(0, { Username: 'Admin1', Password: 'Test@456', BranchCode: 10 }),
  );
  expectOk('AUTH login (new pass)', reLogin);
  await post('/auth/service', envelope(101, {
    OldPassword:     'Test@456',
    NewPassword:     'Test@123',
    ConfirmPassword: 'Test@123',
  })).then((r) => expectOk('AUTH_CHANGE_PASS (revert)', r));

  // ---- AUTH: logout ----
  await post('/auth/service', envelope(0, {}))
    .then((r) => expectOk('AUTH logout', r));

  // eslint-disable-next-line no-console
  console.log(`\nAll smoke checks passed.\nResidual rows: family ${synFamCode}, member ${synMemberCode}, promoted-guest ${promoCode}.\nManual cleanup if needed.`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
