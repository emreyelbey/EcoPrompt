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
 * Bir kodun belirli bir aşamadaki gerçek (örnek olmayan) kayıtlarının HEPSİNİ eskiden yeniye döner.
 * Ekrandaki mesaj geçmişi (/api/messages) için kullanılır; geçmiş kısaltılmaz.
 * Sayfa yüklenince bir kez çağrılır (her istemde değil).
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
 * Yapay zekaya bağlam olarak verilecek son HISTORY_LIMIT etkileşim (yalnızca istem ve yanıt), eskiden yeniye.
 * Her istemde çağrılır. Firestore her dönen belgeyi bir okuma sayar (Spark: günlük 50.000),
 * bu yüzden bütün kayıtlar değil yalnızca son HISTORY_LIMIT kayıt okunur:
 * en yeniden eskiye sıralayıp ilk 12'yi alır, sonra sırayı ters çeviririz.
 * Bu sorgu konsolda tanımlı bileşik indeksi gerektirir (firestore.indexes.json):
 *   code ↑, phase ↑, isSample ↑, createdAt ↓
 * isSample filtresi sorgudadır; böylece örnek kayıtlar araya girse bile bağlam 12 gerçek kayıttır.
 */
export async function getHistory(db, code, phase) {
  const snap = await db
    .collection('interactions')
    .where('code', '==', code)
    .where('phase', '==', phase)
    .where('isSample', '==', false)
    .orderBy('createdAt', 'desc') // En yeni kayıt en başta
    .limit(HISTORY_LIMIT)
    .select('prompt', 'response') // Okuma sayısını değiştirmez; yalnızca gereken alanlar gelir
    .get();

  // Sorgu en yeniden eskiye döner; yapay zekaya eskiden yeniye verilmeli.
  return snap.docs
    .map((doc) => doc.data())
    .reverse()
    .map((data) => ({ prompt: data.prompt, response: data.response }));
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
 * Sade görünümde (Kontrol grubu ve Ön Test'teki Deney grubu) çevresel ölçümler tarayıcıya ASLA gitmez
 * (kör deney). engineVersion (gerçek model sürümü; marka yasağı) hiçbir görünümde gitmez.
 * Yeni alan eklemek bilinçli bir karar olmalı; test bunu denetler.
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

/**
 * EkoToken görünümündeki öğrenciye (YALNIZCA Deney grubu + Son Test) eklenen çevresel alanlar.
 * Açık liste: burada olmayan hiçbir alan tarayıcıya çıkmaz.
 * Bilerek dışarıda bırakılanlar: costUsd (gerçek fatura değil, öğrenciye gösterilmiyor),
 * weightedTokens, engineVersion (marka yasağı), code, group, phase, isSample.
 */
export const ECO_CLIENT_FIELDS = [
  'inputTokens',
  'outputTokens',
  'tokenSource',
  'energyMin',
  'energyAvg',
  'energyMax',
  'waterMin',
  'waterAvg',
  'waterMax',
  'co2Min',
  'co2Avg',
  'co2Max',
  'savingsPct',
];

/**
 * EkoToken görünümü için mesaj: sade mesaj + `eco` nesnesi (yalnızca ECO_CLIENT_FIELDS).
 */
export function toEcoClientMessage(id, data, createdAtMs) {
  const eco = {};
  for (const field of ECO_CLIENT_FIELDS) {
    eco[field] = data[field] ?? null; // Eksik alan null olur; tarayıcı bunu güvenle gösterir.
  }
  return { ...toClientMessage(id, data, createdAtMs), eco };
}

/**
 * Uç noktaların kullandığı tek giriş: görünüme göre mesaj biçimini seçer.
 * view, sunucuda getStudentView(grup, aşama) ile hesaplanır; tarayıcıdan gelmez.
 *   'ekotoken' → çevresel alanlarla, diğer her durum → sade.
 */
export function toStudentMessage(id, data, view, createdAtMs) {
  if (view === 'ekotoken') return toEcoClientMessage(id, data, createdAtMs);
  return toClientMessage(id, data, createdAtMs);
}
