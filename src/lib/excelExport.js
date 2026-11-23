// Excel (.xlsx) dışa aktarma: şartnamedeki 4 sayfa + değişken sözlüğü.
//   1) Tum_Kayitlar        her etkileşim bir satır (örnek kayıtlar hariç)
//   2) Ogrenci_Ozetleri    60 kodun tamamı; Ön Test / Son Test / Toplam
//   3) Grup_Karsilastirma  4 hücre (Kontrol/Deney × Ön/Son) betimsel tablo + her ölçüt için 4 test
//   4) SPSS_Veri_Seti      geniş format: her katılımcı tek satır, SPSS kurallarına uygun değişken adları
//   5) Degisken_Sozlugu    SPSS değişkenlerinin anlamı, değer kodları, eksik veri kuralı, formüller
// Marka yasağı: engineVersion ve gerçek model adları hiçbir sayfada yoktur; model yalnızca ölçek sınıfı
// adıyla (Hafif / Standart / Akıl Yürütme) yazılır. Panel listesi zaten engineVersion taşımaz.
// Sayılar yuvarlanmadan, gerçek sayısal hücre olarak yazılır; görünüm Excel'de ayarlanabilir.
// Tarih (Tum_Kayitlar) gerçek Excel tarih hücresidir (Türkiye saati), metin değil.
// Eksik veri kuralı: bir öğrencinin o aşamanın analizine girmediği hücreler BOŞTUR, 0 değil
// (SPSS_Veri_Seti ve Ogrenci_Ozetleri aynı kuralı izler; Excel'de sütun ortalaması doğru çıkar).
// Bu dosya yalnızca "Excel İndir" tıklanınca import() ile yüklenir; öğrenci tarayıcısı hiç indirmez.
import { MODEL_SCALES } from './footprint.js';
import { COHENS_D_FORMULAS, ZERO_PROMPT_POLICY } from './stats.js';
import { ALL_CODES, getGroup, getStatus } from './participants.js';
import { formatCsvDate, fileDate } from './csv.js';
import {
  METRIC_META,
  METRIC_ORDER,
  PHASE_NAMES,
  POLICY_NOTES,
  PRIMARY_METRIC,
  SAME_AS_ENERGY_NOTE,
  describeCells,
  participantRows,
  runCanonicalTests,
  testVerdict,
} from './statsReport.js';
import { buildXlsx, dateCell, downloadBytes } from './xlsxWriter.js';

export const SHEET_NAMES = ['Tum_Kayitlar', 'Ogrenci_Ozetleri', 'Grup_Karsilastirma', 'SPSS_Veri_Seti', 'Degisken_Sozlugu'];

// Ortak notlar (Grup_Karsilastirma ve Degisken_Sozlugu'nda yazılır).
export const P_VALUE_NOTE = 'Bütün p değerleri ÇİFT YÖNLÜDÜR (two-tailed). Anlamlılık düzeyi α = 0,05; p < 0,05 ise fark anlamlı sayılır.';
const SAMPLE_NOTE = 'Örnek veriler (isSample) bu dosyaya girmez.';

// Kayıttaki sayı alanını güvenle okur: yoksa veya geçersizse null (boş hücre), 0 değil.
function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* ---------------------------------------------------------------------------
 * 1) Tum_Kayitlar
 * ------------------------------------------------------------------------- */

