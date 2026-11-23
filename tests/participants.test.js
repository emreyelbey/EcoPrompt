// Katılımcı kodu mantığının testleri (src/lib/participants.js).
import { describe, it, expect } from 'vitest';
import { ALL_CODES, normalizeCode, isValidCode, getGroup, getStatus } from '../src/lib/participants.js';

describe('ALL_CODES', () => {
  it('60 kod içerir, tekrarsızdır, K001 ile başlar D030 ile biter', () => {
    expect(ALL_CODES).toHaveLength(60);
    expect(new Set(ALL_CODES).size).toBe(60);
    expect(ALL_CODES[0]).toBe('K001');
    expect(ALL_CODES[29]).toBe('K030');
    expect(ALL_CODES[30]).toBe('D001');
    expect(ALL_CODES[59]).toBe('D030');
  });

  it('listedeki her kod geçerlidir', () => {
    expect(ALL_CODES.every(isValidCode)).toBe(true);
  });
});

describe('normalizeCode', () => {
  it('boşlukları siler ve büyük harfe çevirir', () => {
    expect(normalizeCode(' k001 ')).toBe('K001');
    expect(normalizeCode('d030')).toBe('D030');
  });

  it('metin olmayan girdide boş metin döner', () => {
    expect(normalizeCode(undefined)).toBe('');
    expect(normalizeCode(null)).toBe('');
    expect(normalizeCode(1)).toBe('');
    expect(normalizeCode({})).toBe('');
  });
});

describe('isValidCode', () => {
  it('sınır değerlerini kabul eder', () => {
    for (const code of ['K001', 'K030', 'D001', 'D030']) expect(isValidCode(code)).toBe(true);
  });

  it('aralık dışı ve hatalı biçimleri reddeder', () => {
    for (const code of ['K000', 'K031', 'D031', 'X001', 'K1', 'K01', 'K0001', '', 'k001', 'K 001', 'K001 ']) {
      expect(isValidCode(code)).toBe(false);
    }
  });
});

describe('getGroup ve getStatus', () => {
  it('grubu koddan bulur', () => {
    expect(getGroup('K005')).toBe('Kontrol');
    expect(getGroup('D012')).toBe('Deney');
    expect(getGroup('X001')).toBeNull();
  });

  it('001–020 Asıl, 021–030 Yedek', () => {
    expect(getStatus('K020')).toBe('Asıl');
    expect(getStatus('K021')).toBe('Yedek');
    expect(getStatus('D001')).toBe('Asıl');
    expect(getStatus('D030')).toBe('Yedek');
    expect(getStatus('D031')).toBeNull();
  });
});
