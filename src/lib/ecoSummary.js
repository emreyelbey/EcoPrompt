// EkoToken oturum özeti: öğrencinin bu aşamadaki mesajlarından toplamları, grafik serilerini
// ve model dağılımını çıkarır. Üst özet şeridi ve Kişisel Rapor bu fonksiyonu kullanır.
// YENİ FORMÜL YOKTUR: her mesajın enerji/su/CO₂ değeri sunucuda footprint.js ile hesaplanmıştır;
// burada yalnızca toplanır. Günlük karşılıklar da footprint.js'teki getDailyEquivalents ile bulunur.
// Saf fonksiyondur; tests/ecoSummary.test.js ile doğrulanır.

import { MODEL_ORDER, MODEL_SCALES, getDailyEquivalents } from './footprint.js';

// Sayı değilse 0 kabul eder (eksik alan özetin tamamını bozmasın).
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Grafiklerde gösterilecek değeri 4 ondalığa yuvarlar (küçük değerler sıfır görünmesin).
function round4(value) {
  return Math.round(value * 10000) / 10000;
}

/**
 * @param {{ modelId: string, eco?: object }[]} messages  Sunucudan gelen mesajlar (eskiden yeniye)
 * @returns {{
 *   prompts: number, inputTokens: number, outputTokens: number, totalTokens: number,
 *   energy: number, water: number, co2: number,
 *   equivalents: object,
 *   perInteraction: { name: string, Girdi: number, Çıktı: number, Su: number, Enerji: number, CO2: number }[],
 *   modelDistribution: { id: string, name: string, count: number, pct: number }[],
 * }}
 */
export function summarizeSession(messages) {
  // Çevresel verisi olmayan mesajlar (ör. sade görünümden kalan) özete girmez.
  const ecoMessages = (Array.isArray(messages) ? messages : []).filter((m) => m && m.eco);

  let inputTokens = 0;
  let outputTokens = 0;
  let energy = 0;
  let water = 0;
  let co2 = 0;

  // Etkileşim bazlı seri: token sayıları her etkileşimin kendisi, su/enerji/CO₂ birikimlidir.
  const perInteraction = ecoMessages.map((m, index) => {
    inputTokens += num(m.eco.inputTokens);
    outputTokens += num(m.eco.outputTokens);
    energy += num(m.eco.energyAvg);
    water += num(m.eco.waterAvg);
    co2 += num(m.eco.co2Avg);
    return {
      name: `#${index + 1}`,
      Girdi: num(m.eco.inputTokens),
      Çıktı: num(m.eco.outputTokens),
      Su: round4(water),
      Enerji: round4(energy),
      CO2: round4(co2),
    };
  });

  const prompts = ecoMessages.length;

  // Model dağılımı: hiç kullanılmayan sınıf listede yer almaz.
  const modelDistribution = MODEL_ORDER.map((id) => {
    const count = ecoMessages.filter((m) => m.modelId === id).length;
    return {
      id,
      name: MODEL_SCALES[id].name,
      count,
      pct: prompts > 0 ? Math.round((count / prompts) * 100) : 0,
    };
  }).filter((item) => item.count > 0);

  return {
    prompts,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    energy,
    water,
    co2,
    equivalents: getDailyEquivalents(water, energy, co2),
    perInteraction,
    modelDistribution,
  };
}
