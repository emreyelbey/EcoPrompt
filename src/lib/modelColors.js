// Model sınıfı → görünüm eşlemesi (TEK KAYNAK). EkoToken grafiklerinde renk + BİÇİM = model sınıfıdır:
// birikim sütunu, siyah karttaki "istem başına" sütunları, lejantlar ve Kişisel Rapor grafikleri bu dosyayı kullanır.
// Yalnızca EkoToken ekranında (Deney + Son Test) kullanılır; sade ekranda model gösterimi yoktur.
// Yalnızca Türkçe sınıf adları vardır; sağlayıcı/model adı geçmez.
//
// NEDEN BİÇİM? Gri bir Standart dilimi siyah Akıl Yürütme diliminin yanında ekranda ayırt edilemiyordu.
// Bu yüzden Standart renkle değil şekille ayrılır:
//   Hafif = DOLU yeşil · Standart = İÇİ BOŞ (zemin rengi) + 1,5 px çerçeve · Akıl Yürütme = DOLU koyu.
// Böylece gri tonlu çıktıda ve renk körlüğünde de üç sınıf ayırt edilir (dolu / boş / dolu; iki dolu renk
// açıklıkça da farklıdır). tests/modelColors.test.js denetler.
//
// Zemin türleri (tone):
//   'light' → kâğıt beyazı zemin (#FAFAF9), birikim sütunu. Standart'ın dolgusu zemin rengidir.
//   'dark'  → siyah kart (#0A0A0B). Siyah zeminde siyah dilim görünmeyeceği için Akıl Yürütme açık tondur.
//   'chart' → Kişisel Rapor'daki alan grafikleri (halka) ve listesi, beyaz kart zemini. Geniş alanlarda içi tamamen
//             boş dilim "eksik veri" gibi görüneceği için Standart çok açık gri dolgu + koyu çerçevedir.

import { MODEL_ORDER } from './footprint.js';

// Standart'ın çerçeve kalınlığı (px).
export const STANDARD_STROKE_WIDTH = 1.5;

// Her zemin için zemin rengi (kontrast hesabı ve testler için).
export const TONE_BACKGROUNDS = { light: '#FAFAF9', dark: '#0A0A0B', chart: '#FFFFFF' };

// fill: dolgu rengi · stroke: çerçeve rengi (null = çerçeve yok) · hollow: içi boş mu (lejant ve testler için).
export const MODEL_STYLES = {
  light: {
    light: { fill: '#059669', stroke: null, hollow: false },
    standard: { fill: '#FAFAF9', stroke: '#0A0A0B', hollow: true },
    reasoning: { fill: '#0A0A0B', stroke: null, hollow: false },
  },
  dark: {
    light: { fill: '#34D399', stroke: null, hollow: false },
    standard: { fill: '#0A0A0B', stroke: '#FAFAFA', hollow: true },
    reasoning: { fill: '#FAFAFA', stroke: null, hollow: false },
  },
  chart: {
    light: { fill: '#059669', stroke: null, hollow: false },
    standard: { fill: '#E4E4E7', stroke: '#0A0A0B', hollow: true },
    reasoning: { fill: '#0A0A0B', stroke: null, hollow: false },
  },
};

// Lejantlarda kullanılan kısa Türkçe sınıf adları.
export const MODEL_SHORT_NAMES = {
  light: 'Hafif',
  standard: 'Standart',
  reasoning: 'Akıl Yürütme',
};

// Bilinmeyen sınıf (ör. bozuk kayıt) için nötr gri; çizim bozulmaz.
const UNKNOWN_STYLE = { fill: '#A1A1AA', stroke: null, hollow: false };

/** Bir sınıfın görünümü: { fill, stroke, hollow }. */
export function modelStyle(modelId, tone = 'light') {
  return MODEL_STYLES[tone]?.[modelId] ?? UNKNOWN_STYLE;
}

/**
 * HTML öğesi (dilim, sütun, lejant karesi) için satır içi stil. Çerçeve içe gölgeyle (inset box-shadow) çizilir:
 * öğenin boyutu değişmez, dilim yükseklikleri oranlı kalır.
 */
export function modelSwatchStyle(modelId, tone = 'light') {
  const { fill, stroke } = modelStyle(modelId, tone);
  return {
    backgroundColor: fill,
    boxShadow: stroke ? `inset 0 0 0 ${STANDARD_STROKE_WIDTH}px ${stroke}` : undefined,
  };
}

/** Lejant için sabit sıralı liste: [{ id, name, style }]. */
export function modelLegend(tone = 'light') {
  return MODEL_ORDER.map((id) => ({ id, name: MODEL_SHORT_NAMES[id], style: modelSwatchStyle(id, tone) }));
}
