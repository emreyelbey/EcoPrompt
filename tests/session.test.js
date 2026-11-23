// Yönetici oturumu testleri (api/_lib/session.js): parola kontrolü ve imzalı token.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkPasscode, createAdminToken, verifyAdminToken, TOKEN_TTL_MS } from '../api/_lib/session.js';

const SECRET = 'test-gizli-anahtar-en-az-16-karakter';
const NOW = 1_700_000_000_000;

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
  process.env.ADMIN_PASSCODE = 'dogru-parola';
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
  delete process.env.ADMIN_PASSCODE;
});

describe('checkPasscode', () => {
  it('doğru parolayı kabul eder', () => {
    expect(checkPasscode('dogru-parola')).toBe(true);
  });

  it('yanlış, boş veya metin olmayan parolayı reddeder', () => {
    expect(checkPasscode('yanlis')).toBe(false);
    expect(checkPasscode('dogru-parola ')).toBe(false);
    expect(checkPasscode('')).toBe(false);
    expect(checkPasscode(undefined)).toBe(false);
    expect(checkPasscode(123)).toBe(false);
  });

  it('ADMIN_PASSCODE yoksa hata fırlatır', () => {
    delete process.env.ADMIN_PASSCODE;
    expect(() => checkPasscode('x')).toThrow();
  });
});

describe('createAdminToken / verifyAdminToken', () => {
  it('üretilen token süresi dolana kadar geçerlidir', () => {
    const { token, exp } = createAdminToken(NOW);
    expect(exp).toBe(NOW + TOKEN_TTL_MS);
    expect(verifyAdminToken(token, NOW + 1000)).toEqual({ exp });
    expect(verifyAdminToken(token, exp - 1)).toEqual({ exp });
  });

  it('süresi dolmuş token reddedilir', () => {
    const { token, exp } = createAdminToken(NOW);
    expect(verifyAdminToken(token, exp)).toBeNull();
    expect(verifyAdminToken(token, exp + 1)).toBeNull();
  });

  it('yükü değiştirilmiş token reddedilir', () => {
    const { token } = createAdminToken(NOW);
    const [, signature] = token.split('.');
    // Süreyi uzatmaya çalışan sahte yük.
    const fakePayload = Buffer.from(JSON.stringify({ role: 'admin', exp: NOW * 2 })).toString('base64url');
    expect(verifyAdminToken(`${fakePayload}.${signature}`, NOW)).toBeNull();
  });

  it('imzası değiştirilmiş token reddedilir', () => {
    const { token } = createAdminToken(NOW);
    const last = token.at(-1) === 'A' ? 'B' : 'A';
    expect(verifyAdminToken(token.slice(0, -1) + last, NOW)).toBeNull();
  });

  it('başka bir gizli anahtarla imzalanmış token reddedilir', () => {
    process.env.SESSION_SECRET = 'baska-bir-gizli-anahtar-1234567';
    const { token } = createAdminToken(NOW);
    process.env.SESSION_SECRET = SECRET;
    expect(verifyAdminToken(token, NOW)).toBeNull();
  });

  it('bozuk biçimli token reddedilir', () => {
    for (const bad of [undefined, null, '', 'abc', 'a.b.c', '.', 'x.y']) {
      expect(verifyAdminToken(bad, NOW)).toBeNull();
    }
  });

  it('SESSION_SECRET yoksa veya çok kısaysa token üretilmez', () => {
    delete process.env.SESSION_SECRET;
    expect(() => createAdminToken(NOW)).toThrow();
    process.env.SESSION_SECRET = 'kisa';
    expect(() => createAdminToken(NOW)).toThrow();
  });
});
