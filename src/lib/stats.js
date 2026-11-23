// İstatistik motoru (mini SPSS): betimsel istatistik, Welch t-testi, eşleştirilmiş t-testi
// ve öğrenci kayıtlarını katılımcı bazında toplama.
// Buradaki her fonksiyon "saf"tır: dış dünyaya dokunmaz, aynı girdiye hep aynı sonucu verir.
// Doğrulama: tests/stats.test.js (standart t-tablosu değerleri ve bağımsız sayısal integral hesabı).
// Kaynak: reference/canvas-prototip.tsx (lnGamma, betacf, regularizedIncompleteBeta,
// studentTTwoTailedP, calcDescriptives, welchTTest, pairedTTest, buildPhaseStudentMap).
// Prototipten farkı: hesaplanamayan durumlarda sahte değer (t = ±999, p = 1) yazılmaz;
// bunun yerine { valid: false, reason } ile Türkçe gerekçe döner.
// Dilim 7 eki: etki büyüklüğü (Cohen's d) ve iki yeni ölçüt (ağırlıklı token, istem başına enerji).
// Bütün p değerleri ÇİFT YÖNLÜDÜR (two-tailed).

/* ---------------------------------------------------------------------------
 * 1. AYARLAR
 * ------------------------------------------------------------------------- */

// Anlamlılık düzeyi.
export const ALPHA = 0.05;

// Bir aşamada hiç istem yazmayan katılımcılar analize nasıl girer? (proje rehberi Bölüm 12/1)
// 'exclude': o aşamada kaydı olmayan katılımcı analize girmez (prototip davranışı).
// 'zero'   : o aşamada GİRİŞ YAPMIŞ ama istem yazmamış katılımcı 0 istemle dahil edilir.
//            Hiç giriş yapmamış (deneye gelmemiş) öğrenci yine dahil edilmez.
// Danışman öğretmenin kararı bekleniyor; karar verilene kadar 'exclude'.
export const ZERO_PROMPT_POLICY = 'exclude';

// Ondalıklı sayılarla yapılan toplamalarda küçük yuvarlama artıkları oluşur
// (ör. 0,1 + 0,2 = 0,30000000000000004). Standart sapma bu kadar küçükse 0 kabul edilir;
// yoksa aslında aynı olan değerler sahte, dev bir t değeri üretir.
const RELATIVE_ZERO_TOLERANCE = 1e-9;

/* ---------------------------------------------------------------------------
 * 2. t DAĞILIMI (p değeri hesabı)
 *    Kaynak: Numerical Recipes yöntemi. Prototipten değiştirilmeden alındı.
 * ------------------------------------------------------------------------- */

/**
 * Gamma fonksiyonunun doğal logaritması (Lanczos yaklaşımı).
 * Faktöriyelin ondalıklı sayılara genişletilmiş hâlidir: Γ(n) = (n − 1)!
 */
export function lnGamma(z) {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = z;
  let tmp = z + 5.5;
  tmp -= (z + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / z);
}

/**
 * Eksik beta fonksiyonu için sürekli kesir (Lentz yöntemi).
 * Sonsuz bir kesri, sonuç artık değişmeyene kadar adım adım hesaplar.
 */
function betacf(a, b, x) {
  const MAXIT = 200; // en fazla adım sayısı
  const EPS = 3e-12; // istenen hassasiyet
  const FPMIN = 1e-30; // sıfıra bölmeyi önlemek için çok küçük sayı
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    // Çift adım
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    // Tek adım
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break; // sonuç artık değişmiyor: dur
  }
  return h;
}

/**
 * Düzenlenmiş eksik beta fonksiyonu I_x(a, b). t dağılımının kuyruk alanı bununla bulunur.
 */
export function regularizedIncompleteBeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  // Sürekli kesir, x'in hangi tarafta olduğuna göre daha hızlı yakınsayan biçimde kullanılır.
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/**
 * Çift yönlü p değeri: t dağılımında |t|'den daha uç bir değer görme olasılığı.
 * p = I_x(sd/2, 1/2), x = sd / (sd + t²)
 * Geçersiz girdide null döner.
 */
