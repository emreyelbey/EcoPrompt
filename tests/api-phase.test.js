// /api/admin/phase testleri: yalnızca geçerli yönetici token'ıyla aşama okunur/değiştirilir.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeDb, createReq, createRes } from './helpers/fake-api.js';

let fakeDb;
vi.mock('../api/_lib/firebase.js', () => ({
  getDb: () => fakeDb,
  serverTimestamp: () => 'SUNUCU_ZAMANI',
  increment: (n) => ({ __increment: n }),
}));

const { default: handler } = await import('../api/admin/phase.js');
const { createAdminToken } = await import('../api/_lib/session.js');

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-gizli-anahtar-en-az-16-karakter';
  fakeDb = createFakeDb();
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

async function call({ method = 'GET', body, token } = {}) {
  const res = createRes();
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  await handler(createReq({ method, body, headers }), res);
  return res;
}

const adminToken = () => createAdminToken().token;

describe('/api/admin/phase — yetki', () => {
  it('token yoksa veya bozuksa 401, belge yazılmaz', async () => {
    expect((await call()).statusCode).toBe(401);
    const res = await call({ method: 'POST', body: { phase: 'posttest' }, token: 'bozuk.token' });
    expect(res.statusCode).toBe(401);
    expect(fakeDb.docs.has('settings/experiment')).toBe(false);
  });

  it('süresi dolmuş token 401', async () => {
    const old = createAdminToken(Date.now() - 9 * 60 * 60 * 1000).token;
    expect((await call({ token: old })).statusCode).toBe(401);
  });

  it('desteklenmeyen yöntem 405', async () => {
    const res = await call({ method: 'PUT', token: adminToken() });
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
  });
});

describe('/api/admin/phase — okuma ve yazma', () => {
  it('belge yokken GET pretest döner ve belge oluşturmaz', async () => {
    const res = await call({ token: adminToken() });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ phase: 'pretest' });
    expect(fakeDb.docs.has('settings/experiment')).toBe(false);
  });

  it('POST aşamayı sunucu zamanıyla yazar; GET yeni aşamayı döner', async () => {
    const res = await call({ method: 'POST', body: { phase: 'posttest' }, token: adminToken() });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ phase: 'posttest' });
    expect(fakeDb.docs.get('settings/experiment')).toEqual({ activePhase: 'posttest', updatedAt: 'SUNUCU_ZAMANI' });
    expect((await call({ token: adminToken() })).body.phase).toBe('posttest');
  });

  it('geçersiz aşama 400, mevcut değer değişmez', async () => {
    fakeDb.docs.set('settings/experiment', { activePhase: 'pretest' });
    for (const phase of ['Son Test', '', undefined, 'POSTTEST']) {
      const res = await call({ method: 'POST', body: { phase }, token: adminToken() });
      expect(res.statusCode).toBe(400);
      expect(res.body.hata).toContain('Geçersiz aşama');
    }
    expect(fakeDb.docs.get('settings/experiment').activePhase).toBe('pretest');
  });

  it('aşama değişince eski etkileşim kayıtları silinmez', async () => {
    fakeDb.docs.set('interactions/x', { code: 'K001', phase: 'pretest' });
    await call({ method: 'POST', body: { phase: 'posttest' }, token: adminToken() });
    expect(fakeDb.docs.get('interactions/x')).toEqual({ code: 'K001', phase: 'pretest' });
  });
});
