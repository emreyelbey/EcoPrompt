// Yönetici paneli hesapları testleri (src/lib/adminSummary.js).
import { describe, it, expect } from 'vitest';
import {
  overviewStats,
  filterRecords,
  codeRows,
  realRecords,
  latestMillis,
  mergeById,
  configHashSummary,
} from '../src/lib/adminSummary.js';

const r = (o) => ({ energyAvg: 1, waterAvg: 2, co2Avg: 0.5, isSample: false, createdAt: 0, ...o });

const RECORDS = [
  r({ id: '1', code: 'K001', group: 'Kontrol', phase: 'pretest', modelId: 'light', prompt: 'Fotosentez nedir?', createdAt: 10 }),
  r({ id: '2', code: 'K001', group: 'Kontrol', phase: 'pretest', modelId: 'standard', prompt: 'İkinci', createdAt: 20 }),
  r({ id: '3', code: 'K002', group: 'Kontrol', phase: 'posttest', modelId: 'standard', prompt: 'Üçüncü', createdAt: 30 }),
  r({ id: '4', code: 'D001', group: 'Deney', phase: 'posttest', modelId: 'light', prompt: 'Dördüncü', createdAt: 40, energyAvg: 3 }),
  r({ id: 'ornek', code: 'D002', group: 'Deney', phase: 'pretest', modelId: 'reasoning', prompt: 'Örnek', isSample: true, createdAt: 50 }),
];

const LOGINS = [
  { code: 'K001', phase: 'pretest', firstLoginAt: 5, lastLoginAt: 25, sessionCount: 2 },
  { code: 'K003', phase: 'pretest', firstLoginAt: 6, lastLoginAt: 6 }, // eski belge: sessionCount yok
  { code: 'K001', phase: 'posttest', firstLoginAt: 100, lastLoginAt: 120, sessionCount: 1 },
];

describe('overviewStats', () => {
  it('Tümü: KPI ve grup özetleri (örnekler hariç)', () => {
    const s = overviewStats(realRecords(RECORDS), LOGINS, 'all');
    expect(s.totalPrompts).toBe(4);
    expect(s.activeParticipants).toBe(3);
    expect(s.loggedInParticipants).toBe(2);
    expect(s.totalEnergy).toBe(6);
    expect(s.totalWater).toBe(8);
    expect(s.groups.Kontrol.prompts).toBe(3);
    expect(s.groups.Kontrol.users).toBe(2);
    expect(s.groups.Kontrol.avgPrompts).toBe(1.5);
    expect(s.groups.Deney.avgEnergy).toBe(3);
    expect(s.groups.Kontrol.models.standard.pct).toBeCloseTo(66.667, 2);
    expect(s.groups.Deney.models.reasoning.count).toBe(0); // örnek kayıt girmedi
  });

  it('aşama filtresi kayıtlara ve girişlere uygulanır', () => {
    const s = overviewStats(realRecords(RECORDS), LOGINS, 'posttest');
    expect(s.totalPrompts).toBe(2);
    expect(s.loggedInParticipants).toBe(1);
  });

  it('kod izin listesi: 60 kodun dışındaki kodlar sayılmaz; başka liste verilirse yalnızca o kodlar sayılır', () => {
    const foreign = [r({ id: 'x1', code: 'OK01', group: 'Kontrol', phase: 'pretest', modelId: 'light' })];
    const base = overviewStats(realRecords(RECORDS), [], 'all');
    const withForeign = overviewStats([...realRecords(RECORDS), ...foreign], [{ code: 'OK01', phase: 'pretest' }], 'all');
    expect(withForeign).toEqual(base);
    expect(base.totalCodes).toBe(60);

    const only = overviewStats([...realRecords(RECORDS), ...foreign], [], 'all', { OK01: 'Kontrol' });
    expect(only.totalPrompts).toBe(1);
    expect(only.totalCodes).toBe(1);
  });

  it('boş veride sıfıra bölme olmaz', () => {
    const s = overviewStats([], [], 'all');
    expect(s.groups.Deney).toMatchObject({ prompts: 0, users: 0, avgPrompts: 0, avgEnergy: 0 });
    expect(s.groups.Deney.models.light.pct).toBe(0);
  });
});

