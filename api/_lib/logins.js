// Giriş kayıtları: hangi kod hangi aşamada giriş yaptı? (proje rehberi Bölüm 12/1)
// Belge: logins/{code}_{phase}, ör. logins/K001_pretest. Kimlik sabit olduğundan
// aynı öğrenci aynı aşamada kaç kez girerse girsin tek belge olur; loginCount artar.
import { serverTimestamp, increment } from './firebase.js';

export async function recordLogin(db, { code, group, phase }) {
  const ref = db.collection('logins').doc(`${code}_${phase}`);

  // Transaction: "belge var mı?" kontrolü ile yazma aynı anda yapılır,
  // böylece iki eşzamanlı girişte firstLoginAt iki kez yazılmaz.
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      // İlk giriş: tüm alanlar yazılır.
      tx.set(ref, {
        code,
        group,
        phase,
        firstLoginAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        loginCount: 1,
      });
    } else {
      // Sonraki girişler: yalnızca son giriş zamanı ve sayaç güncellenir.
      tx.update(ref, {
        lastLoginAt: serverTimestamp(),
        loginCount: increment(1),
      });
    }
  });
}
