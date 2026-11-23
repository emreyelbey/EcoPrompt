// Aktif test aşaması: settings/experiment belgesindeki activePhase.
// Okuma: belge yoksa veya değer beklenmeyense 'pretest' varsayılır (belge oluşturulmaz).
// Yazma: yalnızca yönetici uç noktası (/api/admin/phase) çağırır.
import { serverTimestamp } from './firebase.js';
import { PHASES, DEFAULT_PHASE, normalizePhase } from '../../src/lib/phases.js';

export { PHASES, DEFAULT_PHASE };

function experimentDoc(db) {
  return db.collection('settings').doc('experiment');
}

export async function getActivePhase(db) {
  const snap = await experimentDoc(db).get();
  return normalizePhase(snap.exists ? snap.data().activePhase : undefined);
}

// Aktif aşamayı yazar. Zaman sunucu saatidir. Eski etkileşim kayıtlarına dokunulmaz.
export async function setActivePhase(db, phase) {
  await experimentDoc(db).set({ activePhase: phase, updatedAt: serverTimestamp() }, { merge: true });
}
