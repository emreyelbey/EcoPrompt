// src/lib/statsReport.js testleri: 4 kanonik test, Cohen's d, eşleşen n, Türkçe yorumlar,
// net değişim kartları. Sabit veri setinin beklenen değerleri dogrulama/tcheck.py çıktısından alınmıştır
// (panelin hesabı ile bağımsız Python hesabı aynı sonucu vermeli).
import { describe, it, expect } from 'vitest';
import {
  PRIMARY_METRIC,
  METRIC_META,
  buildStatsReport,
  interpretTest,
  participantRows,
  runCanonicalTests,
  testVerdict,
  pPhrase,
} from '../src/lib/statsReport.js';
import { fixtureRecords, interaction, loginsFor } from './helpers/stats-fixture.js';

const records = fixtureRecords();
const logins = loginsFor(records);
const byId = (report) => Object.fromEntries(report.tests.map((t) => [t.id, t]));

describe('birincil ölçüt', () => {
  it('birincil ölçüt Toplam Enerji (Wh)', () => {
    expect(PRIMARY_METRIC).toBe('energy');
    expect(METRIC_META.energy.primary).toBe(true);
    expect(Object.values(METRIC_META).filter((m) => m.primary)).toHaveLength(1);
    expect(buildStatsReport(records, logins).metric).toBe('energy');
  });
});

describe('sabit veri seti: panel = tcheck.py', () => {
  const t = byId(buildStatsReport(records, logins));

  it('1) Başlangıç denkliği (Welch)', () => {
    expect(t.baseline.result.t).toBeCloseTo(-0.06311944031, 9);
    expect(t.baseline.result.df).toBeCloseTo(7.927520959, 8);
    expect(t.baseline.result.p).toBeCloseTo(0.95123385, 6);
    expect(t.baseline.d).toBeCloseTo(-0.0399202392, 9);
    expect(t.baseline.dLabel).toBe('ihmal edilebilir');
    expect(t.baseline.counts).toEqual({ n1: 5, n2: 5 });
    expect(t.baseline.means[0]).toBeCloseTo(3.3, 10);
    expect(t.baseline.means[1]).toBeCloseTo(3.32, 10);
    expect(testVerdict(t.baseline)).toBe('Anlamlı değil');
  });

  it('2) Kontrol Ön → Son (eşleştirilmiş)', () => {
    expect(t.kontrol.result.t).toBeCloseTo(-0.5345224838, 9);
    expect(t.kontrol.result.p).toBeCloseTo(0.6213083, 6);
    expect(t.kontrol.d).toBeCloseTo(-0.2390457219, 9);
    expect(t.kontrol.counts).toEqual({ nPre: 5, nPost: 5, nPaired: 5 });
  });

  it('3) Deney Ön → Son (eşleştirilmiş)', () => {
    expect(t.deney.result.t).toBeCloseTo(-9.797958971, 8);
    expect(t.deney.result.p).toBeCloseTo(0.000608185, 7);
    expect(t.deney.d).toBeCloseTo(-4.38178046, 8);
    expect(t.deney.dLabel).toBe('büyük');
    expect(testVerdict(t.deney)).toBe('Anlamlı');
  });

  it('4) Son Test grup farkı (Welch)', () => {
    expect(t.posttest.result.t).toBeCloseTo(4.295003938, 8);
    expect(t.posttest.result.p).toBeCloseTo(0.002869235, 7);
    expect(t.posttest.d).toBeCloseTo(2.716399, 6);
  });

  it('betimsel tablo: 4 hücre, n, ortalama ve SS', () => {
    const report = buildStatsReport(records, logins);
    expect(report.descriptives.map((c) => c.label)).toEqual([
      'Kontrol — Ön Test',
      'Kontrol — Son Test',
      'Deney — Ön Test',
      'Deney — Son Test',
    ]);
    expect(report.descriptives.every((c) => c.n === 5)).toBe(true);
    expect(report.descriptives[3].mean).toBeCloseTo(2.12, 10);
  });
});

