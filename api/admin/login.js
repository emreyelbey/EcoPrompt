// Yönetici girişi: POST /api/admin/login  { passcode }
// Parola sunucuda ADMIN_PASSCODE ile karşılaştırılır. Doğruysa imzalı, 8 saatlik token döner.
import { checkPasscode, createAdminToken } from '../_lib/session.js';
import { allowMethod, readBody, sendError } from '../_lib/http.js';

// Yanlış parolada yanıtı geciktirme süresi: art arda tahmin denemelerini yavaşlatır.
const WRONG_PASSCODE_DELAY_MS = 1000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (!allowMethod(req, res, 'POST')) return;

  try {
    const { passcode } = readBody(req);

    if (!checkPasscode(passcode)) {
      await wait(WRONG_PASSCODE_DELAY_MS);
      return sendError(res, 401, 'Yönetici parolası hatalı. Lütfen tekrar kontrol edin.');
    }

    const { token, exp } = createAdminToken();
    return res.status(200).json({ token, exp });
  } catch (err) {
    // Genellikle ortam değişkeni eksikliği. Ayrıntı yalnızca sunucu loguna.
    console.error('Yönetici girişi hatası:', err.message);
    return sendError(res, 500, 'Yönetici girişi şu anda yapılamıyor. Sunucu ayarlarını kontrol edin.');
  }
}
