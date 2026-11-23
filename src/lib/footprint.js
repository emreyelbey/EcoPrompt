// Bilimsel hesaplama motoru: token sayımı, enerji / su / CO₂ ayak izi, maliyet,
// tasarruf oranı ve günlük hayat karşılıkları.
// Buradaki her fonksiyon "saf"tır: dış dünyaya dokunmaz, aynı girdiye hep aynı sonucu verir.
// Bu sayede hepsi birim testleriyle (tests/footprint.test.js) doğrulanır.
// Kaynak: reference/canvas-prototip.tsx (estimateTokens, calculateFootprint, getDailyEquivalents).
// Katsayılar: docs/sartname.md Bölüm 3 ve proje rehberi Bölüm 5. Değiştirmeden önce danışmana sorulur.

import { fmtNum, fmtSmart } from './format.js';

/* ---------------------------------------------------------------------------
 * 1. KATSAYILAR
 * ------------------------------------------------------------------------- */

// 3 ölçek sınıfı. Enerji değerleri 1.000 ağırlıklı token başına Wh'dir.
// Maliyet, 1 milyon token başına ABD dolarıdır (girdi ve çıktı ayrı).
export const MODEL_SCALES = {
  light: {
    id: 'light',
    name: 'Hafif Model',
    energyMin: 0.12,
    energyAvg: 0.18,
    energyMax: 0.25,
    costInputPer1M: 0.1,
    costOutputPer1M: 0.4,
  },
  standard: {
    id: 'standard',
    name: 'Standart Model',
    energyMin: 0.45,
    energyAvg: 0.65,
    energyMax: 0.9,
    costInputPer1M: 1.25,
    costOutputPer1M: 5.0,
  },
  reasoning: {
    id: 'reasoning',
    name: 'Akıl Yürütme Modeli',
    energyMin: 1.4,
    energyAvg: 2.1,
    energyMax: 3.0,
    costInputPer1M: 3.0,
    costOutputPer1M: 15.0,
  },
};

// Sınıfların arayüzde ve grafiklerde gösterilme sırası.
export const MODEL_ORDER = ['light', 'standard', 'reasoning'];

// Su ayak izi (WUE): 1 Wh enerji için harcanan soğutma suyu (mL/Wh).
export const WUE = { min: 0.2, avg: 1.0, max: 1.8 };

// Elektrik şebekesinin karbon yoğunluğu: 1 Wh için salınan CO₂ (g/Wh).
export const CARBON_INTENSITY = { min: 0.3, avg: 0.43, max: 0.55 };

// Türkçe metinde ortalama kaç karakterin 1 token ettiği (tahmin için).
export const CHARS_PER_TOKEN = 3.6;

// Çıktı tokenlarının ağırlığı: çıktı üretmek, girdiyi okumaktan yaklaşık 3 kat fazla enerji harcar.
export const OUTPUT_WEIGHT = 3;

// Günlük hayat karşılıklarında kullanılan sabitler.
export const EQUIVALENTS = {
  dropMl: 0.05, // 1 su damlası
  teaspoonMl: 5, // 1 tatlı kaşığı
  glassMl: 200, // 1 su bardağı
  bottleMl: 500, // 1 yarım litrelik şişe
  ledSecondsPerWh: 360, // 10 W LED ampul, 1 Wh ile 360 saniye yanar (3600 sn / 10 W)
  phoneBatteryWh: 15, // ortalama akıllı telefon bataryası
  carGramsPerMeter: 0.12, // binek araç 120 g CO₂/km = 0,12 g/m
  treeGramsPerDay: 60, // olgun bir ağacın günlük CO₂ emilimi
};

/* ---------------------------------------------------------------------------
 * 2. TOKEN SAYIMI
 * ------------------------------------------------------------------------- */

/**
 * Metnin token sayısını tahmin eder: ⌈karakter sayısı / 3,6⌉
 * Boş metin her zaman 0'dır; gizli veya sabit token eklenmez.
 */
