// Yapay zeka istemcisi (api/_lib/ai.js) ve model eşlemesi testleri.
// Gerçek ağ isteği yapılmaz: fetch, bekleme ve saat taklit edilir.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateReply,
  buildContents,
  parseRetryDelay,
  AI_MESSAGES,
  AiError,
  ATTEMPT_TIMEOUT_MS,
  RETRY_DELAYS_MS,
  DEFAULT_BUDGET_MS,
} from '../api/_lib/ai.js';
import { MODEL_MAP, getModelConfig } from '../api/_lib/models.js';
import { buildSystemInstruction } from '../api/_lib/prompt.js';
import { MODEL_ORDER } from '../src/lib/footprint.js';

// Taklit HTTP yanıtı.
function httpResponse(status, data = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

const OK_DATA = {
  candidates: [{ content: { parts: [{ text: 'düşünce özeti', thought: true }, { text: 'Cevap.' }] } }],
  usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2, thoughtsTokenCount: 7 },
  modelVersion: 'surum-x',
};

// Sahte saat: sleep çağrıldıkça ilerler, böylece süre bütçesi gerçekten beklemeden denenir.
function fakeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    sleep: vi.fn(async (ms) => {
      t += ms;
    }),
    advance: (ms) => {
      t += ms;
    },
  };
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-anahtari';
});
afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

describe('model eşlemesi', () => {
  it('üç sınıfın her biri gerçekten farklı bir modele gider', () => {
    expect(Object.keys(MODEL_MAP).sort()).toEqual([...MODEL_ORDER].sort());
    const names = MODEL_ORDER.map((id) => MODEL_MAP[id].model);
    expect(new Set(names).size).toBe(3);
  });

  it('bilinmeyen sınıfta hata verir', () => {
    expect(() => getModelConfig('mega')).toThrow();
  });

  it('sistem talimatı marka yasağını ve sınıfa özel derinliği içerir', () => {
    const text = buildSystemInstruction('light');
    expect(text).toContain('Eğitim Asistanı');
    expect(text).toContain('KESİNLİKLE anma');
    expect(text).toContain('özlü');
    expect(buildSystemInstruction('reasoning')).toContain('adım adım');
  });
});

describe('buildContents', () => {
  it('geçmişi user/model sırasıyla ve yeni istemi sona ekler', () => {
    expect(buildContents([{ prompt: 'a', response: 'b' }], 'c')).toEqual([
      { role: 'user', parts: [{ text: 'a' }] },
      { role: 'model', parts: [{ text: 'b' }] },
      { role: 'user', parts: [{ text: 'c' }] },
    ]);
  });
});

describe('parseRetryDelay', () => {
  const body = (retryDelay) => ({
    error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] },
  });
  it('"6s" → 6000 ms, "1.5s" → 1500 ms', () => {
    expect(parseRetryDelay(body('6s'))).toBe(6000);
    expect(parseRetryDelay(body('1.5s'))).toBe(1500);
  });
  it('bilgi yoksa veya bozuksa null', () => {
    expect(parseRetryDelay({})).toBe(null);
    expect(parseRetryDelay(body('altı saniye'))).toBe(null);
    expect(parseRetryDelay(undefined)).toBe(null);
  });
});

describe('süre ayarları', () => {
  it('her sınıfın deneme sınırı toplam bütçeden kısa; böylece en az bir yeniden denemeye yer kalır', () => {
    for (const id of MODEL_ORDER) {
      expect(ATTEMPT_TIMEOUT_MS[id]).toBeGreaterThan(0);
      expect(ATTEMPT_TIMEOUT_MS[id]).toBeLessThan(DEFAULT_BUDGET_MS);
    }
  });
});

