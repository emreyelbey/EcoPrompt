// Mini SPSS raporu (saf fonksiyonlar): 4 hücre betimsel istatistik, 4 kanonik t-testi,
// Cohen's d, net değişim kartları, grafik verisi ve lise öğrencisinin anlayacağı Türkçe yorumlar.
// İstatistik sekmesi (StatsTab.jsx) ve Excel dışa aktarma (excelExport.js) aynı hesabı buradan alır;
// böylece panelde görülen sayı ile Excel'deki sayı her zaman aynıdır.
// Kurallar: α = 0,05; p değerleri ÇİFT YÖNLÜ; örnek kayıtlar (isSample) hesaba girmez;
// sıfır istem politikası stats.js → ZERO_PROMPT_POLICY.
// Kaynak: reference/canvas-prototip.tsx (spssAnalysis → changeCards, descriptives, tests).
import {
  ALPHA,
  METRICS,
  ZERO_PROMPT_POLICY,
  aggregateByParticipant,
  calcDescriptives,
  effectSizeLabel,
  getPairs,
  getValues,
  pairedTTest,
  welchTTest,
} from './stats.js';
import { fmtNum, fmtSmart, formatPValue } from './format.js';

// Raporda ana hipotezin ölçütü (23.11.2026 kararı): öğrenci başına toplam enerji.
export const PRIMARY_METRIC = 'energy';

// Ölçütlerin adları, birimleri ve SPSS değişken adı ekleri (SPSS'te OnTest_<ek>, SonTest_<ek>, Fark_<ek>).
export const METRIC_META = {
  prompts: { label: 'İstem Sayısı', unit: 'istem', spss: 'Istem', description: 'Öğrencinin o aşamada yazdığı istem sayısı' },
  weightedTokens: {
    label: 'Ağırlıklı Token (toplam)',
    unit: 'token',
    spss: 'AgirlikliToken',
    description: 'Öğrencinin o aşamadaki ağırlıklı tokenlarının toplamı (Girdi + 3 × Çıktı)',
  },
  energy: {
    label: 'Toplam Enerji',
    unit: 'Wh',
    spss: 'Enerji_Wh',
    primary: true,
    description: 'Öğrencinin o aşamadaki toplam enerji tüketimi (ortalama katsayılarla)',
  },
  energyPerPrompt: {
    label: 'İstem Başına Ortalama Enerji',
    unit: 'Wh',
    spss: 'EnerjiIstem_Wh',
    description: 'Toplam enerji ÷ istem sayısı (0 istemde tanımsız, boş)',
  },
  water: { label: 'Toplam Su', unit: 'mL', spss: 'Su_mL', description: 'Öğrencinin o aşamadaki toplam su ayak izi (ortalama katsayılarla)' },
  co2: { label: 'Toplam CO₂', unit: 'g', spss: 'CO2_g', description: 'Öğrencinin o aşamadaki toplam CO₂ salımı (ortalama katsayılarla)' },
  lightPct: {
    label: 'Hafif Model Oranı',
    unit: '%',
    spss: 'HafifYuzde',
    description: 'İstemlerin yüzde kaçının Hafif Model ile yazıldığı (0 istemde tanımsız, boş)',
  },
};

// Ölçütlerin gösterilme sırası (stats.js ile aynı).
export const METRIC_ORDER = METRICS;

// Su ve CO₂ enerjinin sabit katlarıdır; testleri enerjiyle birebir aynı çıkar.
export const SAME_AS_ENERGY_NOTE =
  'Su ve CO₂, enerjinin sabit katlarıdır (su = enerji × 1,0 mL/Wh; CO₂ = enerji × 0,43 g/Wh). ' +
  "Bu yüzden t, p ve Cohen's d değerleri Toplam Enerji ile birebir aynı çıkar; ayrı bir bulgu sayılmamalıdır.";

// Sıfır istem politikasının açıklaması (panelde ve Excel'de gösterilir).
export const POLICY_NOTES = {
  exclude: 'O aşamada hiç istem yazmayan katılımcı o aşamanın analizine girmez.',
  zero: 'O aşamada giriş yapıp istem yazmayan katılımcı 0 değeriyle analize girer; o aşamada hiç giriş yapmayan girmez.',
};

