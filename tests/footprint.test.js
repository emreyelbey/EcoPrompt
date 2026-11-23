// src/lib/footprint.js testleri: token sayımı, ayak izi hesabı ve günlük hayat karşılıkları.
// Beklenen değerler katsayı tablosundan (CLAUDE.md Bölüm 5) elle hesaplanmıştır.
import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  resolveTokens,
  calculateFootprint,
  calculateSavingsPct,
  getDailyEquivalents,
} from '../src/lib/footprint.js';

describe('estimateTokens', () => {
  it('boş, yalnızca boşluk veya metin olmayan girdi 0 token sayılır', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('   \n\t ')).toBe(0);
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
    expect(estimateTokens(123)).toBe(0);
  });

  it('⌈karakter / 3,6⌉ formülünü uygular', () => {
    expect(estimateTokens('a'.repeat(36))).toBe(10);
    expect(estimateTokens('a'.repeat(37))).toBe(11); // 10,28 → 11 (yukarı yuvarlama)
    expect(estimateTokens('a')).toBe(1);
  });

  it('baştaki ve sondaki boşlukları saymaz', () => {
    expect(estimateTokens('   ' + 'a'.repeat(36) + '   ')).toBe(10);
  });
});

describe('resolveTokens', () => {
  it('gerçek kullanım bilgisi varsa onu kullanır, düşünme tokenlarını çıktıya ekler', () => {
    const usage = { promptTokenCount: 50, candidatesTokenCount: 200, thoughtsTokenCount: 300 };
    expect(resolveTokens(usage, 'soru', 'cevap')).toEqual({
      inputTokens: 50,
      outputTokens: 500,
      tokenSource: 'gerçek',
    });
  });

  it('düşünme tokenı alanı yoksa 0 kabul eder', () => {
    const usage = { promptTokenCount: 50, candidatesTokenCount: 200 };
    expect(resolveTokens(usage, 'soru', 'cevap').outputTokens).toBe(200);
  });

  it('kullanım bilgisi yoksa her ikisini de tahmin eder', () => {
    const result = resolveTokens(undefined, 'a'.repeat(36), 'b'.repeat(72));
    expect(result).toEqual({ inputTokens: 10, outputTokens: 20, tokenSource: 'tahmini' });
  });

  it('yalnızca girdi gerçekse yarım kayıt yapmaz, ikisini de tahmin eder', () => {
    const usage = { promptTokenCount: 50, candidatesTokenCount: 0 };
    const result = resolveTokens(usage, 'a'.repeat(36), 'b'.repeat(72));
    expect(result).toEqual({ inputTokens: 10, outputTokens: 20, tokenSource: 'tahmini' });
  });

  it('bozuk değerlerde (negatif, ondalıklı, metin) tahmine döner', () => {
    const prompt = 'a'.repeat(36);
    const response = 'b'.repeat(36);
    expect(resolveTokens({ promptTokenCount: -5, candidatesTokenCount: 10 }, prompt, response).tokenSource).toBe('tahmini');
    expect(resolveTokens({ promptTokenCount: 5.5, candidatesTokenCount: 10 }, prompt, response).tokenSource).toBe('tahmini');
    expect(resolveTokens({ promptTokenCount: '5', candidatesTokenCount: 10 }, prompt, response).tokenSource).toBe('tahmini');
    expect(resolveTokens({ promptTokenCount: 5, candidatesTokenCount: 10, thoughtsTokenCount: null }, prompt, response).tokenSource).toBe('tahmini');
  });
});

