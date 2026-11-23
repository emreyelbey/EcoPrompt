// Yönetici oturumu: parola kontrolü ve imzalı, süreli token.
// Token biçimi:  <yük>.<imza>
//   yük  = base64url(JSON { role: 'admin', exp })        (exp: bitiş zamanı, milisaniye)
//   imza = base64url(HMAC-SHA256(SESSION_SECRET, yük))
// İmzayı yalnızca SESSION_SECRET'ı bilen sunucu üretebilir; yük değiştirilirse imza tutmaz.
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { sendError } from './http.js';

// Token geçerlilik süresi: 8 saat.
export const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

const CONFIG_ERROR = 'Sunucu oturum ayarları eksik.';

// İmza anahtarını okur. Kısa veya eksikse token üretilmez.
function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error(CONFIG_ERROR);
  return secret;
}

// Verilen metnin imzasını hesaplar.
function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

// İki metni sabit sürede karşılaştırır. Önce ikisinin de SHA-256 özetini alırız:
// özetler hep aynı uzunlukta olduğu için uzunluk farkı da süreden anlaşılamaz.
function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

// Girilen parola ADMIN_PASSCODE ile aynı mı?
export function checkPasscode(input) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) throw new Error(CONFIG_ERROR);
  if (typeof input !== 'string' || input.length === 0) return false;
  return safeEqual(input, expected);
}

// Yeni yönetici token'ı üretir. `now` testlerde zamanı sabitlemek için verilebilir.
export function createAdminToken(now = Date.now()) {
  const exp = now + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp })).toString('base64url');
  return { token: `${payload}.${sign(payload, getSecret())}`, exp };
}

// Token'ı doğrular. Geçerliyse { exp }, değilse null döner.
export function verifyAdminToken(token, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  // 1) İmza doğru mu?
  if (!safeEqual(signature, sign(payload, getSecret()))) return null;

  // 2) Yük okunabiliyor mu, rolü ve süresi uygun mu?
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!data || data.role !== 'admin' || typeof data.exp !== 'number') return null;
  if (data.exp <= now) return null;

  return { exp: data.exp };
}

// Yönetici uç noktalarının başında çağrılır. "Authorization: Bearer <token>" başlığını doğrular.
// Geçersizse 401 yanıtını kendisi gönderir ve null döner.
export function requireAdmin(req, res) {
  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = verifyAdminToken(token);
  if (!session) {
    sendError(res, 401, 'Yönetici oturumu geçersiz veya süresi dolmuş. Lütfen yeniden giriş yapın.');
    return null;
  }
  return session;
}