export function studentTTwoTailedP(t, df) {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return null;
  const tAbs = Math.abs(t);
  if (tAbs === 0) return 1;
  const x = df / (df + tAbs * tAbs);
  const p = regularizedIncompleteBeta(df / 2, 0.5, x);
  return Math.max(0, Math.min(1, p)); // yuvarlama artıklarına karşı 0–1 aralığında tut
}

/* ---------------------------------------------------------------------------
 * 3. BETİMSEL İSTATİSTİK
 * ------------------------------------------------------------------------- */

/**
 * n, ortalama, örneklem varyansı (n − 1'e bölünür, SPSS ile aynı) ve standart sapma.
 */
export function calcDescriptives(values) {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, sd: 0, variance: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  if (n === 1) return { n: 1, mean, sd: 0, variance: 0 };
  const sumOfSquares = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  const variance = sumOfSquares / (n - 1);
  return { n, mean, sd: Math.sqrt(variance), variance };
}

// Standart sapma, değerlerin büyüklüğüne göre ihmal edilecek kadar küçükse true döner.
function isEffectivelyZero(sd, values) {
  const largest = Math.max(1, ...values.map((v) => Math.abs(v)));
  return sd <= RELATIVE_ZERO_TOLERANCE * largest;
}

/* ---------------------------------------------------------------------------
 * 3b. ETKİ BÜYÜKLÜĞÜ (Cohen's d)
 *     p değeri "fark rastlantı olabilir mi?" sorusunu cevaplar; d ise "fark ne kadar büyük?"
 *     sorusunu. Formüller SPSS 27 ve sonrasının raporladığı Cohen's d ile aynıdır.
 * ------------------------------------------------------------------------- */

// Arayüzde ve Excel'de aynen gösterilen formül açıklamaları.
export const COHENS_D_FORMULAS = {
  independent:
    "Bağımsız gruplar (Welch testleri): havuzlanmış standart sapma ile Cohen's d. " +
    'd = (x̄ Kontrol − x̄ Deney) / sp;  sp = √[((nK − 1)·sK² + (nD − 1)·sD²) / (nK + nD − 2)]',
  paired:
    "Eşleştirilmiş testler: Cohen's dz = farkların ortalaması / farkların standart sapması (fark = Son Test − Ön Test)",
  labels: '|d| < 0,2 ihmal edilebilir · 0,2 ≤ |d| < 0,5 küçük · 0,5 ≤ |d| < 0,8 orta · |d| ≥ 0,8 büyük',
};

/**
 * Bağımsız iki grup için Cohen's d (havuzlanmış standart sapma ile).
 * Girdi calcDescriptives sonuçlarıdır. Hesaplanamıyorsa null döner.
 */
export function cohensDIndependent(d1, d2) {
  if (d1.n < 2 || d2.n < 2) return null;
  // Havuzlanmış varyans: iki grubun varyanslarının serbestlik derecesiyle ağırlıklı ortalaması.
  const pooledVariance = ((d1.n - 1) * d1.variance + (d2.n - 1) * d2.variance) / (d1.n + d2.n - 2);
  const pooledSd = Math.sqrt(pooledVariance);
  if (!(pooledSd > 0)) return null;
  return (d1.mean - d2.mean) / pooledSd;
}

/**
 * Eşleştirilmiş ölçümler için Cohen's dz = farkların ortalaması / farkların standart sapması.
 * Hesaplanamıyorsa null döner.
 */
export function cohensDPaired(meanDiff, sdDiff) {
  if (!Number.isFinite(meanDiff) || !(sdDiff > 0)) return null;
  return meanDiff / sdDiff;
}

/**
 * Etki büyüklüğünün Türkçe etiketi (Cohen'in ölçütleri). d yoksa null.
 */
