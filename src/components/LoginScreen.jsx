// Giriş ekranı: öğrenci kodu ile giriş ve altta sade "Yönetici Girişi" bağlantısı.
// Kurallar (proje rehberi Bölüm 2): demo/önizleme butonu YOK, parola arayüzde hiçbir yerde yazmaz,
// kod ve parola tarayıcıda değil sunucuda (/api/login, /api/admin/login) doğrulanır.
// Görsel referans: reference/canvas-prototip.tsx → LoginScreen.
import { useState } from 'react';
import { GraduationCap, Shield, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../lib/api.js';

export default function LoginScreen({ onStudentLogin, onAdminLogin, initialCode = '', initialError = '' }) {
  const [mode, setMode] = useState('student'); // 'student' | 'admin'
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

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/60">
      <main className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden">
          {/* Üst başlık */}
          <div className="px-6 pt-7 pb-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto mb-3">
              {mode === 'admin' ? (
                <Shield className="w-6 h-6 text-indigo-300" />
              ) : (
                <GraduationCap className="w-6 h-6 text-indigo-300" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              {mode === 'admin' ? 'Araştırmacı / Yönetici Girişi' : 'Eğitim Asistanı Girişi'}
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">TÜBİTAK 2204-A Lise Araştırma Projesi</p>
          </div>

          <div className="p-6">
            {mode === 'student' ? (
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div>
                  <label htmlFor="participant-code" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                    placeholder="Size verilen kodu yazın"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={10}
                    disabled={busy}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 font-semibold tracking-wider uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Giriş için yalnızca öğretmeniniz tarafından verilen kişisel çalışma kodunuzu kullanın.
                  </p>
                </div>

                <ErrorBox message={errorMsg} />

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kontrol ediliyor…</span>
                    </>
                  ) : (
                    <>
                      <span>Oturumu Başlat</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label htmlFor="admin-pass" className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Yönetici Parolası
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-slate-600 disabled:bg-slate-50 transition-all"
                    />
                  </div>
                </div>

                <ErrorBox message={errorMsg} />

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  <span>{busy ? 'Kontrol ediliyor…' : 'Yönetici Paneline Gir'}</span>
                </button>
              </form>
            )}

            {/* Sade alt geçiş bağlantısı */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              {mode === 'student' ? (
                <button
                  type="button"
                  onClick={() => switchMode('admin')}
                  disabled={busy}
                  className="text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Yönetici Girişi
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode('student')}
                  disabled={busy}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Öğrenci Girişine Dön
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Kırmızı hata kutusu. Mesaj yoksa hiçbir şey çizmez.
function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}
