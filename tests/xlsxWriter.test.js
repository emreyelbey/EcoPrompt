// src/lib/xlsxWriter.js testleri: ZIP yapısı ve CRC (Node'un kendi zlib.crc32'siyle bağımsız denetim),
// sayısal/metin hücre tipleri, formül enjeksiyonu koruması, XML kaçışlama, 32.767 karakter sınırı.
import { describe, it, expect } from 'vitest';
import { crc32 as nodeCrc32 } from 'node:zlib';
import {
  MAX_CELL_CHARS,
  TRUNCATION_SUFFIX,
  buildXlsx,
  DATE_FORMAT,
  cellXml,
  columnLetter,
  crc32,
  dateCell,
  excelSerialTR,
  prepareCellText,
} from '../src/lib/xlsxWriter.js';
import { readWorkbook } from './helpers/xlsx-reader.js';

describe('ZIP ve çalışma kitabı yapısı', () => {
  const bytes = buildXlsx([
    { name: 'Bir', rows: [['Başlık', 'Sayı'], ['ğüşİıöç', 1.5]], boldRows: [0], freezeHeader: true, columnWidths: [12, 8] },
    { name: 'Iki', rows: [[1, 2, 3]] },
  ]);

  it('gerekli parçaları içerir ve her parçanın CRC32 değeri doğrudur', () => {
    const { files, names } = readWorkbook(bytes);
    expect([...files.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]);
    expect(names).toEqual(['Bir', 'Iki']);
  });

  it("kendi CRC32'miz Node'un CRC32'siyle aynı sonucu verir", () => {
    const data = new TextEncoder().encode('Ön Test – Son Test 123');
    expect(crc32(data)).toBe(nodeCrc32(data) >>> 0);
  });

  it('Türkçe karakterler bozulmadan okunur; başlık kalın ve sabit', () => {
    const { files, sheets } = readWorkbook(bytes);
    expect(sheets.Bir[1][0].value).toBe('ğüşİıöç');
    expect(sheets.Bir[0][0].raw).toContain('s="1"');
    expect(sheets.Bir[1][0].raw).not.toContain('s="1"');
    expect(files.get('xl/worksheets/sheet1.xml')).toContain('state="frozen"');
    expect(files.get('xl/worksheets/sheet1.xml')).toContain('<col min="1" max="1" width="12" customWidth="1"/>');
  });

  it('aynı girdi her seferinde aynı baytları üretir', () => {
    const again = buildXlsx([
      { name: 'Bir', rows: [['Başlık', 'Sayı'], ['ğüşİıöç', 1.5]], boldRows: [0], freezeHeader: true, columnWidths: [12, 8] },
      { name: 'Iki', rows: [[1, 2, 3]] },
    ]);
    expect(Buffer.from(again).equals(Buffer.from(bytes))).toBe(true);
  });

  it('geçersiz sayfa adı reddedilir', () => {
    expect(() => buildXlsx([{ name: 'a'.repeat(32), rows: [] }])).toThrow(/Geçersiz sayfa adı/);
    expect(() => buildXlsx([{ name: 'Kayıt/Liste', rows: [] }])).toThrow();
    expect(() => buildXlsx([{ name: '', rows: [] }])).toThrow();
  });

  it('sütun harfleri: A, Z, AA, AZ, BA', () => {
    expect([0, 25, 26, 51, 52].map(columnLetter)).toEqual(['A', 'Z', 'AA', 'AZ', 'BA']);
  });
});

describe('hücre tipleri', () => {
  it('sayılar gerçek sayısal hücre olarak yazılır (metin değil)', () => {
    expect(cellXml(42, 'A1')).toBe('<c r="A1"><v>42</v></c>');
    expect(cellXml(0.000123, 'B2')).toBe('<c r="B2"><v>0.000123</v></c>');
    expect(cellXml(-3.5, 'C3')).toBe('<c r="C3"><v>-3.5</v></c>');
    expect(cellXml(0, 'D4')).toBe('<c r="D4"><v>0</v></c>');
    expect(cellXml(-0, 'D4')).toBe('<c r="D4"><v>0</v></c>');
    expect(cellXml(1.5, 'E5')).not.toContain('inlineStr');
  });

  it('çok küçük sayılar bilimsel gösterimle de sayı olarak kalır', () => {
    const { sheets } = readWorkbook(buildXlsx([{ name: 'S', rows: [[1e-9, 123456789.123]] }]));
    expect(sheets.S[0][0]).toMatchObject({ type: 'number', value: 1e-9 });
    expect(sheets.S[0][1]).toMatchObject({ type: 'number', value: 123456789.123 });
  });

  it('NaN, Infinity, null ve undefined boş hücre olur ("NaN" metni yazılmaz)', () => {
    for (const v of [NaN, Infinity, -Infinity, null, undefined]) expect(cellXml(v, 'A1')).toBe('');
    const { sheets } = readWorkbook(buildXlsx([{ name: 'S', rows: [[NaN, 'x', null, 7]] }]));
    expect(sheets.S[0][0]).toBeUndefined();
    expect(sheets.S[0][2]).toBeUndefined();
    expect(sheets.S[0][3]).toMatchObject({ type: 'number', value: 7 });
  });

  it('metinler inlineStr hücresidir', () => {
    expect(cellXml('Merhaba', 'A1')).toBe('<c r="A1" t="inlineStr"><is><t xml:space="preserve">Merhaba</t></is></c>');
  });

  it('= ile başlayan istem formül olarak çalışmaz (formül hücresi yazılmaz)', () => {
    const xml = cellXml('=HYPERLINK("http://kotu.example","tıkla")', 'A1');
    expect(xml).toContain('t="inlineStr"');
    expect(xml).not.toContain('<f>');
    const { sheets } = readWorkbook(buildXlsx([{ name: 'S', rows: [['=1+1', '+5', '-3', '@SUM(A1)']] }]));
    expect(sheets.S[0].map((c) => c.type)).toEqual(['string', 'string', 'string', 'string']);
    expect(sheets.S[0][0].value).toBe('=1+1');
  });

  it('XML özel karakterleri kaçışlanır', () => {
    expect(cellXml('a < b & c > "d"', 'A1')).toContain('a &lt; b &amp; c &gt; &quot;d&quot;');
    const { sheets } = readWorkbook(buildXlsx([{ name: 'S', rows: [['<script>&</script>']] }]));
    expect(sheets.S[0][0].value).toBe('<script>&</script>');
  });

  it('XML’de yasak kontrol karakterleri silinir; sekme ve satır sonu korunur', () => {
    expect(prepareCellText('a\u0000b\u0007c\u001Fd')).toBe('abcd');
    expect(prepareCellText('satır1\nsatır2\tsekme')).toBe('satır1\nsatır2\tsekme');
    expect(prepareCellText('eşsiz \uD800 vekil')).toBe('eşsiz  vekil');
    expect(prepareCellText('emoji 😀 kalır')).toBe('emoji 😀 kalır');
  });
});

