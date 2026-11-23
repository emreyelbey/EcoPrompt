// src/lib/excelExport.js testleri: sayfa adları ve sırası, SPSS değişken adı kuralları, geniş format,
// eksik veri (boş hücre, 0 değil), sayısal hücre tipleri, d formülleri ve "çift yönlü" notu,
// panel ile Excel'in aynı sayıları vermesi, marka yasağı (engineVersion ve model adları sızmaz).
import { describe, it, expect } from 'vitest';
import {
  SHEET_NAMES,
  SPSS_RESERVED,
  TEST_HEADER,
  buildWorkbook,
  buildWorkbookSheets,
  spssColumns,
  workbookFileName,
} from '../src/lib/excelExport.js';
import { participantRows, runCanonicalTests } from '../src/lib/statsReport.js';
import { fixtureRecords, interaction, loginsFor } from './helpers/stats-fixture.js';
import { readWorkbook } from './helpers/xlsx-reader.js';
import { BRAND_PATTERNS } from './helpers/brand-patterns.js';
import { excelSerialTR } from '../src/lib/xlsxWriter.js';

const NOW = new Date(2026, 10, 23, 14, 5, 0);

// Sabit veri seti + eksik veri durumları:
// - D010 yalnızca Ön Test'e katıldı (Son Test boş olmalı)
// - Örnek kayıt (hiçbir sayfaya girmemeli)
// - engineVersion alanı taşıyan kayıt (hiçbir sayfaya sızmamalı)
// - = ile başlayan istem (formül olmamalı)
const records = [
  ...fixtureRecords(),
  interaction('D010', 'pretest', 2.5, { engineVersion: 'gemini-test-001', modelId: 'light', prompt: '=1+1 nedir?' }),
  interaction('K020', 'pretest', 99, { isSample: true, prompt: 'ÖRNEK KAYIT' }),
];
const logins = loginsFor(records.filter((r) => !r.isSample));

const sheets = buildWorkbookSheets(records, logins, { now: NOW });
const sheetByName = Object.fromEntries(sheets.map((s) => [s.name, s]));
const bytes = buildWorkbook(records, logins, { now: NOW });
const book = readWorkbook(bytes);

describe('sayfalar', () => {
  it('4 zorunlu sayfa + değişken sözlüğü, doğru sırayla', () => {
    expect(SHEET_NAMES).toEqual(['Tum_Kayitlar', 'Ogrenci_Ozetleri', 'Grup_Karsilastirma', 'SPSS_Veri_Seti', 'Degisken_Sozlugu']);
    expect(book.names).toEqual(SHEET_NAMES);
  });

  it('dosya adı tarihlidir', () => {
    expect(workbookFileName(NOW)).toBe('EkoToken_Veri_Seti_2026-11-23.xlsx');
  });
});

describe('Tum_Kayitlar', () => {
  const rows = book.sheets.Tum_Kayitlar;

  it('örnek kayıtlar girmez; her gerçek etkileşim bir satır', () => {
    expect(rows).toHaveLength(1 + 21);
    expect(JSON.stringify(sheetByName.Tum_Kayitlar.rows)).not.toContain('ÖRNEK KAYIT');
  });

  it('model yalnızca ölçek sınıfı adıyla yazılır; sayılar sayısal hücredir', () => {
    const header = rows[0].map((c) => c.value);
    const light = rows.find((r) => r[header.indexOf('İstem')]?.value === '=1+1 nedir?');
    expect(light[header.indexOf('Model Sınıfı')].value).toBe('Hafif Model');
    expect(light[header.indexOf('Enerji Ort (Wh)')]).toMatchObject({ type: 'number', value: 2.5 });
    expect(light[header.indexOf('Ağırlıklı Token')].type).toBe('number');
    expect(light[header.indexOf('İstem')].type).toBe('string'); // formül değil
  });
});

describe('Tum_Kayitlar: tarih', () => {
  it('Tarih sütunu gerçek Excel tarih hücresidir (sayısal, tarih biçimli, Türkiye saati)', () => {
    const ms = Date.UTC(2026, 10, 23, 11, 5, 30); // Türkiye: 23.11.2026 14:05:30
    const wb = readWorkbook(buildWorkbook([interaction('K001', 'pretest', 1, { createdAt: ms })], [], { now: NOW }));
    const sheet = wb.sheets.Tum_Kayitlar;
    expect(sheet[0][0].value).toBe('Tarih (Türkiye saati)');
    expect(sheet[1][0].type).toBe('number');
    expect(sheet[1][0].raw).toContain('s="2"');
    expect(sheet[1][0].value).toBeCloseTo(46349.58715277778, 9); // Python ile bağımsız hesap
  });

  it('bütün kayıt satırlarında tarih sayısal ve tarih biçimlidir; sıra eskiden yeniye', () => {
    const rows = book.sheets.Tum_Kayitlar.slice(1);
    for (const r of rows) {
      expect(r[0].type).toBe('number');
      expect(r[0].raw).toContain('s="2"');
    }
    const serials = rows.map((r) => r[0].value);
    expect(serials).toEqual([...serials].sort((a, b) => a - b));
    const first = [...records].filter((r) => !r.isSample).sort((a, b) => a.createdAt - b.createdAt)[0];
    expect(serials[0]).toBe(excelSerialTR(first.createdAt));
  });
});