export function effectSizeLabel(d) {
  if (d === null || d === undefined || !Number.isFinite(d)) return null;
  const size = Math.abs(d);
  if (size < 0.2) return 'ihmal edilebilir';
  if (size < 0.5) return 'küçük';
  if (size < 0.8) return 'orta';
  return 'büyük';
}

/* ---------------------------------------------------------------------------
 * 4. t-TESTLERİ
 * ------------------------------------------------------------------------- */

/**
 * Bağımsız örneklem Welch t-testi (çift yönlü). Grup varyanslarının eşit olduğu varsayılmaz.
 * Kullanım: Ön Test K vs D (başlangıç denkliği), Son Test K vs D.
 *
 * @param {number[]} group1  ör. Kontrol grubundaki öğrencilerin değerleri
 * @param {number[]} group2  ör. Deney grubundaki öğrencilerin değerleri
 * @returns Geçerliyse { valid: true, t, df, p, meanDiff, d, d1, d2 }   (p çift yönlü, d = Cohen's d)
 *          Hesaplanamıyorsa { valid: false, reason, d: null, d1, d2 }
 */
export function welchTTest(group1, group2) {
  const d1 = calcDescriptives(group1);
  const d2 = calcDescriptives(group2);

  if (d1.n < 2 || d2.n < 2) {
    return {
      valid: false,
      reason: `Bağımsız örneklem t-testi için her iki grupta en az 2 katılımcı gereklidir (şu an: ${d1.n} ve ${d2.n}).`,
      d: null,
      d1,
      d2,
    };
  }

  // İki grupta da tüm değerler aynıysa varyans 0'dır, t formülünde paydada 0 kalır.
  if (isEffectivelyZero(d1.sd, group1) && isEffectivelyZero(d2.sd, group2)) {
    return {
      valid: false,
      reason:
        'Her iki grupta da tüm katılımcıların değeri birbirinin aynı (varyans 0) olduğundan t istatistiği hesaplanamadı.',
      d: null,
      d1,
      d2,
    };
  }

  const se1 = d1.variance / d1.n; // 1. grubun ortalamasının varyansı
  const se2 = d2.variance / d2.n; // 2. grubun ortalamasının varyansı
  const seSum = se1 + se2;
  const t = (d1.mean - d2.mean) / Math.sqrt(seSum);

  // Welch–Satterthwaite serbestlik derecesi (genellikle tam sayı değildir).
  const df = (seSum * seSum) / ((se1 * se1) / (d1.n - 1) + (se2 * se2) / (d2.n - 1));

  return {
    valid: true,
    t,
    df,
    p: studentTTwoTailedP(t, df),
    meanDiff: d1.mean - d2.mean,
    d: cohensDIndependent(d1, d2),
    d1,
    d2,
  };
}

/**
 * Bağımlı örneklem (eşleştirilmiş) t-testi (çift yönlü).
 * Aynı öğrencinin Ön Test ve Son Test değerleri karşılaştırılır. Fark = Son − Ön.
 * Kullanım: Kontrol Ön vs Son, Deney Ön vs Son.
 *
 * @param {{ pre: number, post: number }[]} pairs  her öğrenci için bir çift
 * @returns Geçerliyse { valid: true, t, df, p, meanDiff, sdDiff, d, preMean, postMean, n }
 *          Hesaplanamıyorsa { valid: false, reason, meanDiff, d: null, preMean, postMean, n }
 *          (p çift yönlü; d = Cohen's dz; preMean/postMean yalnızca eşleşen öğrencilerin ortalamasıdır)
 */
