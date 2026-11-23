// Öğrenci girişi: POST /api/login  { code }
// Kodu doğrular, grubu koddan ve aşamayı veritabanından belirler, giriş kaydını günceller.
// Yanıt: { code, group, phase }. Grup ve aşamayı tarayıcı değil sunucu belirler.
import { getDb } from './_lib/firebase.js';
import { getActivePhase } from './_lib/phase.js';
import { recordLogin } from './_lib/logins.js';
import { allowMethod, readBody, sendError } from './_lib/http.js';
import { normalizeCode, isValidCode, getGroup } from '../src/lib/participants.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return;

  // 1) Kodu standart biçime getir ve doğrula.
  const code = normalizeCode(readBody(req).code);
  if (!code) {
    return sendError(res, 400, 'Lütfen size verilen katılımcı kodunu girin.');
  }
  if (!isValidCode(code)) {
    return sendError(
      res,
      400,
      'Geçersiz katılımcı kodu. Lütfen yalnızca araştırmacı tarafından size verilen kodu (ör. K001 veya D001 biçiminde) eksiksiz girin.'
    );
  }

  try {
    // 2) Grup koddan, aşama veritabanından.
    const group = getGroup(code);
    const db = getDb();
    const phase = await getActivePhase(db);

    // 3) Bu aşamadaki giriş kaydını oluştur/güncelle (isLogin: giriş sayacı da artar).
    await recordLogin(db, { code, group, phase, isLogin: true });

    return res.status(200).json({ code, group, phase });
  } catch (err) {
    // Ayrıntı yalnızca sunucu loguna; kullanıcıya genel Türkçe mesaj.
    console.error('Giriş hatası:', err.message);
    return sendError(res, 500, 'Giriş şu anda yapılamıyor. Lütfen biraz sonra tekrar deneyin.');
  }
}
