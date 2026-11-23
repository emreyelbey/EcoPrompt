// Katılımcı kodları: 60 geçerli kodun listesi, kod doğrulama, grup ve statü (Asıl/Yedek) bulma.
// Hem tarayıcı hem sunucu (/api) bu dosyayı kullanır. Ancak grup bilgisine yalnızca sunucuda
// güvenilir: sunucu her istekte grubu koddan kendisi hesaplar.
// Kaynak: reference/canvas-prototip.tsx (PARTICIPANT_MAP mantığı).

// Her grupta kaç kod var ve ilk kaçı "Asıl" (geri kalanı "Yedek").
const CODES_PER_GROUP = 30;
const MAIN_COUNT = 20;

// Kod harfi → grup adı.
const GROUP_BY_LETTER = { K: 'Kontrol', D: 'Deney' };

// Bir sayıyı 3 haneli metne çevirir: 7 → "007".
function pad3(n) {
  return String(n).padStart(3, '0');
}

// 60 kodun tamamı: K001…K030, ardından D001…D030.
export const ALL_CODES = ['K', 'D'].flatMap((letter) =>
  Array.from({ length: CODES_PER_GROUP }, (_, i) => letter + pad3(i + 1))
);

// Kullanıcının yazdığı kodu standart biçime getirir: " k001 " → "K001".
// Metin değilse boş metin döner.
export function normalizeCode(input) {
  if (typeof input !== 'string') return '';
  return input.trim().toUpperCase();
}

// Kod geçerli mi? Biçim: K veya D harfi + 3 rakam, sayı 1–30 arası.
// Kod önce normalizeCode ile standartlaştırılmış olmalıdır.
export function isValidCode(code) {
  const match = /^([KD])(\d{3})$/.exec(code);
  if (!match) return false;
  const number = Number(match[2]);
  return number >= 1 && number <= CODES_PER_GROUP;
}

// Kodun grubu: "K005" → "Kontrol", "D012" → "Deney". Geçersiz kodda null.
export function getGroup(code) {
  if (!isValidCode(code)) return null;
  return GROUP_BY_LETTER[code[0]];
}

// Kodun statüsü: 001–020 "Asıl", 021–030 "Yedek". Geçersiz kodda null.
export function getStatus(code) {
  if (!isValidCode(code)) return null;
  return Number(code.slice(1)) <= MAIN_COUNT ? 'Asıl' : 'Yedek';
}

// 60 kodun kod → grup eşlemesi. İstatistik ve Excel hesapları bunu İZİN LİSTESİ olarak kullanır:
// burada olmayan bir koda ait kayıt (ör. örnek veri kodu veya bozuk kayıt) hiçbir hesaba girmez.
export const PARTICIPANT_CODE_GROUPS = Object.fromEntries(ALL_CODES.map((code) => [code, getGroup(code)]));