describe('Excel hücre sınırı: 32.767 karakter', () => {
  it('40.000 karakterlik metin tam 32.767 karaktere iner ve "…[kırpıldı]" ile biter', () => {
    const text = prepareCellText('ğ'.repeat(40000));
    expect(MAX_CELL_CHARS).toBe(32767);
    expect(text.length).toBe(32767);
    expect(text.endsWith(TRUNCATION_SUFFIX)).toBe(true);
    expect(TRUNCATION_SUFFIX).toBe('…[kırpıldı]');
    expect(text.startsWith('ğğğ')).toBe(true); // Türkçe karakter bozulmaz
  });

  it('tam 32.767 karakterlik metin olduğu gibi kalır', () => {
    const text = 'a'.repeat(32767);
    expect(prepareCellText(text)).toBe(text);
    expect(prepareCellText('b'.repeat(32768)).length).toBe(32767);
  });

  it('emoji (iki parçalı karakter) ortasından kesilmez', () => {
    const cutAt = MAX_CELL_CHARS - TRUNCATION_SUFFIX.length;
    const text = prepareCellText('a'.repeat(cutAt - 1) + '😀' + 'b'.repeat(100));
    expect(text.endsWith(TRUNCATION_SUFFIX)).toBe(true);
    expect(text.length).toBeLessThanOrEqual(MAX_CELL_CHARS);
    expect(/[\uD800-\uDBFF]$/.test(text.slice(0, -TRUNCATION_SUFFIX.length))).toBe(false);
  });

  it('kırpma Excel dosyasına yazılan hücrede de uygulanır', () => {
    const { sheets } = readWorkbook(buildXlsx([{ name: 'S', rows: [['x'.repeat(50000)]] }]));
    expect(sheets.S[0][0].value.length).toBe(32767);
    expect(sheets.S[0][0].value.endsWith('…[kırpıldı]')).toBe(true);
  });
});

describe('tarih hücreleri (Türkiye saati, UTC+3)', () => {
  // Beklenen seri değerler Python'da bağımsız hesaplandı: (tarih − 30.12.1899) gün cinsinden.
  it('23.11.2026 14:05:30 (Türkiye) = 46349,58715277778', () => {
    const ms = Date.UTC(2026, 10, 23, 11, 5, 30); // UTC 11:05:30 = Türkiye 14:05:30
    expect(excelSerialTR(ms)).toBeCloseTo(46349.58715277778, 9);
  });

  it('Türkiye gece yarısı tam sayıdır: 01.01.2026 00:00 (Türkiye) = 46023', () => {
    expect(excelSerialTR(Date.UTC(2025, 11, 31, 21, 0, 0))).toBe(46023);
  });

  it('tarih hücresi sayısaldır (metin değil) ve tarih biçimli stil (s="2") taşır', () => {
    const xml = cellXml(dateCell(Date.UTC(2025, 11, 31, 21, 0, 0)), 'A2');
    expect(xml).toBe('<c r="A2" s="2"><v>46023</v></c>');
    expect(xml).not.toContain('inlineStr');
  });

  it('geçersiz zaman boş hücre olur', () => {
    expect(dateCell(null)).toBeNull();
    expect(dateCell(NaN)).toBeNull();
    expect(cellXml(dateCell(undefined), 'A1')).toBe('');
  });

  it('styles.xml: özel biçim 164 = "dd.mm.yyyy hh:mm:ss" ve 3. hücre biçimi (s="2") bu biçimi kullanır', () => {
    const { files } = readWorkbook(buildXlsx([{ name: 'S', rows: [[dateCell(0)]] }]));
    const styles = files.get('xl/styles.xml');
    expect(DATE_FORMAT).toBe('dd.mm.yyyy hh:mm:ss');
    expect(styles).toContain('<numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy hh:mm:ss"/></numFmts>');
    const xfs = [.../<cellXfs count="3">(.*?)<\/cellXfs>/.exec(styles)[1].matchAll(/<xf [^>]*\/>/g)].map((m) => m[0]);
    expect(xfs).toHaveLength(3);
    expect(xfs[2]).toContain('numFmtId="164"');
    expect(xfs[2]).toContain('applyNumberFormat="1"');
    // numFmts, fonts'tan önce gelmeli (OOXML öğe sırası; yoksa Excel onarım ister).
    expect(styles.indexOf('<numFmts')).toBeLessThan(styles.indexOf('<fonts'));
  });
});
