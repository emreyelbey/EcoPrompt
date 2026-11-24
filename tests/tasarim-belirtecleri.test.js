// Tasarım belirteçleri ve yazı tipleri testi (Yön 2b tasarımı, adım 1).
// Denetlenenler:
// - Yazı tipleri CDN'den değil npm paketlerinden gelir; sayfada dış font bağlantısı yoktur.
// - Her yüz için latin VE latin-ext alt kümesi tanımlıdır (ğ Ğ ş Ş İ yalnızca latin-ext'te bulunur).
// - Her @font-face kuralında unicode-range vardır (yoksa tarayıcı gereksiz dosya indirir veya yüzler çakışır).
// - Font dosyaları gerçekten node_modules'ta vardır (yanlış yol derlemeyi bozmadan önce yakalanır).
// - "Hareketi azalt" ayarında bütün animasyon ve geçişler kapanır.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const KOK = process.cwd();
const fontsCss = readFileSync(join(KOK, 'src', 'fonts.css'), 'utf8');
const indexCss = readFileSync(join(KOK, 'src', 'index.css'), 'utf8');

// fonts.css içindeki @font-face bloklarını { family, style, weight, src, range } olarak ayırır.
function fontFaces(css) {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => {
    const body = m[1];
    const get = (prop) => body.match(new RegExp(`${prop}:\\s*([^;]+);`))?.[1].trim();
    return {
      family: get('font-family')?.replace(/['"]/g, ''),
      style: get('font-style'),
      weight: get('font-weight'),
      src: body.match(/url\('([^']+)'\)/)?.[1],
      range: get('unicode-range'),
    };
  });
}

// Bir klasördeki bütün dosyalar (alt klasörler dahil).
function dosyalar(yol) {
  if (!existsSync(yol)) return [];
  if (statSync(yol).isFile()) return [yol];
  return readdirSync(yol).flatMap((ad) => dosyalar(join(yol, ad)));
}

// Tasarımın istediği yüzler (TASARIM.md Bölüm 2): aile, stil, ağırlık.
const BEKLENEN_YUZLER = [
  ['Inter Tight', 'normal', '400'],
  ['Inter Tight', 'normal', '500'],
  ['Inter Tight', 'normal', '600'],
  ['Inter Tight', 'normal', '700'],
  ['Instrument Serif', 'italic', '400'],
  ['JetBrains Mono', 'normal', '500'],
];

describe('Yazı tipleri', () => {
  const faces = fontFaces(fontsCss);

  it('yalnızca beklenen 6 yüz × 2 alt küme (latin + latin-ext) tanımlıdır', () => {
    expect(faces).toHaveLength(BEKLENEN_YUZLER.length * 2);
    for (const [family, style, weight] of BEKLENEN_YUZLER) {
      const ayni = faces.filter((f) => f.family === family && f.style === style && f.weight === weight);
      const altKumeler = ayni.map((f) => (f.src.includes('-latin-ext-') ? 'latin-ext' : 'latin')).sort();
      expect(altKumeler, `${family} ${style} ${weight}`).toEqual(['latin', 'latin-ext']);
    }
  });

  it('latin-ext aralığı Türkçe harfleri (ğ Ğ ş Ş İ) kapsar, latin aralığı ı harfini kapsar', () => {
    // unicode-range içinde tek bir kod noktası veya aralık olup olmadığını denetler.
    const kapsar = (range, kod) =>
      range.split(',').some((parca) => {
        const [bas, son] = parca.trim().replace('U+', '').split('-').map((h) => parseInt(h, 16));
        return kod >= bas && kod <= (son ?? bas);
      });
    for (const f of faces) {
      expect(f.range, `${f.src} unicode-range`).toBeTruthy();
      const harfler = f.src.includes('-latin-ext-') ? 'ğĞşŞİ' : 'ıçöüÇÖÜ';
      for (const harf of harfler) {
        expect(kapsar(f.range, harf.codePointAt(0)), `${f.src} → ${harf}`).toBe(true);
      }
    }
  });

  it('font dosyaları npm paketinden gelir, woff2 biçimindedir ve diskte vardır', () => {
    for (const f of faces) {
      expect(f.src.startsWith('@fontsource/'), f.src).toBe(true);
      expect(f.src.endsWith('.woff2'), f.src).toBe(true);
      expect(existsSync(join(KOK, 'node_modules', f.src)), f.src).toBe(true);
    }
  });

  it('arayüzde CDN font bağlantısı yoktur', () => {
    const bulunanlar = [...dosyalar(join(KOK, 'src')), join(KOK, 'index.html')].filter((dosya) =>
      /fonts\.(googleapis|gstatic)\.com|fonts\.bunny\.net|use\.typekit\.net/i.test(readFileSync(dosya, 'utf8')),
    );
    expect(bulunanlar).toEqual([]);
    expect(fontsCss).not.toMatch(/https?:\/\//);
  });
});

describe('Hareket', () => {
  it('"hareketi azalt" ayarında bütün animasyon ve geçişler kapanır', () => {
    const blok = indexCss.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(blok).toMatch(/animation:\s*none\s*!important/);
    expect(blok).toMatch(/transition:\s*none\s*!important/);
  });
});
