// Mesaj geçmişi: POST /api/messages  { code }
// Öğrencinin KENDİ kodunun ve AKTİF aşamanın mesajlarını eskiden yeniye döner.
// Sayfa yenilendiğinde sohbetin geri gelmesi için kullanılır. Başka hiçbir öğrencinin verisi dönmez.
import { getDb } from './_lib/firebase.js';
import { getActivePhase } from './_lib/phase.js';
import { recordLogin } from './_lib/logins.js';
import { getOwnInteractions, toStudentMessage } from './_lib/interactions.js';
import { allowMethod, readBody, sendError } from './_lib/http.js';
import { normalizeCode, isValidCode, getGroup } from '../src/lib/participants.js';
import { getStudentView } from '../src/lib/phases.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return;

  const code = normalizeCode(readBody(req).code);
  if (!code || !isValidCode(code)) {
    return sendError(res, 400, 'Geçersiz katılımcı kodu. Lütfen çıkış yapıp kodunuzla yeniden giriş yapın.');
  }

  try {
    const group = getGroup(code);
    const db = getDb();
    const phase = await getActivePhase(db);
    await recordLogin(db, { code, group, phase });

    // Çevresel alanlar yalnızca EkoToken görünümüne (Deney + Son Test) eklenir.
    const view = getStudentView(group, phase);
    const items = await getOwnInteractions(db, code, phase);
    const messages = items.map(({ id, data }) => toStudentMessage(id, data, view));
    return res.status(200).json({ phase, messages });
  } catch (err) {
    console.error('Mesaj geçmişi hatası:', err.message);
    return sendError(res, 500, 'Mesaj geçmişi yüklenemedi. Lütfen sayfayı yenileyin.');
  }
}
