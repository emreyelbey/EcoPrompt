// Yönetici paneli uç noktaları testleri: /api/admin/data, /api/admin/record, /api/admin/clear.
// Sahte Firestore kullanılır; zaman damgaları testlerde milisaniye sayısıdır.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeDb, createReq, createRes } from './helpers/fake-api.js';

let fakeDb;
vi.mock('../api/_lib/firebase.js', () => ({
  getDb: () => fakeDb,
  serverTimestamp: () => 'SUNUCU_ZAMANI',
  increment: (n) => ({ __increment: n }),
  timestampFromMillis: (ms) => ms,
  documentIdField: () => '__name__',
}));

const { default: dataHandler } = await import('../api/admin/data.js');
const { default: recordHandler } = await import('../api/admin/record.js');
const { default: clearHandler } = await import('../api/admin/clear.js');
const { createAdminToken } = await import('../api/_lib/session.js');
const { PAGE_SIZE, OVERLAP_MS, ADMIN_LIST_FIELDS } = await import('../api/_lib/admin.js');

let token;

beforeEach(() => {
  process.env.SESSION_SECRET = 'test-gizli-anahtar-en-az-16-karakter';
  token = createAdminToken().token;
  fakeDb = createFakeDb();
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

// Örnek bir etkileşim kaydı (veritabanındaki biçim).
function record(overrides = {}) {
  return {
    code: 'K001',
    group: 'Kontrol',
    phase: 'pretest',
    modelId: 'light',
    prompt: 'Soru',
    response: 'Çok uzun bir yanıt metni',
    inputTokens: 100,
    outputTokens: 50,
    weightedTokens: 250,
    tokenSource: 'gerçek',
    energyAvg: 0.045,
    waterAvg: 0.045,
    co2Avg: 0.019,
    costUsd: 0.00003,
    savingsPct: 0,
    engineVersion: 'motor-surum-1',
    isSample: false,
    createdAt: 1000,
    ...overrides,
  };
}

async function call(handler, { method = 'GET', query = {}, body, auth = true } = {}) {
  const res = createRes();
  const headers = auth ? { authorization: `Bearer ${token}` } : {};
  await handler(createReq({ method, query, body, headers }), res);
  return res;
}

describe('yetki: tüm yeni uç noktalar yönetici token\'ı ister', () => {
  it.each([
    ['data GET', dataHandler, 'GET', {}],
    ['record GET', recordHandler, 'GET', { id: 'a' }],
    ['record DELETE', recordHandler, 'DELETE', { id: 'a' }],
    ['clear GET', clearHandler, 'GET', {}],
    ['clear POST', clearHandler, 'POST', {}],
  ])('%s token yokken 401', async (_name, handler, method, query) => {
    fakeDb = createFakeDb({ 'interactions/a': record() });
    const res = await call(handler, { method, query, body: { confirm: 'SİL' }, auth: false });
    expect(res.statusCode).toBe(401);
    expect(fakeDb.docs.has('interactions/a')).toBe(true);
  });

  it('bozuk token da 401', async () => {
    token = 'sahte.token';
    const res = await call(dataHandler);
    expect(res.statusCode).toBe(401);
  });
});

describe('/api/admin/data', () => {
  it('liste uzun yanıtı ve engineVersion\'ı içermez; veritabanından da istenmez', async () => {
    fakeDb = createFakeDb({ 'interactions/a': record() });
    const res = await call(dataHandler);
    expect(res.statusCode).toBe(200);
    const item = res.body.interactions[0];
    expect(item.id).toBe('a');
    expect(item.prompt).toBe('Soru');
    expect(item).not.toHaveProperty('response');
    expect(item).not.toHaveProperty('engineVersion');
    expect(Object.keys(item).sort()).toEqual(['id', ...ADMIN_LIST_FIELDS].sort());
    // Sorguda select() ile yalnızca liste alanları istendi.
    const call0 = fakeDb.selectCalls.find((c) => c.collection === 'interactions');
    expect(call0.fields).not.toContain('response');
    expect(call0.fields).not.toContain('engineVersion');
  });

  it('kayıtlar zamana göre sıralı; giriş kayıtları ve aktif aşama da döner', async () => {
    fakeDb = createFakeDb({
      'interactions/b': record({ createdAt: 2000 }),
      'interactions/a': record({ createdAt: 1000 }),
      'logins/K001_pretest': { code: 'K001', group: 'Kontrol', phase: 'pretest', firstLoginAt: 500, lastLoginAt: 900, loginCount: 3, sessionCount: 1 },
      'settings/experiment': { activePhase: 'posttest' },
    });
    const res = await call(dataHandler);
    expect(res.body.interactions.map((i) => i.id)).toEqual(['a', 'b']);
    expect(res.body.logins).toEqual([
      { id: 'K001_pretest', code: 'K001', group: 'Kontrol', phase: 'pretest', firstLoginAt: 500, lastLoginAt: 900, loginCount: 3, sessionCount: 1 },
    ]);
    expect(res.body.phase).toBe('posttest');
    expect(res.body.hasMore).toBe(false);
  });

  it('artımlı okuma: yalnızca since − 5 sn sonrasındaki kayıtlar gelir', async () => {
    const since = 100_000;
    fakeDb = createFakeDb({
      'interactions/eski': record({ createdAt: since - OVERLAP_MS - 1 }),
      'interactions/ortusme': record({ createdAt: since - 1000 }),
      'interactions/yeni': record({ createdAt: since + 1 }),
      'logins/K001_pretest': { code: 'K001', lastLoginAt: since - OVERLAP_MS - 1 },
      'logins/K002_pretest': { code: 'K002', lastLoginAt: since + 10 },
    });
    const res = await call(dataHandler, { query: { since: String(since), loginsSince: String(since) } });
    expect(res.body.interactions.map((i) => i.id)).toEqual(['ortusme', 'yeni']);
    expect(res.body.logins.map((l) => l.id)).toEqual(['K002_pretest']);
  });

  it('sayfalama: PAGE_SIZE dolunca hasMore ve imleç döner; imleçle kalanlar gelir', async () => {
    const initial = {};
    for (let i = 0; i < PAGE_SIZE + 3; i++) {
      // Bazı kayıtlar aynı zamanda: kimliğe göre ikinci sıralama kayıt kaçırmamalı.
      initial[`interactions/r${String(i).padStart(4, '0')}`] = record({ createdAt: 1000 + Math.floor(i / 2) });
    }
    fakeDb = createFakeDb(initial);

    const first = await call(dataHandler);
    expect(first.body.interactions).toHaveLength(PAGE_SIZE);
    expect(first.body.hasMore).toBe(true);

    const { t, id } = first.body.next;
    const second = await call(dataHandler, { query: { afterT: String(t), afterId: id } });
    expect(second.body.interactions).toHaveLength(3);
    expect(second.body.hasMore).toBe(false);
    expect(second.body.logins).toBe(null);

    const ids = [...first.body.interactions, ...second.body.interactions].map((i) => i.id);
    expect(new Set(ids).size).toBe(PAGE_SIZE + 3);
  });

  it('POST reddedilir', async () => {
    const res = await call(dataHandler, { method: 'POST' });
    expect(res.statusCode).toBe(405);
  });
});

describe('/api/admin/record', () => {
  it('GET tam yanıtı döner, engineVersion yok', async () => {
    fakeDb = createFakeDb({ 'interactions/a': record() });
    const res = await call(recordHandler, { query: { id: 'a' } });
    expect(res.statusCode).toBe(200);
    expect(res.body.record.response).toBe('Çok uzun bir yanıt metni');
    expect(res.body.record).not.toHaveProperty('engineVersion');
    expect(JSON.stringify(res.body)).not.toContain('motor-surum');
  });

  it('DELETE yalnızca o kaydı siler', async () => {
    fakeDb = createFakeDb({ 'interactions/a': record(), 'interactions/b': record() });
    const res = await call(recordHandler, { method: 'DELETE', query: { id: 'a' } });
    expect(res.statusCode).toBe(200);
    expect(fakeDb.docs.has('interactions/a')).toBe(false);
    expect(fakeDb.docs.has('interactions/b')).toBe(true);
  });

  it('olmayan kayıt 404, geçersiz kimlik 400', async () => {
    expect((await call(recordHandler, { query: { id: 'yok' } })).statusCode).toBe(404);
    expect((await call(recordHandler, { query: { id: '../settings' } })).statusCode).toBe(400);
    expect((await call(recordHandler, { query: {} })).statusCode).toBe(400);
  });
});

describe('/api/admin/clear — "SİL" / "SIL" güvencesi', () => {
  function fullDb() {
    return createFakeDb({
      'interactions/a': record(),
      'interactions/b': record(),
      'logins/K001_pretest': { code: 'K001', lastLoginAt: 1 },
      'rateLimits/K001': { lastRequestAt: 1 },
      'settings/experiment': { activePhase: 'posttest' },
    });
  }

  it('GET silinecek sayıları döner ve hiçbir şey silmez', async () => {
    fakeDb = fullDb();
    const res = await call(clearHandler);
    expect(res.statusCode).toBe(200);
    expect(res.body.counts).toEqual({ interactions: 2, logins: 1, rateLimits: 1 });
    expect(fakeDb.docs.size).toBe(5);
  });

  it.each([
    ['gövde yok', undefined],
    ['confirm yok', {}],
    ['küçük harf', { confirm: 'sil' }],
    ['ilk harf büyük', { confirm: 'Sil' }],
    ['fazla harf', { confirm: 'SILL' }],
    ['boş metin', { confirm: '' }],
    ['boşluklu', { confirm: ' SİL ' }],
    ['true', { confirm: true }],
    ['eski alan adı', { onay: true }],
  ])('%s → 400 ve veri yerinde kalır', async (_name, body) => {
    fakeDb = fullDb();
    const res = await call(clearHandler, { method: 'POST', body });
    expect(res.statusCode).toBe(400);
    expect(res.body.hata).toContain('SİL');
    expect(fakeDb.docs.size).toBe(5);
  });

  it.each(['SİL', 'SIL'])('confirm: "%s" → üç koleksiyon boşalır, settings/experiment kalır', async (confirm) => {
    fakeDb = fullDb();
    const res = await call(clearHandler, { method: 'POST', body: { confirm } });
    expect(res.statusCode).toBe(200);
    expect(res.body.deleted).toEqual({ interactions: 2, logins: 1, rateLimits: 1 });
    expect([...fakeDb.docs.keys()]).toEqual(['settings/experiment']);
    expect(fakeDb.docs.get('settings/experiment').activePhase).toBe('posttest');
  });

  it('500\'den fazla belge gruplar hâlinde silinir', async () => {
    const initial = {};
    for (let i = 0; i < 1203; i++) initial[`interactions/r${i}`] = record();
    fakeDb = createFakeDb(initial);
    const res = await call(clearHandler, { method: 'POST', body: { confirm: 'SİL' } });
    expect(res.body.deleted.interactions).toBe(1203);
    expect(fakeDb.docs.size).toBe(0);
  });
});
