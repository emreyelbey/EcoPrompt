// Model sınıfı → renk eşlemesi (TEK KAYNAK). EkoToken grafiklerinde renk = model sınıfıdır:
// birikim sütunu, siyah karttaki "istem başına" sütunları ve Kişisel Rapor grafikleri bu dosyayı kullanır.
// Yalnızca EkoToken ekranında (Deney + Son Test) kullanılır; sade ekranda renkli model gösterimi yoktur.
// Yalnızca Türkçe sınıf adları vardır; sağlayıcı/model adı geçmez.
//
// Renk seçimi (tests/modelColors.test.js denetler):
//   - Her renk kendi zeminine karşı en az 3:1 kontrast sağlar (WCAG, grafik öğesi).
//   - Üç renk açıklık bakımından da belirgin ayrışır (yan yana iki renk arasında en az 1,8:1); böylece renk
//     körlüğünde ve gri tonlu çıktıda da ayırt edilir.
//
// AÇIK ZEMİN (kâğıt beyazı #FAFAF9): Hafif = koyu EkoToken yeşili, Standart = gri, Akıl Yürütme = mürekkep siyahı.
//   Hafif #059669 (3,6:1) · Standart #52525B (7,4:1) · Akıl Yürütme #0A0A0B (19:1)
//   Not: daha açık bir gri (#8A8A93) yeşille neredeyse aynı açıklıkta olduğu için seçilmedi.
// KOYU ZEMİN (siyah kart #0A0A0B): siyah zeminde siyah görünmeyeceği için Akıl Yürütme en açık tondur (beyaz);
//   Hafif = parlak EkoToken yeşili, Standart = gri.
//   Akıl Yürütme #FAFAFA (19:1) · Hafif #34D399 (10,3:1) · Standart #71717A (4,1:1)

import { MODEL_ORDER } from './footprint.js';

export const MODEL_COLORS = {
  light: '#059669',
  standard: '#52525B',
  reasoning: '#0A0A0B',
};

export const MODEL_COLORS_ON_DARK = {
  light: '#34D399',
  standard: '#71717A',
  reasoning: '#FAFAFA',
};

// Açıklamalarda (lejant) kullanılan kısa Türkçe sınıf adları.
export const MODEL_SHORT_NAMES = {
  light: 'Hafif',
  standard: 'Standart',
  reasoning: 'Akıl Yürütme',
};

/**
 * Lejant için sabit sıralı liste: [{ id, name, color }].
 * @param {'light'|'dark'} tone  Zemin: açık (kâğıt) veya koyu (siyah kart)
 */
export function modelLegend(tone = 'light') {
  const colors = tone === 'dark' ? MODEL_COLORS_ON_DARK : MODEL_COLORS;
  return MODEL_ORDER.map((id) => ({ id, name: MODEL_SHORT_NAMES[id], color: colors[id] }));
}

// Bilinmeyen sınıf için nötr gri (iki zeminde de okunur).
const UNKNOWN_COLOR = '#A1A1AA';

/** Bir sınıfın rengi. Bilinmeyen sınıf gelirse (ör. bozuk kayıt) nötr gri döner; çizim bozulmaz. */
export function modelColor(modelId, tone = 'light') {
  const colors = tone === 'dark' ? MODEL_COLORS_ON_DARK : MODEL_COLORS;
  return colors[modelId] ?? UNKNOWN_COLOR;
}