describe('Ogrenci_Ozetleri', () => {
  const ozet = sheetByName.Ogrenci_Ozetleri;
  const header = ozet.rows[0];
  const col = (name) => header.indexOf(name);
  const rowOf = (sheet, code) => sheet.rows.find((r) => r[0] === code);

  it('60 kodun tamamı yer alır', () => {
    expect(ozet.rows).toHaveLength(61);
    expect(ozet.rows[1][0]).toBe('K001');
    expect(ozet.rows[60][0]).toBe('D030');
  });

  it('analize girmeyen aşamanın ölçüt hücreleri BOŞ (0 değil); Giriş sütunu Evet/Hayır kalır', () => {
    const d10 = rowOf(ozet, 'D010'); // yalnızca Ön Test
    expect(d10[col('Ön Test Giriş')]).toBe('Evet');
    expect(d10[col('Ön Test Enerji (Wh)')]).toBe(2.5);
    expect(d10[col('Son Test Giriş')]).toBe('Hayır');
    for (const h of ['İstem', 'Ağırlıklı Token', 'Enerji (Wh)', 'Su (mL)', 'CO₂ (g)', 'Hafif Model (%)']) {
      expect(d10[col(`Son Test ${h}`)]).toBeNull();
    }
  });

  it('toplam sütunları yalnızca mevcut aşamaların toplamıdır; iki aşama da boşsa boş', () => {
    const d10 = rowOf(ozet, 'D010');
    expect(d10[col('Toplam İstem')]).toBe(1);
    expect(d10[col('Toplam Enerji (Wh)')]).toBe(2.5);
    const d1 = rowOf(ozet, 'D001');
    expect(d1[col('Toplam Enerji (Wh)')]).toBeCloseTo(3.4 + 1.9, 12);
    expect(d1[col('Toplam İstem')]).toBe(2);
    const k30 = rowOf(ozet, 'K030'); // hiç katılmadı
    expect(k30[col('Ön Test Giriş')]).toBe('Hayır');
    expect(k30[col('Son Test Giriş')]).toBe('Hayır');
    expect(k30.slice(3).filter((v) => v !== 'Hayır').every((v) => v === null)).toBe(true);
    for (const h of ['Toplam İstem', 'Toplam Ağırlıklı Token', 'Toplam Enerji (Wh)', 'Toplam Su (mL)', 'Toplam CO₂ (g)']) {
      expect(k30[col(h)]).toBeNull();
    }
  });

  it('"exclude": giriş yapıp istem yazmayan öğrencinin Giriş = Evet ama ölçütleri boş', () => {
    const lg = [...logins, { code: 'D010', phase: 'posttest' }];
    const sheet = buildWorkbookSheets(records, lg, { policy: 'exclude', now: NOW }).find((x) => x.name === 'Ogrenci_Ozetleri');
    const d10 = rowOf(sheet, 'D010');
    expect(d10[col('Son Test Giriş')]).toBe('Evet');
    expect(d10[col('Son Test İstem')]).toBeNull();
    expect(d10[col('Son Test Enerji (Wh)')]).toBeNull();
  });

  it('"zero": aynı öğrenci 0 değerleriyle girer; Hafif Model % yine boş', () => {
    const lg = [...logins, { code: 'D010', phase: 'posttest' }];
    const sheet = buildWorkbookSheets(records, lg, { policy: 'zero', now: NOW }).find((x) => x.name === 'Ogrenci_Ozetleri');
    const d10 = rowOf(sheet, 'D010');
    expect(d10[col('Son Test İstem')]).toBe(0);
    expect(d10[col('Son Test Enerji (Wh)')]).toBe(0);
    expect(d10[col('Son Test Hafif Model (%)')]).toBeNull();
    expect(d10[col('Toplam Enerji (Wh)')]).toBe(2.5);
  });

  it('Excel’de sütun ortalaması panelin hücre ortalamasıyla aynıdır (boşlar dosyada hiç yazılmaz)', () => {
    const xml = book.sheets.Ogrenci_Ozetleri;
    const c = col('Son Test Enerji (Wh)');
    const deney = xml.slice(1).filter((r) => r[1].value === 'Deney' && r[c]).map((r) => r[c].value);
    expect(deney).toHaveLength(5); // D010 ve gelmeyen 24 kod: hücre yok
    const mean = deney.reduce((a, b) => a + b, 0) / deney.length;
    expect(mean).toBeCloseTo(2.12, 12); // panel: Deney — Son Test ortalaması
  });
});