describe('calculateFootprint', () => {
  it('ağırlıklı token = girdi + 3 × çıktı', () => {
    expect(calculateFootprint(100, 100, 'light').weightedTokens).toBe(400);
    expect(calculateFootprint(0, 0, 'light').weightedTokens).toBe(0);
  });

  it('hafif model, 1000 girdi token: enerji, su, CO₂ min/ort/maks', () => {
    const fp = calculateFootprint(1000, 0, 'light');
    expect(fp.energyMin).toBeCloseTo(0.12, 10);
    expect(fp.energyAvg).toBeCloseTo(0.18, 10);
    expect(fp.energyMax).toBeCloseTo(0.25, 10);
    expect(fp.waterMin).toBeCloseTo(0.024, 10); // 0,12 × 0,2
    expect(fp.waterAvg).toBeCloseTo(0.18, 10); // 0,18 × 1,0
    expect(fp.waterMax).toBeCloseTo(0.45, 10); // 0,25 × 1,8
    expect(fp.co2Min).toBeCloseTo(0.036, 10); // 0,12 × 0,30
    expect(fp.co2Avg).toBeCloseTo(0.0774, 10); // 0,18 × 0,43
    expect(fp.co2Max).toBeCloseTo(0.1375, 10); // 0,25 × 0,55
    expect(fp.costUsd).toBeCloseTo(0.0001, 12); // 1000 / 1M × 0,10
  });

  it('akıl yürütme modeli, 200 girdi + 600 çıktı (2000 ağırlıklı token)', () => {
    const fp = calculateFootprint(200, 600, 'reasoning');
    expect(fp.weightedTokens).toBe(2000);
    expect(fp.energyMin).toBeCloseTo(2.8, 10);
    expect(fp.energyAvg).toBeCloseTo(4.2, 10);
    expect(fp.energyMax).toBeCloseTo(6.0, 10);
    expect(fp.waterMin).toBeCloseTo(0.56, 10);
    expect(fp.waterAvg).toBeCloseTo(4.2, 10);
    expect(fp.waterMax).toBeCloseTo(10.8, 10);
    expect(fp.co2Min).toBeCloseTo(0.84, 10);
    expect(fp.co2Avg).toBeCloseTo(1.806, 10);
    expect(fp.co2Max).toBeCloseTo(3.3, 10);
  });

  it('maliyet: standart model, 1M girdi + 1M çıktı = 6,25 USD', () => {
    expect(calculateFootprint(1_000_000, 1_000_000, 'standard').costUsd).toBeCloseTo(6.25, 10);
  });

  it('min ≤ ort ≤ maks sıralaması her sınıfta korunur', () => {
    for (const id of ['light', 'standard', 'reasoning']) {
      const fp = calculateFootprint(300, 700, id);
      expect(fp.energyMin).toBeLessThanOrEqual(fp.energyAvg);
      expect(fp.energyAvg).toBeLessThanOrEqual(fp.energyMax);
      expect(fp.waterMin).toBeLessThanOrEqual(fp.waterAvg);
      expect(fp.waterAvg).toBeLessThanOrEqual(fp.waterMax);
      expect(fp.co2Min).toBeLessThanOrEqual(fp.co2Avg);
      expect(fp.co2Avg).toBeLessThanOrEqual(fp.co2Max);
    }
  });

  it('negatif, ondalıklı ve geçersiz token girdilerini temizler', () => {
    const fp = calculateFootprint(-50, 10.6, 'light');
    expect(fp.inputTokens).toBe(0);
    expect(fp.outputTokens).toBe(11);
    expect(calculateFootprint('abc', NaN, 'light').weightedTokens).toBe(0);
  });

  it('bilinmeyen model sınıfında hata verir (sessizce başka sınıf varsaymaz)', () => {
    expect(() => calculateFootprint(10, 10, 'bilinmeyen')).toThrow('Bilinmeyen model sınıfı');
    expect(() => calculateFootprint(10, 10, undefined)).toThrow();
    expect(() => calculateFootprint(10, 10, 'toString')).toThrow();
  });
});

describe('calculateSavingsPct', () => {
  it('hafif modele göre ortalama enerji tasarrufu yüzdesi', () => {
    expect(calculateSavingsPct('light')).toBe(0);
    expect(calculateSavingsPct('standard')).toBe(72); // (0,65 − 0,18) / 0,65 = %72,3
    expect(calculateSavingsPct('reasoning')).toBe(91); // (2,10 − 0,18) / 2,10 = %91,4
  });

  it('calculateFootprint sonucuna da yazılır', () => {
    expect(calculateFootprint(10, 10, 'standard').savingsPct).toBe(72);
  });
});

