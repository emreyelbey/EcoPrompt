// Yönetici paneli verisi: GET /api/admin/data  (Authorization: Bearer <token>)
// Sorgu parametreleri (hepsi isteğe bağlı, milisaniye):
//   since        → yalnızca bu zamandan sonra gelen etkileşimler (yoksa hepsi, baştan)
//   loginsSince  → yalnızca bu zamandan sonra değişen giriş kayıtları (yoksa hepsi)
//   afterT+afterId → sayfalama: önceki sayfanın son kaydından devam (bu durumda giriş kayıtları ve aşama dönmez)
// Yanıt: { interactions, hasMore, next, logins, phase, serverTime }
// Listede uzun yanıt metni ve engineVersion yoktur (api/_lib/admin.js → ADMIN_LIST_FIELDS).
import { getDb } from '../_lib/firebase.js';
import { getActivePhase } from '../_lib/phase.js';
import { requireAdmin } from '../_lib/session.js';
import { allowMethod, sendError } from '../_lib/http.js';
import { listInteractions, listLogins, OVERLAP_MS } from '../_lib/admin.js';

// Sorgu parametresini sıfır veya pozitif sayıya çevirir; geçersizse undefined.
function readMillis(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'GET')) return;

  try {
    const session = requireAdmin(req, res);
    if (!session) return; // 401 yanıtı requireAdmin içinde gönderildi.

    const query = req.query || {};
    const db = getDb();

    // Sayfalama devamı: yalnızca etkileşimlerin sonraki sayfası.
    const afterT = readMillis(query.afterT);
    if (afterT !== undefined && typeof query.afterId === 'string' && query.afterId) {
      const page = await listInteractions(db, { after: { t: afterT, id: query.afterId } });
      return res.status(200).json({
        interactions: page.items,
        hasMore: page.hasMore,
        next: page.next,
        logins: null,
        phase: null,
        serverTime: Date.now(),
      });
    }

    // Artımlı okuma: son görülen zamandan biraz öncesinden başlanır (OVERLAP_MS).
    const since = readMillis(query.since);
    const loginsSince = readMillis(query.loginsSince);
    const [page, logins, phase] = await Promise.all([
      listInteractions(db, { since: since === undefined ? undefined : Math.max(0, since - OVERLAP_MS) }),
      listLogins(db, { since: loginsSince === undefined ? undefined : Math.max(0, loginsSince - OVERLAP_MS) }),
      getActivePhase(db),
    ]);

    return res.status(200).json({
      interactions: page.items,
      hasMore: page.hasMore,
      next: page.next,
      logins,
      phase,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error('Yönetici verisi hatası:', err.message);
    return sendError(res, 500, 'Panel verileri şu anda yüklenemiyor. Lütfen tekrar deneyin.');
  }
}