export function pairedTTest(pairs) {
  const n = pairs.length;
  // Eşleşen öğrencilerin Ön Test ve Son Test ortalamaları (yorumda yönü söylemek için).
  const preMean = n > 0 ? calcDescriptives(pairs.map((pair) => pair.pre)).mean : null;
  const postMean = n > 0 ? calcDescriptives(pairs.map((pair) => pair.post)).mean : null;

  if (n < 2) {
    return {
      valid: false,
      reason: `Bağımlı örneklem t-testi için hem Ön Test hem Son Test verisine sahip en az 2 katılımcı gereklidir (şu an: ${n}).`,
      meanDiff: null,
      d: null,
      preMean,
      postMean,
      n,
    };
  }

  const diffs = pairs.map((pair) => pair.post - pair.pre);
  const dStats = calcDescriptives(diffs);

  // Herkesin farkı aynıysa farkların standart sapması 0'dır, t formülünde paydada 0 kalır.
  if (isEffectivelyZero(dStats.sd, diffs)) {
    return {
      valid: false,
      reason:
        'Tüm katılımcılarda Ön Test–Son Test farkı aynı olduğundan (farkların standart sapması 0) t istatistiği hesaplanamadı.',
      meanDiff: dStats.mean,
      d: null,
      preMean,
      postMean,
      n,
    };
  }

  const df = n - 1;
  const t = dStats.mean / (dStats.sd / Math.sqrt(n)); // ortalama fark / standart hata

  return {
    valid: true,
    t,
    df,
    p: studentTTwoTailedP(t, df),
    meanDiff: dStats.mean,
    sdDiff: dStats.sd,
    d: cohensDPaired(dStats.mean, dStats.sd),
    preMean,
    postMean,
    n,
  };
}

/* ---------------------------------------------------------------------------
 * 5. KATILIMCI BAZINDA TOPLAMA
 *    t-testleri tek tek mesajlar üzerinde değil, öğrenci başına toplamlar üzerinde yapılır.
 * ------------------------------------------------------------------------- */

export const PHASES = ['pretest', 'posttest'];

// Analizde kullanılabilen ölçütler (öğrenci başına).
// prompts: istem sayısı · weightedTokens: toplam ağırlıklı token · energy: toplam enerji (Wh, BİRİNCİL ölçüt)
// energyPerPrompt: istem başına ortalama enerji (Wh) · water: toplam su (mL) · co2: toplam CO₂ (g)
// lightPct: Hafif Model ile yazılan istemlerin yüzdesi
export const METRICS = ['prompts', 'weightedTokens', 'energy', 'energyPerPrompt', 'water', 'co2', 'lightPct'];

// Katılımcı kodunun ilk harfinden grubu bulur: K → Kontrol, D → Deney.
// (Sunucu da grubu aynı kuralla koddan belirler.)
function groupFromCode(code) {
  if (typeof code === 'string' && code.startsWith('K')) return 'Kontrol';
  if (typeof code === 'string' && code.startsWith('D')) return 'Deney';
  return null;
}

/**
 * Etkileşim kayıtlarını öğrenci + aşama başına tek satıra toplar.
 *
 * Her satır: { code, group, phase, prompts, weightedTokens, water, energy, co2, energyPerPrompt, lightPct }
 * - water / energy / co2: o aşamadaki tüm yanıtların ORTALAMA değerlerinin toplamı
 * - weightedTokens: o aşamadaki ağırlıklı tokenların toplamı (Girdi + 3 × Çıktı)
 * - energyPerPrompt: energy / prompts. 0 istemde tanımsızdır → null.
 * - lightPct: Hafif Model ile yazılan istemlerin yüzdesi. 0 istemde tanımsızdır → null.
 *
 * @param {object[]} interactions  Firestore'daki interactions kayıtları
 * @param {object}   options
 * @param {'exclude'|'zero'} [options.policy]  sıfır istem politikası (varsayılan: ZERO_PROMPT_POLICY)
 * @param {{ pretest: string[], posttest: string[] }} [options.loggedInCodes]
 *        Her aşamada giriş yapmış kodlar. 'zero' politikasında zorunludur.
 * @param {boolean} [options.includeSamples]  örnek veriler dahil edilsin mi? (varsayılan: hayır)
 * @returns {object[]}
 */