describe('getDailyEquivalents — su', () => {
  it('2,5 mL altı damla ile anlatılır', () => {
    expect(getDailyEquivalents(0.25, 0, 0).waterPrimary).toBe('≈ 5,0 su damlası'); // 10 damla altı: 1 basamak
    expect(getDailyEquivalents(1, 0, 0).waterPrimary).toBe('≈ 20 su damlası');
    expect(getDailyEquivalents(2.4, 0, 0).waterPrimary).toBe('≈ 48 su damlası');
  });

  it('2,5–80 mL tatlı kaşığı ile anlatılır', () => {
    expect(getDailyEquivalents(2.5, 0, 0).waterPrimary).toBe('≈ 0,5 tatlı kaşığı su');
    expect(getDailyEquivalents(50, 0, 0).waterPrimary).toBe('≈ 10,0 tatlı kaşığı su');
  });

  it('80–400 mL bardak ile anlatılır', () => {
    expect(getDailyEquivalents(80, 0, 0).waterPrimary).toBe('≈ 0,40 su bardağı');
    expect(getDailyEquivalents(300, 0, 0).waterPrimary).toBe('≈ 1,50 su bardağı');
  });

  it('400 mL ve üstü şişe ile anlatılır', () => {
    expect(getDailyEquivalents(400, 0, 0).waterPrimary).toBe('≈ 0,80 yarım litrelik şişe');
  });

  it('sayısal karşılıkları doğru hesaplar', () => {
    const eq = getDailyEquivalents(1000, 0, 0);
    expect(eq.drops).toBeCloseTo(20000, 6);
    expect(eq.teaspoons).toBeCloseTo(200, 10);
    expect(eq.glasses).toBeCloseTo(5, 10);
    expect(eq.bottles).toBeCloseTo(2, 10);
  });
});

describe('getDailyEquivalents — enerji', () => {
  it('LED süresini saniye / dakika / saat olarak yazar (1 Wh = 360 sn)', () => {
    expect(getDailyEquivalents(0, 0.1, 0).ledText).toBe('10 W LED ampulü 36 sn yakmaya eşdeğer');
    expect(getDailyEquivalents(0, 0.25, 0).ledText).toBe('10 W LED ampulü 1,5 dk yakmaya eşdeğer');
    expect(getDailyEquivalents(0, 10, 0).ledText).toBe('10 W LED ampulü 1,00 sa yakmaya eşdeğer');
  });

  it('telefon bataryası yüzdesi (15 Wh)', () => {
    const eq = getDailyEquivalents(0, 1.5, 0);
    expect(eq.phonePct).toBeCloseTo(10, 10);
    expect(eq.phoneText).toBe('Telefon bataryasının %10,00 kadarı');
  });
});

describe('getDailyEquivalents — karbon', () => {
  it('araç mesafesini metre veya km olarak yazar (0,12 g/m)', () => {
    expect(getDailyEquivalents(0, 0, 0.6).carText).toBe('5,0 metre araç sürüşü');
    expect(getDailyEquivalents(0, 0, 12).carText).toBe('100 metre araç sürüşü');
    expect(getDailyEquivalents(0, 0, 120).carText).toBe('1,00 km araç sürüşü');
  });

  it('ağacın günlük emilimiyle karşılaştırır (60 g/gün)', () => {
    expect(getDailyEquivalents(0, 0, 3).treeText).toBe('1 olgun ağacın günlük CO₂ emiliminin %5,00 kadarı');
    expect(getDailyEquivalents(0, 0, 120).treeText).toBe('1 olgun ağacın 2,00 günlük CO₂ emilimi');
  });
});

describe('getDailyEquivalents — geçersiz girdi', () => {
  it('negatif ve geçersiz değerleri 0 kabul eder', () => {
    const eq = getDailyEquivalents(-5, NaN, 'abc');
    expect(eq.drops).toBe(0);
    expect(eq.ledSeconds).toBe(0);
    expect(eq.carMeters).toBe(0);
    expect(eq.waterPrimary).toBe('≈ 0,0 su damlası');
  });
});
