// Tarayıcıdan sunucuya (/api/*) istek göndermek için tek yardımcı.
// Başarılıysa sunucunun JSON yanıtını döner; başarısızsa Türkçe mesajlı bir hata fırlatır.
// Hata nesnesinde `status` alanı bulunur (ağ hatasında 0).

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // İnternet yok veya sunucuya ulaşılamıyor.
    throw makeError(0, 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  }

  // Yanıt JSON değilse (ör. sunucu çöktüyse) boş nesne kabul edilir.
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw makeError(response.status, data.hata || 'Beklenmeyen bir sunucu hatası oluştu. Lütfen tekrar deneyin.');
  }
  return data;
}

function makeError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
