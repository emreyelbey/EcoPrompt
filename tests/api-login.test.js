// /api/login uç noktası testleri. Gerçek veritabanı yerine sahte Firestore kullanılır.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeDb, createReq, createRes } from './helpers/fake-api.js';

// api/_lib/firebase.js yerine sahte sürüm: getDb() bizim sahte veritabanımızı döner.
let fakeDb;
vi.mock('../api/_lib/firebase.js', () => ({
  getDb: () => fakeDb,
  serverTimestamp: () => 'SUNUCU_ZAMANI',
  increment: (n) => ({ __increment: n }),
}));

const { default: handler } = await import('../api/login.js');

async function post(body) {
  const res = createRes();
  await handler(createReq({ method: 'POST', body }), res);
  return res;
}

beforeEach(() => {
  fakeDb = createFakeDb();
});

describe('/api/login', () => {
  it('geçerli kodla giriş: grup koddan, aşama varsayılan pretest, giriş kaydı oluşur', async () => {
    const res = await post({ code: ' k005 ' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ code: 'K005', group: 'Kontrol', phase: 'pretest' });
    expect(fakeDb.docs.get('logins/K005_pretest')).toEqual({
      code: 'K005',
      group: 'Kontrol',
      phase: 'pretest',
      firstLoginAt: 'SUNUCU_ZAMANI',
      lastLoginAt: 'SUNUCU_ZAMANI',
      loginCount: 1,
      sessionCount: 1,
    });
    // settings/experiment yokken oluşturulmaz.
    expect(fakeDb.docs.has('settings/experiment')).toBe(false);
  });

  it('aynı kod tekrar girince tek belge kalır, loginCount ve sessionCount artar', async () => {
    await post({ code: 'D010' });
    await post({ code: 'D010' });
    await post({ code: 'd010' });
    const doc = fakeDb.docs.get('logins/D010_pretest');
    expect(doc.loginCount).toBe(3);
    expect(doc.sessionCount).toBe(3);
    expect(doc.group).toBe('Deney');
    expect([...fakeDb.docs.keys()].filter((k) => k.startsWith('logins/'))).toEqual(['logins/D010_pretest']);
  });

  it('aktif aşama veritabanından okunur', async () => {
    fakeDb = createFakeDb({ 'settings/experiment': { activePhase: 'posttest' } });
    const res = await post({ code: 'D001' });
    expect(res.body.phase).toBe('posttest');
    expect(fakeDb.docs.has('logins/D001_posttest')).toBe(true);
  });

  it('tarayıcıdan gelen group ve phase alanları yok sayılır', async () => {
    const res = await post({ code: 'K001', group: 'Deney', phase: 'posttest' });
    expect(res.body).toEqual({ code: 'K001', group: 'Kontrol', phase: 'pretest' });
  });

  it('geçersiz aktif aşama değerinde pretest varsayılır', async () => {
    fakeDb = createFakeDb({ 'settings/experiment': { activePhase: 'bozuk' } });
    const res = await post({ code: 'K001' });
    expect(res.body.phase).toBe('pretest');
  });

  it('geçersiz kodda 400 döner ve hiçbir şey yazılmaz', async () => {
    for (const code of ['K031', 'X001', 'abc', 'K 001']) {
      const res = await post({ code });
      expect(res.statusCode).toBe(400);
      expect(res.body.hata).toMatch(/Geçersiz katılımcı kodu/);
    }
    expect(fakeDb.docs.size).toBe(0);
  });

  it('boş veya metin olmayan kodda 400 ve Türkçe uyarı', async () => {
    for (const body of [{}, { code: '   ' }, { code: 123 }, undefined]) {
      const res = await post(body);
      expect(res.statusCode).toBe(400);
      expect(res.body.hata).toMatch(/katılımcı kodunu girin/);
    }
    expect(fakeDb.docs.size).toBe(0);
  });

  it('GET isteğinde 405', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });

  it('veritabanı hatasında 500 ve genel Türkçe mesaj', async () => {
    fakeDb = {
      collection() {
        throw new Error('bağlantı yok');
      },
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post({ code: 'K001' });
    spy.mockRestore();
    expect(res.statusCode).toBe(500);
    expect(res.body.hata).toMatch(/Giriş şu anda yapılamıyor/);
  });
});
