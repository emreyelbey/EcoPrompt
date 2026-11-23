// "Verileri Temizle" onay metni: hem onay penceresi (tarayıcı) hem /api/admin/clear (sunucu) bunu kullanır.
// Kabul edilen yazımlar yalnızca büyük harfle "SİL" ve "SIL". "SIL" (noktasız I), İngilizce klavyede "İ"
// yazılamadığı için kabul edilir. Küçük harf ("sil", "Sil"), boşluklu veya fazla harfli yazımlar reddedilir.

export const CLEAR_CONFIRM_TEXTS = ['SİL', 'SIL'];

// Gönderilen metin geçerli bir onay mı? Metin değilse false (ör. true, sayı, boş).
export function isClearConfirmed(value) {
  return typeof value === 'string' && CLEAR_CONFIRM_TEXTS.includes(value);
}
