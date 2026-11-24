// @vitest-environment jsdom
// Model seçiminin hatırlanması (src/lib/session.js): sessionStorage, anahtar `model:<kod>:<aşama>`.
// Sayfa yenilenince seçim korunur; çıkışta (clearSession) bütün seçimler silinir.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_MODEL,
  loadModelChoice,
  saveModelChoice,
  saveStudent,
  saveAdmin,
  loadSession,
  clearSession,
} from '../src/lib/session.js';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('loadModelChoice / saveModelChoice', () => {
  it('kayıt yoksa varsayılan Standart', () => {
    expect(DEFAULT_MODEL).toBe('standard');
    expect(loadModelChoice('K001', 'pretest')).toBe('standard');
  });

  it('kaydedilen seçim aynı kod ve aşamada geri okunur', () => {
    saveModelChoice('K001', 'pretest', 'light');
    expect(sessionStorage.getItem('model:K001:pretest')).toBe('light');
    expect(loadModelChoice('K001', 'pretest')).toBe('light');
  });

  it('başka aşamaya veya başka koda taşınmaz', () => {
    saveModelChoice('K001', 'pretest', 'light');
    expect(loadModelChoice('K001', 'posttest')).toBe('standard');
    expect(loadModelChoice('K002', 'pretest')).toBe('standard');
  });

  it('geçersiz değer yok sayılır', () => {
    sessionStorage.setItem('model:K001:pretest', 'bozuk');
    expect(loadModelChoice('K001', 'pretest')).toBe('standard');
  });
});

describe('clearSession', () => {
  it('oturumla birlikte bütün model seçimlerini siler, başka anahtarlara dokunmaz', () => {
    saveStudent('K001');
    saveAdmin('token', 123);
    saveModelChoice('K001', 'pretest', 'light');
    saveModelChoice('K001', 'posttest', 'reasoning');
    saveModelChoice('D005', 'pretest', 'light');
    sessionStorage.setItem('baska', 'kalsin');

    clearSession();

    expect(loadSession()).toBeNull();
    expect(Object.keys(sessionStorage).filter((k) => k.startsWith('model:'))).toEqual([]);
    expect(loadModelChoice('K001', 'pretest')).toBe('standard');
    expect(sessionStorage.getItem('baska')).toBe('kalsin');
  });
});