export const GROUPS = ['Kontrol', 'Deney'];
export const PHASE_NAMES = { pretest: 'Ön Test', posttest: 'Son Test' };

/* ---------------------------------------------------------------------------
 * Veri hazırlama
 * ------------------------------------------------------------------------- */

/**
 * Kayıtları öğrenci + aşama başına satırlara çevirir (stats.js → aggregateByParticipant).
 * logins: giriş kayıtları; 'zero' politikasında "o aşamada giriş yapmış" listesi buradan çıkar.
 * scope (yalnızca örnek veri önizlemesi kullanır):
 *   codeGroups: izin verilen kodlar (kod → grup). Verilmezse 60 katılımcı kodu.
 *   includeSamples: örnek kayıtlar sayılsın mı? Verilmezse hayır.
 */
export function participantRows(records, logins = [], policy = ZERO_PROMPT_POLICY, { codeGroups, includeSamples = false } = {}) {
  const loggedInCodes = { pretest: [], posttest: [] };
  for (const login of logins) {
    if (loggedInCodes[login.phase]) loggedInCodes[login.phase].push(login.code);
  }
  return aggregateByParticipant(records, { policy, loggedInCodes, codeGroups, includeSamples });
}

/* ---------------------------------------------------------------------------
 * Biçimlendirme yardımcıları (yorum metinleri için)
 * ------------------------------------------------------------------------- */

// Bir ölçüt değerini birimiyle yazar: "3,25 Wh", "%40,0".
export function formatMetricValue(value, metric) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const meta = METRIC_META[metric];
  if (meta.unit === '%') return `%${fmtNum(value, 1)}`;
  if (metric === 'prompts') return `${fmtNum(value, 2)} istem`;
  if (metric === 'weightedTokens') return `${fmtNum(value, 0)} token`;
  return `${fmtSmart(value)} ${meta.unit}`;
}

// "p = 0,4120" veya "p < 0,001"
export function pPhrase(p) {
  const text = formatPValue(p);
  return text.startsWith('<') ? `p ${text}` : `p = ${text}`;
}

// Ortalamanın yönü: azalma / artış / değişim yok.
function direction(before, after) {
  if (after < before) return 'azalma';
  if (after > before) return 'artış';
  return 'değişim yok';
}

/* ---------------------------------------------------------------------------
 * Türkçe yorum
 * ------------------------------------------------------------------------- */

/**
 * Bir testin sonucunu lise öğrencisinin anlayacağı sadelikte yorumlar.
 * @param {object} test  runCanonicalTests'in ürettiği test nesnesi
 * @param {string} metric
 */
export function interpretTest(test, metric) {
  const r = test.result;
  if (!r.valid) return `Hesaplanamadı: ${r.reason}`;

  const significant = r.p < ALPHA; // p tam 0,05 ise anlamlı SAYILMAZ
  const p = `${pPhrase(r.p)} ${significant ? '<' : '≥'} 0,05`;
  const [m1, m2] = test.means;
  const v1 = formatMetricValue(m1, metric);
  const v2 = formatMetricValue(m2, metric);
  let text;

  if (test.id === 'baseline') {
    text = significant
      ? `${p}: Ön Test'te iki grup arasında anlamlı bir fark var (Kontrol ort. ${v1}, Deney ort. ${v2}). ` +
        'Yani gruplar deneye denk başlamadı; Son Test sonuçları yorumlanırken bu başlangıç farkı hesaba katılmalı.'
      : `${p}: Ön Test'te iki grup arasında anlamlı bir fark yok (Kontrol ort. ${v1}, Deney ort. ${v2}). ` +
        'Yani gruplar deneye benzer düzeyde başladı; sonradan çıkan bir fark başlangıçtaki bir farktan kaynaklanmaz.';
  } else if (test.id === 'posttest') {
    const lower = m2 < m1 ? 'daha düşük' : 'daha yüksek';
    text = significant
      ? `${p}: Son Test'te iki grup arasında anlamlı bir fark var (Kontrol ort. ${v1}, Deney ort. ${v2}). ` +
        `Deney grubunun ortalaması Kontrol grubundan ${lower}; bu farkın tesadüf olma ihtimali düşük.`
      : `${p}: Son Test'te iki grup arasında anlamlı bir fark yok (Kontrol ort. ${v1}, Deney ort. ${v2}). ` +
        'Görülen fark tesadüf olabilir.';
  } else {
    // Eşleştirilmiş testler: aynı öğrencilerin Ön Test → Son Test değişimi.
    const group = test.group;
    const dir = direction(m1, m2);
    if (significant) {
      text =
        `${p}: ${group} grubunda Ön Test'ten Son Test'e anlamlı bir ${dir} var (ortalama ${v1} → ${v2}). ` +
        'Bu değişimin tesadüf olma ihtimali düşük.';
      if (group === 'Kontrol') {
        text += ' Kontrol grubu eğitim almadığı için bu değişim zamanla veya başka bir nedenle olmuş olabilir; Deney grubundaki değişim bununla birlikte yorumlanmalı.';
      } else if (dir === 'azalma') {
        text += ' Bu azalma, eğitim ve EkoToken arayüzünün beklenen etkisiyle uyumlu.';
      }
    } else {
      text =
        `${p}: ${group} grubunda Ön Test ile Son Test arasında anlamlı bir değişim yok (ortalama ${v1} → ${v2}). ` +
        'Görülen fark tesadüf olabilir.';
    }
  }

  if (test.d !== null) {
    text += ` Etki büyüklüğü ${test.dLabel} (d = ${fmtNum(test.d, 2)}).`;
  }
  return text;
}

