// Sıfır bağımlılıklı, yalnızca YAZAN küçük Excel (.xlsx) üreticisi.
// Bir .xlsx dosyası aslında içinde birkaç XML dosyası bulunan bir ZIP arşividir. Bu dosya o XML'leri
// metin olarak üretir ve sıkıştırmasız (STORE) bir ZIP'e koyar. Dış paket kullanılmaz (tedarik zinciri
// riski yok); dosya okunmadığı için xlsx kütüphanelerinin bilinen okuma açıkları da burada yoktur.
// Kurallar:
// - Sayılar gerçek sayısal hücre olarak yazılır (<c><v>…</v></c>): Excel ve SPSS bunlarla hesap yapabilir.
//   Geçersiz sayı (NaN, Infinity) ve null/undefined boş hücre olur.
// - Metinler "inlineStr" hücresidir: = ile başlasa bile formül olarak ÇALIŞMAZ (formül enjeksiyonu yok).
// - Excel bir hücrede en fazla 32.767 karakter kabul eder; daha uzun metin kırpılıp "…[kırpıldı]" eklenir.
// - XML'de yasak olan kontrol karakterleri (ör. \u0000) silinir; yoksa Excel dosyayı "bozuk" sayar.
// - Tarihler gerçek Excel tarih hücresidir: seri sayı + "dd.mm.yyyy hh:mm:ss" biçimi, Türkiye saati (UTC+3).
//   Böylece Excel'de doğru sıralanır ve filtrelenir. Kullanım: hücreye dateCell(milisaniye) yazılır.
// Kaynak: reference/canvas-prototip.tsx (buildFallbackXlsxBlob, createZipBlob, crc32).

export const MAX_CELL_CHARS = 32767;
export const TRUNCATION_SUFFIX = '…[kırpıldı]';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/* ---------------------------------------------------------------------------
 * 1. Metin hazırlama
 * ------------------------------------------------------------------------- */

// XML 1.0'da izin verilmeyen karakterler: sekme/satır sonu dışındaki kontrol karakterleri ve
// eşi olmayan "vekil" (surrogate) karakterler.
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/**
 * Hücreye yazılacak metni hazırlar: yasak karakterleri siler, 32.767 sınırını aşarsa kırpar.
 */
export function prepareCellText(value) {
  let text = String(value).replace(INVALID_XML_CHARS, '');
  if (text.length > MAX_CELL_CHARS) {
    let cut = MAX_CELL_CHARS - TRUNCATION_SUFFIX.length;
    // Emoji gibi iki parçalı karakterin ortasından kesme.
    const code = text.charCodeAt(cut - 1);
    if (code >= 0xd800 && code <= 0xdbff) cut -= 1;
    text = text.slice(0, cut) + TRUNCATION_SUFFIX;
  }
  return text;
}

