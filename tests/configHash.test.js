// Yapılandırma özeti testleri (api/_lib/configHash.js, dondurma kuralı).
// Güvence: aynı ayarlar her zaman aynı özeti verir; ölçümü etkileyen herhangi bir ayar değişince özet değişir.
import { describe, it, expect } from 'vitest';
import { CONFIG_HASH, CONFIG_HASH_LENGTH, computeConfigHash, currentConfig, stableStringify } from '../api/_lib/configHash.js';
import { BRAND_PATTERNS } from './helpers/brand-patterns.js';

// Ayarların derin kopyası (testte değiştirmek gerçek ayarları etkilemesin).
const clone = () => JSON.parse(JSON.stringify(currentConfig()));

describe('configHash', () => {
  it('12 onaltılık karakter; aynı ayarlar aynı özeti verir', () => {
    expect(CONFIG_HASH).toMatch(new RegExp(`^[0-9a-f]{${CONFIG_HASH_LENGTH}}$`));
    expect(computeConfigHash(currentConfig())).toBe(CONFIG_HASH);
    expect(computeConfigHash(clone())).toBe(CONFIG_HASH);
  });

  it('anahtar sırası özeti değiştirmez', () => {
    expect(stableStringify({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(stableStringify({ a: [2, { c: 4, d: 3 }], b: 1 }));
  });

  it('özetin girdisi ölçümü etkileyen bütün ayarları içerir', () => {
    expect(Object.keys(currentConfig()).sort()).toEqual(['footprint', 'historyLimit', 'modelMap', 'systemInstructions', 'temperature']);
    expect(Object.keys(currentConfig().systemInstructions)).toEqual(['light', 'standard', 'reasoning']);
  });

  it.each([
    ['sistem talimatı', (c) => (c.systemInstructions.light += ' ')],
    ['model eşlemesi', (c) => (c.modelMap.standard.thinkingLevel = 'high')],
    ['sıcaklık', (c) => (c.temperature.reasoning = 0.6)],
    ['bağlam sınırı (HISTORY_LIMIT)', (c) => (c.historyLimit = 13)],
    ['enerji katsayısı', (c) => (c.footprint.MODEL_SCALES.light.energyAvg = 0.19)],
    ['su katsayısı', (c) => (c.footprint.WUE.avg = 1.1)],
    ['karbon katsayısı', (c) => (c.footprint.CARBON_INTENSITY.avg = 0.44)],
  ])('%s değişince özet değişir', (_, change) => {
    const changed = clone();
    change(changed);
    expect(computeConfigHash(changed)).not.toBe(CONFIG_HASH);
  });

  it('özet marka veya model adı içermez (yalnızca onaltılık karakter)', () => {
    for (const pattern of BRAND_PATTERNS) expect(CONFIG_HASH).not.toMatch(pattern);
  });
});
