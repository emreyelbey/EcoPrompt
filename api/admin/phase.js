// Aktif aşama yönetimi (yalnızca yönetici).
//   GET  /api/admin/phase              → { phase }   (mevcut aşama)
//   POST /api/admin/phase  { phase }   → { phase }   (aşamayı değiştirir)
// İkisi de "Authorization: Bearer <token>" ister. Aşama değişince eski kayıtlar silinmez;
// açık öğrenci ekranları yeni aşamayı canlı dinleyiciden veya sonraki API yanıtından öğrenir.
import { getDb } from '../_lib/firebase.js';
import { getActivePhase, setActivePhase } from '../_lib/phase.js';
import { requireAdmin } from '../_lib/session.js';
import { allowMethod, readBody, sendError } from '../_lib/http.js';
import { isValidPhase } from '../../src/lib/phases.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['GET', 'POST'])) return;

  try {
    const session = requireAdmin(req, res);
    if (!session) return; // 401 yanıtı requireAdmin içinde gönderildi.

    const db = getDb();

    if (req.method === 'GET') {
      return res.status(200).json({ phase: await getActivePhase(db) });
    }

    // POST: yalnızca 'pretest' veya 'posttest' kabul edilir.
    const phase = readBody(req).phase;
    if (!isValidPhase(phase)) {
      return sendError(res, 400, 'Geçersiz aşama. Yalnızca Ön Test veya Son Test seçilebilir.');
    }
    await setActivePhase(db, phase);
    return res.status(200).json({ phase });
  } catch (err) {
    console.error('Aşama işlemi hatası:', err.message);
    return sendError(res, 500, 'Aşama bilgisi şu anda işlenemiyor. Lütfen tekrar deneyin.');
  }
}
