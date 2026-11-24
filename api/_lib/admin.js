// Yönetici paneli için veritabanı işlemleri (yalnızca sunucu).
// - Kayıt listesi: yalnızca ADMIN_LIST_FIELDS alanları okunur. Uzun yanıt metni (response) listede yoktur;
//   satıra tıklanınca ayrı istekle gelir. engineVersion (gerçek model sürümü) hiçbir zaman tarayıcıya çıkmaz.
// - Artımlı okuma: panel her yoklamada yalnızca son okumadan sonra gelen kayıtları ister. Firestore her
//   okunan belge için kota harcar; tüm koleksiyonu tekrar tekrar okumak günlük kotayı bitirir.
// - Temizleme: interactions, logins, rateLimits koleksiyonları 500'lük gruplar hâlinde silinir.
import { timestampFromMillis, documentIdField } from './firebase.js';

// Bir sayfada en fazla kaç kayıt döner. İstem en fazla 4000 karakter olduğundan en kötü durumda bile
// yanıt Vercel'in 4,5 MB sınırının altında kalır.
export const PAGE_SIZE = 500;

// Artımlı okumada geriye doğru bırakılan pay (milisaniye). Aynı anda yazılan kayıtlar kaçmasın diye
// son görülen zamandan 5 sn öncesinden başlanır; tekrar gelen kayıtları tarayıcı kimliğe göre ayıklar.
export const OVERLAP_MS = 5000;

// Temizlenen koleksiyonlar. settings/experiment (aktif aşama) BİLEREK listede yoktur.
export const CLEARABLE_COLLECTIONS = ['interactions', 'logins', 'rateLimits'];

// Toplu silmede bir seferde silinen belge sayısı (Firestore toplu yazma sınırı 500).
const DELETE_BATCH_SIZE = 500;

// Yönetici listesine çıkan alanlar (açık liste). Bilerek DIŞARIDA: response (ayrı istekle gelir),
// engineVersion (marka yasağı; hiçbir görünümde çıkmaz).
export const ADMIN_LIST_FIELDS = [
  'code',
  'group',
  'phase',
  'modelId',
  'prompt',
  'inputTokens',
  'outputTokens',
  'weightedTokens',
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
  'costUsd',
  'savingsPct',
  'isSample',
  'configHash', // ölçüm koşullarının özeti (Dilim 8; eski kayıtlarda null)
  'createdAt',
];

// Giriş kayıtlarından panele çıkan alanlar.
const LOGIN_FIELDS = ['code', 'group', 'phase', 'firstLoginAt', 'lastLoginAt', 'loginCount', 'sessionCount'];

// Firestore zaman damgasını (veya testlerdeki sayıyı) milisaniyeye çevirir. Yoksa null.
export function toMillis(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return null;
}

// Liste satırı: yalnızca ADMIN_LIST_FIELDS; zaman milisaniye sayısı olur.
export function toAdminListItem(id, data) {
  const item = { id };
  for (const field of ADMIN_LIST_FIELDS) {
    item[field] = data[field] ?? null;
  }
  item.createdAt = toMillis(data.createdAt);
  item.isSample = data.isSample === true;
  return item;
}

// Kayıt detayı: liste alanları + tam yanıt metni. engineVersion yine yok.
export function toAdminDetail(id, data) {
  return { ...toAdminListItem(id, data), response: data.response ?? '' };
}

// Giriş kaydı satırı.
export function toAdminLogin(id, data) {
  const item = { id };
  for (const field of LOGIN_FIELDS) {
    item[field] = data[field] ?? null;
  }
  item.firstLoginAt = toMillis(data.firstLoginAt);
  item.lastLoginAt = toMillis(data.lastLoginAt);
  return item;
}

/**
 * Etkileşim kayıtlarını oluşturulma zamanına göre sıralı, sayfa sayfa okur.
 * @param {object} options
 * @param {number} [options.since]  Bu zamandan (ms) itibaren gelenler. Verilmezse baştan.
 * @param {{ t: number, id: string }} [options.after]  Önceki sayfanın son kaydı (sayfalama imleci).
 * @returns {Promise<{ items: object[], hasMore: boolean, next: { t: number, id: string } | null }>}
 */
export async function listInteractions(db, { since, after } = {}) {
  let query = db.collection('interactions');
  if (Number.isFinite(since)) {
    query = query.where('createdAt', '>=', timestampFromMillis(since));
  }
  // Önce zamana, eşitlikte belge kimliğine göre sıralanır; böylece sayfalar arasında kayıt kaçmaz.
  query = query.orderBy('createdAt').orderBy(documentIdField());
  if (after) {
    query = query.startAfter(timestampFromMillis(after.t), after.id);
  }
  const snap = await query.select(...ADMIN_LIST_FIELDS).limit(PAGE_SIZE).get();

  const items = snap.docs.map((doc) => toAdminListItem(doc.id, doc.data()));
  const hasMore = items.length === PAGE_SIZE;
  const last = items[items.length - 1];
  return { items, hasMore, next: hasMore ? { t: last.createdAt, id: last.id } : null };
}

/**
 * Giriş kayıtlarını okur. since verilirse yalnızca o zamandan sonra değişenler (en fazla 120 belge).
 */
export async function listLogins(db, { since } = {}) {
  let query = db.collection('logins');
  if (Number.isFinite(since)) {
    query = query.where('lastLoginAt', '>=', timestampFromMillis(since));
  }
  const snap = await query.get();
  return snap.docs.map((doc) => toAdminLogin(doc.id, doc.data()));
}

// Bir koleksiyondaki belge sayısı. count() belgeleri indirmez (1.000 belge başına 1 okuma).
export async function countCollection(db, name) {
  const snap = await db.collection(name).count().get();
  return snap.data().count;
}

// Bir koleksiyonun tüm belgelerini 500'lük gruplar hâlinde siler; silinen sayıyı döner.
export async function deleteCollection(db, name) {
  let deleted = 0;
  // Her turda en fazla 500 belgenin yalnızca kimliği okunur (select() alan istemez) ve silinir.
  for (;;) {
    const snap = await db.collection(name).select().limit(DELETE_BATCH_SIZE).get();
    if (snap.docs.length === 0) break;
    const batch = db.batch();
    for (const doc of snap.docs) batch.delete(doc.ref);
    await batch.commit();
    deleted += snap.docs.length;
    if (snap.docs.length < DELETE_BATCH_SIZE) break;
  }
  return deleted;
}

// Belge kimliği güvenli mi? (boş değil, "/" içermiyor, makul uzunlukta)
export function isValidDocId(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && !id.includes('/');
}
