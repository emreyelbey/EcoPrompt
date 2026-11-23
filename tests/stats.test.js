// src/lib/stats.js testleri.
// Beklenen değerler iki kaynaktan gelir:
// 1) Standart t-tablosu değerleri (proje rehberi Bölüm 6'daki zorunlu testler).
// 2) Bağımsız bir hesap: t dağılımının yoğunluk fonksiyonunun Simpson yöntemiyle sayısal
//    integrali (saf Python). Bu yöntem buradaki sürekli kesir algoritmasından tamamen farklıdır;
//    aynı sonucu vermesi hesabın doğru olduğunu gösterir.
import { describe, it, expect } from 'vitest';
import {
  studentTTwoTailedP,
  calcDescriptives,
  welchTTest,
  pairedTTest,
  aggregateByParticipant,
  getValues,
  getPairs,
  ZERO_PROMPT_POLICY,
  cohensDIndependent,
  cohensDPaired,
  effectSizeLabel,
} from '../src/lib/stats.js';

describe('studentTTwoTailedP — zorunlu testler', () => {
  it('p(t = 2,0; sd = 10) = 0,073388', () => {
    expect(studentTTwoTailedP(2.0, 10)).toBeCloseTo(0.073388, 6);
  });

  it('p(t = 2,228139; sd = 10) = 0,05', () => {
    expect(studentTTwoTailedP(2.228139, 10)).toBeCloseTo(0.05, 6);
  });

  it('p(t = −3,5; sd = 4) = 0,024896', () => {
    expect(studentTTwoTailedP(-3.5, 4)).toBeCloseTo(0.024896, 6);
  });
});

describe('studentTTwoTailedP — temel özellikler', () => {
  it('t = 0 ise p = 1', () => {
    expect(studentTTwoTailedP(0, 10)).toBe(1);
  });

  it('simetriktir: p(t) = p(−t)', () => {
    expect(studentTTwoTailedP(-1.7, 7)).toBeCloseTo(studentTTwoTailedP(1.7, 7), 12);
  });

  it('t büyüdükçe p küçülür', () => {
    expect(studentTTwoTailedP(3, 10)).toBeLessThan(studentTTwoTailedP(2, 10));
  });

  it('geçersiz girdide null döner', () => {
    expect(studentTTwoTailedP(NaN, 10)).toBeNull();
    expect(studentTTwoTailedP(2, 0)).toBeNull();
    expect(studentTTwoTailedP(2, -1)).toBeNull();
    expect(studentTTwoTailedP(Infinity, 10)).toBeNull();
  });
});

