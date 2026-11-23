// Firestore bağlantısı (yalnızca sunucu). firebase-admin kütüphanesini bir kez başlatır.
// Kimlik bilgisi FIREBASE_SERVICE_ACCOUNT ortam değişkenindeki JSON metninden okunur.
// Admin SDK güvenlik kurallarını atlar; bu yüzden bu dosya asla tarayıcıya gitmez.
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, FieldPath, Timestamp } from 'firebase-admin/firestore';

// Kullanıcıya gösterilecek genel hata. Ayrıntı (ve gizli bilgi) asla dışarı sızmaz.
const SETUP_ERROR = 'Sunucu veritabanı ayarları eksik veya hatalı.';

// Servis hesabında bulunması gereken alanlar.
const REQUIRED_FIELDS = ['project_id', 'client_email', 'private_key'];

// Ortam değişkenindeki metni çözümler. Saf fonksiyondur (test edilebilir).
// Dönüş: { ok: true, account } veya { ok: false, reason }.
// ÖNEMLİ: `reason` değerin hiçbir parçasını içermez; yalnızca uzunluk, konum, alan adları.
// (JSON.parse'ın kendi hata mesajı girdiden parça içerebildiği için olduğu gibi kullanılmaz.)
export function parseServiceAccount(raw) {
  if (raw === undefined || raw === '') {
    return { ok: false, reason: 'FIREBASE_SERVICE_ACCOUNT tanımlı değil veya boş.' };
  }

  // Yapısal ipuçları: uzunluk ve gerçek satır sonu sayısı (çok satırlı değer sık bir hatadır).
  const newlines = (raw.match(/\n/g) || []).length;
  const shape = `uzunluk ${raw.length}, gerçek satır sonu ${newlines}`;

  let account;
  try {
    account = JSON.parse(raw);
  } catch (err) {
    const match = /position (\d+)/.exec(err.message);
    const where = match ? `konum ${match[1]}` : 'konum bilinmiyor (metin erken bitiyor olabilir)';
    return { ok: false, reason: `JSON ayrıştırılamadı (${where}; ${shape}).` };
  }

  if (!account || typeof account !== 'object' || Array.isArray(account)) {
    return { ok: false, reason: `JSON bir nesne değil (tür: ${typeof account}; ${shape}).` };
  }

  const missing = REQUIRED_FIELDS.filter((f) => typeof account[f] !== 'string' || account[f] === '');
  if (missing.length > 0) {
    return { ok: false, reason: `Eksik alanlar: ${missing.join(', ')}.` };
  }
  if (!account.private_key.includes('BEGIN PRIVATE KEY')) {
    return { ok: false, reason: 'private_key alanı geçerli bir anahtar biçiminde değil.' };
  }

  return { ok: true, account };
}

// Firestore nesnesini döner. Sunucusuz fonksiyon "sıcak" kalırsa aynı bağlantı yeniden kullanılır.
export function getDb() {
  if (getApps().length === 0) {
    const parsed = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!parsed.ok) {
      // Sebep yalnızca sunucu loguna yazılır; değer içermez.
      console.error('Firebase ayar hatası:', parsed.reason);
      throw new Error(SETUP_ERROR);
    }
    try {
      initializeApp({ credential: cert(parsed.account) });
    } catch (err) {
      // firebase-admin'in kendi mesajları sabit metinlerdir, anahtarın içeriğini yazmaz.
      console.error('Firebase başlatma hatası:', err.code || '', err.message);
      throw new Error(SETUP_ERROR);
    }
  }
  return getFirestore();
}

// Sunucu saati (tarayıcı saatine güvenilmez).
export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

// Bir sayısal alanı veritabanında atomik olarak artırır.
export function increment(n) {
  return FieldValue.increment(n);
}

// Milisaniyeyi Firestore zaman damgasına çevirir (zaman aralığı sorguları için).
export function timestampFromMillis(ms) {
  return Timestamp.fromMillis(ms);
}

// Sorgularda belge kimliğine göre sıralamak için özel alan yolu.
export function documentIdField() {
  return FieldPath.documentId();
}
