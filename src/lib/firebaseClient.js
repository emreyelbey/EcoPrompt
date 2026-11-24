// Tarayıcıdaki Firestore bağlantısı. TEK AMACI settings/experiment belgesini okumaktır.
// Güvenlik kuralları bu belge dışındaki her şeyi tarayıcıya kapatır (bkz. firestore.rules);
// bu dosyada yazma kodu yoktur. Ayarlar VITE_FIREBASE_* değişkenlerinden gelir (gizli değildir).
// Ayarlar eksikse bağlantı kurulmaz: uygulama çalışmaya devam eder, aşama bilgisi API yanıtlarından gelir.
// Firebase paketleri büyük olduğu için dinamik import() ile, yalnızca gerektiğinde (öğrenci ekranı
// açılınca ve ayar varsa) ayrı bir parçadan indirilir. Giriş ekranı bu kodu beklemez.

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

let dbPromise; // Tek bağlantı: ikinci çağrı aynı sözü (Promise) alır.

// Firestore nesnesini sözle (Promise) döner; ayar yoksa söz null ile sonuçlanır.
export function loadClientDb() {
  if (dbPromise) return dbPromise;
  const config = readFirebaseConfig(import.meta.env);
  if (!config) {
    console.warn('Canlı aşama dinleyicisi kapalı: istemci veritabanı ayarları eksik.');
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = Promise.all([import('firebase/app'), import('firebase/firestore')]).then(
    ([{ initializeApp }, { getFirestore }]) => getFirestore(initializeApp(config))
  );
  // İndirme başarısız olursa (ör. ağ kesildi) bir sonraki çağrı yeniden denesin.
  dbPromise.catch(() => {
    dbPromise = undefined;
  });
  return dbPromise;
}