describe('filterRecords', () => {
  const all = { query: '', group: 'all', phase: 'all', model: 'all' };

  it('en yeni önce; örnek ayıklamaz (hangi listenin gösterileceğine AdminScreen karar verir)', () => {
    expect(filterRecords(RECORDS, all).map((x) => x.id)).toEqual(['ornek', '4', '3', '2', '1']);
    expect(filterRecords(realRecords(RECORDS), all).map((x) => x.id)).toEqual(['4', '3', '2', '1']);
  });

  it('kod ve istemde Türkçe büyük/küçük harf duyarsız arama', () => {
    expect(filterRecords(RECORDS, { ...all, query: 'k002' }).map((x) => x.id)).toEqual(['3']);
    expect(filterRecords(RECORDS, { ...all, query: 'İKİNCİ' }).map((x) => x.id)).toEqual(['2']);
  });

  it('grup, aşama ve model filtreleri birlikte', () => {
    const res = filterRecords(RECORDS, { ...all, group: 'Kontrol', phase: 'pretest', model: 'light' });
    expect(res.map((x) => x.id)).toEqual(['1']);
  });
});

describe('codeRows', () => {
  const rows = codeRows(RECORDS, LOGINS);

  it('60 kodun tamamı, grup ve statüyle', () => {
    expect(rows).toHaveLength(60);
    expect(rows.find((x) => x.code === 'K020').status).toBe('Asıl');
    expect(rows.find((x) => x.code === 'D021')).toMatchObject({ group: 'Deney', status: 'Yedek' });
  });

  it('giriş durumu logins koleksiyonundan, istem sayıları gerçek kayıtlardan', () => {
    const k1 = rows.find((x) => x.code === 'K001');
    expect(k1.pretest).toMatchObject({ loggedIn: true, firstLoginAt: 5, sessionCount: 2, prompts: 2 });
    expect(k1.posttest).toMatchObject({ loggedIn: true, prompts: 0 });
    expect(k1.totalPrompts).toBe(2);
    expect(k1.lastActivityAt).toBe(120);

    const k3 = rows.find((x) => x.code === 'K003');
    expect(k3.pretest.loggedIn).toBe(true);
    expect(k3.pretest.sessionCount).toBe(null);

    const d2 = rows.find((x) => x.code === 'D002');
    expect(d2.totalPrompts).toBe(0); // yalnızca örnek kaydı vardı
    expect(d2.lastActivityAt).toBe(null);
  });
});

describe('önbellek yardımcıları', () => {
  it('latestMillis en büyük zamanı bulur, boşta undefined', () => {
    expect(latestMillis(RECORDS, 'createdAt')).toBe(50);
    expect(latestMillis([], 'createdAt')).toBeUndefined();
  });

  it('mergeById tekrarları üzerine yazar', () => {
    const m = mergeById(new Map([['a', { id: 'a', v: 1 }]]), [{ id: 'a', v: 2 }, { id: 'b', v: 3 }]);
    expect([...m.values()]).toEqual([{ id: 'a', v: 2 }, { id: 'b', v: 3 }]);
  });
});

describe('configHashSummary (dondurma kuralı)', () => {
  it('tek özet: ok; özetsiz eski kayıtlar ayrıca sayılır', () => {
    const s = configHashSummary([
      r({ phase: 'pretest', configHash: 'aaaaaaaaaaaa' }),
      r({ phase: 'posttest', configHash: 'aaaaaaaaaaaa' }),
      r({ phase: 'pretest' }), // alan eklenmeden önce yazılmış kayıt
    ]);
    expect(s.ok).toBe(true);
    expect(s.missing).toBe(1);
    expect(s.hashes).toEqual([{ hash: 'aaaaaaaaaaaa', count: 2, pretest: 1, posttest: 1 }]);
  });

  it('iki farklı özet: ok değil; en çok kayıtlı özet önce, aşama dağılımıyla', () => {
    const s = configHashSummary([
      r({ phase: 'pretest', configHash: 'aaaaaaaaaaaa' }),
      r({ phase: 'pretest', configHash: 'aaaaaaaaaaaa' }),
      r({ phase: 'posttest', configHash: 'bbbbbbbbbbbb' }),
    ]);
    expect(s.ok).toBe(false);
    expect(s.hashes.map((h) => [h.hash, h.pretest, h.posttest])).toEqual([
      ['aaaaaaaaaaaa', 2, 0],
      ['bbbbbbbbbbbb', 0, 1],
    ]);
  });
});