// XML'de özel anlamı olan karakterleri kaçışlar.
export function xmlEscape(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Sütun numarası → harf: 0 → A, 25 → Z, 26 → AA.
export function columnLetter(index) {
  let letter = '';
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

/* ---------------------------------------------------------------------------
 * 1b. Tarih
 * ------------------------------------------------------------------------- */

// Türkiye 2016'dan beri yıl boyu UTC+3 kullanır (yaz/kış saati yok).
export const TURKEY_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Excel'in tarih sayacı 30.12.1899'dan başlar; 01.01.1970 (JavaScript zamanının başlangıcı) = 25569. gün.
const EXCEL_EPOCH_OFFSET_DAYS = 25569;
export const DATE_FORMAT = 'dd.mm.yyyy hh:mm:ss';

/**
 * JavaScript zamanını (UTC milisaniye) Türkiye saatine göre Excel seri sayısına çevirir.
 * Seri sayının tam kısmı gün, ondalık kısmı günün kesridir (ör. 0,5 = öğlen 12:00).
 */
export function excelSerialTR(ms) {
  return (ms + TURKEY_UTC_OFFSET_MS) / MS_PER_DAY + EXCEL_EPOCH_OFFSET_DAYS;
}

/** Tarih hücresi değeri. Geçersiz zamanda null (boş hücre). */
export function dateCell(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) ? { date: ms } : null;
}

/* ---------------------------------------------------------------------------
 * 2. Sayfa XML'i
 * ------------------------------------------------------------------------- */

// Tek bir hücrenin XML'i. Boş hücre için boş metin döner (hücre hiç yazılmaz).
// Biçimler (styles.xml → cellXfs): 0 = normal, 1 = kalın yazı (başlık satırları), 2 = tarih.
export function cellXml(value, ref, bold = false) {
  const s = bold ? ' s="1"' : '';
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'date' in value) {
    // Tarih: sayısal hücre + tarih biçimi (s="2").
    return `<c r="${ref}" s="2"><v>${excelSerialTR(value.date)}</v></c>`;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    // -0 yerine 0; sayı metne çevrilir (1e-7 gibi bilimsel gösterim Excel'de geçerlidir).
    return `<c r="${ref}"${s}><v>${Object.is(value, -0) ? 0 : value}</v></c>`;
  }
  const text = xmlEscape(prepareCellText(value));
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

/**
 * Bir sayfanın XML'i.
 * @param {object} sheet  { rows: any[][], boldRows?: number[], freezeHeader?: boolean, columnWidths?: number[] }
 */
export function sheetXml(sheet) {
  const bold = new Set(sheet.boldRows || []);

  const rowsXml = sheet.rows
    .map((row, r) => {
      const cells = row.map((value, c) => cellXml(value, `${columnLetter(c)}${r + 1}`, bold.has(r))).join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');

  // İlk satırı (başlıkları) kaydırırken sabit tut.
  const views = sheet.freezeHeader
    ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    : '';

  const cols = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join('')}</cols>`
    : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `${views}${cols}<sheetData>${rowsXml}</sheetData></worksheet>`
  );
}

/* ---------------------------------------------------------------------------
 * 3. ZIP (sıkıştırmasız)
 * ------------------------------------------------------------------------- */

// CRC32: ZIP'in her dosya için istediği hata denetim sayısı.
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Sabit dosya tarihi: 01.01.1980 (ZIP'in en eski tarihi). Aynı girdi hep aynı baytları üretir.
const DOS_DATE = (0 << 9) | (1 << 5) | 1;

/**
 * Dosyaları sıkıştırmasız ZIP arşivine koyar.
 * @param {{ name: string, content: string }[]} files
 * @returns {Uint8Array}
 */
export function createZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    // Yerel dosya başlığı (30 bayt + ad)
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // imza
    lv.setUint16(4, 20, true); // gereken sürüm
    lv.setUint16(6, 0x0800, true); // ad UTF-8
    lv.setUint16(8, 0, true); // yöntem: STORE (sıkıştırma yok)
    lv.setUint16(10, 0, true); // saat
    lv.setUint16(12, DOS_DATE, true); // tarih
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true); // sıkıştırılmış boyut
    lv.setUint32(22, data.length, true); // gerçek boyut
    lv.setUint16(26, name.length, true);
    local.set(name, 30);
    parts.push(local, data);

    // Merkezi dizin kaydı (46 bayt + ad)
    const entry = new Uint8Array(46 + name.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, DOS_DATE, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true); // yerel başlığın arşivdeki yeri
    entry.set(name, 46);
    central.push(entry);

    offset += local.length + data.length;
  }

  // Merkezi dizinin sonu (22 bayt)
  const centralSize = central.reduce((sum, b) => sum + b.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  // Bütün parçaları tek bayt dizisinde birleştir.
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((sum, b) => sum + b.length, 0));
  let pos = 0;
  for (const b of all) {
    out.set(b, pos);
    pos += b.length;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 4. Çalışma kitabı
 * ------------------------------------------------------------------------- */

// Excel sayfa adı kuralları: 1–31 karakter, \ / ? * [ ] : içermez.
function checkSheetName(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 31 || /[\\/?*[\]:]/.test(name)) {
    throw new Error(`Geçersiz sayfa adı: ${name}`);
  }
}

// Biçim tablosu: 0 = normal yazı, 1 = kalın yazı, 2 = tarih (özel sayı biçimi 164).
// 164 ve sonrası Excel'de "özel" biçim numaralarıdır; 0–163 Excel'in kendi biçimlerine ayrılmıştır.
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="${DATE_FORMAT}"/></numFmts>` +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/**
 * Sayfalardan .xlsx dosyasının baytlarını üretir.
 * @param {{ name: string, rows: any[][], boldRows?: number[], freezeHeader?: boolean, columnWidths?: number[] }[]} sheets
 * @returns {Uint8Array}
 */
export function buildXlsx(sheets) {
  sheets.forEach((sheet) => checkSheetName(sheet.name));

  const sheetOverrides = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('');
  const sheetEntries = sheets.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const sheetRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join('');
  const header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

  const files = [
    {
      name: '[Content_Types].xml',
      content:
        `${header}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        `${sheetOverrides}</Types>`,
    },
    {
      name: '_rels/.rels',
      content:
        `${header}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content:
        `${header}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        `${header}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetRels}` +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        '</Relationships>',
    },
    { name: 'xl/styles.xml', content: STYLES_XML },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(sheet) })),
  ];

  return createZip(files);
}

// Baytları dosya olarak indirir (yalnızca tarayıcıda).
export function downloadBytes(filename, bytes, mime = XLSX_MIME) {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