export function aggregateByParticipant(interactions, options = {}) {
  const policy = options.policy === undefined ? ZERO_PROMPT_POLICY : options.policy;
  const includeSamples = options.includeSamples === true;
  const loggedInCodes = options.loggedInCodes;

  if (policy !== 'exclude' && policy !== 'zero') {
    throw new Error(`Bilinmeyen sıfır istem politikası: ${policy}`);
  }
  if (policy === 'zero' && !loggedInCodes) {
    throw new Error("'zero' politikası için her aşamada giriş yapmış kodların listesi gereklidir.");
  }

  // Anahtar: "K001|pretest" → o öğrencinin o aşamadaki toplamları
  const rows = new Map();
  const keyOf = (code, phase) => `${code}|${phase}`;

  for (const it of interactions) {
    if (it.isSample === true && !includeSamples) continue; // örnek veri varsayılan olarak girmez
    if (!PHASES.includes(it.phase)) continue;

    const key = keyOf(it.code, it.phase);
    if (!rows.has(key)) {
      rows.set(key, {
        code: it.code,
        group: it.group,
        phase: it.phase,
        prompts: 0,
        weightedTokens: 0,
        water: 0,
        energy: 0,
        co2: 0,
        lightCount: 0,
      });
    }
    const row = rows.get(key);
    row.prompts += 1;
    row.weightedTokens += Number(it.weightedTokens) || 0;
    row.water += Number(it.waterAvg) || 0;
    row.energy += Number(it.energyAvg) || 0;
    row.co2 += Number(it.co2Avg) || 0;
    if (it.modelId === 'light') row.lightCount += 1;
  }

  // 'zero' politikası: o aşamada giriş yapmış ama hiç istem yazmamış öğrenciyi 0 ile ekle.
  if (policy === 'zero') {
    for (const phase of PHASES) {
      const codes = loggedInCodes[phase] || [];
      for (const code of codes) {
        const key = keyOf(code, phase);
        if (rows.has(key)) continue; // istem yazmış, zaten var
        const group = groupFromCode(code);
        if (!group) continue; // geçersiz kod
        rows.set(key, { code, group, phase, prompts: 0, weightedTokens: 0, water: 0, energy: 0, co2: 0, lightCount: 0 });
      }
    }
  }

  // Oran ölçütlerini hesapla (0 istemde tanımsız → null) ve yardımcı sayacı çıkar.
  return Array.from(rows.values()).map((row) => {
    const { lightCount, ...rest } = row;
    return {
      ...rest,
      energyPerPrompt: row.prompts > 0 ? row.energy / row.prompts : null,
      lightPct: row.prompts > 0 ? (lightCount / row.prompts) * 100 : null,
    };
  });
}

/**
 * Belirli bir grup + aşama için bir ölçütün değer listesini verir (Welch testi girdisi).
 * Değeri tanımsız (null) olanlar atlanır.
 */
export function getValues(rows, group, phase, metric) {
  return rows
    .filter((r) => r.group === group && r.phase === phase)
    .map((r) => r[metric])
    .filter((v) => v !== null && v !== undefined);
}

/**
 * Belirli bir grupta, hem Ön Test hem Son Test değeri olan öğrencilerin çiftlerini verir
 * (eşleştirilmiş test girdisi). Bir aşamada değeri tanımsız olan öğrenci çifte girmez.
 *
 * @returns {{ code: string, pre: number, post: number }[]}
 */
export function getPairs(rows, group, metric) {
  const post = new Map();
  for (const r of rows) {
    if (r.group === group && r.phase === 'posttest') post.set(r.code, r[metric]);
  }

  const pairs = [];
  for (const r of rows) {
    if (r.group !== group || r.phase !== 'pretest') continue;
    const preValue = r[metric];
    const postValue = post.get(r.code);
    if (preValue === null || preValue === undefined) continue;
    if (postValue === null || postValue === undefined) continue;
    pairs.push({ code: r.code, pre: preValue, post: postValue });
  }
  return pairs;
}