/* ---------------------------------------------------------------------------
 * Betimsel istatistik ve 4 kanonik test
 * ------------------------------------------------------------------------- */

// 4 hücre: Kontrol/Deney × Ön/Son Test.
export const CELLS = [
  { group: 'Kontrol', phase: 'pretest' },
  { group: 'Kontrol', phase: 'posttest' },
  { group: 'Deney', phase: 'pretest' },
  { group: 'Deney', phase: 'posttest' },
];

/** 4 hücrenin betimsel istatistikleri: { group, phase, label, n, mean, sd, variance, total } */
export function describeCells(rows, metric) {
  return CELLS.map(({ group, phase }) => {
    const values = getValues(rows, group, phase, metric);
    return {
      group,
      phase,
      label: `${group} — ${PHASE_NAMES[phase]}`,
      ...calcDescriptives(values),
      total: values.reduce((sum, v) => sum + v, 0),
    };
  });
}

/**
 * 4 kanonik test. Her test:
 * { id, no, title, method, kind ('independent'|'paired'), group?, expected, compared: [ad1, ad2],
 *   means: [ort1, ort2], counts, result, d, dLabel, significant, interpretation }
 * counts: bağımsızda { n1, n2 }; eşleştirilmişte { nPre, nPost, nPaired }.
 */
export function runCanonicalTests(rows, metric) {
  const independent = (id, no, phase, title, expected) => {
    const result = welchTTest(getValues(rows, 'Kontrol', phase, metric), getValues(rows, 'Deney', phase, metric));
    return {
      id,
      no,
      title,
      method: 'Bağımsız örneklem Welch t testi',
      kind: 'independent',
      expected,
      compared: [`Kontrol (${PHASE_NAMES[phase]})`, `Deney (${PHASE_NAMES[phase]})`],
      means: [result.d1.n > 0 ? result.d1.mean : null, result.d2.n > 0 ? result.d2.mean : null],
      counts: { n1: result.d1.n, n2: result.d2.n },
      result,
    };
  };

  const paired = (id, no, group, title, expected) => {
    const result = pairedTTest(getPairs(rows, group, metric));
    return {
      id,
      no,
      title,
      method: 'Bağımlı örneklem (eşleştirilmiş) t testi',
      kind: 'paired',
      group,
      expected,
      compared: [`${group} (Ön Test)`, `${group} (Son Test)`],
      means: [result.preMean, result.postMean], // yalnızca eşleşen öğrencilerin ortalaması
      counts: {
        nPre: getValues(rows, group, 'pretest', metric).length,
        nPost: getValues(rows, group, 'posttest', metric).length,
        nPaired: result.n,
      },
      result,
    };
  };

  const tests = [
    independent('baseline', 1, 'pretest', '1. Başlangıç Denkliği (Ön Test: Kontrol – Deney)', 'Beklenen: p ≥ 0,05 (gruplar başlangıçta denk)'),
    paired('kontrol', 2, 'Kontrol', '2. Kontrol Grubu Değişimi (Ön Test → Son Test)', 'Beklenen: p ≥ 0,05 (eğitim almayan grupta belirgin değişim yok)'),
    paired('deney', 3, 'Deney', '3. Deney Grubu Değişimi (Ön Test → Son Test)', 'Beklenen: p < 0,05 (eğitim + EkoToken sonrası azalma)'),
    independent('posttest', 4, 'posttest', '4. Son Test Grup Farkı (Son Test: Kontrol – Deney)', 'Beklenen: p < 0,05 (gruplar arasında fark)'),
  ];

  return tests.map((test) => {
    const d = test.result.d ?? null;
    const full = {
      ...test,
      d,
      dLabel: effectSizeLabel(d),
      significant: test.result.valid && test.result.p < ALPHA,
    };
    full.interpretation = interpretTest(full, metric);
    return full;
  });
}

