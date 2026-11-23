// CSV dışa aktarma: Türkçe Excel'de doğrudan doğru açılan dosya üretir.
// - Ayırıcı noktalı virgül (;): Türkçe Excel'de virgül ondalık ayırıcı olduğu için liste ayırıcısı ';'dir.
// - Ondalıklar virgülle yazılır (0,045), böylece Excel sayıyı sayı olarak tanır.
// - Ondalıklı sayılar 6 anlamlı basamağa yuvarlanır (kayan nokta gürültüsü: 0,016451999999999998 → 0,016452).
//   Tam sayılar olduğu gibi kalır. Veritabanındaki ham değer değişmez; yalnızca CSV'ye yazılan metin yuvarlanır.
// - Dosyanın başına UTF-8 BOM eklenir: Excel bunu görünce ğ, ş, İ, ₂ gibi harfleri doğru okur.
// - Satır sonu CRLF (Windows).
// - Formül enjeksiyonu koruması: öğrencinin yazdığı metin = + - @ ile başlıyorsa Excel onu formül sanıp
//   çalıştırabilir. Böyle metinlerin başına ' eklenir.
// Marka yasağı: engineVersion hiçbir CSV sütununda yer almaz.
// Kaynak: reference/canvas-prototip.tsx (downloadCsvFile).
import { MODEL_SCALES } from './footprint.js';
import { PHASE_LABELS } from './adminSummary.js';

const BOM = '﻿';
const SEPARATOR = ';';
const NEWLINE = '\r\n';

// CSV'de ondalıklı sayılar için anlamlı basamak sayısı.
export const CSV_SIGNIFICANT_DIGITS = 6;

/**
 * Sayıyı CSV metnine çevirir.
 * - Tam sayı: olduğu gibi (token sayısı gibi büyük değerler yuvarlanmaz).
 * - Ondalıklı: 6 anlamlı basamak, virgüllü ondalık.
 * - Bilimsel gösterim (4,99e-7) ve binlik ayırıcı kullanılmaz; Türkçe Excel hücreyi sayı olarak okur.
 * Geçersiz değerde (NaN, Infinity) boş metin.
 */
export function csvNumber(value) {
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  // 'en-US' yalnızca ayırıcıyı noktaya sabitlemek için; nokta hemen ardından virgüle çevrilir.
  const text = value.toLocaleString('en-US', {
    maximumSignificantDigits: CSV_SIGNIFICANT_DIGITS,
    useGrouping: false,
  });
  return text.replace('.', ',');
}

// Tek hücreyi CSV biçimine çevirir.
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return csvNumber(value);
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`; // formül sanılmasın
  if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`; // özel karakter varsa tırnak içine
  return text;
}

// Başlıklar + satırlar → CSV metni (BOM dahil).
export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(SEPARATOR));
  return BOM + lines.join(NEWLINE);
}

// Tarihi Türkçe biçimde yazar: 23.11.2026 14:05:33. Zaman yoksa boş.
export function formatCsvDate(ms) {
  if (typeof ms !== 'number') return '';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Bugünün tarihi dosya adı için: 2026-11-23.
export function fileDate(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// Öğrenci Kayıtları CSV'si. Yanıt metni yoktur (liste yanıt taşımaz; Excel'de de yalnızca istem var).
export function recordsCsv(records) {
  const headers = [
    'Tarih',
    'Aşama',
    'Kod',
    'Grup',
    'Model',
    'Girdi Token',
    'Çıktı Token',
    'Ağırlıklı Token',
    'Token Kaynağı',
    'Enerji Min (Wh)',
    'Enerji Ort (Wh)',
    'Enerji Maks (Wh)',
    'Su Min (mL)',
    'Su Ort (mL)',
    'Su Maks (mL)',
    'CO2 Min (g)',
    'CO2 Ort (g)',
    'CO2 Maks (g)',
    'Tahmini Maliyet (USD)',
    'Tasarruf (%)',
    'Örnek Kayıt',
    'İstem',
  ];
  const rows = records.map((r) => [
    formatCsvDate(r.createdAt),
    PHASE_LABELS[r.phase] ?? r.phase,
    r.code,
    r.group,
    MODEL_SCALES[r.modelId]?.name ?? r.modelId,
    r.inputTokens,
    r.outputTokens,
    r.weightedTokens,
    r.tokenSource,
    r.energyMin,
    r.energyAvg,
    r.energyMax,
    r.waterMin,
    r.waterAvg,
    r.waterMax,
    r.co2Min,
    r.co2Avg,
    r.co2Max,
    r.costUsd,
    r.savingsPct,
    r.isSample ? 'Evet' : 'Hayır',
    r.prompt,
  ]);
  return toCsv(headers, rows);
}

// Katılımcı Kodları CSV'si (codeRows çıktısından).
export function codesCsv(rows) {
  const headers = [
    'Kod',
    'Grup',
    'Statü',
    'Ön Test Giriş',
    'Ön Test İlk Giriş',
    'Ön Test Giriş Sayısı',
    'Ön Test İstem',
    'Son Test Giriş',
    'Son Test İlk Giriş',
    'Son Test Giriş Sayısı',
    'Son Test İstem',
    'Toplam İstem',
    'Son Etkinlik',
  ];
  const yesNo = (b) => (b ? 'Evet' : 'Hayır');
  const data = rows.map((r) => [
    r.code,
    r.group,
    r.status,
    yesNo(r.pretest.loggedIn),
    formatCsvDate(r.pretest.firstLoginAt),
    r.pretest.sessionCount,
    r.pretest.prompts,
    yesNo(r.posttest.loggedIn),
    formatCsvDate(r.posttest.firstLoginAt),
    r.posttest.sessionCount,
    r.posttest.prompts,
    r.totalPrompts,
    formatCsvDate(r.lastActivityAt),
  ]);
  return toCsv(headers, data);
}

// CSV metnini dosya olarak indirir (yalnızca tarayıcıda).
export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}
