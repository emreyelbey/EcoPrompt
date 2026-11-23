// Sayı biçimlendirme yardımcıları: sayıları Türkçe yazım kuralıyla metne çevirir
// (ondalık ayırıcı virgül, binlik ayırıcı nokta: 1.234,50).
// Kaynak: reference/canvas-prototip.tsx (fmtNum, fmtSmart, formatPValue).

/**
 * Sayıyı sabit ondalık basamakla Türkçe biçimde yazar.
 * Geçersiz değer (NaN, Infinity, metin) gelirse '0' döner.
 * Örnek: fmtNum(1234.5) → '1.234,50'
 */
export function fmtNum(value, decimals = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Sayının büyüklüğüne göre ondalık basamak sayısını kendisi seçer.
 * Çok küçük değerler (ör. 0,0042 Wh) sıfır görünmesin diye daha fazla basamak gösterilir.
 */
export function fmtSmart(value) {
  const num = Number(value) || 0;
  if (num === 0) return '0';
  if (num < 0.01) return fmtNum(num, 4);
  if (num < 1) return fmtNum(num, 3);
  if (num < 100) return fmtNum(num, 2);
  return fmtNum(num, 1);
}

/**
 * İstatistik p değerini yazar. 0,001'den küçük değerler SPSS'teki gibi '< 0,001' gösterilir.
 * Değer yoksa (test hesaplanamadıysa) '—' döner.
 */
export function formatPValue(p) {
  if (p === null || p === undefined || !Number.isFinite(p)) return '—';
  if (p < 0.001) return '< 0,001';
  return fmtNum(p, 4);
}
