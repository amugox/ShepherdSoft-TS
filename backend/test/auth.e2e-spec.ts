import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { bootstrapTestApp, envelope, authFromLogin } from './app.factory';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login → wire-format short keys + HttpOnly cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'Test@123', BranchCode: 10 }))
      .expect(200);

    expect(res.body.stat).toBe(0);
    expect(res.body.data).toMatchObject({
      ucode:    expect.any(Number),
      uname:    'Admin1',
      br_code:  10,
      br_name:  expect.any(String),
      tkn:      expect.any(String),
      fnames:   expect.any(String),
    });

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    expect(cookies.some((c: string) => c.startsWith('shp_jwt=') && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c: string) => c.startsWith('BS-XSRF-TOKEN='))).toBe(true);
  });

  it('POST /auth/login → 401 on bad credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'wrong', BranchCode: 10 }))
      .expect(401);
  });

  it('POST /guest/service without cookie → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/guest/service')
      .send(envelope(208, {}))
      .expect(401);
  });

  it('POST /guest/service without CSRF header → 403', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'Test@123', BranchCode: 10 }))
      .expect(200);
    const { cookieHeader } = authFromLogin(loginRes.headers['set-cookie']);

    await request(app.getHttpServer())
      .post('/api/v1/guest/service')
      .set('Cookie', cookieHeader)
      .send(envelope(208, {}))
      .expect(403);
  });

  it('POST /auth/service act=0 (logout) clears the cookie', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'Test@123', BranchCode: 10 }))
      .expect(200);
    const { cookieHeader, csrfToken } = authFromLogin(loginRes.headers['set-cookie']);

    const logout = await request(app.getHttpServer())
      .post('/api/v1/auth/service')
      .set('Cookie', cookieHeader)
      .set('BS-XSRF-TOKEN', csrfToken)
      .send(envelope(0))
      .expect(200);

    expect(logout.body.stat).toBe(0);
    const setCookie = logout.headers['set-cookie'];
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    expect(list.some((c: string) => c.startsWith('shp_jwt=;') || /Expires=Thu, 01 Jan 1970/i.test(c))).toBe(true);
  });

  it('AUTH_CHANGE_PASS round-trips', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'Test@123', BranchCode: 10 }))
      .expect(200);
    const first = authFromLogin(loginRes.headers['set-cookie']);

    const forward = await request(app.getHttpServer())
      .post('/api/v1/auth/service')
      .set('Cookie', first.cookieHeader)
      .set('BS-XSRF-TOKEN', first.csrfToken)
      .send(envelope(101, {
        OldPassword:     'Test@123',
        NewPassword:     'Test@456',
        ConfirmPassword: 'Test@456',
      }))
      .expect(200);
    expect(forward.body.stat).toBe(0);

    // Re-login with the new password, then revert so subsequent runs work.
    const reLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(envelope(0, { Username: 'Admin1', Password: 'Test@456', BranchCode: 10 }))
      .expect(200);
    const second = authFromLogin(reLogin.headers['set-cookie']);

    const revert = await request(app.getHttpServer())
      .post('/api/v1/auth/service')
      .set('Cookie', second.cookieHeader)
      .set('BS-XSRF-TOKEN', second.csrfToken)
      .send(envelope(101, {
        OldPassword:     'Test@456',
        NewPassword:     'Test@123',
        ConfirmPassword: 'Test@123',
      }))
      .expect(200);
    expect(revert.body.stat).toBe(0);
  });
});