describe('generateReply', () => {
  it('başarılı yanıt: düşünce özeti metne katılmaz; anahtar URL değil başlıkta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(httpResponse(200, OK_DATA));
    const out = await generateReply({ modelId: 'reasoning', prompt: 'soru', fetchImpl });
    expect(out).toEqual({ text: 'Cevap.', usageMetadata: OK_DATA.usageMetadata, modelVersion: 'surum-x' });

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain(`${MODEL_MAP.reasoning.model}:generateContent`);
    expect(url).not.toContain('test-anahtari');
    expect(options.headers['x-goog-api-key']).toBe('test-anahtari');
    const sent = JSON.parse(options.body);
    expect(sent.generationConfig.thinkingConfig.thinkingLevel).toBe(MODEL_MAP.reasoning.thinkingLevel);
  });

  it('503 → yeniden dener → başarı', async () => {
    const clock = fakeClock();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(httpResponse(503))
      .mockResolvedValueOnce(httpResponse(503))
      .mockResolvedValueOnce(httpResponse(200, OK_DATA));
    const out = await generateReply({ modelId: 'standard', prompt: 'soru', fetchImpl, ...clock });
    expect(out.text).toBe('Cevap.');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(clock.sleep.mock.calls.map((c) => c[0])).toEqual([1000, 2000]);
  });

  it('3 denemede de 503 → "yoğun" mesajlı AiError (503)', async () => {
    const clock = fakeClock();
    const fetchImpl = vi.fn().mockResolvedValue(httpResponse(503, { error: { message: 'Gemini overloaded' } }));
    const err = await generateReply({ modelId: 'light', prompt: 'soru', fetchImpl, ...clock }).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.status).toBe(503);
    expect(err.message).toBe(AI_MESSAGES.busy);
    expect(err.message).not.toMatch(/gemini/i); // sağlayıcı metni sızmaz
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('400 → yeniden denemeden hata', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(httpResponse(400));
    const err = await generateReply({ modelId: 'light', prompt: 'soru', fetchImpl }).catch((e) => e);
    expect(err.status).toBe(502);
    expect(err.message).toBe(AI_MESSAGES.failed);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('boş metin → sahte yanıt yok, AiError', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(httpResponse(200, { candidates: [{ finishReason: 'SAFETY' }] }));
    const err = await generateReply({ modelId: 'light', prompt: 'soru', fetchImpl }).catch((e) => e);
    expect(err.message).toBe(AI_MESSAGES.empty);
  });

  it('süre bütçesi yeniden denemeye yetmiyorsa beklemeden durur', async () => {
    const clock = fakeClock();
    // İlk deneme 48 sn sürüp 503 dönüyor; 50 sn bütçede 1 sn bekleme + 3 sn deneme sığmaz.
    const fetchImpl = vi.fn(async () => {
      clock.advance(48_000);
      return httpResponse(503);
    });
    const err = await generateReply({
      modelId: 'reasoning',
      prompt: 'soru',
      fetchImpl,
      deadline: clock.now() + 50_000,
      ...clock,
    }).catch((e) => e);
    expect(err.status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(clock.sleep).not.toHaveBeenCalled();
  });

  it('istek süre bütçesini aşarsa iptal edilir ve Türkçe zaman aşımı hatası (504) döner', async () => {
    vi.useFakeTimers();
    try {
      // Hiç cevap vermeyen, yalnızca iptal sinyaline tepki veren sahte fetch.
      const fetchImpl = vi.fn(
        (url, { signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => {
              const e = new Error('iptal');
              e.name = 'AbortError';
              reject(e);
            });
          })
      );
      const promise = generateReply({ modelId: 'reasoning', prompt: 'soru', fetchImpl, deadline: Date.now() + 10_000 });
      const caught = promise.catch((e) => e);
      await vi.advanceTimersByTimeAsync(10_000);
      const err = await caught;
      expect(err.status).toBe(504);
      expect(err.message).toBe(AI_MESSAGES.timeout);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('asılı kalan deneme üst süreyle kesilir ve bütçe yettiği için yeniden denenir', async () => {
    vi.useFakeTimers();
    try {
      // 1. deneme hiç cevap vermiyor (yalnızca iptale tepki veriyor), 2. deneme hemen başarılı.
      const fetchImpl = vi
        .fn()
        .mockImplementationOnce(
          (url, { signal }) =>
            new Promise((resolve, reject) => {
              signal.addEventListener('abort', () => {
                const e = new Error('iptal');
                e.name = 'AbortError';
                reject(e);
              });
            })
        )
        .mockResolvedValueOnce(httpResponse(200, OK_DATA));

      const promise = generateReply({ modelId: 'light', prompt: 'soru', fetchImpl, deadline: Date.now() + 50_000 });
      // Hafif sınıfın deneme sınırı (20 sn) + 1 sn bekleme.
      await vi.advanceTimersByTimeAsync(ATTEMPT_TIMEOUT_MS.light + RETRY_DELAYS_MS[0]);
      const out = await promise;
      expect(out.text).toBe('Cevap.');
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('her deneme sürekli asılı kalırsa bütçe dolmadan Türkçe zaman aşımı (504) döner', async () => {
    vi.useFakeTimers();
    try {
      const hang = (url, { signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            const e = new Error('iptal');
            e.name = 'AbortError';
            reject(e);
          });
        });
      const fetchImpl = vi.fn(hang);
      const start = Date.now();
      const caught = generateReply({ modelId: 'standard', prompt: 'soru', fetchImpl, deadline: start + 50_000 }).catch(
        (e) => e
      );
      await vi.advanceTimersByTimeAsync(50_000);
      const err = await caught;
      expect(err.status).toBe(504);
      expect(err.message).toBe(AI_MESSAGES.timeout);
      // 20 sn + 1 sn bekleme + 20 sn = 41 sn; kalan 9 sn'de 3. deneme (bekleme 2 sn) kalan süreyle yapılır.
      expect(fetchImpl).toHaveBeenCalledTimes(3);
      expect(Date.now() - start).toBeLessThanOrEqual(50_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('429: sağlayıcının önerdiği bekleme süresi (retryDelay) kullanılır', async () => {
    const clock = fakeClock();
    const quotaBody = {
      error: {
        status: 'RESOURCE_EXHAUSTED',
        details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '6s' }],
      },
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(httpResponse(429, quotaBody))
      .mockResolvedValueOnce(httpResponse(200, OK_DATA));
    const out = await generateReply({ modelId: 'standard', prompt: 'soru', fetchImpl, ...clock });
    expect(out.text).toBe('Cevap.');
    expect(clock.sleep.mock.calls.map((c) => c[0])).toEqual([6000]);
  });

  it('429: önerilen bekleme bütçeye sığmıyorsa beklemeden "yoğun" hatası döner', async () => {
    const clock = fakeClock();
    const quotaBody = { error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '60s' }] } };
    const fetchImpl = vi.fn().mockResolvedValue(httpResponse(429, quotaBody));
    const err = await generateReply({ modelId: 'standard', prompt: 'soru', fetchImpl, ...clock }).catch((e) => e);
    expect(err.status).toBe(503);
    expect(err.message).toBe(AI_MESSAGES.busy);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(clock.sleep).not.toHaveBeenCalled();
  });

  it('anahtar tanımlı değilse ayar hatası', async () => {
    delete process.env.GEMINI_API_KEY;
    const err = await generateReply({ modelId: 'light', prompt: 'soru', fetchImpl: vi.fn() }).catch((e) => e);
    expect(err.message).toBe(AI_MESSAGES.config);
  });
});
