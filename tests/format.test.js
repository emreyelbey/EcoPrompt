// src/lib/format.js testleri: sayıların Türkçe yazım kuralıyla biçimlendirilmesi.
import { describe, it, expect } from 'vitest';
import { fmtNum, fmtSmart, formatPValue } from '../src/lib/format.js';

describe('fmtNum', () => {
  it('ondalık için virgül, binlik için nokta kullanır', () => {
    expect(fmtNum(1234.5)).toBe('1.234,50');
    expect(fmtNum(0.5, 1)).toBe('0,5');
    expect(fmtNum(20, 0)).toBe('20');
  });

  it('geçersiz değerde 0 yazar', () => {
    expect(fmtNum(NaN)).toBe('0');
    expect(fmtNum(Infinity)).toBe('0');
    expect(fmtNum('abc')).toBe('0');
  });
});

describe('fmtSmart', () => {
  it('büyüklüğe göre basamak sayısı seçer', () => {
    expect(fmtSmart(0)).toBe('0');
    expect(fmtSmart(0.005)).toBe('0,0050');
    expect(fmtSmart(0.5)).toBe('0,500');
    expect(fmtSmart(5)).toBe('5,00');
    expect(fmtSmart(500)).toBe('500,0');
  });
});

describe('formatPValue', () => {
  it('p değerini 4 basamakla yazar', () => {
    expect(formatPValue(0.073388)).toBe('0,0734');
  });

  it('0,001 altını "< 0,001" yazar', () => {
    expect(formatPValue(0.0005)).toBe('< 0,001');
  });

  it('değer yoksa tire yazar', () => {
    expect(formatPValue(null)).toBe('—');
    expect(formatPValue(undefined)).toBe('—');
    expect(formatPValue(NaN)).toBe('—');
  });
});
