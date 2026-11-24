// Giriş ekranı: öğrenci kodu ile giriş ve altta sade "Yönetici Girişi" bağlantısı.
// Kurallar (proje rehberi Bölüm 2): demo/önizleme butonu YOK, parola arayüzde hiçbir yerde yazmaz,
// kod ve parola tarayıcıda değil sunucuda (/api/login, /api/admin/login) doğrulanır.
// Görsel referans: reference/tasarim-yon2b/Yon2-Giris.dc.html (Yön 2b, koyu ekran).
// Kör deney: ekran nötrdür (yeşil, yaprak, çevre çağrışımı yok); iki grup da aynı ekranı görür.
// Mobil (Dilim 8d): yazı kutuları 16 px'ten büyük (iOS yakınlaştırmaz), dokunma hedefleri en az 44 px.
// Klavye açılıp alan daralınca içerik kaydırılabilir (orta alan esner, form ekranın dışında kalmaz).
import { useState } from 'react';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/api.js';
import { BrandMark, Wordmark } from './ui/BrandMark.jsx';
import { useScreenTheme } from '../lib/screenTheme.js';

// İki formda ortak yazı kutusu görünümü (koyu zemin, 56 px yükseklik, odakta nötr vurgu çerçevesi).
const FIELD_CLASS =
  'w-full h-14 px-[18px] rounded-2xl border border-dark-line bg-dark-field text-on-dark placeholder:text-text-3 ' +
  'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60 transition-colors';

// İki formda ortak birincil buton (tam yuvarlak, açık renk).
const PRIMARY_BUTTON_CLASS =
  'w-full h-14 rounded-full bg-on-dark text-ink text-base font-semibold flex items-center justify-center gap-2 ' +
  'hover:bg-white active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait transition-all ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink';

