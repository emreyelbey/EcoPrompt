// settings/experiment belgesini gerçek zamanlı ve SALT OKUNUR dinler (proje rehberi Bölüm 3'teki tek istisna).
// Yönetici aşamayı değiştirdiğinde açık öğrenci ekranları birkaç saniye içinde haberdar olur.
// Bu dinleyici YALNIZCA HIZ içindir: okul ağı veya reklam engelleyici onu durdurabilir. Bu yüzden ekran
// aşamayı ayrıca /api/messages ve /api/chat yanıtlarından da öğrenir (doğru kaynak sunucudur).
import { doc, onSnapshot } from 'firebase/firestore';
import { getClientDb } from './firebaseClient.js';
import { normalizePhase } from './phases.js';

// onPhase(aşama) her değişiklikte çağrılır. Dönen fonksiyon dinlemeyi durdurur.
// `db` testlerde verilebilir; null ise (ayar yok) hiçbir şey dinlenmez.
export function subscribeToPhase(onPhase, db = getClientDb()) {
  if (!db) return () => {};

  return onSnapshot(
    doc(db, 'settings', 'experiment'),
    (snap) => onPhase(normalizePhase(snap.exists() ? snap.data().activePhase : undefined)),
    // Hata öğrenciye gösterilmez; aşama API yanıtlarından öğrenilmeye devam eder.
    (err) => console.warn('Canlı aşama dinleyicisi durdu:', err.code || err.message)
  );
}