function allRecordsSheet(records) {
  const header = [
    'Tarih (Türkiye saati)',
    'Aşama',
    'Katılımcı Kodu',
    'Grup',
    'Model Sınıfı',
    'Girdi Token',
    'Çıktı Token',
    'Ağırlıklı Token',
    'Token Kaynağı',
    'Enerji Min (Wh)',
    'Enerji Ort (Wh)',
    'Enerji Maks (Wh)',
    'Su Min (mL)',
    'Su Ort (mL)',
    'Su Maks (mL)',
    'CO₂ Min (g)',
    'CO₂ Ort (g)',
    'CO₂ Maks (g)',
    'Tahmini Maliyet (USD, referans fiyat)',
    'Tasarruf Oranı (%)',
    'İstem',
  ];
  const sorted = [...records].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const rows = sorted.map((r) => [
    dateCell(r.createdAt), // gerçek tarih hücresi (Türkiye saati)
    PHASE_NAMES[r.phase] ?? r.phase,
    r.code,
    r.group,
    MODEL_SCALES[r.modelId]?.name ?? '',
    num(r.inputTokens),
    num(r.outputTokens),
    num(r.weightedTokens),
    r.tokenSource ?? '',
    num(r.energyMin),
    num(r.energyAvg),
    num(r.energyMax),
    num(r.waterMin),
    num(r.waterAvg),
    num(r.waterMax),
    num(r.co2Min),
    num(r.co2Avg),
    num(r.co2Max),
    num(r.costUsd),
    num(r.savingsPct),
    r.prompt ?? '',
  ]);
  return {
    name: 'Tum_Kayitlar',
    rows: [header, ...rows],
    boldRows: [0],
    freezeHeader: true,
    columnWidths: [19, 9, 14, 9, 20, 11, 11, 14, 13, ...Array(9).fill(14), 18, 14, 80],
  };
}

/* ---------------------------------------------------------------------------
 * 2) Ogrenci_Ozetleri
 *    Değerler SPSS_Veri_Seti ile aynı kaynaktan (participantRows) gelir: o aşamanın analizine
 *    girmeyen katılımcının o aşamadaki ölçüt hücreleri boştur. "Giriş" sütunu giriş kaydını gösterir.
 * ------------------------------------------------------------------------- */

// Toplam sütunlarındaki ölçütler (oran ölçütleri toplanamaz).
const SUMMED_METRICS = ['prompts', 'weightedTokens', 'energy', 'water', 'co2'];

function studentSummarySheet(rows, logins) {
  const loggedIn = new Set(logins.map((l) => `${l.code}|${l.phase}`));
  const phaseCols = (name) => [
    `${name} Giriş`,
    `${name} İstem`,
    `${name} Ağırlıklı Token`,
    `${name} Enerji (Wh)`,
    `${name} Su (mL)`,
    `${name} CO₂ (g)`,
    `${name} Hafif Model (%)`,
  ];
  const header = [
    'Katılımcı Kodu',
    'Grup',
    'Statü',
    ...phaseCols('Ön Test'),
    ...phaseCols('Son Test'),
    'Toplam İstem',
    'Toplam Ağırlıklı Token',
    'Toplam Enerji (Wh)',
    'Toplam Su (mL)',
    'Toplam CO₂ (g)',
  ];

  const byKey = new Map(rows.map((r) => [`${r.code}|${r.phase}`, r]));

  const data = ALL_CODES.map((code) => {
    const pre = byKey.get(`${code}|pretest`);
    const post = byKey.get(`${code}|posttest`);
    // Analize girmeyen aşamada bütün ölçüt hücreleri boş (null); 0 yazılmaz.
    const phaseValues = (phase, row) => [
      loggedIn.has(`${code}|${phase}`) ? 'Evet' : 'Hayır',
      ...SUMMED_METRICS.map((m) => (row ? row[m] : null)),
      row ? row.lightPct : null, // 0 istemde de tanımsız → boş
    ];
    // Toplam: yalnızca mevcut aşamaların toplamı; iki aşama da boşsa boş.
    const present = [pre, post].filter(Boolean);
    const total = (m) => (present.length > 0 ? present.reduce((s, r) => s + r[m], 0) : null);
    return [
      code,
      getGroup(code),
      getStatus(code),
      ...phaseValues('pretest', pre),
      ...phaseValues('posttest', post),
      ...SUMMED_METRICS.map(total),
    ];
  });

  return {
    name: 'Ogrenci_Ozetleri',
    rows: [header, ...data],
    boldRows: [0],
    freezeHeader: true,
    columnWidths: [14, 9, 8, ...Array(19).fill(15)],
  };
}

