// Aktif test aşamasını veritabanından okur: settings/experiment belgesindeki activePhase.
// Belge henüz yoksa (aşama anahtarı Dilim 4'te gelecek) 'pretest' varsayılır; belge oluşturulmaz.

export const PHASES = ['pretest', 'posttest'];
export const DEFAULT_PHASE = 'pretest';

export async function getActivePhase(db) {
  const snap = await db.collection('settings').doc('experiment').get();
  const phase = snap.exists ? snap.data().activePhase : undefined;
  // Beklenmeyen bir değer yazılmışsa da güvenli varsayılana döneriz.
  return PHASES.includes(phase) ? phase : DEFAULT_PHASE;
}
