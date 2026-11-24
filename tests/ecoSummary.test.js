// summarizeSession testleri: EkoToken özet şeridi ve Kişisel Rapor bu toplamları kullanır.
import { describe, it, expect } from 'vitest';
import { summarizeSession } from '../src/lib/ecoSummary.js';
import { calculateFootprint, getDailyEquivalents } from '../src/lib/footprint.js';

// Sunucunun göndereceği biçimde bir mesaj üretir (eco = calculateFootprint sonucu).
function msg(modelId, input, output) {
  const fp = calculateFootprint(input, output, modelId);
  return {
    id: `${modelId}-${input}`,
    modelId,
    prompt: 'soru',
    response: 'cevap',
    eco: { ...fp, tokenSource: 'gerçek' },
  };
}

describe('summarizeSession', () => {
  it('boş liste: her şey 0, seriler boş', () => {
    const s = summarizeSession([]);
    expect(s.prompts).toBe(0);
    expect(s.totalTokens).toBe(0);
    expect(s.energy).toBe(0);
    expect(s.perInteraction).toEqual([]);
    expect(s.modelDistribution).toEqual([]);
    expect(s.equivalents).toEqual(getDailyEquivalents(0, 0, 0));
  });

  it('geçersiz girdi çökmez', () => {
    expect(summarizeSession(undefined).prompts).toBe(0);
    expect(summarizeSession(null).prompts).toBe(0);
  });

  it('toplamlar mesajların ortalama değerlerinin toplamıdır', () => {
    const a = msg('light', 100, 50);
    const b = msg('reasoning', 200, 100);
    const s = summarizeSession([a, b]);
    expect(s.prompts).toBe(2);
    expect(s.inputTokens).toBe(300);
    expect(s.outputTokens).toBe(150);
    expect(s.totalTokens).toBe(450);
    expect(s.energy).toBeCloseTo(a.eco.energyAvg + b.eco.energyAvg, 12);
    expect(s.water).toBeCloseTo(a.eco.waterAvg + b.eco.waterAvg, 12);
    expect(s.co2).toBeCloseTo(a.eco.co2Avg + b.eco.co2Avg, 12);
    expect(s.equivalents).toEqual(getDailyEquivalents(s.water, s.energy, s.co2));
  });

  it('etkileşim serisi: tokenlar tek tek, su/enerji/CO₂ birikimli', () => {
    const a = msg('standard', 100, 50);
    const b = msg('standard', 40, 10);
    const s = summarizeSession([a, b]);
    expect(s.perInteraction.map((r) => r.name)).toEqual(['#1', '#2']);
    expect(s.perInteraction[1].Girdi).toBe(40);
    expect(s.perInteraction[1].Çıktı).toBe(10);
    expect(s.perInteraction[1].Enerji).toBeCloseTo(a.eco.energyAvg + b.eco.energyAvg, 4);
    expect(s.perInteraction[1].Su).toBeGreaterThan(s.perInteraction[0].Su);
  });

  it('istem başına enerji: birikimli değil, her istemin kendi değeri (sütun grafiği için)', () => {
    const a = msg('reasoning', 300, 200);
    const b = msg('light', 40, 10);
    const s = summarizeSession([a, b]);
    expect(s.energyPerPrompt).toEqual([a.eco.energyAvg, b.eco.energyAvg]);
    expect(s.modelPerPrompt).toEqual(['reasoning', 'light']); // aynı sırada model sınıfı
    expect(summarizeSession([]).energyPerPrompt).toEqual([]);
  });

  it('model dağılımı sabit sırada, kullanılmayan sınıf yok, yüzdeler doğru', () => {
    const s = summarizeSession([msg('reasoning', 10, 10), msg('light', 10, 10), msg('light', 20, 10), msg('light', 30, 10)]);
    expect(s.modelDistribution).toEqual([
      { id: 'light', name: 'Hafif Model', count: 3, pct: 75 },
      { id: 'reasoning', name: 'Akıl Yürütme Modeli', count: 1, pct: 25 },
    ]);
  });

  it('eco alanı olmayan mesaj atlanır', () => {
    const s = summarizeSession([{ id: 'x', modelId: 'light', prompt: 'p', response: 'r' }, msg('light', 10, 10)]);
    expect(s.prompts).toBe(1);
    expect(s.perInteraction).toHaveLength(1);
  });
});
