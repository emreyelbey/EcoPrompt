// interactions koleksiyonu: öğrenci sohbet kayıtlarını okuma ve yazma (yalnızca sunucu).
// Öğrenci yalnızca KENDİ kodunun ve AKTİF aşamanın kayıtlarını alabilir (proje rehberi Bölüm 3).

// Çok turlu bağlam için yapay zekaya gönderilen en fazla geçmiş etkileşim sayısı.
export const HISTORY_LIMIT = 12;

// Firestore zaman damgasını (veya testlerdeki sayıyı) milisaniyeye çevirir.
function toMillis(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return 0; // Zaman yoksa en başa sıralanır.
}

/**
 * Bir kodun belirli bir aşamadaki gerçek (örnek olmayan) kayıtlarını eskiden yeniye döner.
 * Sorguda yalnızca iki eşitlik filtresi var; Firestore bunun için ek indeks istemez.
 * Sıralama bellekte yapılır (bir öğrencinin bir aşamadaki kayıt sayısı küçüktür).
 * @returns {Promise<{ id: string, data: object }[]>}
 */
export async function getOwnInteractions(db, code, phase) {
  const snap = await db.collection('interactions').where('code', '==', code).where('phase', '==', phase).get();

  return snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() }))
    .filter((item) => item.data.isSample !== true)
    .sort((a, b) => toMillis(a.data.createdAt) - toMillis(b.data.createdAt));
}

/**
 * Yapay zekaya bağlam olarak verilecek son HISTORY_LIMIT etkileşim (yalnızca istem ve yanıt).
 */
export async function getHistory(db, code, phase) {
  const all = await getOwnInteractions(db, code, phase);
  return all.slice(-HISTORY_LIMIT).map(({ data }) => ({ prompt: data.prompt, response: data.response }));
}

/**
 * Yeni etkileşim kaydını yazar ve belge kimliğini döner.
 * Hata olursa hata fırlatır; çağıran taraf öğrenciye hata gösterir (sessiz veri kaybı yok).
 */
export async function saveInteraction(db, record) {
  const ref = db.collection('interactions').doc(); // Otomatik kimlik
  await ref.set(record);
  return ref.id;
}

/**
 * Tarayıcıya gönderilecek mesaj. YALNIZCA bu alanlar çıkar:
 *   id, modelId, prompt, response, createdAt
 * Çevresel ölçümler (kör deney) ve engineVersion (gerçek model sürümü; marka yasağı)
 * tarayıcıya ASLA gitmez. Yeni alan eklemek bilinçli bir karar olmalı; test bunu denetler.
 */
export function toClientMessage(id, data, createdAtMs) {
  const ms = createdAtMs ?? toMillis(data.createdAt);
  return {
    id,
    modelId: data.modelId,
    prompt: data.prompt,
    response: data.response,
    createdAt: ms ? new Date(ms).toISOString() : null,
  };
}
