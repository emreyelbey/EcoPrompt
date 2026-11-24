// Yönetici paneli (Dilim 6–7): üst çubukta aktif aşama anahtarı ve yenileme; 5 sekme.
//   1) Genel Bakış & Grafikler  2) Ön Test – Son Test & İstatistik (mini SPSS + Excel, Dilim 7)
//   3) Öğrenci Kayıtları  4) Katılımcı Kodları (60)  5) Metodoloji & Kaynakça
// Bütün veri requireAdmin korumalı /api/admin/* uç noktalarından gelir (tarayıcı veritabanına erişmez).
// Veri artımlı yenilenir (useAdminData.js): Firestore okuma kotası korunur.
// Bu dosya App.jsx'te React.lazy ile yüklenir; öğrenci tarayıcısı panel ve grafik kodunu indirmez.
// Düzen kuralları proje rehberi Bölüm 8'e uyar (sabit üst/alt çubuk, yalnızca orta alan kayar).
// Örnek veri önizlemesi (Dilim 8): örnek veri tarayıcıda üretilir (src/lib/sampleData.js), veritabanına
// HİÇ yazılmaz. Önizleme açıkken Genel Bakış, İstatistik ve Kayıtlar sekmeleri YALNIZCA örnek veriyi
// (ayrı kodlar, OK/OD) gösterir; gerçek veriyle asla karışmaz. Uyarı bandı sabit üst çubuktadır (kaydırınca
// kaybolmaz), her kartta "ÖRNEK VERİ" işareti çıkar, Excel/CSV, silme ve temizleme pasiftir.
// Katılımcı Kodları sekmesi ve aşama anahtarı her zaman gerçek veriyle çalışır.
import { useCallback, useMemo, useState } from 'react';
import { LogOut, Loader2, AlertCircle, RefreshCw, BarChart3, Activity, Database, Users, BookOpen, AlertTriangle, FlaskConical } from 'lucide-react';
import ConfirmModal from '../ConfirmModal.jsx';
import MethodologyContent from '../eko/MethodologyContent.jsx';
import ClearDataModal from './ClearDataModal.jsx';
import CodesTab from './CodesTab.jsx';
import ExperimentDesignSection from './ExperimentDesignSection.jsx';
import OverviewTab from './OverviewTab.jsx';
import { PreviewContext } from './PreviewContext.jsx';
import RecordsTab from './RecordsTab.jsx';
import StatsTab from './StatsTab.jsx';
import Toast from './Toast.jsx';
import useAdminData from './useAdminData.js';
import { apiRequest } from '../../lib/api.js';
import { PHASES } from '../../lib/phases.js';
import { PHASE_LABELS, realRecords } from '../../lib/adminSummary.js';
import { generateSampleData, SAMPLE_CODE_GROUPS } from '../../lib/sampleData.js';

