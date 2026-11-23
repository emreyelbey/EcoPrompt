// Uç noktalar için küçük yardımcılar: istek yöntemi kontrolü, JSON gövde okuma, Türkçe hata yanıtı.

// Türkçe hata yanıtı gönderir: { hata: "..." }.
export function sendError(res, status, message) {
  res.status(status).json({ hata: message });
}

// İstek yöntemi beklenenden farklıysa 405 döner ve false verir.
// `method` tek bir yöntem ('POST') veya izin verilen yöntemlerin listesi (['GET', 'POST']) olabilir.
export function allowMethod(req, res, method) {
  const allowed = Array.isArray(method) ? method : [method];
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  sendError(res, 405, 'Bu istek türü desteklenmiyor.');
  return false;
}

// İstek gövdesini nesne olarak döner. Vercel JSON gövdeyi çoğunlukla kendisi ayrıştırır;
// metin gelirse burada ayrıştırırız. Bozuk veya boş gövdede boş nesne döner.
export function readBody(req) {
  const body = req.body;
  if (body && typeof body === 'object') return body;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}