describe('SPSS_Veri_Seti', () => {
  const header = sheetByName.SPSS_Veri_Seti.rows[0];
  const data = sheetByName.SPSS_Veri_Seti.rows.slice(1);
  const col = (name) => header.indexOf(name);
  const row = (code) => data.find((r) => r[0] === code);

  it('değişken adları SPSS kurallarına uyar: ASCII, harfle başlar, boşluksuz, ≤ 64, benzersiz, ayrılmış sözcük değil', () => {
    for (const name of header) {
      expect(name).toMatch(/^[A-Za-z][A-Za-z0-9_]{0,63}$/);
      expect(name.endsWith('_')).toBe(false);
      expect(SPSS_RESERVED).not.toContain(name.toUpperCase());
    }
    expect(new Set(header).size).toBe(header.length);
  });

  it('kimlik ve katılım sütunları: Grup_Kodu, Statu_Kodu, OnTest_Katilim, SonTest_Katilim', () => {
    expect(header.slice(0, 5)).toEqual(['Katilimci_Kodu', 'Grup_Kodu', 'Statu_Kodu', 'OnTest_Katilim', 'SonTest_Katilim']);
    expect(header).toContain('OnTest_Enerji_Wh');
    expect(header).toContain('SonTest_AgirlikliToken');
    expect(header).toContain('Fark_EnerjiIstem_Wh');
  });

  it('geniş format: 60 katılımcı, her biri tek satır', () => {
    expect(data).toHaveLength(60);
    expect(new Set(data.map((r) => r[0])).size).toBe(60);
  });

  it('grup ve statü sayısal kodlanır (0 = Kontrol / 1 = Deney; 0 = Asıl / 1 = Yedek)', () => {
    expect(row('K001')[col('Grup_Kodu')]).toBe(0);
    expect(row('D001')[col('Grup_Kodu')]).toBe(1);
    expect(row('K001')[col('Statu_Kodu')]).toBe(0);
    expect(row('D021')[col('Statu_Kodu')]).toBe(1);
  });

  it('yalnızca Ön Test’e katılan öğrencinin Son Test ve Fark hücreleri BOŞ kalır (0 yazılmaz)', () => {
    const d10 = row('D010');
    expect(d10[col('OnTest_Katilim')]).toBe(1);
    expect(d10[col('SonTest_Katilim')]).toBe(0);
    expect(d10[col('OnTest_Enerji_Wh')]).toBe(2.5);
    expect(d10[col('SonTest_Enerji_Wh')]).toBeNull();
    expect(d10[col('SonTest_Istem')]).toBeNull();
    expect(d10[col('Fark_Enerji_Wh')]).toBeNull();
  });

  it('hiç katılmayan öğrencinin bütün ölçüt hücreleri boştur', () => {
    const k30 = row('K030');
    expect(k30[col('OnTest_Katilim')]).toBe(0);
    expect(k30[col('SonTest_Katilim')]).toBe(0);
    expect(k30.slice(5).every((v) => v === null)).toBe(true);
  });

  it('Fark = Son Test − Ön Test', () => {
    expect(row('D001')[col('Fark_Enerji_Wh')]).toBeCloseTo(1.9 - 3.4, 12);
    expect(row('D001')[col('Fark_Istem')]).toBe(0);
  });

  it('"zero" politikasında giriş yapıp istem yazmayan öğrenci 0 alır; oran ölçütleri yine boş', () => {
    const lg = [...logins, { code: 'D010', phase: 'posttest' }];
    const spss = buildWorkbookSheets(records, lg, { policy: 'zero', now: NOW }).find((s) => s.name === 'SPSS_Veri_Seti');
    const d10 = spss.rows.find((r) => r[0] === 'D010');
    expect(d10[col('SonTest_Katilim')]).toBe(1);
    expect(d10[col('SonTest_Istem')]).toBe(0);
    expect(d10[col('SonTest_Enerji_Wh')]).toBe(0);
    expect(d10[col('SonTest_HafifYuzde')]).toBeNull();
    expect(d10[col('SonTest_EnerjiIstem_Wh')]).toBeNull();
  });

  it('dosyada başlık dışındaki bütün hücreler (kod hariç) gerçek sayısal hücredir', () => {
    const xmlRows = book.sheets.SPSS_Veri_Seti;
    expect(xmlRows[0].every((c) => c.type === 'string')).toBe(true);
    for (const r of xmlRows.slice(1)) {
      expect(r[0].type).toBe('string');
      for (const cell of r.slice(1)) {
        if (cell) expect(cell.type).toBe('number');
      }
    }
    const d001 = xmlRows.find((r) => r[0].value === 'D001');
    expect(d001[1]).toMatchObject({ type: 'number', value: 1 });
    expect(d001[3].raw).not.toContain('inlineStr'); // OnTest_Katilim
    expect(d001[4].raw).not.toContain('inlineStr'); // SonTest_Katilim
  });
});

