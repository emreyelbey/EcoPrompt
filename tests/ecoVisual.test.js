// ecoVisual testleri: EkoToken çubuk ve sütun ölçekleri (Yön 2b tasarımı, adım 4).
// Onaylanan ölçek: aralık çubuğunun tamamı = aynı tokenla Akıl Yürütme sınıfının maks değeri.
import { describe, it, expect } from 'vitest';
import { rangeScale, rangeBands, savingsBars, promptColumns } from '../src/lib/ecoVisual.js';
import { calculateFootprint } from '../src/lib/footprint.js';

// Sunucunun göndereceği eco alanı.
const eco = (modelId, input, output) => calculateFootprint(input, output, modelId);

describe('rangeScale', () => {
  it('ölçek, aynı tokenla Akıl Yürütme sınıfının maks değeridir', () => {
    const top = calculateFootprint(500, 120, 'reasoning');
    expect(rangeScale(500, 120)).toEqual({ energy: top.energyMax, water: top.waterMax, co2: top.co2Max });
  });
});

describe('rangeBands', () => {
  it('Akıl Yürütme yanıtında bant sağ uca dayanır', () => {
    const b = rangeBands(eco('reasoning', 500, 120));
    for (const k of ['energy', 'water', 'co2']) {
      expect(b[k].left + b[k].width).toBeCloseTo(100, 10);
    }
  });

  it('Hafif yanıtın bandı Standart ve Akıl Yürütme yanıtınınkinden kısa ve soldadır', () => {
    const light = rangeBands(eco('light', 500, 120)).energy;
    const standard = rangeBands(eco('standard', 500, 120)).energy;
    const reasoning = rangeBands(eco('reasoning', 500, 120)).energy;
    expect(light.left + light.width).toBeLessThan(standard.left + standard.width);
    expect(standard.left + standard.width).toBeLessThan(reasoning.left + reasoning.width);
    // Hafif enerji: 0,12–0,25 Wh / Akıl Yürütme maks 3,00 → bant %4–%8,33
    expect(light.left).toBeCloseTo((0.12 / 3) * 100, 10);
    expect(light.width).toBeCloseTo(((0.25 - 0.12) / 3) * 100, 10);
  });

  it('0 token: bant çizilmez, NaN çıkmaz', () => {
    const b = rangeBands(eco('standard', 0, 0));
    expect(b.energy).toEqual({ left: 0, width: 0 });
    expect(b.water).toEqual({ left: 0, width: 0 });
    expect(b.co2).toEqual({ left: 0, width: 0 });
  });
});

describe('savingsBars', () => {
  it('seçilen model tam, Hafif (100 − tasarruf)', () => {
    expect(savingsBars(72)).toEqual({ selected: 100, light: 28 });
    expect(savingsBars(0)).toEqual({ selected: 100, light: 100 });
  });
  it('geçersiz veya sınır dışı değer güvenli', () => {
    expect(savingsBars(undefined).light).toBe(100);
    expect(savingsBars(150).light).toBe(0);
  });
});

describe('promptColumns', () => {
  it('yalnızca son 12 istem; en büyük %100, sıra numarası oturumdaki yeri', () => {
    const values = Array.from({ length: 15 }, (_, i) => i + 1); // 1..15
    const cols = promptColumns(values);
    expect(cols).toHaveLength(12);
    expect(cols[0]).toEqual({ index: 3, value: 4, height: (4 / 15) * 100 });
    expect(cols.at(-1)).toEqual({ index: 14, value: 15, height: 100 });
  });
  it('çok küçük değer en az %8, 0 değer 0 yükseklik; boş liste boş', () => {
    const cols = promptColumns([1000, 1, 0]);
    expect(cols[1].height).toBe(8);
    expect(cols[2].height).toBe(0);
    expect(promptColumns([])).toEqual([]);
    expect(promptColumns(undefined)).toEqual([]);
  });
});
