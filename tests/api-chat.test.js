// /api/chat uç noktası testleri. Sahte Firestore ve taklit yapay zeka kullanılır;
// gerçek veritabanına veya yapay zeka servisine istek gitmez.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeDb, createReq, createRes } from './helpers/fake-api.js';

let fakeDb;
vi.mock('../api/_lib/firebase.js', () => ({
  getDb: () => fakeDb,
  serverTimestamp: () => 'SUNUCU_ZAMANI',
  increment: (n) => ({ __increment: n }),
}));

// generateReply taklit edilir; AiError gerçek sınıf olarak kalır.
const generateReply = vi.fn();
vi.mock('../api/_lib/ai.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, generateReply: (...args) => generateReply(...args) };
});

const { default: handler, config, AI_DEADLINE_MS } = await import('../api/chat.js');
const { AiError, AI_MESSAGES } = await import('../api/_lib/ai.js');

async function post(body) {
  const res = createRes();
  await handler(createReq({ method: 'POST', body }), res);
  return res;
}

// Varsayılan başarılı yapay zeka yanıtı (düşünme tokenları dahil).
function okReply(overrides = {}) {
  return {
    text: 'Üçgenin iç açıları toplamı 180 derecedir.',
    usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, thoughtsTokenCount: 50 },
    modelVersion: 'motor-surum-1',
    ...overrides,
  };
}

// interactions koleksiyonundaki kayıtlar.
function interactions() {
  return [...fakeDb.docs].filter(([k]) => k.startsWith('interactions/')).map(([, v]) => v);
}

beforeEach(() => {
  fakeDb = createFakeDb();
  generateReply.mockReset();
  generateReply.mockResolvedValue(okReply());
});

