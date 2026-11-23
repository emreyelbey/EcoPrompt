// /api/admin/login ve /api/admin/session uç noktası testleri.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createReq, createRes } from './helpers/fake-api.js';
import loginHandler from '../api/admin/login.js';
import sessionHandler from '../api/admin/session.js';

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-gizli-anahtar-en-az-16-karakter';
  process.env.ADMIN_PASSCODE = 'dogru-parola';
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
  delete process.env.ADMIN_PASSCODE;
  vi.useRealTimers();
});

async function login(passcode) {
  const res = createRes();
  await loginHandler(createReq({ method: 'POST', body: { passcode } }), res);
  return res;
}

function checkSession(token) {
  const res = createRes();
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  sessionHandler(createReq({ method: 'GET', headers }), res);
  return res;
}

describe('/api/admin/login', () => {
  it('doğru parolada token döner ve token oturum kontrolünden geçer', async () => {
    const res = await login('dogru-parola');
    expect(res.statusCode).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.exp).toBeGreaterThan(Date.now());

    const check = checkSession(res.body.token);
    expect(check.statusCode).toBe(200);
    expect(check.body).toEqual({ ok: true, exp: res.body.exp });
  });

  it('yanlış parolada 401 ve token yok (bekleme süresi sahte saatle geçilir)', async () => {
    vi.useFakeTimers();
    const pending = login('yanlis');
    await vi.advanceTimersByTimeAsync(1000);
    const res = await pending;
    expect(res.statusCode).toBe(401);
    expect(res.body.token).toBeUndefined();
    expect(res.body.hata).toMatch(/parolası hatalı/);
  });

  it('ADMIN_PASSCODE ayarlı değilse 500 ve Türkçe mesaj', async () => {
    delete process.env.ADMIN_PASSCODE;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await login('herhangi');
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body.hata).toMatch(/Yönetici girişi şu anda yapılamıyor/);
  });

  it('GET isteğinde 405', async () => {
    const res = createRes();
    await loginHandler(createReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });
});

describe('/api/admin/session', () => {
  it("token'sız istekte 401", () => {
    const res = checkSession();
    expect(res.statusCode).toBe(401);
    expect(res.body.hata).toMatch(/oturumu geçersiz/);
  });

  it('sahte token ile 401', () => {
    expect(checkSession('abc.def').statusCode).toBe(401);
  });

  it('POST isteğinde 405', () => {
    const res = createRes();
    sessionHandler(createReq({ method: 'POST' }), res);
    expect(res.statusCode).toBe(405);
  });
});