/* ---------------------------------------------------------------------------
 * 3) Grup_Karsilastirma
 * ------------------------------------------------------------------------- */

export const TEST_HEADER = [
  'Ölçüt',
  'SPSS Değişkeni',
  'Birincil',
  'Test No',
  'Test',
  'Yöntem',
  'Karşılaştırılan 1',
  'Ortalama 1',
  'Karşılaştırılan 2',
  'Ortalama 2',
  'n Kontrol',
  'n Deney',
  'n Ön Test',
  'n Son Test',
  'n Eşleşen',
  't',
  'sd',
  'p (çift yönlü)',
  "Cohen's d",
  'Etki Büyüklüğü',
  'Sonuç',
  'Yorum',
];

function groupComparisonSheet(rows, policy) {
  const out = [];
  const bold = [];
  const addBold = (row) => {
    bold.push(out.length);
    out.push(row);
  };

  // Blok 1: betimsel istatistikler
  addBold(['1) Betimsel istatistikler: öğrenci başına değerler (Kontrol/Deney × Ön Test/Son Test)']);
  addBold(['Ölçüt', 'SPSS Değişkeni', 'Birim', 'Grup', 'Aşama', 'n (katılımcı)', 'Ortalama', 'Standart Sapma', 'Toplam']);
  for (const metric of METRIC_ORDER) {
    const meta = METRIC_META[metric];
    // Oran ölçütlerinde (yüzde, istem başına) toplamın anlamı yoktur.
    const isRatio = metric === 'lightPct' || metric === 'energyPerPrompt';
    for (const cell of describeCells(rows, metric)) {
      out.push([
        meta.label,
        meta.spss,
        meta.unit,
        cell.group,
        PHASE_NAMES[cell.phase],
        cell.n,
        cell.n > 0 ? cell.mean : null,
        cell.n > 1 ? cell.sd : null,
        isRatio ? null : cell.total,
      ]);
    }
  }
  out.push([]);

  // Blok 2: hipotez testleri
  addBold([`2) Hipotez testleri (α = 0,05; p değerleri çift yönlü). Birincil ölçüt: ${METRIC_META[PRIMARY_METRIC].label} (${METRIC_META[PRIMARY_METRIC].unit})`]);
  addBold(TEST_HEADER);
  for (const metric of METRIC_ORDER) {
    const meta = METRIC_META[metric];
    for (const test of runCanonicalTests(rows, metric)) {
      const r = test.result;
      const independent = test.kind === 'independent';
      out.push([
        meta.label,
        meta.spss,
        meta.primary ? 'Evet' : 'Hayır',
        test.no,
        test.title,
        test.method,
        test.compared[0],
        test.means[0],
        test.compared[1],
        test.means[1],
        independent ? test.counts.n1 : null,
        independent ? test.counts.n2 : null,
        independent ? null : test.counts.nPre,
        independent ? null : test.counts.nPost,
        independent ? null : test.counts.nPaired,
        r.valid ? r.t : null,
        r.valid ? r.df : null,
        r.valid ? r.p : null,
        test.d,
        test.dLabel ?? '',
        testVerdict(test),
        test.interpretation,
      ]);
    }
  }
  out.push([]);

  // Blok 3: notlar
  addBold(['Notlar']);
  out.push([P_VALUE_NOTE]);
  out.push([`Cohen's d — ${COHENS_D_FORMULAS.independent}`]);
  out.push([`Cohen's d — ${COHENS_D_FORMULAS.paired}`]);
  out.push([`Etki büyüklüğü etiketleri: ${COHENS_D_FORMULAS.labels}`]);
  out.push([
    "Eşleştirilmiş testlerde n, yalnızca iki aşamada da verisi olan katılımcı sayısıdır (n Eşleşen). Ortalama 1 ve 2, bu eşleşen katılımcıların Ön Test ve Son Test ortalamalarıdır.",
  ]);
  out.push([`Sıfır istem politikası (${policy}): ${POLICY_NOTES[policy]}`]);
  out.push([SAME_AS_ENERGY_NOTE]);
  out.push([SAMPLE_NOTE]);

  return {
    name: 'Grup_Karsilastirma',
    rows: out,
    boldRows: bold,
    columnWidths: [26, 16, 10, 8, 44, 34, 18, 13, 18, 13, 9, 9, 9, 9, 9, 11, 9, 13, 11, 15, 13, 100],
  };
}