describe('/api/chat — doğrulama', () => {
  it.each([
    [{ code: 'X999', modelId: 'light', prompt: 'merhaba' }, 'Geçersiz katılımcı kodu'],
    [{ code: 'K001', modelId: 'light', prompt: '   ' }, 'soru veya istem'],
    [{ code: 'K001', modelId: 'light', prompt: 'a'.repeat(4001) }, '4000'],
    [{ code: 'K001', modelId: 'super', prompt: 'merhaba' }, 'model seçin'],
  ])('%o → 400', async (body, fragment) => {
    const res = await post(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.hata).toContain(fragment);
    expect(generateReply).not.toHaveBeenCalled();
  });

  it('tam 4000 karakter kabul edilir', async () => {
    const res = await post({ code: 'K001', modelId: 'light', prompt: 'a'.repeat(4000) });
    expect(res.statusCode).toBe(200);
  });

  it('GET reddedilir', async () => {
    const res = createRes();
    await handler(createReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });
});

describe('/api/chat — başarılı istek', () => {
  it('kayıt sunucu değerleriyle yazılır; tarayıcının gönderdiği alanlar yok sayılır', async () => {
    const res = await post({
      code: 'k007',
      modelId: 'reasoning',
      prompt: '  Üçgenin iç açıları?  ',
      group: 'Deney',
      phase: 'posttest',
      inputTokens: 1,
      outputTokens: 1,
      createdAt: 'dün',
      isSample: true,
    });
    expect(res.statusCode).toBe(200);

    const [rec] = interactions();
    expect(rec.code).toBe('K007');
    expect(rec.group).toBe('Kontrol');
    expect(rec.phase).toBe('pretest');
    expect(rec.prompt).toBe('Üçgenin iç açıları?');
    expect(rec.createdAt).toBe('SUNUCU_ZAMANI');
    expect(rec.isSample).toBe(false);
    // Çıktı = candidates + thoughts = 30 + 50
    expect(rec.inputTokens).toBe(120);
    expect(rec.outputTokens).toBe(80);
    expect(rec.weightedTokens).toBe(120 + 3 * 80);
    expect(rec.tokenSource).toBe('gerçek');
    expect(rec.energyAvg).toBeCloseTo((360 / 1000) * 2.1, 10);
    expect(rec.savingsPct).toBeGreaterThan(0);
    expect(rec.engineVersion).toBe('motor-surum-1');
  });

  it('tarayıcıya yalnızca id, modelId, prompt, response, createdAt gider (çevresel alan ve engineVersion yok)', async () => {
    const res = await post({ code: 'D001', modelId: 'light', prompt: 'merhaba' });
    expect(Object.keys(res.body).sort()).toEqual(['message', 'phase']);
    expect(Object.keys(res.body.message).sort()).toEqual(['createdAt', 'id', 'modelId', 'prompt', 'response']);
    expect(JSON.stringify(res.body)).not.toContain('motor-surum-1');
  });

  it('aktif aşama veritabanından okunur ve yanıtta kaydın aşaması döner', async () => {
    fakeDb = createFakeDb({ 'settings/experiment': { activePhase: 'posttest' } });
    const res = await post({ code: 'D002', modelId: 'standard', prompt: 'merhaba', phase: 'pretest' });
    expect(res.body.phase).toBe('posttest');
    expect(interactions()[0].phase).toBe('posttest');
    expect(interactions()[0].group).toBe('Deney');
  });

  it('usageMetadata yoksa tahmin kullanılır ve tokenSource = tahmini', async () => {
    generateReply.mockResolvedValue(okReply({ usageMetadata: undefined, modelVersion: null }));
    await post({ code: 'K002', modelId: 'light', prompt: 'merhaba' });
    expect(interactions()[0].tokenSource).toBe('tahmini');
    expect(interactions()[0].engineVersion).toBe(null);
  });

  it('her istekte giriş kaydı güncellenir', async () => {
    await post({ code: 'K003', modelId: 'light', prompt: 'bir' });
    fakeDb.docs.set('rateLimits/K003', { lastRequestAt: 0 }); // hız sınırını sıfırla
    await post({ code: 'K003', modelId: 'light', prompt: 'iki' });
    expect(fakeDb.docs.get('logins/K003_pretest').loginCount).toBe(2);
  });

  it('geçmiş yalnızca kendi kodu + aktif aşamadan, eskiden yeniye gelir; örnek kayıtlar hariç', async () => {
    fakeDb = createFakeDb({
      'interactions/a': { code: 'K004', phase: 'pretest', prompt: 'ikinci', response: 'y2', createdAt: 200 },
      'interactions/b': { code: 'K004', phase: 'pretest', prompt: 'birinci', response: 'y1', createdAt: 100 },
      'interactions/c': { code: 'K004', phase: 'posttest', prompt: 'başka aşama', response: 'x', createdAt: 50 },
      'interactions/d': { code: 'K005', phase: 'pretest', prompt: 'başka öğrenci', response: 'x', createdAt: 50 },
      'interactions/e': { code: 'K004', phase: 'pretest', prompt: 'örnek', response: 'x', createdAt: 10, isSample: true },
    });
    await post({ code: 'K004', modelId: 'light', prompt: 'üçüncü' });
    const { history, prompt, modelId, deadline } = generateReply.mock.calls[0][0];
    expect(history).toEqual([
      { prompt: 'birinci', response: 'y1' },
      { prompt: 'ikinci', response: 'y2' },
    ]);
    expect(prompt).toBe('üçüncü');
    expect(modelId).toBe('light');
    expect(typeof deadline).toBe('number');
  });

  it('geçmiş en fazla son 12 etkileşimdir', async () => {
    const initial = {};
    for (let i = 1; i <= 15; i++) {
      initial[`interactions/m${i}`] = { code: 'K006', phase: 'pretest', prompt: `s${i}`, response: `c${i}`, createdAt: i };
    }
    fakeDb = createFakeDb(initial);
    await post({ code: 'K006', modelId: 'light', prompt: 'yeni' });
    const { history } = generateReply.mock.calls[0][0];
    expect(history).toHaveLength(12);
    expect(history[0].prompt).toBe('s4');
    expect(history[11].prompt).toBe('s15');
  });
});

describe('/api/chat — hız sınırı, hatalar ve süre', () => {
  it('3 saniye içinde ikinci istek 429 alır ve yapay zekaya gitmez', async () => {
    await post({ code: 'K010', modelId: 'light', prompt: 'bir' });
    const res = await post({ code: 'K010', modelId: 'light', prompt: 'iki' });
    expect(res.statusCode).toBe(429);
    expect(res.body.hata).toContain('bekleyip');
    expect(generateReply).toHaveBeenCalledTimes(1);
    expect(interactions()).toHaveLength(1);
  });

  it('farklı kodlar birbirini sınırlamaz', async () => {
    await post({ code: 'K011', modelId: 'light', prompt: 'bir' });
    const res = await post({ code: 'K012', modelId: 'light', prompt: 'iki' });
    expect(res.statusCode).toBe(200);
  });

  it('yapay zeka hatasında Türkçe hata döner, kayıt yazılmaz', async () => {
    generateReply.mockRejectedValue(new AiError(503, AI_MESSAGES.busy));
    const res = await post({ code: 'K013', modelId: 'standard', prompt: 'merhaba' });
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ hata: AI_MESSAGES.busy });
    expect(interactions()).toHaveLength(0);
  });

  it('beklenmeyen hatanın iç mesajı öğrenciye sızmaz', async () => {
    generateReply.mockRejectedValue(new Error('gizli iç ayrıntı'));
    const res = await post({ code: 'K014', modelId: 'light', prompt: 'merhaba' });
    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('gizli');
  });

  it('kayıt yazılamazsa 500 döner ve yanıt metni öğrenciye gönderilmez', async () => {
    fakeDb = createFakeDb({}, { failWritesTo: 'interactions' });
    const res = await post({ code: 'K015', modelId: 'light', prompt: 'merhaba' });
    expect(res.statusCode).toBe(500);
    expect(res.body.hata).toContain('kaydedilemedi');
    expect(JSON.stringify(res.body)).not.toContain('180 derece');
  });

  it('süre ayarı: yapay zeka bütçesi Vercel sınırından önce biter', () => {
    expect(config.maxDuration).toBeLessThanOrEqual(300); // Hobby üst sınırı
    expect(AI_DEADLINE_MS).toBeLessThan(config.maxDuration * 1000 - 5000); // veritabanı için pay
  });
});
