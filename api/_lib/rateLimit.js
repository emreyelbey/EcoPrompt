// Hız sınırı: aynı katılımcı kodu 3 saniyede en fazla 1 istek gönderebilir.
// Sunucusuz ortamda bellek istekler arasında korunmadığı için son istek zamanı Firestore'da tutulur:
// rateLimits/{code} = { lastRequestAt }  (sunucu saatiyle, milisaniye cinsinden sayı)

export const RATE_LIMIT_MS = 3000;

/**
 * Bu kod için yeni bir istek hakkı ister.
 * Transaction kullanılır: "son istek ne zamandı?" okuması ile yeni zamanın yazılması aynı anda olur.
 * Böylece çift tıklamayla gelen iki eşzamanlı istekten yalnızca biri geçer.
 * @returns {Promise<{ ok: true } | { ok: false, waitMs: number }>}
 */
export async function claimRateSlot(db, code, now = Date.now()) {
  const ref = db.collection('rateLimits').doc(code);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const last = snap.exists ? snap.data().lastRequestAt : undefined;

    // Önceki istekten bu yana 3 saniye geçmediyse reddedilir.
    if (typeof last === 'number' && now - last < RATE_LIMIT_MS) {
      return { ok: false, waitMs: RATE_LIMIT_MS - (now - last) };
    }

    tx.set(ref, { lastRequestAt: now });
    return { ok: true };
  });
}