// Testin kısa sonucu: "Anlamlı" / "Anlamlı değil" / "Hesaplanamadı"
export function testVerdict(test) {
  if (!test.result.valid) return 'Hesaplanamadı';
  return test.significant ? 'Anlamlı' : 'Anlamlı değil';
}

/* ---------------------------------------------------------------------------
 * Net değişim kartları ve grafik verisi
 * ------------------------------------------------------------------------- */

// Bir hücrenin ortalaması; hiç katılımcı yoksa null.
function cellMean(rows, group, phase, metric) {
  const values = getValues(rows, group, phase, metric);
  return values.length > 0 ? calcDescriptives(values).mean : null;
}

// Yüzde değişim: Ön Test ortalaması 0 veya yoksa tanımsız.
function pctChange(pre, post) {
  if (pre === null || post === null || pre === 0) return null;
  return ((post - pre) / pre) * 100;
}

// Şartnamedeki 4 net değişim kartı: İstem, Su, Enerji, CO₂.
export const CHANGE_CARD_METRICS = ['prompts', 'water', 'energy', 'co2'];

export function changeCards(rows) {
  return CHANGE_CARD_METRICS.map((metric) => {
    const card = { metric, label: METRIC_META[metric].label, unit: METRIC_META[metric].unit };
    for (const group of GROUPS) {
      const pre = cellMean(rows, group, 'pretest', metric);
      const post = cellMean(rows, group, 'posttest', metric);
      card[group] = { pre, post, pct: pctChange(pre, post) };
    }
    return card;
  });
}

// Ön Test / Son Test gruplandırılmış sütun grafiği verisi (öğrenci başına ortalama).
export function prePostChartData(rows, metric) {
  return GROUPS.map((group) => ({
    name: `${group} Grubu`,
    'Ön Test': cellMean(rows, group, 'pretest', metric),
    'Son Test': cellMean(rows, group, 'posttest', metric),
  }));
}

/**
 * İstatistik sekmesinin bütün içeriği.
 * @param {object[]} records  etkileşim kayıtları (örnekler otomatik dışlanır)
 * @param {object[]} logins   giriş kayıtları
 * @param {{ metric?: string, policy?: 'exclude'|'zero', sample?: { codeGroups: object } }} options
 *        sample: YALNIZCA örnek veri önizlemesi verir. Verilince yalnızca bu listedeki örnek kodlar sayılır
 *        (örnek kayıtlar dahil). Verilmezse 60 katılımcı kodu ve gerçek kayıtlar (varsayılan).
 */
export function buildStatsReport(records, logins, { metric = PRIMARY_METRIC, policy = ZERO_PROMPT_POLICY, sample } = {}) {
  const scope = sample ? { codeGroups: sample.codeGroups, includeSamples: true } : {};
  const rows = participantRows(records, logins, policy, scope);
  return {
    metric,
    policy,
    rows,
    descriptives: describeCells(rows, metric),
    tests: runCanonicalTests(rows, metric),
    changeCards: changeCards(rows),
    promptChart: prePostChartData(rows, 'prompts'),
    metricChart: prePostChartData(rows, metric),
  };
}
