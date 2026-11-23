// Yönetici oturum kontrolü: GET /api/admin/session  (Authorization: Bearer <token>)
// Sayfa yenilendiğinde tarayıcıdaki token'ın hâlâ geçerli olup olmadığını söyler.
import { requireAdmin } from '../_lib/session.js';
import { allowMethod, sendError } from '../_lib/http.js';

export default function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;

  try {
    const session = requireAdmin(req, res);
    if (!session) return; // 401 yanıtı requireAdmin içinde gönderildi.
    return res.status(200).json({ ok: true, exp: session.exp });
  } catch (err) {
    console.error('Oturum kontrolü hatası:', err.message);
    return sendError(res, 500, 'Oturum şu anda kontrol edilemiyor. Sunucu ayarlarını kontrol edin.');
  }
}
