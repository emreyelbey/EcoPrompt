// FIREBASE_SERVICE_ACCOUNT çözümleme testleri (api/_lib/firebase.js → parseServiceAccount).
// Özellikle: hata gerekçesi değerin hiçbir parçasını içermemeli.
import { describe, it, expect } from 'vitest';
import { parseServiceAccount } from '../api/_lib/firebase.js';

const GIZLI = 'COK-GIZLI-ICERIK';
const gecerli = {
  type: 'service_account',
  project_id: 'deneme-proje',
  client_email: 'x@deneme.iam.example',
  private_key: `-----BEGIN PRIVATE KEY-----\n${GIZLI}\n-----END PRIVATE KEY-----\n`,
};

describe('parseServiceAccount', () => {
  it('tek satır geçerli JSON kabul edilir', () => {
    const r = parseServiceAccount(JSON.stringify(gecerli));
    expect(r.ok).toBe(true);
    expect(r.account.project_id).toBe('deneme-proje');
  });

  it('tanımsız veya boş değer', () => {
    expect(parseServiceAccount(undefined).ok).toBe(false);
    expect(parseServiceAccount('').reason).toMatch(/tanımlı değil/);
  });

  it('bozuk JSON: konum verilir, içerik verilmez', () => {
    // Çok satırlı değer ilk satırda kesilmiş gibi: yalnızca "{".
    const kesik = parseServiceAccount('{');
    expect(kesik.ok).toBe(false);
    expect(kesik.reason).toMatch(/JSON ayrıştırılamadı/);

    // Gizli içerik barındıran bozuk metin.
    const raw = `{"private_key": "${GIZLI}" BOZUK}`;
    const r = parseServiceAccount(raw);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/konum \d+/);
    expect(r.reason).not.toContain(GIZLI);
    expect(r.reason).not.toContain('private_key');
  });

  it('gerçek satır sonu sayısını bildirir', () => {
    const r = parseServiceAccount('{\n"a":\n');
    expect(r.reason).toMatch(/gerçek satır sonu 2/);
  });

  it('nesne olmayan JSON reddedilir', () => {
    expect(parseServiceAccount('"metin"').reason).toMatch(/nesne değil/);
    expect(parseServiceAccount('[1]').reason).toMatch(/nesne değil/);
  });

  it('eksik alanlar adlarıyla bildirilir, değerleri bildirilmez', () => {
    const { private_key, ...eksik } = gecerli;
    const r = parseServiceAccount(JSON.stringify(eksik));
    expect(r.reason).toBe('Eksik alanlar: private_key.');
  });

  it('anahtar biçimi yanlışsa reddedilir ve anahtar yazılmaz', () => {
    const r = parseServiceAccount(JSON.stringify({ ...gecerli, private_key: GIZLI }));
    expect(r.ok).toBe(false);
    expect(r.reason).not.toContain(GIZLI);
  });
});
