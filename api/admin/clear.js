// Verileri Temizle (yalnızca yönetici). GERİ ALINAMAZ.
//   GET  /api/admin/clear                    → { counts: { interactions, logins, rateLimits } }
//                                              (onay penceresinde silinecek sayıları göstermek için)
//   POST /api/admin/clear  { confirm: "SİL" }  → { deleted: { interactions, logins, rateLimits } }
//                          ("SIL" de kabul edilir: İngilizce klavyede "İ" yazılamaz)
// Güvence: gövdede tam olarak confirm: "SİL" veya "SIL" yoksa hiçbir şey silinmez (400). Bu, arayüzdeki onay
// penceresine ek ikinci bir kattır: yanlışlıkla gönderilen bir istek veriyi silemez.
// settings/experiment (aktif aşama) silinmez (proje rehberi Bölüm 7).
import { getDb } from '../_lib/firebase.js';
import { requireAdmin } from '../_lib/session.js';
import { allowMethod, readBody, sendError } from '../_lib/http.js';
import { CLEARABLE_COLLECTIONS, countCollection, deleteCollection } from '../_lib/admin.js';
import { isClearConfirmed } from '../../src/lib/clearConfirm.js';

// Silme süresi uzun olabilir (birkaç bin belge); Hobby planı sınırının içinde kalır.
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['GET', 'POST'])) return;

  try {
    const session = requireAdmin(req, res);
    if (!session) return; // 401 yanıtı requireAdmin içinde gönderildi.

    if (req.method === 'POST' && !isClearConfirmed(readBody(req).confirm)) {
      return sendError(res, 400, 'Silme onaylanmadı. Onay için büyük harfle "SİL" (veya "SIL") yazılmalıdır.');
    }

    const db = getDb();
    const result = {};

    if (req.method === 'GET') {
      for (const name of CLEARABLE_COLLECTIONS) result[name] = await countCollection(db, name);
      return res.status(200).json({ counts: result });
    }

    for (const name of CLEARABLE_COLLECTIONS) result[name] = await deleteCollection(db, name);
    return res.status(200).json({ deleted: result });
  } catch (err) {
    console.error('Veri temizleme hatası:', err.message);
    return sendError(res, 500, 'Veriler şu anda temizlenemiyor. Lütfen tekrar deneyin.');
  }
}