/* ---------------------------------------------------------------------------
 * 4) SPSS_Veri_Seti (geniş format)
 * ------------------------------------------------------------------------- */

// SPSS'te değişken adı olarak kullanılamayan ayrılmış sözcükler.
export const SPSS_RESERVED = ['ALL', 'AND', 'BY', 'EQ', 'GE', 'GT', 'LE', 'LT', 'NE', 'NOT', 'OR', 'TO', 'WITH'];

// SPSS sütunları: [ad, Türkçe etiket, birim, değer kodları/açıklama]. Sözlük sayfası da buradan üretilir.
export function spssColumns() {
  const columns = [
    ['Katilimci_Kodu', 'Katılımcı kodu', '', 'Metin (K001–K030 Kontrol, D001–D030 Deney)'],
    ['Grup_Kodu', 'Grup', '', '0 = Kontrol, 1 = Deney'],
    ['Statu_Kodu', 'Statü', '', '0 = Asıl (001–020), 1 = Yedek (021–030)'],
    ['OnTest_Katilim', 'Ön Test analizine katılım', '', '0 = katılmadı (o aşamanın değerleri boş), 1 = katıldı'],
    ['SonTest_Katilim', 'Son Test analizine katılım', '', '0 = katılmadı (o aşamanın değerleri boş), 1 = katıldı'],
  ];
  for (const [prefix, phaseName] of [
    ['OnTest', 'Ön Test'],
    ['SonTest', 'Son Test'],
  ]) {
    for (const metric of METRIC_ORDER) {
      const meta = METRIC_META[metric];
      columns.push([`${prefix}_${meta.spss}`, `${phaseName}: ${meta.label}`, meta.unit, meta.description]);
    }
  }
  for (const metric of METRIC_ORDER) {
    const meta = METRIC_META[metric];
    columns.push([
      `Fark_${meta.spss}`,
      `Fark (Son Test − Ön Test): ${meta.label}`,
      meta.unit,
      'Son Test − Ön Test. İki aşamadan biri boşsa boş. Negatif değer azalma demektir.',
    ]);
  }
  return columns;
}

function spssSheet(rows) {
  const byKey = new Map(rows.map((r) => [`${r.code}|${r.phase}`, r]));
  const header = spssColumns().map((c) => c[0]);

  const data = ALL_CODES.map((code) => {
    const pre = byKey.get(`${code}|pretest`);
    const post = byKey.get(`${code}|posttest`);
    const value = (row, metric) => (row && row[metric] !== null && row[metric] !== undefined ? row[metric] : null);
    const preValues = METRIC_ORDER.map((m) => value(pre, m));
    const postValues = METRIC_ORDER.map((m) => value(post, m));
    // Fark yalnızca iki aşamada da değer varsa hesaplanır; yoksa boş (eksik veri), asla 0 değil.
    const diffs = preValues.map((a, i) => (a !== null && postValues[i] !== null ? postValues[i] - a : null));
    return [
      code,
      getGroup(code) === 'Deney' ? 1 : 0,
      getStatus(code) === 'Yedek' ? 1 : 0,
      pre ? 1 : 0,
      post ? 1 : 0,
      ...preValues,
      ...postValues,
      ...diffs,
    ];
  });

  return {
    name: 'SPSS_Veri_Seti',
    rows: [header, ...data],
    boldRows: [0],
    freezeHeader: true,
    columnWidths: header.map((h) => Math.max(10, h.length + 2)),
  };
}

