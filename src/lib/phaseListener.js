// settings/experiment belgesini gerçek zamanlı ve SALT OKUNUR dinler (proje rehberi Bölüm 3'teki tek istisna).
// Yönetici aşamayı değiştirdiğinde açık öğrenci ekranları birkaç saniye içinde haberdar olur.
// Bu dinleyici YALNIZCA HIZ içindir: okul ağı veya reklam engelleyici onu durdurabilir. Bu yüzden ekran
// aşamayı ayrıca /api/messages ve /api/chat yanıtlarından da öğrenir (doğru kaynak sunucudur).
//
// Firebase kodu ayrı bir parçadan dinamik olarak indirilir. Yine de subscribeToPhase durdurma
// fonksiyonunu HEMEN (eşzamanlı) döner; böylece React'in useEffect temizliği aynen çalışır.
// İndirme bitmeden durdurulursa dinleme hiç başlamaz.
import { loadClientDb } from './firebaseClient.js';
import { normalizePhase } from './phases.js';

// onPhase(aşama) her değişiklikte çağrılır. Dönen fonksiyon dinlemeyi durdurur.
// `db` testlerde verilebilir: null ise (ayar yok) hiçbir şey dinlenmez; verilmezse bağlantı yüklenir.
export function subscribeToPhase(onPhase, db) {
  let stopped = false; // Durdurma fonksiyonu çağrıldı mı?
  let unsubscribe = null; // Dinleme başladıysa Firestore'un durdurma fonksiyonu

  const dbReady = db === undefined ? loadClientDb() : Promise.resolve(db);

  dbReady
    .then(async (readyDb) => {
      if (stopped || !readyDb) return;
      const { doc, onSnapshot } = await import('firebase/firestore');
      if (stopped) return; // İndirme sırasında ekran kapandı.
      unsubscribe = onSnapshot(
        doc(readyDb, 'settings', 'experiment'),
        (snap) => onPhase(normalizePhase(snap.exists() ? snap.data().activePhase : undefined)),
        // Hata öğrenciye gösterilmez; aşama API yanıtlarından öğrenilmeye devam eder.
        (err) => console.warn('Canlı aşama dinleyicisi durdu:', err.code || err.message)
      );
    })
    // Parça indirilemezse de öğrenciye hata gösterilmez (aynı gerekçe).
    .catch((err) => console.warn('Canlı aşama dinleyicisi başlatılamadı:', err?.message));

  return () => {
    stopped = true;
    if (unsubscribe) unsubscribe();
  };
}
