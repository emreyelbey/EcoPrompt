// Ölçü renkleri testi (src/lib/metricColors.js): kontrast, yeşil yasağı ve tek kaynak kuralı.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { METRIC_STYLES, metricIconStyle } from '../src/lib/metricColors.js';
import { MODEL_STYLES } from '../src/lib/modelColors.js';

// Onaltılık rengin göreli parlaklığı ve iki renk arasındaki kontrast (WCAG).
function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Rengin tonu (0–360°). Yeşil aralığı yaklaşık 80°–170°.
function hue(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return null; // gri
  let h;
  if (max === r) h = ((g - b) / (max - min)) % 6;
  else if (max === g) h = (b - r) / (max - min) + 2;
  else h = (r - g) / (max - min) + 4;
  return (h * 60 + 360) % 360;
}

const PAPER = '#FAFAF9';

describe('Ölçü renkleri', () => {
  it('her ikon rengi kendi yuvarlak zeminine ve kâğıt zemine karşı en az 3:1', () => {
    for (const [name, s] of Object.entries(METRIC_STYLES)) {
      expect(contrast(s.fg, s.bg), `${name} ikon/zemin`).toBeGreaterThanOrEqual(3);
      expect(contrast(s.fg, PAPER), `${name} ikon/kâğıt`).toBeGreaterThanOrEqual(3);
    }
  });

  it('yeşil kullanılmaz (yeşil Hafif Model / EkoToken içindir)', () => {
    const hafif = [MODEL_STYLES.light.light.fill, MODEL_STYLES.dark.light.fill];
    for (const [name, s] of Object.entries(METRIC_STYLES)) {
      for (const color of [s.bg, s.fg]) {
        const h = hue(color);
        expect(h === null || h < 80 || h > 170, `${name} ${color} yeşil tonda`).toBe(true);
        expect(hafif).not.toContain(color);
      }
    }
  });

  it('bilinmeyen ölçü nötr gri döner', () => {
    expect(metricIconStyle('yok')).toEqual({ backgroundColor: METRIC_STYLES.neutral.bg, color: METRIC_STYLES.neutral.fg });
  });

  it('ölçü ikonu kullanan bileşenler ortak MetricIcon bileşenini kullanır', () => {
    for (const f of [
      'src/components/admin/OverviewTab.jsx',
      'src/components/eko/MethodologyContent.jsx',
      'src/components/eko/EcoImpactFooter.jsx',
      'src/components/eko/PersonalReportModal.jsx',
    ]) {
      expect(readFileSync(f, 'utf8'), f).toMatch(/import MetricIcon from '\.\.\/ui\/MetricIcon\.jsx'/);
    }
  });

  it('sade ekran ölçü ikonu kullanmaz', () => {
    expect(readFileSync('src/components/ChatScreen.jsx', 'utf8')).not.toMatch(/MetricIcon|metricColors/);
  });
});
