// EkoToken görsel ölçekleri (Yön 2b tasarımı): çubukların ve sütunların ne kadar dolu çizileceği.
// YENİ FORMÜL veya KATSAYI YOKTUR. Enerji/su/CO₂ değerleri sunucuda footprint.js ile hesaplanmıştır;
// burada yalnızca "çubuğun yüzde kaçı" sorusu cevaplanır. Saf fonksiyonlardır; tests/ecoVisual.test.js denetler.
//
// AYAK İZİ ARALIK ÇUBUĞU (onaylanan ölçek, 24.11.2026):
//   Çubuğun tamamı = aynı girdi/çıktı tokenı ile en yüksek enerji katsayılı sınıfın (Akıl Yürütme)
//   alabileceği EN YÜKSEK değer. Koyu bant bu yanıtın min–maks aralığıdır.
//   Böylece Hafif Model yanıtının bandı çubuğun solunda kısa, Akıl Yürütme yanıtının bandı sağ uca kadar
//   uzun görünür: sınıflar arası fark çubuktan da okunur.

import { MODEL_ORDER, calculateFootprint } from './footprint.js';

// Sayıyı [alt, üst] aralığına sıkıştırır; sayı değilse alt sınırı döner (NaN çizime sızmasın).
function clamp(value, low, high) {
  const n = Number(value);
  if (!Number.isFinite(n)) return low;
  return Math.min(high, Math.max(low, n));
}

/**
 * Aynı tokenlarla her ölçüt için çıkabilecek en yüksek değer (çubuğun tamamı).
 * Hangi sınıfın en yüksek olduğu sabit yazılmaz: bütün sınıfların maks değerlerinin en büyüğü alınır.
 * @returns {{ energy: number, water: number, co2: number }}
 */
export function rangeScale(inputTokens, outputTokens) {
  const all = MODEL_ORDER.map((id) => calculateFootprint(inputTokens, outputTokens, id));
  return {
    energy: Math.max(...all.map((f) => f.energyMax)),
    water: Math.max(...all.map((f) => f.waterMax)),
    co2: Math.max(...all.map((f) => f.co2Max)),
  };
}

/**
 * Bir yanıtın üç ölçütü için aralık bandının konumu (yüzde): { left, width }.
 * left = min / ölçek × 100, width = (maks − min) / ölçek × 100. Ölçek 0 ise (0 token) bant çizilmez.
 * @param {object} eco  Sunucudan gelen eco alanı (inputTokens, outputTokens, energyMin/Max, waterMin/Max, co2Min/Max)
 */
export function rangeBands(eco) {
  const scale = rangeScale(eco.inputTokens, eco.outputTokens);
  const band = (min, max, top) => {
    if (!(top > 0)) return { left: 0, width: 0 };
    const left = clamp((min / top) * 100, 0, 100);
    const right = clamp((max / top) * 100, left, 100);
    return { left, width: right - left };
  };
  return {
    energy: band(eco.energyMin, eco.energyMax, scale.energy),
    water: band(eco.waterMin, eco.waterMax, scale.water),
    co2: band(eco.co2Min, eco.co2Max, scale.co2),
  };
}

/**
 * Tasarruf karşılaştırması: seçilen model çubuğu tam (%100), Hafif Model çubuğu (100 − tasarruf %).
 * Yüzde footprint.js → calculateSavingsPct'ten gelir (sunucuda hesaplanıp eco.savingsPct olarak gönderilir).
 */
export function savingsBars(savingsPct) {
  const pct = clamp(savingsPct, 0, 100);
  return { selected: 100, light: 100 - pct };
}

/**
 * Birikim sütunu (xl ve üstü, EkoToken yan alanı): her istem bir dilim; sütunun tamamı oturum toplamıdır.
 * share = o istemin enerjisi / oturum toplam enerjisi (0–1). Toplam 0 ise bütün paylar 0.
 * Sıra eskiden yeniye korunur (çizimde eskisi altta, en yenisi üstte).
 * modelPerPrompt (isteğe bağlı): her istemin model sınıfı, aynı sırada (dilim rengi = model sınıfı).
 * @returns {{ index: number, value: number, share: number, modelId: string|null }[]}
 *   index: istemin oturumdaki sırası (0'dan)
 */
export function stackSlices(energyPerPrompt, modelPerPrompt = []) {
  const values = (Array.isArray(energyPerPrompt) ? energyPerPrompt : []).map((v) => clamp(v, 0, Infinity));
  const total = values.reduce((sum, v) => sum + v, 0);
  return values.map((value, index) => ({
    index,
    value,
    share: total > 0 ? value / total : 0,
    modelId: modelPerPrompt?.[index] ?? null,
  }));
}

/**
 * Oturum kartındaki küçük sütun grafiği: son `limit` istemin enerjisi ve her sütunun yüksekliği (yüzde).
 * Sütun yüksekliği o istemin enerjisi / gösterilen en büyük enerji. Çok küçük değerler de görünsün diye
 * sütun en az %8 yüksekliktedir (değer 0 ise 0).
 * modelPerPrompt (isteğe bağlı): her istemin model sınıfı, aynı sırada (sütun rengi = model sınıfı).
 * @returns {{ index: number, value: number, height: number, modelId: string|null }[]}
 *   index: istemin oturumdaki sırası (0'dan)
 */
export function promptColumns(energyPerPrompt, modelPerPrompt = [], limit = 12) {
  const values = Array.isArray(energyPerPrompt) ? energyPerPrompt : [];
  const start = Math.max(0, values.length - limit);
  const shown = values.slice(start);
  const top = Math.max(0, ...shown.map((v) => clamp(v, 0, Infinity)));
  return shown.map((v, i) => {
    const value = clamp(v, 0, Infinity);
    const height = top > 0 && value > 0 ? Math.max(8, (value / top) * 100) : 0;
    return { index: start + i, value, height, modelId: modelPerPrompt?.[start + i] ?? null };
  });
}