export default function AdminScreen({ token, onLogout }) {
  const data = useAdminData(token, onLogout);
  const [tab, setTab] = useState('overview');
  const [phaseTarget, setPhaseTarget] = useState(null); // onay bekleyen yeni aşama
  const [savingPhase, setSavingPhase] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);
  // Örnek veri önizlemesi: açılınca örnek set bir kez üretilir (sabit tohumlu, her seferinde aynı veri).
  const [sample, setSample] = useState(null); // null = önizleme kapalı
  const preview = sample !== null;
  const togglePreview = () => setSample((current) => (current ? null : generateSampleData()));

  // Veritabanındaki örnek kayıtlar (eski sürümlerden kalmış olabilir) hiçbir hesaba girmez.
  const real = useMemo(() => realRecords(data.records), [data.records]);
  const sampleCount = data.records.length - real.length;

  // Sekmelere giden veri: önizlemede YALNIZCA örnek set ve örnek kod listesi; değilse gerçek veri.
  // undefined → hesaplar varsayılan izin listesini (60 katılımcı kodu) kullanır.
  const shown = preview
    ? { records: sample.records, logins: sample.logins, codeGroups: SAMPLE_CODE_GROUPS }
    : { records: real, logins: data.logins, codeGroups: undefined };

  const confirmPhase = async () => {
    setSavingPhase(true);
    try {
      const res = await apiRequest('/api/admin/phase', { method: 'POST', body: { phase: phaseTarget }, token });
      data.setPhase(res.phase);
      setToast(`Aktif aşama "${PHASE_LABELS[res.phase]}" olarak değiştirildi.`);
    } catch (err) {
      if (err.status === 401) onLogout();
      else setToast(err.message);
    } finally {
      setSavingPhase(false);
      setPhaseTarget(null);
    }
  };

  const handleCleared = (deleted) => {
    setClearOpen(false);
    data.clearAll();
    setToast(`Silindi: ${deleted.interactions} etkileşim, ${deleted.logins} giriş, ${deleted.rateLimits} hız sınırı kaydı.`);
  };

  const tabs = [
    { id: 'overview', label: 'Genel Bakış & Grafikler', icon: BarChart3 },
    { id: 'stats', label: 'Ön Test – Son Test & İstatistik', icon: Activity },
    { id: 'records', label: `Öğrenci Kayıtları (${shown.records.length})`, icon: Database },
    { id: 'codes', label: 'Katılımcı Kodları (60)', icon: Users },
    { id: 'methodology', label: 'Metodoloji & Kaynakça', icon: BookOpen },
  ];

  return (
    <PreviewContext.Provider value={preview}>
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      <header className="shrink-0 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold truncate">Yönetici Paneli</span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Aktif aşama anahtarı: değişiklik onay penceresiyle yapılır */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80" role="group" aria-label="Aktif aşama">
              <span className="hidden md:inline px-1.5 text-[11px] text-slate-500">Aktif Aşama:</span>
              {PHASES.map((id) => {
                const active = data.phase === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    disabled={active || savingPhase || data.phase === null}
                    onClick={() => setPhaseTarget(id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      active ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {PHASE_LABELS[id]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={data.refresh}
              disabled={data.refreshing}
              title="Yeni kayıtları şimdi getir (otomatik: 15 sn'de bir)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${data.refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              Yenile
            </button>
            {data.lastUpdated && (
              <span className="hidden sm:inline text-[11px] text-slate-500">
                Son güncelleme: {new Date(data.lastUpdated).toLocaleTimeString('tr-TR')}
              </span>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Çıkış
            </button>
          </div>
        </div>

        {/* Sekmeler */}
        <nav className="border-t border-slate-200" aria-label="Panel sekmeleri">
          <div className="max-w-7xl mx-auto px-3 sm:px-5 flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Önizleme bandı: sabit üst çubuğun içinde, sayfa kaydırılınca kaybolmaz */}
        {preview && (
          <div
            role="status"
            data-testid="onizleme-bandi"
            className="border-t-2 border-amber-500 bg-amber-400 text-amber-950"
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <p className="flex items-start gap-2 font-semibold">
                <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  ÖRNEK VERİ ÖNİZLEMESİ — gerçek deney verisi değildir. Excel/CSV, silme ve temizleme kapalı.
                  <span className="font-normal"> Katılımcı Kodları sekmesi ve aşama anahtarı gerçek veriyi gösterir.</span>
                </span>
              </p>
              <button
                type="button"
                onClick={togglePreview}
                className="shrink-0 rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
              >
                Önizlemeden Çık
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-4">
        <div className="max-w-7xl mx-auto space-y-4 pb-6">
          {sampleCount > 0 && (
            <div role="note" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              <p>
                Veritabanında <strong>{sampleCount} örnek kayıt</strong> var. Örnek kayıtlar istatistiklere, grafiklere ve
                Excel'e girmez; canlı deneyden önce temizlenmelidir.
              </p>
            </div>
          )}

          {data.error && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 flex flex-wrap items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <p className="flex-1">{data.error}</p>
              <button
                type="button"
                onClick={data.reloadAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                Tekrar Dene
              </button>
            </div>
          )}

          {data.loading ? (
            <div className="py-16 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" aria-label="Yükleniyor" />
            </div>
          ) : (
            <>
              {tab === 'overview' && (
                <OverviewTab
                  records={shown.records}
                  logins={shown.logins}
                  codeGroups={shown.codeGroups}
                  onClearClick={() => setClearOpen(true)}
                  onTogglePreview={togglePreview}
                />
              )}
              {tab === 'stats' && (
                <StatsTab
                  records={shown.records}
                  logins={shown.logins}
                  codeGroups={shown.codeGroups}
                  currentConfigHash={data.currentConfigHash}
                  onToast={setToast}
                />
              )}
              {tab === 'records' && (
                <RecordsTab
                  records={shown.records}
                  token={token}
                  onUnauthorized={onLogout}
                  onDeleted={data.removeRecord}
                  onToast={setToast}
                />
              )}
              {tab === 'codes' && <CodesTab records={data.records} logins={data.logins} onToast={setToast} />}
              {tab === 'methodology' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                  <ExperimentDesignSection />
                  <MethodologyContent />
                </div>
              )}
            </>
          )}

          {!data.loading && (
            <p className="text-center text-[11px] text-slate-400">
              Panel yeni kayıtları 15 sn'de bir otomatik getirir (sekme açıkken). Başka bir cihazdan silinen kayıtlar için
              <button type="button" onClick={data.reloadAll} className="ml-1 underline hover:text-slate-600">
                tümünü yeniden yükle
              </button>
              .
            </p>
          )}
        </div>
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-400">
        TÜBİTAK 2204-A Lise Araştırma Projesi
      </footer>

      <ConfirmModal
        open={phaseTarget !== null}
        title="Aşama değiştirilsin mi?"
        message={`Aktif aşama "${PHASE_LABELS[phaseTarget] ?? ''}" olarak değiştirilecek. Açık öğrenci ekranları yeni aşamaya geçer. Eski kayıtlar silinmez.`}
        confirmLabel="Değiştir"
        busy={savingPhase}
        onConfirm={confirmPhase}
        onCancel={() => setPhaseTarget(null)}
      />

      <ClearDataModal
        open={clearOpen}
        token={token}
        onUnauthorized={onLogout}
        onCleared={handleCleared}
        onCancel={() => setClearOpen(false)}
      />

      <Toast message={toast} onDone={clearToast} />
    </div>
    </PreviewContext.Provider>
  );
}
