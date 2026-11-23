// Örnek veri üreticisi (saf fonksiyon, testli). YALNIZCA yönetici panelindeki "Örnek veriyle önizle"
// modu için kullanılır: ekranın dolu hâlini göstermek amacıyla.
//
// Güvenlik kuralları (katmanlı savunma):
// 1) Örnek veri veritabanına HİÇ YAZILMAZ. Tarayıcıda, yönetici paneli açıkken üretilir.
// 2) Ayrı kodlar kullanılır (OK01–OK20, OD01–OD20). 60 gerçek katılımcı kodundan hiçbiriyle çakışmaz;
//    istatistik ve Excel kodu yalnızca izin verilen kod listesindeki kayıtları sayar.
// 3) Her kayıt isSample: true taşır.
//
// NÖTR veri: Gruplar ve aşamalar arasında bilerek bir fark TASARLANMAMIŞTIR. Dört hücre
// (Kontrol/Deney × Ön/Son Test) aynı dağılımdan, aynı parametrelerle üretilir. Hangi test anlamlı
// çıkarsa çıksın sonuç ayarlanmaz; örnek veri bir araştırma sonucu göstermez.
// Deterministik: sabit tohumlu sözde rastgele üretici sayesinde her açılışta aynı veri oluşur.
// Soru/yanıt metinleri reference/canvas-prototip.tsx → generateSampleInteractions'tan uyarlandı
// (prototipteki "Son Test'te Deney düşüşü" kurgusu bilerek ALINMADI).
import { calculateFootprint } from './footprint.js';
import { PHASES } from './phases.js';

// Örnek kodlar: her grupta 20 kod. Kod → grup eşlemesi aynı zamanda izin listesidir.
// Neden 20: örnek veri gerçek deneyin büyüklüğünü taklit eder (her grupta 20 asıl katılımcı).
// Bu kural sonuçtan bağımsızdır; küçük örneklemde şans farkları olduğundan büyük görünür.
const SAMPLE_PER_GROUP = 20;
const pad2 = (n) => String(n).padStart(2, '0');

export const SAMPLE_CODE_GROUPS = Object.fromEntries([
  ...Array.from({ length: SAMPLE_PER_GROUP }, (_, i) => [`OK${pad2(i + 1)}`, 'Kontrol']),
  ...Array.from({ length: SAMPLE_PER_GROUP }, (_, i) => [`OD${pad2(i + 1)}`, 'Deney']),
]);

export const SAMPLE_CODES = Object.keys(SAMPLE_CODE_GROUPS);

// Üretim parametreleri: TEK bir dağılım. Gruba veya aşamaya göre dallanma YOKTUR.
export const SAMPLE_PARAMS = {
  seed: 2204, // sabit tohum
  promptsPerParticipant: { min: 2, max: 9 }, // kişi başına istem sayısı (dahil)
  modelWeights: { light: 0.3, standard: 0.45, reasoning: 0.25 }, // model seçme olasılıkları
  inputTokens: { min: 40, max: 220 },
  outputTokens: { min: 80, max: 700 },
};

// Sabit tohumlu sözde rastgele sayı üreticisi (mulberry32). Her çağrıda 0 ile 1 arasında bir sayı verir.
// Aynı tohum her zaman aynı sayı dizisini üretir; böylece örnek veri her açılışta aynıdır.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// min ile max arasında (ikisi de dahil) rastgele bir tam sayı.
function randomInt(random, { min, max }) {
  return min + Math.floor(random() * (max - min + 1));
}

// Ağırlıklara göre bir model sınıfı seçer.
function pickModel(random, weights) {
  const r = random();
  let total = 0;
  for (const [id, weight] of Object.entries(weights)) {
    total += weight;
    if (r < total) return id;
  }
  return Object.keys(weights).at(-1); // yuvarlama artığı için son seçenek
}

