// Marka yasağı testi (TÜBİTAK kuralı 1): arayüz ve herkese açık sunucu kodunda
// ticari yapay zeka marka/ürün adı geçmediğini otomatik olarak denetler.
// api/_lib/ klasörü hariç tutulur: model adları ve API anahtarı erişimi yalnızca orada bulunur.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const KOK = process.cwd();

// Taranacak yerler.
const TARANACAKLAR = ['src', 'api', 'index.html'];

// Taranmayacak klasör (kök dizine göre).
const HARIC = join('api', '_lib');

// Yasaklı adlar. \b kelime sınırıdır: "metadata" gibi masum kelimeler yakalanmasın diye.
const YASAKLI = [
  /\bopenai\b/i,
  /\bchatgpt\b/i,
  /\bgpt\b/i,
  /\bclaude\b/i,
  /\banthropic\b/i,
  /\bgemini\b/i,
  /\bgoogle\b/i,
  /\bbard\b/i,
  /\bcopilot\b/i,
  /\bmicrosoft\b/i,
  /\bllama\b/i,
  /\bmeta ai\b/i,
  /\bmistral\b/i,
  /\bdeepseek\b/i,
  /\bgrok\b/i,
  /\bperplexity\b/i,
];

// Bir yolun altındaki tüm dosyaları (alt klasörler dahil) listeler.
function dosyalariTopla(yol) {
  if (!existsSync(yol)) return [];
  if (statSync(yol).isFile()) return [yol];

  const sonuc = [];
  for (const ad of readdirSync(yol)) {
    const tamYol = join(yol, ad);
    const goreli = relative(KOK, tamYol);
    // api/_lib ve onun altındaki her şey atlanır.
    if (goreli === HARIC || goreli.startsWith(HARIC + sep)) continue;
    sonuc.push(...dosyalariTopla(tamYol));
  }
  return sonuc;
}

describe('Marka yasağı', () => {
  it('arayüz ve sunucu uç noktalarında ticari yapay zeka adı geçmez', () => {
    const bulunanlar = [];

    for (const hedef of TARANACAKLAR) {
      for (const dosya of dosyalariTopla(join(KOK, hedef))) {
        const satirlar = readFileSync(dosya, 'utf8').split('\n');
        satirlar.forEach((satir, i) => {
          for (const desen of YASAKLI) {
            if (desen.test(satir)) {
              bulunanlar.push(`${relative(KOK, dosya)}:${i + 1} → ${desen}`);
            }
          }
        });
      }
    }

    expect(bulunanlar).toEqual([]);
  });
});
