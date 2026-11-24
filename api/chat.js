// Sohbet: POST /api/chat  { code, modelId, prompt }
// Akış: kodu doğrula → aşamayı oku → hız sınırı → giriş kaydı → geçmişi oku → yapay zekaya sor
//       → token ve ayak izini hesapla → kaydı yaz → yanıtı döndür.
// Grup koddan, aşama veritabanından, zaman sunucudan, token sayıları API yanıtından gelir.
// Tarayıcının gönderdiği group/phase/token/zaman alanları hiç okunmaz.
import { getDb, serverTimestamp } from './_lib/firebase.js';
import { getActivePhase } from './_lib/phase.js';
import { recordLogin } from './_lib/logins.js';
import { claimRateSlot } from './_lib/rateLimit.js';
import { getHistory, saveInteraction, toStudentMessage } from './_lib/interactions.js';
import { getStudentView } from '../src/lib/phases.js';
import { generateReply, AiError } from './_lib/ai.js';
import { CONFIG_HASH } from './_lib/configHash.js';
import { allowMethod, readBody, sendError } from './_lib/http.js';
import { normalizeCode, isValidCode, getGroup } from '../src/lib/participants.js';
import { MODEL_ORDER, resolveTokens, calculateFootprint } from '../src/lib/footprint.js';

// Vercel'de bu fonksiyonun en uzun çalışma süresi (saniye). Hobby planında üst sınır 300 sn;
// 60 sn hem bu sınırın hem de eski (Fluid Compute kapalı) sınırın içinde kalır.
export const config = { maxDuration: 60 };

// Yapay zekaya ayrılan süre: isteğin başından itibaren 50 sn. Kalan ~10 sn veritabanı
// işlemleri içindir. Böylece Vercel fonksiyonu kesmeden ÖNCE Türkçe zaman aşımı hatası döner.
export const AI_DEADLINE_MS = 50_000;

// Bir istemin en fazla karakter sayısı.
export const MAX_PROMPT_LENGTH = 4000;

export default async function handler(req, res) {
  const startedAt = Date.now();
  if (!allowMethod(req, res, 'POST')) return;
  const body = readBody(req);

  // 1) Kod
  const code = normalizeCode(body.code);
  if (!code || !isValidCode(code)) {
    return sendError(res, 400, 'Geçersiz katılımcı kodu. Lütfen çıkış yapıp kodunuzla yeniden giriş yapın.');
  }

  // 2) Model sınıfı ve istem
  const modelId = body.modelId;
  if (!MODEL_ORDER.includes(modelId)) {
    return sendError(res, 400, 'Lütfen bir model seçin.');
  }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return sendError(res, 400, 'Lütfen bir soru veya istem yazın.');
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return sendError(res, 400, `İstem en fazla ${MAX_PROMPT_LENGTH} karakter olabilir.`);
  }

  // 3) Grup, aşama, hız sınırı, giriş kaydı ve geçmiş (veritabanı adımları)
  let db, group, phase, history;
  try {
    group = getGroup(code);
    db = getDb();
    phase = await getActivePhase(db);

    const slot = await claimRateSlot(db, code);
    if (!slot.ok) {
      return sendError(res, 429, 'Çok hızlı gönderiyorsunuz. Lütfen birkaç saniye bekleyip tekrar deneyin.');
    }

    await recordLogin(db, { code, group, phase });
    history = await getHistory(db, code, phase);
  } catch (err) {
    console.error('Sohbet veritabanı hatası (okuma):', err.message);
    return sendError(res, 500, 'Sunucuya şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.');
  }

  // 4) Yapay zeka. Hata olursa kayıt yazılmaz ve sahte yanıt üretilmez.
  let reply;
  try {
    reply = await generateReply({ modelId, history, prompt, deadline: startedAt + AI_DEADLINE_MS });
  } catch (err) {
    if (err instanceof AiError) return sendError(res, err.status, err.message);
    console.error('Sohbet beklenmeyen hata:', err.message);
    return sendError(res, 502, 'Asistan şu anda yanıt veremiyor. Lütfen tekrar deneyin.');
  }

  // 5) Token sayıları (gerçek usageMetadata varsa o, yoksa tahmin) ve ayak izi.
  //    Not: inputTokens sistem talimatını ve geçmiş bağlamı da içerir (proje rehberi Bölüm 5, metodoloji notu).
  const tokens = resolveTokens(reply.usageMetadata, prompt, reply.text);
  const footprint = calculateFootprint(tokens.inputTokens, tokens.outputTokens, modelId);

  const record = {
    code,
    group,
    phase,
    modelId,
    prompt,
    response: reply.text,
    ...footprint, // inputTokens, outputTokens, weightedTokens, energy*, water*, co2*, costUsd, savingsPct
    tokenSource: tokens.tokenSource,
    engineVersion: reply.modelVersion, // Yalnızca veritabanında; tarayıcıya/Excel'e/CSV'ye asla çıkmaz.
    isSample: false,
    // Ölçüm koşullarının özeti (sistem talimatı, model eşlemesi, katsayılar, bağlam sınırı). Deney boyunca
    // tek değer kalmalı (dondurma kuralı). Yalnızca veritabanında ve yönetici panelinde; öğrenciye gitmez.
    configHash: CONFIG_HASH,
    createdAt: serverTimestamp(),
  };

  // 6) Kaydı yaz. Yazılamazsa yanıt öğrenciye GÖSTERİLMEZ: ekranda görünen her mesajın kaydı olmalı.
  let id;
  try {
    id = await saveInteraction(db, record);
  } catch (err) {
    console.error('Sohbet veritabanı hatası (yazma):', err.message);
    return sendError(res, 500, 'Yanıt alındı ancak kaydedilemedi. Lütfen tekrar deneyin.');
  }

  // `phase`: kaydın yazıldığı aşama. Tarayıcı bunu ekrandaki aşamayla karşılaştırır; farklıysa
  // mesajı eklemez ve geçmişi yeniden yükler (canlı dinleyici engellense bile ekran doğru aşamaya geçer).
  // Çevresel alanlar yalnızca EkoToken görünümüne (Deney + Son Test) eklenir; grup koddan,
  // aşama veritabanından gelir. Kontrol grubunun ve Ön Test'in yanıtında bu alanlar yoktur.
  const view = getStudentView(group, phase);
  return res.status(200).json({ message: toStudentMessage(id, record, view, Date.now()), phase });
}
