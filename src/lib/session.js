// Tarayıcıdaki oturum bilgisini saklar.
// - Öğrenci: aktif kod localStorage'da (sayfa yenilense de tarayıcı kapansa da kalır).
// - Yönetici: imzalı token sessionStorage'da (sekme kapanınca silinir).
// Burada saklanan bilgiye sunucu güvenmez: kod ve token her istekte sunucuda yeniden doğrulanır.

const STUDENT_KEY = 'oturum';
const ADMIN_KEY = 'yoneticiOturumu';

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

export function clearSession() {
  try {
    localStorage.removeItem(STUDENT_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    // Depolama kapalıysa silinecek bir şey de yoktur.
  }
}
