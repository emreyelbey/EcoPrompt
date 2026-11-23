// Tarayıcıdaki Firestore bağlantısı. TEK AMACI settings/experiment belgesini okumaktır.
// Güvenlik kuralları bu belge dışındaki her şeyi tarayıcıya kapatır (bkz. firestore.rules);
// bu dosyada yazma kodu yoktur. Ayarlar VITE_FIREBASE_* değişkenlerinden gelir (gizli değildir).
// Ayarlar eksikse bağlantı kurulmaz: uygulama çalışmaya devam eder, aşama bilgisi API yanıtlarından gelir.
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Ortam değişkenlerinden istemci ayarını oluşturur. Biri bile eksikse null döner. Saf fonksiyondur.
export function readFirebaseConfig(env) {
  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  return Object.values(config).every((v) => typeof v === 'string' && v !== '') ? config : null;
}

let cachedDb; // undefined: henüz denenmedi, null: ayar yok

// Firestore nesnesini döner; ayar yoksa null.
export function getClientDb() {
  if (cachedDb !== undefined) return cachedDb;
  const config = readFirebaseConfig(import.meta.env);
  if (!config) {
    console.warn('Canlı aşama dinleyicisi kapalı: istemci veritabanı ayarları eksik.');
    cachedDb = null;
    return null;
  }
  cachedDb = getFirestore(initializeApp(config));
  return cachedDb;
}
