// Tek kayıt işlemleri (yalnızca yönetici):
//   GET    /api/admin/record?id=<kimlik>  → { record }  (tam soru + tam yanıt; engineVersion yok)
//   DELETE /api/admin/record?id=<kimlik>  → { deleted: true }
import { getDb } from '../_lib/firebase.js';
import { requireAdmin } from '../_lib/session.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { toAdminDetail, isValidDocId } from '../_lib/admin.js';

export default async function handler(req, res) {
  if (!allowMethod(req, res, ['GET', 'DELETE'])) return;

  try {
    const session = requireAdmin(req, res);
    if (!session) return; // 401 yanıtı requireAdmin içinde gönderildi.

    const id = req.query?.id;
    if (!isValidDocId(id)) {
      return sendError(res, 400, 'Geçersiz kayıt kimliği.');
    }

    const ref = getDb().collection('interactions').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      return sendError(res, 404, 'Kayıt bulunamadı. Daha önce silinmiş olabilir.');
    }

    if (req.method === 'GET') {
      return res.status(200).json({ record: toAdminDetail(id, snap.data()) });
    }

    await ref.delete();
    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error('Kayıt işlemi hatası:', err.message);
    return sendError(res, 500, 'Kayıt işlemi şu anda yapılamıyor. Lütfen tekrar deneyin.');
  }
}