/* ---------------------------------------------------------------------------
 * 5) Degisken_Sozlugu
 * ------------------------------------------------------------------------- */

function dictionarySheet(policy, now) {
  const out = [['Değişken', 'Etiket', 'Birim', 'Değer Kodları / Açıklama'], ...spssColumns()];
  out.push([]);
  const notesStart = out.length;
  out.push(['Genel Notlar']);
  out.push(['Eksik veri', 'Boş hücre = eksik veri (SPSS sistem eksiği). 0 yazılmaz; 0 gerçekten ölçülmüş sıfırdır.']);
  out.push(['Sıfır istem politikası', `${policy}: ${POLICY_NOTES[policy]}`]);
  out.push(['Ölçüm düzeyi', 'Bütün ölçütler öğrenci başına o aşamadaki değerlerdir (toplam ölçütler: o aşamadaki tüm istemlerin toplamı).']);
  out.push(['p değeri', P_VALUE_NOTE]);
  out.push(["Cohen's d (bağımsız)", COHENS_D_FORMULAS.independent]);
  out.push(["Cohen's d (eşleştirilmiş)", COHENS_D_FORMULAS.paired]);
  out.push(['Etki büyüklüğü etiketleri', COHENS_D_FORMULAS.labels]);
  out.push(['Su ve CO₂', SAME_AS_ENERGY_NOTE]);
  out.push(['Birincil ölçüt', `${METRIC_META[PRIMARY_METRIC].label} (${METRIC_META[PRIMARY_METRIC].unit}) → OnTest_${METRIC_META[PRIMARY_METRIC].spss}, SonTest_${METRIC_META[PRIMARY_METRIC].spss}`]);
  out.push(['SPSS aktarımı', 'SPSS_Veri_Seti sayfası: ilk satır değişken adlarıdır, her satır bir katılımcıdır. Grup_Kodu bağımsız değişkendir.']);
  out.push(['Örnek veri', SAMPLE_NOTE]);
  out.push(['Dışa aktarma zamanı', formatCsvDate(now.getTime())]);

  return {
    name: 'Degisken_Sozlugu',
    rows: out,
    boldRows: [0, notesStart],
    columnWidths: [26, 44, 8, 100],
  };
}

/* ---------------------------------------------------------------------------
 * Çalışma kitabı
 * ------------------------------------------------------------------------- */

/**
 * 5 sayfanın içeriği (saf fonksiyon; testler doğrudan bunu kullanır).
 * @param {object[]} allRecords  panel kayıtları (örnekler burada ayıklanır)
 * @param {object[]} logins      giriş kayıtları
 */
export function buildWorkbookSheets(allRecords, logins = [], { policy = ZERO_PROMPT_POLICY, now = new Date() } = {}) {
  const records = allRecords.filter((r) => r.isSample !== true);
  const rows = participantRows(records, logins, policy);
  return [
    allRecordsSheet(records),
    studentSummarySheet(rows, logins),
    groupComparisonSheet(rows, policy),
    spssSheet(rows),
    dictionarySheet(policy, now),
  ];
}

// Çalışma kitabının baytları.
export function buildWorkbook(allRecords, logins, options) {
  return buildXlsx(buildWorkbookSheets(allRecords, logins, options));
}

// Dosya adı (yalnızca yönetici indirir).
export function workbookFileName(now = new Date()) {
  return `EkoToken_Veri_Seti_${fileDate(now)}.xlsx`;
}

// Tarayıcıda dosyayı üretip indirir.
export function downloadWorkbook(allRecords, logins) {
  const now = new Date();
  downloadBytes(workbookFileName(now), buildWorkbook(allRecords, logins, { now }));
}
