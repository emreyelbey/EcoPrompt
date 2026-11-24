// Yapay zeka istemcisi (yalnızca sunucu). Sağlayıcının REST uç noktasına istek atar.
// - API anahtarı URL'de değil, istek başlığında gider (sunucu loglarına URL düşse bile anahtar görünmez).
// - Geçici hatalarda (yoğunluk, kota, ağ, asılı kalan deneme) süre bütçesi yettiği sürece en çok
//   2 kez yeniden dener. Her denemenin bir üst süresi vardır; 429'da sağlayıcının önerdiği bekleme kullanılır.
// - Her türlü hatada sabit Türkçe mesajlı AiError fırlatır. Sağlayıcının kendi hata metni
//   öğrenciye ASLA iletilmez (marka adı içerebilir); yalnızca durum kodu sunucu loguna yazılır.
// Sağlayıcı değişirse yalnızca bu dosya ve models.js değişir (proje rehberi Bölüm 7).
import { getModelConfig } from './models.js';
import { buildSystemInstruction } from './prompt.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Yeniden denemeler arasındaki bekleme süreleri (ms): 1. tekrar 1 sn, 2. tekrar 2 sn sonra.
export const RETRY_DELAYS_MS = [1000, 2000];

// Bir denemeye kalan süre bundan azsa yeni deneme başlatılmaz (cevap gelme ihtimali yok).
export const MIN_ATTEMPT_MS = 3000;

// Tek bir denemenin en uzun süresi (ms). Bu süre dolarsa deneme iptal edilir ve
// toplam bütçe yetiyorsa yeniden denenir. Akıl yürütme modeli uzun düşündüğü için daha fazla süre alır.
export const ATTEMPT_TIMEOUT_MS = { light: 20_000, standard: 20_000, reasoning: 40_000 };

// Varsayılan süre bütçesi. /api/chat kendi bütçesini `deadline` ile verir.
export const DEFAULT_BUDGET_MS = 50_000;

// Yanıt çeşitliliği (temperature) sınıf başına. Ölçüm koşulunun parçasıdır: yapılandırma özetine
// (configHash.js) girer, Ön Test başladıktan sonra Son Test bitene kadar değiştirilmez.
export const TEMPERATURE = { light: 0.7, standard: 0.7, reasoning: 0.5 };

// Öğrenciye gösterilecek sabit Türkçe mesajlar.
export const AI_MESSAGES = {
  busy: 'Asistan şu anda çok yoğun. Lütfen birkaç saniye sonra tekrar deneyin.',
  timeout: 'Asistan yanıtı zamanında hazırlayamadı. Lütfen tekrar deneyin veya sorunuzu kısaltın.',
  empty: 'Asistan bu soruya geçerli bir yanıt üretemedi. Lütfen sorunuzu farklı biçimde yazıp tekrar deneyin.',
  failed: 'Asistan şu anda yanıt veremiyor. Lütfen tekrar deneyin.',
  config: 'Sunucu yapay zeka ayarları eksik.',
};

// Yapay zeka hatası. `status`, /api/chat'in tarayıcıya döneceği HTTP kodudur.
export class AiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AiError';
    this.status = status;
  }
}

// Geçmiş etkileşimleri ve yeni istemi sağlayıcının beklediği sohbet biçimine çevirir.
// history: [{ prompt, response }, ...] (eskiden yeniye)
export function buildContents(history, prompt) {
  const contents = [];
  for (const item of history) {
    if (item.prompt) contents.push({ role: 'user', parts: [{ text: item.prompt }] });
    if (item.response) contents.push({ role: 'model', parts: [{ text: item.response }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });
  return contents;
}

// Yanıttaki metin parçalarını birleştirir. Düşünme özetleri (thought: true) yanıta katılmaz.
function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();
}

// Bu HTTP durumunda yeniden denemek mantıklı mı? (429: kota/yoğunluk, 5xx: sunucu tarafı geçici)
function isRetriable(status) {
  return status === 429 || status >= 500;
}

// 429 yanıtında sağlayıcı "şu kadar sonra tekrar dene" bilgisini verir:
// error.details içinde { "@type": "...RetryInfo", retryDelay: "6s" }. Milisaniye döner; yoksa null.
export function parseRetryDelay(data) {
  const details = Array.isArray(data?.error?.details) ? data.error.details : [];
  for (const item of details) {
    if (typeof item?.['@type'] === 'string' && item['@type'].endsWith('RetryInfo')) {
      const match = /^(\d+(?:\.\d+)?)s$/.exec(String(item.retryDelay || ''));
      if (match) return Math.ceil(Number(match[1]) * 1000);
    }
  }
  return null;
}

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tek bir deneme yapar. Hata fırlatmaz; sonucu bir nesneyle bildirir:
 *   { ok: true, data }                               başarılı yanıt
 *   { ok: false, kind: 'busy', retryDelayMs }        429/5xx (yeniden denenebilir)
 *   { ok: false, kind: 'failed', retriable }         ağ hatası (denenebilir) veya 400/403/404 (denenmez)
 *   { ok: false, kind: 'timeout', budgetOver }       deneme süresi doldu
 */
async function attemptOnce({ url, apiKey, body, timeoutMs, budgetOver, fetchImpl, modelId }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body,
      signal: controller.signal,
    });
    // Yanıt gövdesi de aynı süre sınırı içinde okunur. Bozuk gövde boş nesne sayılır.
    const data = await response.json().catch((err) => {
      if (err.name === 'AbortError') throw err;
      return {};
    });

    if (response.ok) return { ok: true, data };

    console.error('Yapay zeka HTTP hatası:', modelId, response.status);
    if (!isRetriable(response.status)) return { ok: false, kind: 'failed', retriable: false };
    return {
      ok: false,
      kind: 'busy',
      retryDelayMs: response.status === 429 ? parseRetryDelay(data) : null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Yapay zeka zaman aşımı:', modelId, budgetOver ? '(bütçe bitti)' : '(deneme sınırı)');
      return { ok: false, kind: 'timeout', budgetOver };
    }
    console.error('Yapay zeka ağ hatası:', modelId, err.name);
    return { ok: false, kind: 'failed', retriable: true };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Yapay zekadan yanıt ister.
 * @param {object} p
 * @param {'light'|'standard'|'reasoning'} p.modelId
 * @param {{prompt: string, response: string}[]} p.history  Bağlam (eskiden yeniye)
 * @param {string} p.prompt  Yeni istem
 * @param {number} [p.deadline]  Bu zamana (ms) kadar bitmeli; geçerse zaman aşımı hatası
 * @param {Function} [p.fetchImpl], [p.sleep], [p.now]  Testlerde taklit için
 * @returns {Promise<{ text: string, usageMetadata: object|undefined, modelVersion: string|null }>}
 */
