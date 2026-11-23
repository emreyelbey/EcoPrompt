// "Verileri Temizle" onay kuralı testi (src/lib/clearConfirm.js). Tarayıcı ve sunucu aynı kuralı kullanır.
import { describe, it, expect } from 'vitest';
import { isClearConfirmed } from '../src/lib/clearConfirm.js';

describe('isClearConfirmed', () => {
  it.each(['SİL', 'SIL'])('"%s" kabul edilir', (text) => {
    expect(isClearConfirmed(text)).toBe(true);
  });

  it.each(['sil', 'Sil', 'sİl', 'SILL', 'SİLL', '', ' SİL', 'SIL '])('"%s" reddedilir', (text) => {
    expect(isClearConfirmed(text)).toBe(false);
  });

  it.each([undefined, null, true, 1, ['SİL']])('metin olmayan değer reddedilir: %s', (value) => {
    expect(isClearConfirmed(value)).toBe(false);
  });
});
