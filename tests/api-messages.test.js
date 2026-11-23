// /api/messages ve toClientMessage testleri: öğrenci yalnızca kendi kodu + aktif aşamanın
// mesajlarını alır; çevresel alanlar ve engineVersion tarayıcıya asla çıkmaz.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeDb, createReq, createRes } from './helpers/fake-api.js';
import {
  toClientMessage,
  toEcoClientMessage,
  toStudentMessage,
  ECO_CLIENT_FIELDS,
} from '../api/_lib/interactions.js';

let fakeDb;
vi.mock('../api/_lib/firebase.js', () => ({
  getDb: () => fakeDb,
  serverTimestamp: () => 'SUNUCU_ZAMANI',
  increment: (n) => ({ __increment: n }),
}));

const { default: handler } = await import('../api/messages.js');

async function post(body) {
  const res = createRes();
  await handler(createReq({ method: 'POST', body }), res);
  return res;
}

// Tam bir kayıt (Firestore'daki gibi bütün alanlarıyla).
const fullRecord = {
  code: 'D003',
  group: 'Deney',
  phase: 'pretest',
  modelId: 'standard',
  prompt: 'soru',
  response: 'cevap',
  inputTokens: 10,
  outputTokens: 20,
  weightedTokens: 70,
  tokenSource: 'gerçek',
  energyMin: 1,
  energyAvg: 2,
  energyMax: 3,
  waterMin: 1,
  waterAvg: 2,
  waterMax: 3,
  co2Min: 1,
  co2Avg: 2,
  co2Max: 3,
  costUsd: 0.1,
  savingsPct: 72,
  engineVersion: 'motor-surum-9',
  isSample: false,
  createdAt: { toMillis: () => Date.UTC(2026, 10, 23, 9, 0, 0) },
};

describe('toClientMessage', () => {
  it('yalnızca izin verilen beş alanı döner; engineVersion ve çevresel alanlar çıkmaz', () => {
    const msg = toClientMessage('abc', fullRecord);
    expect(msg).toEqual({
      id: 'abc',
      modelId: 'standard',
      prompt: 'soru',
      response: 'cevap',
      createdAt: '2026-11-23T09:00:00.000Z',
    });
    expect(msg).not.toHaveProperty('engineVersion');
    expect(JSON.stringify(msg)).not.toContain('motor-surum-9');
  });
});

describe('toEcoClientMessage / toStudentMessage', () => {
  it('eco nesnesinde tam olarak izinli alanlar bulunur', () => {
    const msg = toEcoClientMessage('abc', fullRecord);
    expect(Object.keys(msg).sort()).toEqual(['createdAt', 'eco', 'id', 'modelId', 'prompt', 'response']);
    expect(Object.keys(msg.eco).sort()).toEqual([...ECO_CLIENT_FIELDS].sort());
    expect(ECO_CLIENT_FIELDS).not.toContain('costUsd');
    expect(ECO_CLIENT_FIELDS).not.toContain('engineVersion');
    expect(JSON.stringify(msg)).not.toContain('motor-surum-9');
  });

  it('görünüm sade ise toClientMessage ile aynıdır', () => {
    expect(toStudentMessage('abc', fullRecord, 'sade')).toEqual(toClientMessage('abc', fullRecord));
    expect(toStudentMessage('abc', fullRecord, undefined)).toEqual(toClientMessage('abc', fullRecord));
    expect(toStudentMessage('abc', fullRecord, 'ekotoken')).toHaveProperty('eco');
  });
});

beforeEach(() => {
  fakeDb = createFakeDb({
    'interactions/a': { ...fullRecord, prompt: 'ikinci', createdAt: 200 },
    'interactions/b': { ...fullRecord, prompt: 'birinci', createdAt: 100 },
    'interactions/c': { ...fullRecord, phase: 'posttest', prompt: 'son test' },
    'interactions/d': { ...fullRecord, code: 'D004', prompt: 'başkası' },
  });
});

describe('/api/messages', () => {
  it('kendi kodu + aktif aşama, eskiden yeniye; giriş kaydı güncellenir', async () => {
    const res = await post({ code: 'd003' });
    expect(res.statusCode).toBe(200);
    expect(res.body.phase).toBe('pretest');
    expect(res.body.messages.map((m) => m.prompt)).toEqual(['birinci', 'ikinci']);
    expect(JSON.stringify(res.body)).not.toContain('motor-surum-9');
    expect(JSON.stringify(res.body)).not.toContain('energy');
    expect(fakeDb.docs.get('logins/D003_pretest').loginCount).toBe(1);
  });

  it('Son Test aktifken yalnızca Son Test mesajları gelir', async () => {
    fakeDb.docs.set('settings/experiment', { activePhase: 'posttest' });
    const res = await post({ code: 'D003' });
    expect(res.body.messages.map((m) => m.prompt)).toEqual(['son test']);
  });

  // KÖR DENEY: çevresel alanlar yalnızca Deney + Son Test görünümüne eklenir.
  it.each([
    ['Kontrol grubu, Son Test', 'K003', 'posttest'],
    ['Kontrol grubu, Ön Test', 'K003', 'pretest'],
    ['Deney grubu, Ön Test', 'D003', 'pretest'],
  ])('%s → sade mesajlar, çevresel alan yok', async (_ad, code, phase) => {
    fakeDb = createFakeDb({
      'settings/experiment': { activePhase: phase },
      'interactions/x': { ...fullRecord, code, group: code.startsWith('K') ? 'Kontrol' : 'Deney', phase },
    });
    const res = await post({ code });
    expect(res.body.messages).toHaveLength(1);
    expect(Object.keys(res.body.messages[0]).sort()).toEqual(['createdAt', 'id', 'modelId', 'prompt', 'response']);
    const json = JSON.stringify(res.body);
    for (const word of ['eco', 'energy', 'water', 'co2', 'savingsPct', 'inputTokens', 'outputTokens', 'tokenSource', 'costUsd', 'weightedTokens', 'motor-surum-9']) {
      expect(json).not.toContain(word);
    }
  });

  it('Deney grubu, Son Test → eco alanı kayıttaki değerlerle gelir; costUsd ve engineVersion yok', async () => {
    fakeDb.docs.set('settings/experiment', { activePhase: 'posttest' });
    const res = await post({ code: 'D003' });
    const [msg] = res.body.messages;
    expect(msg.prompt).toBe('son test');
    expect(msg.eco).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      tokenSource: 'gerçek',
      energyMin: 1,
      energyAvg: 2,
      energyMax: 3,
      waterMin: 1,
      waterAvg: 2,
      waterMax: 3,
      co2Min: 1,
      co2Avg: 2,
      co2Max: 3,
      savingsPct: 72,
    });
    const json = JSON.stringify(res.body);
    for (const word of ['costUsd', 'weightedTokens', 'engineVersion', 'motor-surum-9']) expect(json).not.toContain(word);
  });

  it('geçersiz kod 400', async () => {
    const res = await post({ code: 'A1' });
    expect(res.statusCode).toBe(400);
  });
});