// Soru–yanıt havuzu (gruptan ve aşamadan bağımsız). Yanıtlar Markdown/formül görünümünü de gösterir.
const QA_POOL = [
  {
    q: 'Newton hareket yasalarını günlük hayattan örneklerle açıklar mısın?',
    a: "### Newton'un Hareket Yasaları\n\n1. **Eylemsizlik:** Net kuvvet sıfırsa ($F_{\\text{net}} = 0$) cisim durumunu korur.\n2. **Temel yasa:** Net kuvvet kütle ile ivmenin çarpımıdır:\n$$F_{\\text{net}} = m \\cdot a$$\n3. **Etki–tepki:** Her etkiye eşit ve zıt bir tepki vardır.",
  },
  {
    q: 'Mitoz ve mayoz bölünmeyi tablo hâlinde karşılaştır.',
    a: '| Özellik | Mitoz | Mayoz |\n| :--- | :--- | :--- |\n| Oluşan hücre | 2 | 4 |\n| Kromozom sayısı | Sabit ($2n \\to 2n$) | Yarıya iner ($2n \\to n$) |\n| Çeşitlilik | Yok | Var |',
  },
  {
    q: 'İkinci dereceden denklemde diskriminant yöntemini anlat.',
    a: '$ax^2 + bx + c = 0$ denkleminde:\n$$\\Delta = b^2 - 4ac$$\n- $\\Delta > 0$ ise iki farklı kök vardır.\n- $\\Delta = 0$ ise çakışık kök vardır.\n- $\\Delta < 0$ ise gerçel kök yoktur.',
  },
  {
    q: "Tanzimat Fermanı'nın nedenlerini ve sonuçlarını özetle.",
    a: '#### Nedenler\n- Devletin dağılmasını önlemek\n- Avrupa devletlerinin müdahalesini engellemek\n\n#### Sonuçlar\n1. Kanun üstünlüğü ilkesi kabul edildi.\n2. Can ve mal güvenliği devlet güvencesine alındı.',
  },
  {
    q: 'Tepkime hızını etkileyen faktörleri açıkla.',
    a: 'Çarpışma teorisine göre taneciklerin eşik enerjisini ($E_a$) aşması gerekir.\n\n1. **Sıcaklık** etkin çarpışmayı artırır.\n2. **Derişim** çarpışma sıklığını artırır.\n3. **Katalizör** $E_a$ değerini düşürür.',
  },
  {
    q: 'Ohm yasasının formülünü kısaca yaz.',
    a: '- **Formül:** $V = I \\cdot R$\n- $V$ gerilim (Volt), $I$ akım (Amper), $R$ direnç (Ohm).',
  },
  {
    q: 'pH ölçeğinde asit, baz ve nötr aralıkları nedir?',
    a: '25 °C sıcaklıkta $\\text{pH} < 7$ asit, $\\text{pH} = 7$ nötr, $\\text{pH} > 7$ bazdır.',
  },
  {
    q: "Türkiye'deki 3 ana iklim tipini sırala.",
    a: '1. **Akdeniz:** Yazlar sıcak-kurak, kışlar ılık-yağışlı.\n2. **Karadeniz:** Her mevsim yağışlı.\n3. **Karasal:** Yazlar sıcak-kurak, kışlar soğuk.',
  },
];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Önizleme için örnek etkileşim ve giriş kayıtları üretir.
 * @param {number} [now]  zaman referansı (ms). Testler sabit değer verir.
 * @returns {{ records: object[], logins: object[] }}
 */
export function generateSampleData(now = Date.now()) {
  const random = createRandom(SAMPLE_PARAMS.seed);
  const records = [];
  const logins = [];

  for (const phase of PHASES) {
    // Ön Test kayıtları 7 gün önce, Son Test kayıtları 1 gün önce başlar (yalnızca görünüm için).
    const phaseStart = now - (phase === 'pretest' ? 7 : 1) * DAY;

    SAMPLE_CODES.forEach((code, codeIndex) => {
      const group = SAMPLE_CODE_GROUPS[code];
      const count = randomInt(random, SAMPLE_PARAMS.promptsPerParticipant);
      const firstAt = phaseStart + codeIndex * 5 * 60 * 1000;

      for (let i = 0; i < count; i++) {
        const modelId = pickModel(random, SAMPLE_PARAMS.modelWeights);
        const inputTokens = randomInt(random, SAMPLE_PARAMS.inputTokens);
        const outputTokens = randomInt(random, SAMPLE_PARAMS.outputTokens);
        const qa = QA_POOL[Math.floor(random() * QA_POOL.length)];

        records.push({
          id: `ornek-${code}-${phase}-${i}`,
          code,
          group,
          phase,
          modelId,
          prompt: qa.q,
          response: qa.a, // önizleme penceresi yanıtı buradan gösterir (sunucuya istek yok)
          ...calculateFootprint(inputTokens, outputTokens, modelId),
          tokenSource: 'tahmini',
          isSample: true,
          createdAt: firstAt + i * 3 * 60 * 1000,
        });
      }

      logins.push({
        id: `${code}_${phase}`,
        code,
        group,
        phase,
        firstLoginAt: firstAt - 60 * 1000,
        lastLoginAt: firstAt + count * 3 * 60 * 1000,
        loginCount: count + 2,
        sessionCount: 1,
      });
    });
  }

  return { records, logins };
}