describe('calcDescriptives', () => {
  it('ortalama ve örneklem standart sapması (n − 1)', () => {
    const d = calcDescriptives([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(d.n).toBe(8);
    expect(d.mean).toBe(5);
    expect(d.variance).toBeCloseTo(32 / 7, 12);
    expect(d.sd).toBeCloseTo(Math.sqrt(32 / 7), 12);
  });

  it('boş ve tek elemanlı liste hata vermez', () => {
    expect(calcDescriptives([])).toEqual({ n: 0, mean: 0, sd: 0, variance: 0 });
    expect(calcDescriptives([7])).toEqual({ n: 1, mean: 7, sd: 0, variance: 0 });
  });
});

describe('pairedTTest', () => {
  it('zorunlu test: pre=[10,12,9,11,13], post=[8,11,7,10,9] → t = −3,6515, sd = 4, p ≈ 0,0217', () => {
    const pre = [10, 12, 9, 11, 13];
    const post = [8, 11, 7, 10, 9];
    const r = pairedTTest(pre.map((p, i) => ({ pre: p, post: post[i] })));
    expect(r.valid).toBe(true);
    expect(r.t).toBeCloseTo(-3.6515, 4);
    expect(r.df).toBe(4);
    expect(r.p).toBeCloseTo(0.0217, 4);
    expect(r.p).toBeCloseTo(0.021742978, 6); // bağımsız integral hesabı
    expect(r.meanDiff).toBe(-2);
    expect(r.n).toBe(5);
    expect(r.d).toBeCloseTo(-1.632993162, 8); // dz (tcheck.py)
    expect(r.preMean).toBe(11);
    expect(r.postMean).toBe(9);
  });

  it('n < 2 ise hata vermez, Türkçe bilgilendirme döner', () => {
    for (const pairs of [[], [{ pre: 1, post: 2 }]]) {
      const r = pairedTTest(pairs);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/en az 2 katılımcı/);
    }
  });

  it('farkların standart sapması 0 ise (fark ≠ 0) sahte t/p yazmaz, "hesaplanamadı" der', () => {
    const r = pairedTTest([
      { pre: 5, post: 3 },
      { pre: 8, post: 6 },
      { pre: 4, post: 2 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/hesaplanamadı/);
    expect(r.t).toBeUndefined();
    expect(r.p).toBeUndefined();
    expect(r.meanDiff).toBe(-2); // ortalama fark yine de bilgi olarak verilir
  });

  it('farkların standart sapması 0 ise (fark = 0) de "hesaplanamadı" der', () => {
    const r = pairedTTest([
      { pre: 5, post: 5 },
      { pre: 8, post: 8 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/hesaplanamadı/);
  });

  it('ondalık yuvarlama artığı sahte bir dev t değeri üretmez', () => {
    // Tüm farklar aslında 0,3; ama 0,1 + 0,2 bilgisayarda 0,30000000000000004 olur.
    const r = pairedTTest([
      { pre: 0, post: 0.1 + 0.2 },
      { pre: 0, post: 0.3 },
      { pre: 1, post: 1.3 },
    ]);
    expect(r.valid).toBe(false);
  });
});

describe('welchTTest', () => {
  it('örnek A: [1..5] vs [2,4,6,8,10] (bağımsız integral hesabıyla doğrulandı)', () => {
    const r = welchTTest([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r.valid).toBe(true);
    expect(r.t).toBeCloseTo(-1.897366596, 8);
    expect(r.df).toBeCloseTo(5.882352941, 8);
    expect(r.p).toBeCloseTo(0.107531195, 6);
    expect(r.meanDiff).toBe(-3);
    expect(r.d).toBeCloseTo(-1.2, 10); // havuzlanmış SS ile (tcheck.py)
  });

  it('örnek B: farklı grup büyüklükleri (6 ve 4)', () => {
    const r = welchTTest([12, 15, 11, 14, 13, 16], [9, 8, 10, 7]);
    expect(r.valid).toBe(true);
    expect(r.t).toBeCloseTo(5.0, 8);
    expect(r.df).toBeCloseTo(7.941176471, 8);
    expect(r.p).toBeCloseTo(0.001076317, 6);
    expect(r.d).toBeCloseTo(2.98142397, 7);
  });

  it('yalnızca bir grubun varyansı 0 ise geçerli sonuç verir', () => {
    const r = welchTTest([5, 5, 5, 5], [3, 4, 6, 7, 8]);
    expect(r.valid).toBe(true);
    expect(r.t).toBeCloseTo(-0.646996639, 8);
    expect(r.df).toBeCloseTo(4, 8);
    expect(r.p).toBeCloseTo(0.552889434, 6);
    expect(r.d).toBeCloseTo(-0.382768374, 8);
  });

  it('her iki grubun varyansı 0, ortalamalar farklı → sahte p = 1 yazmaz, "hesaplanamadı" der', () => {
    const r = welchTTest([3, 3, 3], [7, 7]);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/hesaplanamadı/);
    expect(r.p).toBeUndefined();
    expect(r.d1.mean).toBe(3); // betimsel istatistik yine de gösterilebilir
    expect(r.d2.mean).toBe(7);
  });

  it('her iki grubun varyansı 0, ortalamalar aynı → yine "hesaplanamadı"', () => {
    const r = welchTTest([4, 4], [4, 4, 4]);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/hesaplanamadı/);
  });

  it('bir grupta 2’den az katılımcı varsa hata vermez, Türkçe bilgilendirme döner', () => {
    for (const [a, b] of [[[1], [1, 2, 3]], [[1, 2], []], [[], []]]) {
      const r = welchTTest(a, b);
      expect(r.valid).toBe(false);
      expect(r.reason).toMatch(/en az 2 katılımcı/);
    }
  });
});

describe("Cohen's d (etki büyüklüğü)", () => {
  it('hesaplanamayan testlerde d = null', () => {
    expect(welchTTest([3, 3, 3], [7, 7]).d).toBeNull();
    expect(welchTTest([1], [1, 2]).d).toBeNull();
    expect(pairedTTest([{ pre: 5, post: 3 }, { pre: 8, post: 6 }]).d).toBeNull();
    expect(pairedTTest([]).d).toBeNull();
  });

  it('yardımcı fonksiyonlar uç durumlarda null döner', () => {
    expect(cohensDIndependent({ n: 1, mean: 1, variance: 0 }, { n: 3, mean: 2, variance: 1 })).toBeNull();
    expect(cohensDIndependent({ n: 2, mean: 1, variance: 0 }, { n: 2, mean: 2, variance: 0 })).toBeNull();
    expect(cohensDPaired(1, 0)).toBeNull();
    expect(cohensDPaired(NaN, 1)).toBeNull();
    expect(cohensDPaired(-1, 2)).toBe(-0.5);
  });

  it('etiketler: < 0,2 ihmal edilebilir · 0,2–0,5 küçük · 0,5–0,8 orta · ≥ 0,8 büyük (işaret önemsiz)', () => {
    expect(effectSizeLabel(0.19)).toBe('ihmal edilebilir');
    expect(effectSizeLabel(0.2)).toBe('küçük');
    expect(effectSizeLabel(-0.49)).toBe('küçük');
    expect(effectSizeLabel(0.5)).toBe('orta');
    expect(effectSizeLabel(-0.79)).toBe('orta');
    expect(effectSizeLabel(0.8)).toBe('büyük');
    expect(effectSizeLabel(-4.4)).toBe('büyük');
    expect(effectSizeLabel(null)).toBeNull();
  });
});

// Sabit 5 Kontrol + 5 Deney veri seti. Aynı sayılar dogrulama/tcheck.py içinde de vardır;
// beklenen değerler o betiğin (Simpson integrali) çıktısından alınmıştır.
describe('sabit veri seti: 4 kanonik test (tcheck.py ile çapraz kontrol)', () => {
  const kOn = [3.2, 2.8, 4.1, 3.5, 2.9];
  const kSon = [3.0, 3.1, 3.8, 3.6, 2.7];
  const dOn = [3.4, 3.0, 3.9, 2.7, 3.6];
  const dSon = [1.9, 2.2, 2.5, 1.6, 2.4];
  const pairs = (a, b) => a.map((v, i) => ({ pre: v, post: b[i] }));

  it('1) Ön Test K vs D (Welch)', () => {
    const r = welchTTest(kOn, dOn);
    expect(r.t).toBeCloseTo(-0.06311944031, 9);
    expect(r.df).toBeCloseTo(7.927520959, 8);
    expect(r.p).toBeCloseTo(0.95123385, 6);
    expect(r.d).toBeCloseTo(-0.0399202392, 9);
  });

  it('2) Kontrol Ön → Son (eşleştirilmiş)', () => {
    const r = pairedTTest(pairs(kOn, kSon));
    expect(r.t).toBeCloseTo(-0.5345224838, 9);
    expect(r.df).toBe(4);
    expect(r.p).toBeCloseTo(0.6213083, 6);
    expect(r.d).toBeCloseTo(-0.2390457219, 9);
  });

  it('3) Deney Ön → Son (eşleştirilmiş)', () => {
    const r = pairedTTest(pairs(dOn, dSon));
    expect(r.t).toBeCloseTo(-9.797958971, 8);
    expect(r.p).toBeCloseTo(0.000608185, 7);
    expect(r.d).toBeCloseTo(-4.38178046, 8);
  });

  it('4) Son Test K vs D (Welch)', () => {
    const r = welchTTest(kSon, dSon);
    expect(r.t).toBeCloseTo(4.295003938, 8);
    expect(r.df).toBeCloseTo(7.709493481, 8);
    expect(r.p).toBeCloseTo(0.002869235, 7);
    expect(r.d).toBeCloseTo(2.716399, 6);
  });
});

/* ---------------------------------------------------------------------------
 * Katılımcı bazında toplama
 * ------------------------------------------------------------------------- */

// Küçük bir örnek veri seti.
function rec(code, group, phase, modelId, avg = 1, isSample = false) {
  return {
    code,
    group,
    phase,
    modelId,
    weightedTokens: avg * 100,
    waterAvg: avg,
    energyAvg: avg * 2,
    co2Avg: avg * 3,
    isSample,
  };
}

const INTERACTIONS = [
  // K001: Ön Test'te 2 istem, Son Test'te giriş yaptı ama istem yazmadı
  rec('K001', 'Kontrol', 'pretest', 'light', 1),
  rec('K001', 'Kontrol', 'pretest', 'standard', 2),
  // K002: iki aşamada da istem yazdı
  rec('K002', 'Kontrol', 'pretest', 'light', 1),
  rec('K002', 'Kontrol', 'posttest', 'light', 1),
  // D001: Ön Test'te istem yazdı, Son Test'e HİÇ gelmedi (giriş yok)
  rec('D001', 'Deney', 'pretest', 'reasoning', 4),
  // Örnek veri: varsayılan olarak hiçbir yere girmemeli
  rec('K003', 'Kontrol', 'pretest', 'light', 9, true),
];

const LOGGED_IN = {
  pretest: ['K001', 'K002', 'D001'],
  posttest: ['K001', 'K002'],
};

function find(rows, code, phase) {
  return rows.find((r) => r.code === code && r.phase === phase);
}

describe('aggregateByParticipant', () => {
  it('varsayılan politika "exclude"', () => {
    expect(ZERO_PROMPT_POLICY).toBe('exclude');
  });

  it('öğrenci + aşama başına toplar', () => {
    const rows = aggregateByParticipant(INTERACTIONS);
    const k1 = find(rows, 'K001', 'pretest');
    expect(k1).toEqual({
      code: 'K001',
      group: 'Kontrol',
      phase: 'pretest',
      prompts: 2,
      weightedTokens: 300,
      water: 3,
      energy: 6,
      co2: 9,
      energyPerPrompt: 3,
      lightPct: 50,
    });
  });

  it('örnek veriler varsayılan olarak dahil edilmez, istenirse edilir', () => {
    expect(find(aggregateByParticipant(INTERACTIONS), 'K003', 'pretest')).toBeUndefined();
    const withSamples = aggregateByParticipant(INTERACTIONS, { includeSamples: true });
    expect(find(withSamples, 'K003', 'pretest').prompts).toBe(1);
  });

  it('"exclude": o aşamada kaydı olmayan katılımcı yer almaz', () => {
    const rows = aggregateByParticipant(INTERACTIONS, { policy: 'exclude', loggedInCodes: LOGGED_IN });
    expect(find(rows, 'K001', 'posttest')).toBeUndefined();
    expect(rows).toHaveLength(4); // K001-ön, K002-ön, K002-son, D001-ön
  });

  it('"zero": o aşamada giriş yapmış ama istem yazmamış katılımcı 0 ile girer', () => {
    const rows = aggregateByParticipant(INTERACTIONS, { policy: 'zero', loggedInCodes: LOGGED_IN });
    expect(find(rows, 'K001', 'posttest')).toEqual({
      code: 'K001',
      group: 'Kontrol',
      phase: 'posttest',
      prompts: 0,
      weightedTokens: 0,
      water: 0,
      energy: 0,
      co2: 0,
      energyPerPrompt: null, // 0 istemde istem başına enerji tanımsız
      lightPct: null, // 0 istemde hafif model oranı tanımsız
    });
  });

  it('"zero": o aşamada HİÇ giriş yapmamış katılımcı 0 sayılmaz (sahte düşüş önlenir)', () => {
    const rows = aggregateByParticipant(INTERACTIONS, { policy: 'zero', loggedInCodes: LOGGED_IN });
    expect(find(rows, 'D001', 'posttest')).toBeUndefined();
  });

  it('"zero": istem yazmış katılımcı giriş listesinde de olsa iki kez eklenmez', () => {
    const rows = aggregateByParticipant(INTERACTIONS, { policy: 'zero', loggedInCodes: LOGGED_IN });
    expect(rows.filter((r) => r.code === 'K002' && r.phase === 'pretest')).toHaveLength(1);
    expect(find(rows, 'K002', 'pretest').prompts).toBe(1);
  });

  it('"zero": grup koddan belirlenir, geçersiz kod atlanır', () => {
    const rows = aggregateByParticipant([], {
      policy: 'zero',
      loggedInCodes: { pretest: ['D005', 'X999'], posttest: [] },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].group).toBe('Deney');
  });

  it('"zero" politikası giriş listesi olmadan çalışmaz', () => {
    expect(() => aggregateByParticipant(INTERACTIONS, { policy: 'zero' })).toThrow(/giriş yapmış/);
  });

  it('bilinmeyen politika hata verir', () => {
    expect(() => aggregateByParticipant(INTERACTIONS, { policy: 'baska' })).toThrow();
  });

  it('geçersiz aşamalı kayıtlar atlanır', () => {
    const rows = aggregateByParticipant([rec('K001', 'Kontrol', 'bilinmeyen', 'light')]);
    expect(rows).toHaveLength(0);
  });
});

describe('getValues ve getPairs', () => {
  const zeroRows = aggregateByParticipant(INTERACTIONS, { policy: 'zero', loggedInCodes: LOGGED_IN });
  const excludeRows = aggregateByParticipant(INTERACTIONS, { policy: 'exclude' });

  it('getValues: grup + aşama için değer listesi', () => {
    expect(getValues(zeroRows, 'Kontrol', 'posttest', 'prompts').sort()).toEqual([0, 1]);
    expect(getValues(excludeRows, 'Kontrol', 'posttest', 'prompts')).toEqual([1]);
  });

  it('getValues: tanımsız (null) hafif model oranları atlanır', () => {
    expect(getValues(zeroRows, 'Kontrol', 'posttest', 'lightPct')).toEqual([100]);
  });

  it('getPairs: yalnızca iki aşamada da değeri olan öğrenciler eşleşir', () => {
    const pairs = getPairs(zeroRows, 'Kontrol', 'prompts');
    expect(pairs).toEqual([
      { code: 'K001', pre: 2, post: 0 },
      { code: 'K002', pre: 1, post: 1 },
    ]);
    expect(getPairs(excludeRows, 'Kontrol', 'prompts')).toEqual([{ code: 'K002', pre: 1, post: 1 }]);
  });

  it('getPairs: Son Test hafif model oranı tanımsızsa öğrenci o ölçütte eşleşmez', () => {
    expect(getPairs(zeroRows, 'Kontrol', 'lightPct')).toEqual([{ code: 'K002', pre: 100, post: 100 }]);
  });

  it('getPairs: Son Test’e gelmeyen deney öğrencisi eşleşmez', () => {
    expect(getPairs(zeroRows, 'Deney', 'prompts')).toEqual([]);
  });
});
