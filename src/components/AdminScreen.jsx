// Yönetici ekranı (Dilim 4 sürümü): yalnızca aktif aşama anahtarı.
// Tam panel (genel bakış, kayıtlar, kodlar, istatistik, Excel) Dilim 6–7'de bu ekrana eklenecek.
// Aşama /api/admin/phase üzerinden okunur ve yazılır; tarayıcı veritabanına yazamaz.
// Düzen kuralları proje rehberi Bölüm 8'e uyar (sabit üst/alt çubuk, yalnızca orta alan kayar).
import { useEffect, useState } from 'react';
import { LogOut, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import ConfirmModal from './ConfirmModal.jsx';
import { apiRequest } from '../lib/api.js';
import { PHASES } from '../lib/phases.js';

// Aşamaların yönetici ekranındaki adları (öğrenci ekranında aşama adı hiç yazmaz).
const PHASE_LABELS = { pretest: 'Ön Test', posttest: 'Son Test' };

export default function AdminScreen({ token, onLogout }) {
  const [phase, setPhase] = useState(null); // Sunucudaki aktif aşama; null = yükleniyor
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null); // Onay bekleyen yeni aşama
  const [saving, setSaving] = useState(false);

  // Yönetici token'ı geçersizse (401) oturum kapatılır; diğer hatalar ekranda gösterilir.
  const handleError = (err) => {
    if (err.status === 401) onLogout();
    else setError(err.message);
  };

  const loadPhase = async () => {
    setError('');
    try {
      const data = await apiRequest('/api/admin/phase', { token });
      setPhase(data.phase);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    loadPhase();
  }, [token]);

  const confirmChange = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await apiRequest('/api/admin/phase', { method: 'POST', body: { phase: target }, token });
      setPhase(data.phase);
      setTarget(null);
    } catch (err) {
      setTarget(null);
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
        <span className="font-semibold truncate">Yönetici Paneli</span>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Çıkış</span>
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Aktif Aşama</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Öğrenci ekranları aktif aşamaya göre açılır. Aşama değişince eski kayıtlar silinmez.
            </p>

            {phase === null && !error && (
              <div className="py-6 flex justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" aria-label="Yükleniyor" />
              </div>
            )}

            {phase !== null && (
              <div className="mt-4 grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                {PHASES.map((id) => {
                  const active = phase === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      disabled={active || saving}
                      onClick={() => setTarget(id)}
                      className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                        active ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {PHASE_LABELS[id]}
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="flex-1">{error}</p>
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={loadPhase}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tekrar Dene
                  </button>
                </div>
              </div>
            )}
          </section>

          <p className="text-center text-xs text-slate-400">Panelin diğer bölümleri sonraki adımlarda eklenecek.</p>
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-400">
        TÜBİTAK 2204-A Lise Araştırma Projesi
      </footer>

      <ConfirmModal
        open={target !== null}
        title="Aşama değiştirilsin mi?"
        message={`Aktif aşama "${PHASE_LABELS[target] ?? ''}" olarak değiştirilecek. Açık öğrenci ekranları yeni aşamaya geçer. Eski kayıtlar silinmez.`}
        confirmLabel="Değiştir"
        busy={saving}
        onConfirm={confirmChange}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
