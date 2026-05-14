import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { bootstrapTestApp, envelope, authFromLogin } from './app.factory';

describe('MemberController (e2e)', () => {
  let app: INestApplication;
  let cookieHeader: string;
  let csrfToken: string;
  const ts = Date.now().toString().slice(-8);
  const fname = `em_${ts}`;
  const famName = `efam_${ts}`;
  let memberCode = 0;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'Test@123', BranchCode: 10 }))
      .expect(200);
    ({ cookieHeader, csrfToken } = authFromLogin(login.headers['set-cookie']));
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (act: number, content: unknown): request.Test =>
    request(app.getHttpServer())
      .post('/api/v1/member/service')
      .set('Cookie', cookieHeader)
      .set('BS-XSRF-TOKEN', csrfToken)
      .send(envelope(act, content));

  it('MEMBER_FIND returns an array', async () => {
    const r = await post(100, { stxt: '' }).expect(200);
    expect(r.body.stat).toBe(0);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('MEMBER_ADD → MEMBER_FIND → MEMBER_GET', async () => {
    const add = await post(102, {
      br_code: 10,
      fname,
      onames:  'E2E',
      cname:   fname,
      pno:     '+254700002222',
      email:   'e2e@example.com',
      padd:    'Smoke',
      dob:     '1990-01-01',
      gdr:     1,
      grp:     1,
      jdt:     new Date().toISOString().slice(0, 10),
    }).expect(200);
    expect(add.body.stat).toBe(0);

    const find = await post(100, { stxt: fname }).expect(200);
    expect(find.body.stat).toBe(0);
    const match = (find.body.data as Array<{ code: number; fname: string }>).find(
      (m) => m.fname === fname,
    );
    expect(match).toBeDefined();
    memberCode = match!.code;

    const get = await post(101, { code: memberCode }).expect(200);
    expect(get.body.stat).toBe(0);
    expect(get.body.data).toMatchObject({ code: memberCode, fname });
  });

  it('MEMBER_FAM_ADD → MEMBER_FAM_FIND → MEMBER_FAM_GET', async () => {
    const add = await post(103, { mcode: memberCode, fname: famName }).expect(200);
    expect(add.body.stat).toBe(0);

    const find = await post(105, { stxt: famName }).expect(200);
    expect(find.body.stat).toBe(0);
    const match = (find.body.data as Array<{ code: number; fname: string }>).find(
      (f) => f.fname === famName,
    );
    expect(match).toBeDefined();

    const get = await post(104, { code: match!.code }).expect(200);
    expect(get.body.stat).toBe(0);
    expect(get.body.data).toMatchObject({ code: match!.code, fname: famName });
  });
});
