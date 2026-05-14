import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { bootstrapTestApp, envelope, authFromLogin } from './app.factory';

describe('GuestController (e2e)', () => {
  let app: INestApplication;
  let cookieHeader: string;
  let csrfToken: string;
  const ts = Date.now().toString().slice(-8);
  const fname = `eg_${ts}`;
  let guestCode = 0;
  let followUpCode = 0;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'Test@123', BranchCode: 10 }))
      .expect(200);
    ({ cookieHeader, csrfToken } = authFromLogin(login.headers['set-cookie']));
  });

  afterAll(async () => {
    if (guestCode > 0) {
      await post(209, { code: guestCode });
    }
    await app.close();
  });

  const post = (act: number, content: unknown): request.Test =>
    request(app.getHttpServer())
      .post('/api/v1/guest/service')
      .set('Cookie', cookieHeader)
      .set('BS-XSRF-TOKEN', csrfToken)
      .send(envelope(act, content));

  it('GUEST_GET_STATS', async () => {
    const r = await post(208, {}).expect(200);
    expect(r.body.stat).toBe(0);
    expect(r.body.data).toMatchObject({
      guests_mo:   expect.any(Number),
      pending_fu:  expect.any(Number),
      overdue_fu:  expect.any(Number),
      promoted_mo: expect.any(Number),
    });
  });

  it('GUEST_FIND returns array', async () => {
    const r = await post(200, { stxt: '' }).expect(200);
    expect(r.body.stat).toBe(0);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('GUEST_ADD → captured by GUEST_FIND', async () => {
    const add = await post(202, {
      fname,
      onames:   'E2E',
      pno:      '+254700001111',
      gdr:      1,
      padd:     'Smoke',
      vdt:      new Date().toISOString().slice(0, 10),
      vtype:    1,
      ba:       1,
      sstage:   1,
      grp_code: 1,
      heard:    1,
    }).expect(200);
    expect(add.body.stat).toBe(0);

    const find = await post(200, { stxt: fname }).expect(200);
    expect(find.body.stat).toBe(0);
    const hits = (find.body.data as Array<{ code: number; fname: string }>);
    const match = hits.find((g) => g.fname === fname);
    expect(match).toBeDefined();
    guestCode = match!.code;
  });

  it('GUEST_GET round-trip uses the wire-format short keys', async () => {
    const r = await post(201, { code: guestCode }).expect(200);
    expect(r.body.stat).toBe(0);
    expect(r.body.data).toMatchObject({
      code:    guestCode,
      fname,
      br_code: 10,
      vtype:   1,
    });
  });

  it('GUEST_FOLLOWUP_ADD → FIND → COMPLETE', async () => {
    const add = await post(203, {
      g_code:      guestCode,
      ftype:       1,
      fdt:         new Date().toISOString().slice(0, 10),
      notes:       `e2e ${ts}`,
      assigned_to: 11,
    }).expect(200);
    expect(add.body.stat).toBe(0);

    const find = await post(204, { code: guestCode }).expect(200);
    expect(find.body.stat).toBe(0);
    const list = find.body.data as Array<{ code: number }>;
    expect(list.length).toBeGreaterThan(0);
    followUpCode = list[0]!.code;

    const complete = await post(205, { code: followUpCode, responded: true, outcome: 'e2e' })
      .expect(200);
    expect(complete.body.stat).toBe(0);
  });
});