describe('Türkçe yorumlar', () => {
  const t = byId(buildStatsReport(records, logins));

  it('başlangıç denkliği sağlanmışsa sade dille "fark yok, denk başladı" der', () => {
    expect(t.baseline.interpretation).toMatch(/^p = 0,95\d+ ≥ 0,05: Ön Test'te iki grup arasında anlamlı bir fark yok/);
    expect(t.baseline.interpretation).toContain('benzer düzeyde başladı');
    expect(t.baseline.interpretation).toContain('Etki büyüklüğü ihmal edilebilir (d = -0,04)');
  });

  it('Deney grubunda anlamlı azalma: yönü ortalamalarla ve etki büyüklüğüyle söyler', () => {
    expect(t.deney.interpretation).toContain('p < 0,001 < 0,05');
    expect(t.deney.interpretation).toContain('Deney grubunda Ön Test\'ten Son Test\'e anlamlı bir azalma var');
    expect(t.deney.interpretation).toContain('3,32 Wh → 2,12 Wh');
    expect(t.deney.interpretation).toContain('eğitim ve EkoToken arayüzünün beklenen etkisiyle uyumlu');
    expect(t.deney.interpretation).toContain('Etki büyüklüğü büyük (d = -4,38)');
  });

  it('Kontrol grubunda anlamlı değişim yoksa "tesadüf olabilir" der', () => {
    expect(t.kontrol.interpretation).toContain('Kontrol grubunda Ön Test ile Son Test arasında anlamlı bir değişim yok');
    expect(t.kontrol.interpretation).toContain('tesadüf olabilir');
  });

  it('Son Test farkı anlamlıysa hangi grubun daha düşük olduğunu söyler', () => {
    expect(t.posttest.interpretation).toContain('Son Test\'te iki grup arasında anlamlı bir fark var');
    expect(t.posttest.interpretation).toContain('Deney grubunun ortalaması Kontrol grubundan daha düşük');
  });

  it('Kontrol grubunda anlamlı ARTIŞ varsa uyarı ekler', () => {
    const recs = [];
    const pre = [1.0, 1.2, 0.9, 1.1, 1.0];
    const post = [2.0, 2.3, 1.8, 2.2, 2.1];
    pre.forEach((v, i) => {
      const code = `K00${i + 1}`;
      recs.push(interaction(code, 'pretest', v), interaction(code, 'posttest', post[i]));
    });
    const k = byId(buildStatsReport(recs, loginsFor(recs))).kontrol;
    expect(k.significant).toBe(true);
    expect(k.interpretation).toContain('anlamlı bir artış var');
    expect(k.interpretation).toContain('Kontrol grubu eğitim almadığı için');
  });

  it('p tam 0,05 ise anlamlı SAYILMAZ (p < 0,05 kuralı)', () => {
    const fake = { id: 'baseline', result: { valid: true, p: 0.05 }, means: [1, 2], d: null };
    const text = interpretTest(fake, 'energy');
    expect(text).toMatch(/^p = 0,0500 ≥ 0,05: /);
    expect(text).toContain('anlamlı bir fark yok');
  });

  it('pPhrase: küçük p değerinde "p < 0,001" yazar', () => {
    expect(pPhrase(0.0001)).toBe('p < 0,001');
    expect(pPhrase(0.25)).toBe('p = 0,2500');
  });
});

describe('uç durumlar ve eksik veri', () => {
  it('veri yoksa 4 test de çökmeden "Hesaplanamadı" + Türkçe gerekçe verir', () => {
    const report = buildStatsReport([], []);
    for (const test of report.tests) {
      expect(test.result.valid).toBe(false);
      expect(test.interpretation).toMatch(/^Hesaplanamadı: .*en az 2 katılımcı/);
      expect(test.d).toBeNull();
      expect(testVerdict(test)).toBe('Hesaplanamadı');
    }
    expect(report.changeCards.every((c) => c.Kontrol.pct === null && c.Deney.pct === null)).toBe(true);
  });

  it('varyans 0 ise "hesaplanamadı" gerekçesi gösterilir', () => {
    // Herkesin farkı aynı: −1,0
    const recs = [];
    [3, 4, 5].forEach((v, i) => recs.push(interaction(`D00${i + 1}`, 'pretest', v), interaction(`D00${i + 1}`, 'posttest', v - 1)));
    const deney = byId(buildStatsReport(recs, loginsFor(recs))).deney;
    expect(deney.result.valid).toBe(false);
    expect(deney.interpretation).toContain('farkların standart sapması 0');
  });

  it('eşleştirilmiş testte n yalnızca iki aşamada da verisi olanları sayar (Ön Test 6, Son Test 5, eşleşen 5)', () => {
    const recs = [...records, interaction('D010', 'pretest', 3.0)]; // yalnızca Ön Test'e katıldı
    const deney = byId(buildStatsReport(recs, loginsFor(recs))).deney;
    expect(deney.counts).toEqual({ nPre: 6, nPost: 5, nPaired: 5 });
    // Test sonucu değişmez: D010 eşleşmediği için teste girmez.
    expect(deney.result.t).toBeCloseTo(-9.797958971, 8);
  });

  it('örnek kayıtlar hiçbir hesaba girmez', () => {
    const withSamples = [...records, interaction('D001', 'posttest', 999, { isSample: true }), interaction('K020', 'pretest', 50, { isSample: true })];
    const a = buildStatsReport(records, logins);
    const b = buildStatsReport(withSamples, logins);
    expect(b.tests.map((t) => t.result.t)).toEqual(a.tests.map((t) => t.result.t));
    expect(b.descriptives).toEqual(a.descriptives);
  });

  it("su ve CO₂ testleri enerjiyle aynı t, p ve d'yi verir", () => {
    const rows = participantRows(records, logins);
    const energy = runCanonicalTests(rows, 'energy');
    for (const metric of ['water', 'co2']) {
      runCanonicalTests(rows, metric).forEach((test, i) => {
        expect(test.result.t).toBeCloseTo(energy[i].result.t, 9);
        expect(test.result.p).toBeCloseTo(energy[i].result.p, 9);
        expect(test.d).toBeCloseTo(energy[i].d, 9);
      });
    }
  });

  it('"zero" politikası: giriş yapıp istem yazmayan öğrenci 0 ile girer, istem başına enerji tanımsız kalır', () => {
    const recs = [...records];
    const lg = [...loginsFor(records), { code: 'D006', phase: 'pretest' }];
    const report = buildStatsReport(recs, lg, { policy: 'zero' });
    expect(report.descriptives[2].n).toBe(6); // Deney Ön Test: D006 dahil
    const perPrompt = buildStatsReport(recs, lg, { policy: 'zero', metric: 'energyPerPrompt' });
    expect(perPrompt.descriptives[2].n).toBe(5); // 0 istemde tanımsız → dışarıda
  });
});

describe('net değişim kartları ve grafik verisi', () => {
  const report = buildStatsReport(records, logins);

  it('şartnamedeki 4 kart: İstem, Su, Enerji, CO₂', () => {
    expect(report.changeCards.map((c) => c.metric)).toEqual(['prompts', 'water', 'energy', 'co2']);
  });

  it('yüzde değişim öğrenci başına ortalamalardan hesaplanır', () => {
    const energy = report.changeCards.find((c) => c.metric === 'energy');
    expect(energy.Deney.pct).toBeCloseTo(((2.12 - 3.32) / 3.32) * 100, 9);
    expect(energy.Kontrol.pct).toBeCloseTo(((3.24 - 3.3) / 3.3) * 100, 9);
  });

  it('grafik verisi Kontrol ve Deney için Ön/Son ortalamalarını içerir', () => {
    expect(report.metricChart[1].name).toBe('Deney Grubu');
    expect(report.metricChart[1]['Ön Test']).toBeCloseTo(3.32, 10);
    expect(report.promptChart[0]['Son Test']).toBe(1);
  });
});