export async function generateReply({
  modelId,
  history = [],
  prompt,
  deadline,
  fetchImpl = globalThis.fetch,
  sleep = realSleep,
  now = Date.now,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError(500, AI_MESSAGES.config);

  const { model, thinkingLevel } = getModelConfig(modelId);
  const endAt = deadline ?? now() + DEFAULT_BUDGET_MS;
  const url = `${API_BASE}/${model}:generateContent`;

  const body = JSON.stringify({
    contents: buildContents(history, prompt),
    systemInstruction: { parts: [{ text: buildSystemInstruction(modelId) }] },
    generationConfig: {
      temperature: TEMPERATURE[modelId],
      thinkingConfig: { thinkingLevel },
    },
  });

  // Son başarısız denemenin türü: denemeler bitince hangi mesajın gösterileceğini belirler.
  let lastFailure = 'failed';

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const remaining = endAt - now();
    if (remaining < MIN_ATTEMPT_MS) break; // Süre bitti; aşağıda Türkçe hata fırlatılır.

    // Deneme süresi: sınıfın üst sınırı veya kalan bütçe (hangisi küçükse).
    // Üst sınır sayesinde asılı kalan tek bir deneme bütün bütçeyi tüketmez.
    const cap = ATTEMPT_TIMEOUT_MS[modelId];
    const timeoutMs = Math.min(cap, remaining);
    const result = await attemptOnce({
      url,
      apiKey,
      body,
      timeoutMs,
      budgetOver: timeoutMs === remaining,
      fetchImpl,
      modelId,
    });

    if (result.ok) {
      const text = extractText(result.data);
      if (!text) {
        // Boş yanıt (ör. güvenlik filtresi). Sahte yanıt üretilmez.
        console.error('Yapay zeka boş yanıt:', modelId, result.data?.candidates?.[0]?.finishReason || '-');
        throw new AiError(502, AI_MESSAGES.empty);
      }
      return {
        text,
        usageMetadata: result.data.usageMetadata,
        modelVersion: typeof result.data.modelVersion === 'string' ? result.data.modelVersion : null,
      };
    }

    // Toplam bütçe bitti: yeniden denemeye yer yok.
    if (result.kind === 'timeout' && result.budgetOver) throw new AiError(504, AI_MESSAGES.timeout);
    // 400, 403, 404 vb.: tekrar denemek sonucu değiştirmez.
    if (result.kind === 'failed' && !result.retriable) throw new AiError(502, AI_MESSAGES.failed);

    lastFailure = result.kind;
    // 429'da sağlayıcının önerdiği bekleme süresi, yoksa sabit bekleme kullanılır.
    const delay = result.retryDelayMs ?? RETRY_DELAYS_MS[attempt];
    if (!(await waitBeforeRetry(attempt, delay, endAt, now, sleep))) break;
  }

  // Denemeler veya süre bitti.
  if (lastFailure === 'timeout') throw new AiError(504, AI_MESSAGES.timeout);
  if (lastFailure === 'busy') throw new AiError(503, AI_MESSAGES.busy);
  throw new AiError(502, AI_MESSAGES.failed);
}

// Yeniden denemeden önce `delay` kadar bekler ve true döner. Yeniden deneme hakkı kalmadıysa
// veya bekleme sonrası yeni bir denemeye yetecek süre kalmayacaksa beklemeden false döner.
async function waitBeforeRetry(attempt, delay, endAt, now, sleep) {
  if (attempt >= RETRY_DELAYS_MS.length) return false; // Son denemeydi.
  if (endAt - now() - delay < MIN_ATTEMPT_MS) return false;
  await sleep(delay);
  return true;
}
