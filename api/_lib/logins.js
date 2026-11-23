// Giriş kayıtları: hangi kod hangi aşamada giriş yaptı? (proje rehberi Bölüm 12/1)
// Belge: logins/{code}_{phase}, ör. logins/K001_pretest. Kimlik sabit olduğundan
// aynı öğrenci aynı aşamada kaç kez girerse girsin tek belge olur.
// İki sayaç var:
//   loginCount   : her etkinlikte artar (giriş, mesaj geçmişi yükleme, her istem). "Etkinlik sayısı".
//   sessionCount : yalnızca /api/login çağrısında artar (isLogin: true). "Giriş sayısı".
//                  Yönetici şüpheli çoklu girişleri bununla kontrol eder. Not: sayfa yenilenince
//                  tarayıcı kodu /api/login ile yeniden doğruladığı için yenileme de giriş sayılır.
import { serverTimestamp, increment } from './firebase.js';

export async function recordLogin(db, { code, group, phase, isLogin = false }) {
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
        sessionCount: isLogin ? 1 : 0,
      });
    } else {
      // Sonraki girişler: yalnızca son giriş zamanı ve sayaç güncellenir.
      const changes = {
        lastLoginAt: serverTimestamp(),
        loginCount: increment(1),
      };
      if (isLogin) changes.sessionCount = increment(1);
      tx.update(ref, changes);
    }
  });
}