export default function LoginScreen({ onStudentLogin, onAdminLogin, initialCode = '', initialError = '' }) {
  const [mode, setMode] = useState('student'); // 'student' | 'admin'
  // Giriş ekranı açıkken sayfa zemini ve tarayıcı çubuğu koyu (klavye açılınca alttaki şerit de koyu kalır).
  useScreenTheme('login');
  const [codeInput, setCodeInput] = useState(initialCode);
  const [passInput, setPassInput] = useState('');
  const [errorMsg, setErrorMsg] = useState(initialError);
  const [busy, setBusy] = useState(false); // İstek sürerken butonlar kilitlenir.

  // Öğrenci formu gönderildiğinde: kodu sunucuya doğrulat.
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!codeInput.trim()) {
      setErrorMsg('Lütfen size verilen katılımcı kodunu girin.');
      return;
    }
    setBusy(true);
    setErrorMsg('');
    try {
      const data = await apiRequest('/api/login', { method: 'POST', body: { code: codeInput } });
      onStudentLogin(data); // { code, group, phase }
    } catch (err) {
      setErrorMsg(err.message);
      setBusy(false);
    }
  };

  // Yönetici formu gönderildiğinde: parolayı sunucuya doğrulat, imzalı token al.
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!passInput) {
      setErrorMsg('Lütfen yönetici parolasını girin.');
      return;
    }
    setBusy(true);
    setErrorMsg('');
    try {
      const data = await apiRequest('/api/admin/login', { method: 'POST', body: { passcode: passInput } });
      setPassInput('');
      onAdminLogin(data); // { token, exp }
    } catch (err) {
      setErrorMsg(err.message);
      setBusy(false);
    }
  };

  // Öğrenci ↔ yönetici formu arasında geçiş.
  const switchMode = (next) => {
    setMode(next);
    setErrorMsg('');
    setPassInput('');
  };

  const isAdmin = mode === 'admin';

  return (
    <div className="app-viewport fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-ink text-on-dark">
      {/* Yalnızca bu alan kayar. İç sütun en az ekran yüksekliğindedir; klavye açılıp alan daralınca
          ortadaki başlık alanı küçülür ve sayfa kaydırılabilir (form görünmez bölgeye düşmez). */}
      {/* DÜZEN
          - Telefon ve tablet (lg altı): tek dar sütun. Üstte logo, ortada başlık (kalan boşluğu doldurur),
            altta form ve alt satır. Taslaktaki telefon düzeninin aynısı.
          - Masaüstü (lg = 1024 px ve üstü): iki sütun, en fazla 1100 px. Solda logo + büyük başlık + alt metin,
            sağda form. İki sütunlu blok dikeyde ortalanır (my-auto); aradaki boşluklar sabittir, böylece çok
            yüksek ekranlarda içerik gerilmez. Alt satır sayfanın altında, aynı genişlikte kalır. */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full w-full max-w-md lg:max-w-[1100px] mx-auto flex flex-col px-7 lg:px-12 pt-7 pb-8 lg:py-10">
          <div className="flex-1 flex flex-col lg:flex-none lg:my-auto lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-x-24 lg:py-12">
            {/* SOL SÜTUN (telefonda: üst satır + başlık alanı) */}
            <div className="flex-1 flex flex-col lg:flex-none lg:gap-14">
              {/* Üst satır: logo + ad, sağda proje etiketi */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BrandMark variant="orbit" size={32} tone="dark" />
                  <Wordmark first="Eğitim " second="Asistanı" className="text-[15px]" />
                </div>
                {/* Masaüstünde gizli: alt satırda proje adı zaten tam yazılı ve etiket sol sütunda boşta kalıyordu. */}
                <span className="lg:hidden font-mono text-[11px] tracking-[0.08em] text-on-dark-2">2204-A</span>
              </div>

              {/* Başlık alanı: telefonda kalan boşluğu doldurur ve içeriği dikeyde ortalar; masaüstünde sabit boşluk */}
              <div className="flex-1 flex flex-col justify-center gap-[18px] lg:gap-6 py-10 lg:py-0 lg:flex-none">
                {isAdmin ? (
                  <h1 className="text-[44px] leading-[46px] lg:text-[72px] lg:leading-[72px] font-semibold tracking-[-0.04em]">
                    Yönetici
                    <br />
                    <span className="font-serif italic font-normal tracking-[-0.01em] text-accent">Girişi.</span>
                  </h1>
                ) : (
                  <h1 className="text-[52px] leading-[52px] lg:text-[88px] lg:leading-[86px] font-semibold tracking-[-0.04em]">
                    Sor.
                    <br />
                    Öğren.
                    <br />
                    <span className="font-serif italic font-normal tracking-[-0.01em] text-accent">Derinleş.</span>
                  </h1>
                )}
                <p className="text-base leading-6 lg:text-lg lg:leading-7 text-on-dark-2 max-w-[290px] lg:max-w-sm">
                  {isAdmin
                    ? 'Araştırma ekibi ve danışman öğretmen içindir.'
                    : 'Ders ve araştırma için kişisel sohbet asistanın.'}
                </p>
              </div>
            </div>

            {/* SAĞ SÜTUN: form (masaüstünde en fazla 400 px, sütunun sağına yaslı) */}
            <div className="lg:w-full lg:max-w-[400px] lg:justify-self-end">
              {isAdmin ? (
                <form onSubmit={handleAdminSubmit} className="flex flex-col gap-3">
                  <label
                    htmlFor="admin-pass"
                    className="text-xs font-medium tracking-[0.08em] uppercase text-on-dark-2"
                  >
                    Yönetici Parolası
                  </label>
                  <input
                    id="admin-pass"
                    type="password"
                    value={passInput}
                    onChange={(e) => {
                      setPassInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Parolanızı girin"
                    autoComplete="off"
                    disabled={busy}
                    className={`${FIELD_CLASS} text-lg`}
                  />
                  <ErrorBox message={errorMsg} />
                  <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASS}>
                    {busy ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden="true" />
                        <span>Kontrol ediliyor…</span>
                      </>
                    ) : (
                      <>
                        <span>Yönetici Paneline Gir</span>
                        <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleStudentSubmit} className="flex flex-col gap-3">
                  <label
                    htmlFor="participant-code"
                    className="text-xs font-medium tracking-[0.08em] uppercase text-on-dark-2"
                  >
                    Katılımcı Kodu
                  </label>
                  <input
                    id="participant-code"
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    // Örnek olarak gerçek bir katılımcı kodu yazılmaz (ör. "K001"): hem grup harfini ima eder
                    // hem de birinin o kodla giriş yapmasını kolaylaştırır.
                    placeholder="Kodunu yaz"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={10}
                    disabled={busy}
                    // Kod mono yazıyla, aralıklı ve büyük harf; yer tutucu normal yazıyla.
                    className={`${FIELD_CLASS} font-mono text-xl tracking-[0.12em] uppercase placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-base`}
                  />
                  <ErrorBox message={errorMsg} />
                  <button type="submit" disabled={busy} className={PRIMARY_BUTTON_CLASS}>
                    {busy ? (
                      <>
                        <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden="true" />
                        <span>Kontrol ediliyor…</span>
                      </>
                    ) : (
                      <>
                        <span>Giriş Yap</span>
                        <ArrowRight className="w-[18px] h-[18px]" aria-hidden="true" />
                      </>
                    )}
                  </button>
                  <p className="mt-1 text-[13px] leading-5 text-on-dark-2 text-center">
                    Kodunu öğretmeninden aldığın karttan gir.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Alt satır: proje adı + sade mod geçiş bağlantısı (demo/önizleme butonu YOK) */}
          {/* 360 px'te iki öğe tek satıra sığsın diye dar ekranda proje adı kısaltılır. */}
          <div className="mt-5 lg:mt-0 pt-2 border-t border-dark-rule flex items-center justify-between gap-x-3">
            <span className="text-xs text-on-dark-3">
              <span className="sm:hidden">TÜBİTAK 2204-A Projesi</span>
              <span className="hidden sm:inline">TÜBİTAK 2204-A Lise Araştırma Projesi</span>
            </span>
            <button
              type="button"
              onClick={() => switchMode(isAdmin ? 'student' : 'admin')}
              disabled={busy}
              // En az 44 px dokunma alanı; sağdaki boşluk negatif kenar boşluğuyla hizalanır.
              className="shrink-0 min-h-11 pl-2 pr-3 -mr-3 text-[13px] font-medium text-on-dark-link hover:text-on-dark disabled:opacity-60 transition-colors focus:outline-none focus-visible:underline"
            >
              {isAdmin ? '← Öğrenci Girişine Dön' : 'Yönetici Girişi'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Kırmızı hata kutusu (koyu zemine uyarlanmış). Mesaj yoksa hiçbir şey çizmez.
function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="p-3 rounded-2xl bg-rose-950/60 border border-rose-900 text-[13px] leading-5 text-rose-200 flex items-start gap-2"
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