describe('Grup_Karsilastirma', () => {
  const rows = sheetByName.Grup_Karsilastirma.rows;
  const text = JSON.stringify(rows);
  const headerIndex = rows.findIndex((r) => r[0] === 'Ölçüt' && r.includes('Test No'));
  const testRows = rows.slice(headerIndex + 1).filter((r, i, all) => all.slice(0, i + 1).every((x) => x.length > 0));

  it('test bloğunda Ön/Son/eşleşen n sütunları ve "p (çift yönlü)" başlığı vardır', () => {
    expect(rows[headerIndex]).toEqual(TEST_HEADER);
    for (const h of ['n Ön Test', 'n Son Test', 'n Eşleşen', 'p (çift yönlü)', "Cohen's d", 'Etki Büyüklüğü']) {
      expect(TEST_HEADER).toContain(h);
    }
    expect(text).toContain('p değerleri çift yönlü');
  });

  it('her ölçüt için 4 test (7 ölçüt × 4 = 28 satır); birincil ölçüt işaretli', () => {
    expect(testRows).toHaveLength(28);
    const energy = testRows.filter((r) => r[1] === 'Enerji_Wh');
    expect(energy.every((r) => r[2] === 'Evet')).toBe(true);
    expect(testRows.filter((r) => r[2] === 'Evet')).toHaveLength(4);
  });

  it('Excel’deki sayılar panelin hesapladığıyla aynıdır', () => {
    const panel = runCanonicalTests(participantRows(records.filter((r) => !r.isSample), logins), 'energy');
    const h = (name) => TEST_HEADER.indexOf(name);
    const energy = testRows.filter((r) => r[1] === 'Enerji_Wh');
    energy.forEach((r, i) => {
      expect(r[h('t')]).toBe(panel[i].result.t);
      expect(r[h('p (çift yönlü)')]).toBe(panel[i].result.p);
      expect(r[h("Cohen's d")]).toBe(panel[i].d);
    });
    // Deney eşleştirilmiş testi: D010 yalnızca Ön Test'te → Ön 6, Son 5, eşleşen 5.
    const deney = energy[2];
    expect([deney[h('n Ön Test')], deney[h('n Son Test')], deney[h('n Eşleşen')]]).toEqual([6, 5, 5]);
    expect(deney[h('n Kontrol')]).toBeNull();
  });

  it("Cohen's d formülleri ve etiket aralıkları yazılıdır", () => {
    expect(text).toContain('havuzlanmış standart sapma');
    expect(text).toContain('sp = √[((nK − 1)·sK² + (nD − 1)·sD²) / (nK + nD − 2)]');
    expect(text).toContain('dz = farkların ortalaması / farkların standart sapması');
    expect(text).toContain('|d| < 0,2 ihmal edilebilir');
    expect(text).toContain('|d| ≥ 0,8 büyük');
  });
});

describe('Degisken_Sozlugu', () => {
  const rows = sheetByName.Degisken_Sozlugu.rows;
  const text = JSON.stringify(rows);

  it('SPSS sayfasındaki her değişken sözlükte açıklanır', () => {
    const names = rows.map((r) => r[0]);
    for (const [name] of spssColumns()) expect(names).toContain(name);
  });

  it('değer kodları, eksik veri kuralı, çift yönlü p ve d formülleri yazılıdır', () => {
    expect(text).toContain('0 = Kontrol, 1 = Deney');
    expect(text).toContain('Boş hücre = eksik veri');
    expect(text).toContain('ÇİFT YÖNLÜDÜR');
    expect(text).toContain('havuzlanmış standart sapma');
    expect(text).toContain('dz = farkların ortalaması');
    expect(text).toContain('23.11.2026 14:05:00');
  });
});

describe('marka yasağı', () => {
  it('Excel dosyasının hiçbir parçasında engineVersion, model sürümü veya marka adı yoktur', () => {
    for (const [name, content] of book.files) {
      expect(content, name).not.toContain('engineVersion');
      expect(content, name).not.toContain('gemini-test-001');
      for (const pattern of BRAND_PATTERNS) expect(pattern.test(content), `${name} → ${pattern}`).toBe(false);
    }
  });
});
