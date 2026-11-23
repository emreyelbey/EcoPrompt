// CSV dışa aktarma testleri (src/lib/csv.js): Türkçe Excel uyumu ve güvenlik.
import { describe, it, expect } from 'vitest';
import { csvCell, csvNumber, toCsv, recordsCsv, codesCsv, formatCsvDate } from '../src/lib/csv.js';
import { codeRows } from '../src/lib/adminSummary.js';

describe('csvCell', () => {
  it('ondalıkları virgülle yazar, tam hassasiyeti korur', () => {
    expect(csvCell(0.045)).toBe('0,045');
    expect(csvCell(-1.5)).toBe('-1,5'); // sayılar formül korumasından etkilenmez
    expect(csvCell(12)).toBe('12');
  });

  it('boş değerler boş hücre', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(NaN)).toBe('');
  });

  it('noktalı virgül, tırnak ve satır sonu içeren metni tırnak içine alır', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('O "dedi"')).toBe('"O ""dedi"""');
    expect(csvCell('satır1\nsatır2')).toBe('"satır1\nsatır2"');
  });

  it.each(['=1+1', '+90 555', '-2+3', '@SUM(A1)'])('formül enjeksiyonu koruması: %s', (text) => {
    expect(csvCell(text).startsWith("'")).toBe(true);
  });

  it('Türkçe harfler olduğu gibi kalır', () => {
    expect(csvCell('Akıl Yürütme Modeli — ğüşiöç İ')).toBe('Akıl Yürütme Modeli — ğüşiöç İ');
  });
});

describe('csvNumber: kayan nokta gürültüsü yuvarlanır', () => {
  it.each([
    [0.016451999999999998, '0,016452'],
    [0.00004990000000000001, '0,0000499'],
    [0.25398000000000004, '0,25398'],
  ])('%s → %s (gerçek ortamda görülen değerler)', (value, expected) => {
    expect(csvNumber(value)).toBe(expected);
  });

  it('tam sayılar yuvarlanmaz', () => {
    expect(csvNumber(1234567)).toBe('1234567');
    expect(csvNumber(0)).toBe('0');
    expect(csvNumber(91)).toBe('91');
  });

  it('çok küçük değerde bilimsel gösterim çıkmaz', () => {
    expect(csvNumber(4.99e-7)).toBe('0,000000499');
    expect(csvNumber(1.23456789e-9)).toBe('0,00000000123457');
  });

  it('negatif ondalık ve büyük ondalıkta binlik ayırıcı yok', () => {
    expect(csvNumber(-0.25398000000000004)).toBe('-0,25398');
    expect(csvNumber(12345.678912)).toBe('12345,7');
  });

  it('geçersiz değer boş', () => {
    expect(csvNumber(Infinity)).toBe('');
  });
});

// Testlerde CSV'yi geri okumak için küçük ayrıştırıcı (ayırıcı ';', tırnak içinde ';' ve satır sonu
// bölmez, "" bir tırnak demektir). BOM önceden çıkarılmış olmalı.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ';') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && text[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

describe('recordsCsv: istemdeki özel karakterler dosyayı bozmaz', () => {
  it('; " ve satır sonu içeren istem tek hücrede birebir geri okunur', () => {
    const prompt = 'Soru; "alıntı" burada\nikinci satır\r\nüçüncü satır';
    const csv = recordsCsv([
      { id: 'a', createdAt: 0, phase: 'pretest', code: 'K001', group: 'Kontrol', modelId: 'light', energyAvg: 0.016451999999999998, prompt },
      { id: 'b', createdAt: 0, phase: 'pretest', code: 'K002', group: 'Kontrol', modelId: 'light', prompt: 'düz soru' },
    ]);
    const rows = parseCsv(csv.slice(1));
    expect(rows).toHaveLength(3); // başlık + 2 kayıt; istemdeki satır sonları yeni satır açmadı
    expect(rows[0]).toHaveLength(22);
    for (const row of rows) expect(row).toHaveLength(22);
    expect(rows[1][21]).toBe(prompt);
    expect(rows[1][10]).toBe('0,016452'); // Enerji Ort (Wh), yuvarlanmış
    expect(rows[2][21]).toBe('düz soru');
  });
});

describe('toCsv', () => {
  it('UTF-8 BOM ile başlar, ayırıcı ; ve satır sonu CRLF', () => {
    const csv = toCsv(['A', 'B'], [[1.5, 'x'], [2, 'y']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('A;B\r\n1,5;x\r\n2;y');
  });
});

describe('recordsCsv', () => {
  const rec = {
    id: 'a',
    createdAt: new Date(2026, 10, 23, 14, 5, 33).getTime(),
    phase: 'posttest',
    code: 'D001',
    group: 'Deney',
    modelId: 'reasoning',
    inputTokens: 100,
    outputTokens: 50,
    weightedTokens: 250,
    tokenSource: 'gerçek',
    energyMin: 0.35,
    energyAvg: 0.525,
    energyMax: 0.75,
    waterAvg: 0.525,
    co2Avg: 0.22575,
    costUsd: 0.00105,
    savingsPct: 91,
    isSample: false,
    prompt: 'Soru; ikinci kısım',
    engineVersion: 'motor-surum-1',
  };
  const csv = recordsCsv([rec]);
  const [header, row] = csv.slice(1).split('\r\n');

  it('Türkçe başlıklar ve Türkçe değerler', () => {
    expect(header.split(';')[0]).toBe('Tarih');
    expect(header.split(';')).toContain('Enerji Ort (Wh)');
    expect(row).toContain('23.11.2026 14:05:33;Son Test;D001;Deney;Akıl Yürütme Modeli;100;50;250;gerçek;0,35;0,525');
    expect(row.endsWith('Hayır;"Soru; ikinci kısım"')).toBe(true);
  });

  it('engineVersion CSV dosyasına girmez (marka yasağı)', () => {
    expect(csv).not.toContain('motor-surum');
    expect(csv.toLowerCase()).not.toContain('engine');
  });
});

describe('codesCsv', () => {
  it('60 satır + başlık; giriş sayısı yoksa boş hücre', () => {
    const csv = codesCsv(codeRows([], [{ code: 'K001', phase: 'pretest', firstLoginAt: null, lastLoginAt: null }]));
    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(61);
    expect(lines[1]).toBe('K001;Kontrol;Asıl;Evet;;;0;Hayır;;;0;0;');
  });
});

describe('formatCsvDate', () => {
  it('zaman yoksa boş', () => {
    expect(formatCsvDate(null)).toBe('');
  });
});
