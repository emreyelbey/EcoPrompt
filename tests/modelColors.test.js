// Model sınıfı renkleri testi (src/lib/modelColors.js): kontrast ve açıklık ayrışması.
// Kontrast: WCAG göreli parlaklık formülü. Grafik öğeleri için en az 3:1 gerekir.
import { describe, it, expect } from 'vitest';
import { MODEL_COLORS, MODEL_COLORS_ON_DARK, MODEL_SHORT_NAMES, modelLegend, modelColor } from '../src/lib/modelColors.js';
import { BRAND_PATTERNS } from './helpers/brand-patterns.js';

// Onaltılık rengin göreli parlaklığı (0 = siyah, 1 = beyaz).
function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// İki renk arasındaki kontrast oranı (1–21).
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAPER = '#FAFAF9';
const INK = '#0A0A0B';

describe('Model sınıfı renkleri', () => {
  it('açık zeminde her renk kâğıda karşı en az 3:1', () => {
    for (const color of Object.values(MODEL_COLORS)) expect(contrast(color, PAPER)).toBeGreaterThanOrEqual(3);
  });

  it('koyu zeminde her renk siyah karta karşı en az 3:1', () => {
    for (const color of Object.values(MODEL_COLORS_ON_DARK)) expect(contrast(color, INK)).toBeGreaterThanOrEqual(3);
  });

  it('üç renk açıklıkça belirgin ayrışır (yan yana iki renk arasında en az 1,8:1)', () => {
    for (const palette of [MODEL_COLORS, MODEL_COLORS_ON_DARK]) {
      const sorted = Object.values(palette).sort((a, b) => luminance(b) - luminance(a));
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(contrast(sorted[i], sorted[i + 1])).toBeGreaterThanOrEqual(1.8);
      }
    }
  });

  it('açık zeminde açıklık sırası: Hafif > Standart > Akıl Yürütme (Akıl Yürütme = mürekkep siyahı)', () => {
    expect(luminance(MODEL_COLORS.light)).toBeGreaterThan(luminance(MODEL_COLORS.standard));
    expect(luminance(MODEL_COLORS.standard)).toBeGreaterThan(luminance(MODEL_COLORS.reasoning));
    expect(MODEL_COLORS.reasoning).toBe(INK);
  });

  it('lejant sabit sırada ve yalnızca Türkçe sınıf adları; marka adı yok', () => {
    expect(modelLegend().map((x) => x.name)).toEqual(['Hafif', 'Standart', 'Akıl Yürütme']);
    expect(modelLegend('dark')[2].color).toBe(MODEL_COLORS_ON_DARK.reasoning);
    for (const name of Object.values(MODEL_SHORT_NAMES)) {
      for (const pattern of BRAND_PATTERNS) expect(pattern.test(name)).toBe(false);
    }
  });

  it('bilinmeyen sınıf nötr gri döner', () => {
    expect(modelColor('yok')).toBe('#A1A1AA');
    expect(modelColor('light', 'dark')).toBe(MODEL_COLORS_ON_DARK.light);
  });
});
