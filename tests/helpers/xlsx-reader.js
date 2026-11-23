// Test yardımcısı: src/lib/xlsxWriter.js'in ürettiği sıkıştırmasız (STORE) ZIP'i açar.
// Her dosyanın CRC32 değerini Node'un kendi zlib.crc32 fonksiyonuyla (yazıcıdan BAĞIMSIZ) denetler.
// Ayrıca sayfa XML'ini hücrelere ayırır: her hücrenin tipi (sayı / metin) ve değeri.
import { crc32 } from 'node:zlib';

/**
 * ZIP baytlarını açar. Dönüş: Map(dosya adı → metin). CRC veya biçim hatasında hata fırlatır.
 */
export function unzipStore(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const files = new Map();
  let pos = 0;
  while (view.getUint32(pos, true) === 0x04034b50) {
    const method = view.getUint16(pos + 8, true);
    const crc = view.getUint32(pos + 14, true);
    const size = view.getUint32(pos + 18, true);
    const nameLength = view.getUint16(pos + 26, true);
    const extraLength = view.getUint16(pos + 28, true);
    if (method !== 0) throw new Error('Beklenmeyen sıkıştırma yöntemi');
    const name = decoder.decode(bytes.subarray(pos + 30, pos + 30 + nameLength));
    const start = pos + 30 + nameLength + extraLength;
    const data = bytes.subarray(start, start + size);
    if (crc32(data) >>> 0 !== crc) throw new Error(`CRC uyuşmuyor: ${name}`);
    files.set(name, decoder.decode(data));
    pos = start + size;
  }
  // Ardından merkezi dizin gelmeli.
  if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('Merkezi dizin bulunamadı');
  return files;
}

// XML kaçışlarını geri çevirir.
function unescapeXml(text) {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

/**
 * Sayfa XML'ini satırlara ayırır: rows[r][c] = { type: 'number'|'string', value, raw } veya undefined (boş).
 */
export function parseSheet(xml) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row r="(\d+)">(.*?)<\/row>/g)) {
    const r = Number(rowMatch[1]) - 1;
    const cells = [];
    for (const c of rowMatch[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(.*?)<\/c>/g)) {
      let col = 0;
      for (const ch of c[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
      col -= 1;
      const attrs = c[2];
      const inner = c[3];
      if (attrs.includes('t="inlineStr"')) {
        const t = /<t[^>]*>(.*?)<\/t>/s.exec(inner);
        cells[col] = { type: 'string', value: unescapeXml(t ? t[1] : ''), raw: c[0] };
      } else {
        const v = /<v>(.*?)<\/v>/.exec(inner);
        cells[col] = { type: 'number', value: Number(v[1]), raw: c[0] };
      }
    }
    rows[r] = cells;
  }
  return rows;
}

/**
 * .xlsx baytlarından sayfa adı → hücre satırları eşlemesi.
 */
export function readWorkbook(bytes) {
  const files = unzipStore(bytes);
  const workbook = files.get('xl/workbook.xml');
  const names = [...workbook.matchAll(/<sheet name="([^"]+)" sheetId="(\d+)"/g)].map((m) => unescapeXml(m[1]));
  const sheets = {};
  names.forEach((name, i) => {
    sheets[name] = parseSheet(files.get(`xl/worksheets/sheet${i + 1}.xml`));
  });
  return { files, names, sheets };
}
