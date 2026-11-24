// Tarayıcıdaki oturum bilgisini saklar.
// - Öğrenci: aktif kod localStorage'da (sayfa yenilense de tarayıcı kapansa da kalır).
// - Yönetici: imzalı token sessionStorage'da (sekme kapanınca silinir).
// - Seçili model: sessionStorage'da, anahtar `model:<kod>:<aşama>` (sayfa yenilenince korunur;
//   sekme kapanınca, çıkışta veya aşama değişince sıfırlanır, aynı bilgisayardaki sonraki öğrenciye geçmez).
// Burada saklanan bilgiye sunucu güvenmez: kod ve token her istekte sunucuda yeniden doğrulanır.

import { MODEL_ORDER } from './footprint.js';

const STUDENT_KEY = 'oturum';
const ADMIN_KEY = 'yoneticiOturumu';
const MODEL_KEY_PREFIX = 'model:';

// Sohbet ekranının varsayılan modeli (Bölüm 12/4: karar verilene kadar Standart).
export const DEFAULT_MODEL = 'standard';

// Depolama erişimi bazı gizli sekme ayarlarında hata verebilir; o durumda sessizce geçeriz.
function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Depolama kapalıysa oturum yalnızca bu sayfa açıkken sürer.
  }
}

export function saveStudent(code) {
  writeJson(localStorage, STUDENT_KEY, { role: 'student', code });
}

export function saveAdmin(token, exp) {
  writeJson(sessionStorage, ADMIN_KEY, { role: 'admin', token, exp });
}

// Kayıtlı oturumu döner: önce yönetici, sonra öğrenci. Yoksa null.
export function loadSession() {
  const admin = readJson(sessionStorage, ADMIN_KEY);
  if (admin?.role === 'admin' && typeof admin.token === 'string') return admin;

  const student = readJson(localStorage, STUDENT_KEY);
  if (student?.role === 'student' && typeof student.code === 'string') return student;

  return null;
}

function modelKey(code, phase) {
  return `${MODEL_KEY_PREFIX}${code}:${phase}`;
}

// Bu kodun bu aşamada en son seçtiği model. Kayıt yoksa veya geçersizse varsayılan (Standart).
export function loadModelChoice(code, phase) {
  try {
    const saved = sessionStorage.getItem(modelKey(code, phase));
    return MODEL_ORDER.includes(saved) ? saved : DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function saveModelChoice(code, phase, modelId) {
  try {
    sessionStorage.setItem(modelKey(code, phase), modelId);
  } catch {
    // Depolama kapalıysa seçim yalnızca bu sayfa açıkken sürer.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STUDENT_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
    // Bütün model seçimleri de silinir. Önce anahtarlar toplanır: silerken sıra numaraları kayar.
    const modelKeys = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(MODEL_KEY_PREFIX)) modelKeys.push(key);
    }
    modelKeys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Depolama kapalıysa silinecek bir şey de yoktur.
  }
}
