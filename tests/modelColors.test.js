// Model sınıfı görünümü testi (src/lib/modelColors.js): renk + biçim.
// Hedef: üç sınıf gri tonlu çıktıda da ayırt edilsin → Hafif DOLU, Standart İÇİ BOŞ (çerçeveli), Akıl Yürütme DOLU;
// iki dolu sınıf açıklıkça da farklı olsun. Kontrast: WCAG göreli parlaklık formülü (grafik öğesi için en az 3:1).
import { describe, it, expect } from 'vitest';
import {
  MODEL_STYLES,
  MODEL_SHORT_NAMES,
  TONE_BACKGROUNDS,
  STANDARD_STROKE_WIDTH,
  modelStyle,
  modelSwatchStyle,
  modelLegend,
} from '../src/lib/modelColors.js';
import { BRAND_PATTERNS } from './helpers/brand-patterns.js';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

const TONES = ['light', 'dark', 'chart'];

describe('Model sınıfı görünümü (renk + biçim)', () => {
  it('her zeminde biçim: Hafif dolu, Standart içi boş + çerçeve, Akıl Yürütme dolu', () => {
    for (const tone of TONES) {
      const s = MODEL_STYLES[tone];
      expect([s.light.hollow, s.standard.hollow, s.reasoning.hollow], tone).toEqual([false, true, false]);
      expect(s.light.stroke, tone).toBeNull();
      expect(s.reasoning.stroke, tone).toBeNull();
      expect(s.standard.stroke, tone).toBeTruthy();
    }
  });

  it('dolu sınıflar zemine karşı en az 3:1 (görünür dolu şekil)', () => {
    for (const tone of TONES) {
      const bg = TONE_BACKGROUNDS[tone];
      for (const id of ['light', 'reasoning']) {
        expect(contrast(MODEL_STYLES[tone][id].fill, bg), `${tone}/${id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('Standart: çerçeve zemine karşı en az 3:1, dolgu zemine çok yakın (içi boş okunur)', () => {
    for (const tone of TONES) {
      const bg = TONE_BACKGROUNDS[tone];
      const { fill, stroke } = MODEL_STYLES[tone].standard;
      expect(contrast(stroke, bg), `${tone} çerçeve`).toBeGreaterThanOrEqual(3);
      expect(contrast(fill, bg), `${tone} dolgu`).toBeLessThan(1.5);
    }
  });

  it('gri tonlu çıktıda ayırt edilir: boş sınıf biçimle, iki dolu sınıf açıklıkla (en az 1,8:1)', () => {
    for (const tone of TONES) {
      const s = MODEL_STYLES[tone];
      // Biçim imzası: dolu/boş + dolgu parlaklığı. Üç imza birbirinden farklı olmalı.
      const filled = [s.light.fill, s.reasoning.fill];
      expect(contrast(filled[0], filled[1]), tone).toBeGreaterThanOrEqual(1.8);
      expect(s.standard.hollow && !s.light.hollow && !s.reasoning.hollow).toBe(true);
    }
  });

  it('açık zeminde Akıl Yürütme mürekkep siyahı, koyu zeminde açık ton', () => {
    expect(MODEL_STYLES.light.reasoning.fill).toBe('#0A0A0B');
    expect(MODEL_STYLES.dark.reasoning.fill).toBe('#FAFAFA');
  });

  it('HTML stili: çerçeve içe gölgeyle çizilir (boyut değişmez); dolu sınıfta gölge yok', () => {
    expect(modelSwatchStyle('standard')).toEqual({
      backgroundColor: '#FAFAF9',
      boxShadow: `inset 0 0 0 ${STANDARD_STROKE_WIDTH}px #0A0A0B`,
    });
    expect(modelSwatchStyle('light', 'dark')).toEqual({ backgroundColor: '#34D399', boxShadow: undefined });
  });

  it('lejant sabit sırada, yalnızca Türkçe sınıf adları; marka adı yok', () => {
    expect(modelLegend().map((x) => x.name)).toEqual(['Hafif', 'Standart', 'Akıl Yürütme']);
    expect(modelLegend('dark')[1].style).toEqual(modelSwatchStyle('standard', 'dark'));
    for (const name of Object.values(MODEL_SHORT_NAMES)) {
      for (const pattern of BRAND_PATTERNS) expect(pattern.test(name)).toBe(false);
    }
  });

  it('bilinmeyen sınıf nötr gri dolu döner', () => {
    expect(modelStyle('yok')).toEqual({ fill: '#A1A1AA', stroke: null, hollow: false });
  });
});

// Tek kaynak kuralı: model sınıfı görünümünü kullanan dosyalar modelColors.js'i içe aktarır; başka hiçbir dosya
// kendi model renk paletini tanımlamaz (eskiden admin/charts.jsx ve PersonalReportModal.jsx'te ayrı paletler vardı).

describe('Model görünümü tek kaynaktan', () => {
  const files = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));

  it('grafik bileşenleri modelColors.js kullanır', () => {
    for (const f of ['src/components/admin/charts.jsx', 'src/components/eko/EcoSummaryBar.jsx', 'src/components/eko/PersonalReportModal.jsx']) {
      expect(readFileSync(f, 'utf8'), f).toMatch(/from '\.\.\/\.\.\/lib\/modelColors\.js'/);
    }
  });

  it('modelColors.js dışında model renk paleti tanımlanmaz', () => {
    const offenders = files('src')
      .filter((f) => !f.endsWith('modelColors.js'))
      .filter((f) => /MODEL_COLORS\s*=|light:\s*'#[0-9a-fA-F]{6}',\s*standard:/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
