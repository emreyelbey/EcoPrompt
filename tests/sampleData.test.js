// Örnek veri üreticisi testleri (src/lib/sampleData.js).
// Güvenceler: deterministik (her seferinde aynı veri), ayrı kodlar (60 gerçek koddan hiçbiri yok),
// her kayıt isSample: true, dört hücrede de veri var, gruplar ve aşamalar aynı parametrelerle üretilir.
// BİLEREK yazılmayan test: "şu test anlamlı çıkmalı". Örnek veri nötrdür; sonuç ayarlanmaz.
import { describe, it, expect } from 'vitest';
import { generateSampleData, createRandom, SAMPLE_CODES, SAMPLE_CODE_GROUPS, SAMPLE_PARAMS } from '../src/lib/sampleData.js';
import { ALL_CODES, isValidCode } from '../src/lib/participants.js';
import { calculateFootprint } from '../src/lib/footprint.js';

const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);
const { records, logins } = generateSampleData(NOW);

describe('örnek veri üreticisi', () => {
  it('deterministiktir: iki çağrı birebir aynı veriyi verir', () => {
    expect(generateSampleData(NOW)).toEqual({ records, logins });
  });

  it('sözde rastgele üretici aynı tohumla aynı diziyi, farklı tohumla farklı diziyi verir', () => {
    const a = createRandom(1);
    const b = createRandom(1);
    const c = createRandom(2);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
    for (const x of seqA) expect(x >= 0 && x < 1).toBe(true);
  });

  it('40 ayrı kod: OK01–OK20 Kontrol, OD01–OD20 Deney (gerçek deneyin asıl katılımcı sayısı); hiçbiri gerçek kod değil', () => {
    expect(SAMPLE_CODES).toHaveLength(40);
    expect(SAMPLE_CODES.filter((c) => c.startsWith('OK'))).toHaveLength(20);
    for (const code of SAMPLE_CODES) {
      expect(ALL_CODES).not.toContain(code);
      expect(isValidCode(code)).toBe(false); // öğrenci giriş ekranında da kullanılamaz
      expect(SAMPLE_CODE_GROUPS[code]).toBe(code.startsWith('OK') ? 'Kontrol' : 'Deney');
    }
  });

  it('her kayıt ve giriş yalnızca örnek kodları kullanır; her kayıtta isSample: true', () => {
    for (const r of records) {
      expect(SAMPLE_CODES).toContain(r.code);
      expect(r.group).toBe(SAMPLE_CODE_GROUPS[r.code]);
      expect(r.isSample).toBe(true);
      expect(typeof r.response).toBe('string');
    }
    for (const l of logins) expect(SAMPLE_CODES).toContain(l.code);
  });

  it('dört hücrede (Kontrol/Deney × Ön/Son Test) kayıt var; her kod iki aşamada da giriş yapmış', () => {
    for (const group of ['Kontrol', 'Deney']) {
      for (const phase of ['pretest', 'posttest']) {
        expect(records.some((r) => r.group === group && r.phase === phase)).toBe(true);
      }
    }
    expect(logins).toHaveLength(80);
  });

  it('kişi başına istem sayısı ve tokenlar tek parametre setinin sınırları içinde', () => {
    const counts = new Map();
    for (const r of records) {
      const key = `${r.code}|${r.phase}`;
      counts.set(key, (counts.get(key) || 0) + 1);
      expect(r.inputTokens).toBeGreaterThanOrEqual(SAMPLE_PARAMS.inputTokens.min);
      expect(r.inputTokens).toBeLessThanOrEqual(SAMPLE_PARAMS.inputTokens.max);
      expect(r.outputTokens).toBeGreaterThanOrEqual(SAMPLE_PARAMS.outputTokens.min);
      expect(r.outputTokens).toBeLessThanOrEqual(SAMPLE_PARAMS.outputTokens.max);
    }
    expect(counts.size).toBe(80);
    for (const n of counts.values()) {
      expect(n).toBeGreaterThanOrEqual(SAMPLE_PARAMS.promptsPerParticipant.min);
      expect(n).toBeLessThanOrEqual(SAMPLE_PARAMS.promptsPerParticipant.max);
    }
  });

  it('ayak izi footprint.js ile hesaplanır (yeni formül yok)', () => {
    const r = records[0];
    expect(r).toMatchObject(calculateFootprint(r.inputTokens, r.outputTokens, r.modelId));
  });
});