export function estimateTokens(text) {
  if (typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return Math.ceil(trimmed.length / CHARS_PER_TOKEN);
}

// Bir değerin geçerli bir token sayısı (0 veya pozitif tam sayı) olup olmadığını söyler.
function isTokenCount(value) {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Yapay zeka API'sinin döndürdüğü kullanım bilgisinden (usageMetadata) token sayılarını çıkarır.
 *
 * - Çıktı token = candidatesTokenCount + thoughtsTokenCount
 *   (düşünme tokenları da üretilmiş tokendır, enerji harcar).
 * - Girdi ve çıktının İKİSİ DE API'den güvenilir biçimde alınabiliyorsa kaynak 'gerçek' olur.
 * - Biri bile eksik veya bozuksa ikisi de metinden tahmin edilir ve kaynak 'tahmini' olur.
 *   (Yarı gerçek yarı tahmini bir kaydı 'gerçek' diye işaretlemek yanıltıcı olurdu.)
 *
 * @returns {{ inputTokens: number, outputTokens: number, tokenSource: 'gerçek' | 'tahmini' }}
 */
export function resolveTokens(usageMetadata, promptText, responseText) {
  const usage = usageMetadata || {};
  const input = usage.promptTokenCount;
  // Alan hiç gelmemişse 0 kabul edilir (ör. düşünme modu kapalı modelde thoughtsTokenCount yoktur).
  const candidates = usage.candidatesTokenCount === undefined ? 0 : usage.candidatesTokenCount;
  const thoughts = usage.thoughtsTokenCount === undefined ? 0 : usage.thoughtsTokenCount;

  const inputIsValid = isTokenCount(input) && input > 0;
  const outputIsValid = isTokenCount(candidates) && isTokenCount(thoughts) && candidates + thoughts > 0;

  if (inputIsValid && outputIsValid) {
    return {
      inputTokens: input,
      outputTokens: candidates + thoughts,
      tokenSource: 'gerçek',
    };
  }

  return {
    inputTokens: estimateTokens(promptText),
    outputTokens: estimateTokens(responseText),
    tokenSource: 'tahmini',
  };
}

/* ---------------------------------------------------------------------------
 * 3. AYAK İZİ HESABI
 * ------------------------------------------------------------------------- */

// Model sınıfını bulur. Bilinmeyen bir sınıf gelirse sessizce başka bir sınıf varsaymak yerine
// hata verir; çünkü yanlış sınıfla hesaplanan bir kayıt araştırma verisini bozar.
function getScale(modelId) {
  if (!Object.hasOwn(MODEL_SCALES, modelId)) {
    throw new Error(`Bilinmeyen model sınıfı: ${modelId}`);
  }
  return MODEL_SCALES[modelId];
}

/**
 * Seçilen sınıf yerine Hafif Model kullanılsaydı yüzde kaç enerji tasarrufu olurdu?
 * Tasarruf % = (seçilen ort. enerji − hafif ort. enerji) / seçilen ort. enerji × 100
 * Tam sayıya yuvarlanır. Hafif Model için 0'dır.
 */
export function calculateSavingsPct(modelId) {
  const selected = getScale(modelId);
  const light = MODEL_SCALES.light;
  if (selected.id === 'light') return 0;
  return Math.round(((selected.energyAvg - light.energyAvg) / selected.energyAvg) * 100);
}

// Token sayısını temizler: sayı değilse 0, negatifse 0, ondalıklıysa en yakın tam sayı.
function cleanTokenCount(value) {
  const num = Math.round(Number(value) || 0);
  return Math.max(0, num);
}

/**
 * Bir etkileşimin çevresel ayak izini ve maliyetini hesaplar.
 *
 * Ağırlıklı token = Girdi + 3 × Çıktı
 * Enerji (Wh)    = ağırlıklı token / 1000 × sınıfın enerji katsayısı
 * Su (mL)        = enerji × WUE           (min×min, ort×ort, maks×maks)
 * CO₂ (g)        = enerji × karbon yoğunluğu (aynı eşleşme)
 * Maliyet (USD)  = girdi/1M × girdi fiyatı + çıktı/1M × çıktı fiyatı
 */
export function calculateFootprint(inputTokens, outputTokens, modelId) {
  const scale = getScale(modelId);
  const input = cleanTokenCount(inputTokens);
  const output = cleanTokenCount(outputTokens);

  const weightedTokens = input + OUTPUT_WEIGHT * output;
  const perThousand = weightedTokens / 1000;

  const energyMin = perThousand * scale.energyMin;
  const energyAvg = perThousand * scale.energyAvg;
  const energyMax = perThousand * scale.energyMax;

  const costUsd =
    (input / 1_000_000) * scale.costInputPer1M + (output / 1_000_000) * scale.costOutputPer1M;

  return {
    inputTokens: input,
    outputTokens: output,
    weightedTokens,
    energyMin,
    energyAvg,
    energyMax,
    waterMin: energyMin * WUE.min,
    waterAvg: energyAvg * WUE.avg,
    waterMax: energyMax * WUE.max,
    co2Min: energyMin * CARBON_INTENSITY.min,
    co2Avg: energyAvg * CARBON_INTENSITY.avg,
    co2Max: energyMax * CARBON_INTENSITY.max,
    costUsd,
    savingsPct: calculateSavingsPct(modelId),
  };
}

/* ---------------------------------------------------------------------------
 * 4. GÜNLÜK HAYAT KARŞILIKLARI
 * ------------------------------------------------------------------------- */

// Su miktarını en anlaşılır birimle anlatır (damla → tatlı kaşığı → bardak → şişe).
function describeWater(waterMl) {
  const drops = waterMl / EQUIVALENTS.dropMl;
  if (waterMl < 2.5) return `≈ ${fmtNum(drops, drops < 10 ? 1 : 0)} su damlası`;
  if (waterMl < 80) return `≈ ${fmtNum(waterMl / EQUIVALENTS.teaspoonMl, 1)} tatlı kaşığı su`;
  if (waterMl < 400) return `≈ ${fmtNum(waterMl / EQUIVALENTS.glassMl, 2)} su bardağı`;
  return `≈ ${fmtNum(waterMl / EQUIVALENTS.bottleMl, 2)} yarım litrelik şişe`;
}

// LED ampulün yanma süresini saniye, dakika veya saat olarak yazar.
function describeDuration(seconds) {
  if (seconds < 60) return `${fmtNum(seconds, 0)} sn`;
  if (seconds < 3600) return `${fmtNum(seconds / 60, 1)} dk`;
  return `${fmtNum(seconds / 3600, 2)} sa`;
}

// Araç sürüş mesafesini metre veya kilometre olarak yazar.
function describeCarDistance(meters) {
  if (meters < 1000) return `${fmtNum(meters, meters < 10 ? 1 : 0)} metre araç sürüşü`;
  return `${fmtNum(meters / 1000, 2)} km araç sürüşü`;
}

// Ağacın günlük CO₂ emilimiyle karşılaştırır.
function describeTree(treeDayPct) {
  if (treeDayPct < 100) return `1 olgun ağacın günlük CO₂ emiliminin %${fmtSmart(treeDayPct)} kadarı`;
  return `1 olgun ağacın ${fmtNum(treeDayPct / 100, 2)} günlük CO₂ emilimi`;
}

/**
 * Su (mL), enerji (Wh) ve CO₂ (g) miktarlarını günlük hayattan örneklerle somutlaştırır.
 * Hem sayısal değerleri (grafik ve testler için) hem de hazır Türkçe metinleri döner.
 * Not: Yüzdelerden sonra ek yerine "kadarı" yazılır; "%3'ü / %5'i" gibi eklerin
 * ses uyumu sayıya göre değiştiği için bu yol her sayıda doğru Türkçe verir.
 */
export function getDailyEquivalents(waterMl, energyWh, co2Grams) {
  // Geçersiz veya negatif değerler 0 kabul edilir.
  const water = Math.max(0, Number(waterMl) || 0);
  const energy = Math.max(0, Number(energyWh) || 0);
  const co2 = Math.max(0, Number(co2Grams) || 0);

  const ledSeconds = energy * EQUIVALENTS.ledSecondsPerWh;
  const phonePct = (energy / EQUIVALENTS.phoneBatteryWh) * 100;
  const carMeters = co2 / EQUIVALENTS.carGramsPerMeter;
  const treeDayPct = (co2 / EQUIVALENTS.treeGramsPerDay) * 100;

  return {
    // Su
    drops: water / EQUIVALENTS.dropMl,
    teaspoons: water / EQUIVALENTS.teaspoonMl,
    glasses: water / EQUIVALENTS.glassMl,
    bottles: water / EQUIVALENTS.bottleMl,
    waterPrimary: describeWater(water),
    // Enerji
    ledSeconds,
    ledText: `10 W LED ampulü ${describeDuration(ledSeconds)} yakmaya eşdeğer`,
    phonePct,
    phoneText: `Telefon bataryasının %${fmtSmart(phonePct)} kadarı`,
    // Karbon
    carMeters,
    carText: describeCarDistance(carMeters),
    treeDayPct,
    treeText: describeTree(treeDayPct),
  };
}
