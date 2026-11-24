// Yönetici paneli (Dilim 6–7, görünüm Yön 2b): 5 sekme.
//   1) Genel Bakış  2) İstatistik (mini SPSS + Excel, Dilim 7)  3) Öğrenci Kayıtları  4) Katılımcı Kodları (60)
//   5) Metodoloji (deney deseni + kaynakça)
// Bütün veri requireAdmin korumalı /api/admin/* uç noktalarından gelir (tarayıcı veritabanına erişmez).
// Veri artımlı yenilenir (useAdminData.js): Firestore okuma kotası korunur.
// Bu dosya App.jsx'te React.lazy ile yüklenir; öğrenci tarayıcısı panel ve grafik kodunu indirmez.
//
// DÜZEN (proje rehberi Bölüm 8: ana görünüm kilitli, yalnızca orta alan kayar):
//   - Geniş ekran (lg = 1024 px ve üstü): solda siyah kenar menüsü (logo, sekmeler + sayılar, canlı güncelleme
//     kutusu, Çıkış). Sağda başlık çubuğu (sekme başlığı, aktif aşama anahtarı, önizleme bandı) ve kayan içerik.
//   - Dar ekran: kenar menüsü kompakt, sabit siyah üst şerit olur (logo, Yenile, Çıkış). Sekmeler tablette (sm–lg)
//     yatay kayan hap listesi, telefonda (sm altı) tam genişlikte yerel bir seçim kutusudur.
//   - Başlık çubuğu ve içerik aynı kapsayıcıdadır (en fazla 1440 px, ortalı); aşama anahtarı kartlarla hizalıdır.
//
// Örnek veri önizlemesi (Dilim 8): örnek veri tarayıcıda üretilir (src/lib/sampleData.js), veritabanına
// HİÇ yazılmaz. Önizleme açıkken Genel Bakış, İstatistik ve Kayıtlar sekmeleri YALNIZCA örnek veriyi
// (ayrı kodlar, OK/OD) gösterir; gerçek veriyle asla karışmaz. Uyarı bandı sabit başlık çubuğundadır (kaydırınca
// kaybolmaz), her kartta "ÖRNEK VERİ" işareti çıkar, Excel/CSV, silme ve temizleme pasiftir.
// Katılımcı Kodları sekmesi ve aşama anahtarı her zaman gerçek veriyle çalışır.
import { useCallback, useMemo, useState } from 'react';
import { LogOut, Loader2, AlertCircle, RefreshCw, AlertTriangle, FlaskConical, ChevronDown } from 'lucide-react';
import ConfirmModal from '../ConfirmModal.jsx';
import MethodologyContent from '../eko/MethodologyContent.jsx';
import { BrandMark } from '../ui/BrandMark.jsx';
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

// Sekmenin tam adı: sayılı sekmelerde "Öğrenci Kayıtları (12)". Kenar menüsü butonlarının erişilebilir adı ve
// telefondaki seçim kutusunun seçenek metni aynı fonksiyondan gelir.
function tabAccessibleName(t) {
  return t.count === undefined ? t.label : `${t.label} (${t.count})`;
}

// Saat "03:52:59" biçiminde.
function clock(ms) {
  return new Date(ms).toLocaleTimeString('tr-TR');
}

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

  // Sekmeler: kısa ad + (varsa) sayı. Erişilebilir ad sayıyı parantez içinde de söyler: "Öğrenci Kayıtları (12)".
  // eyebrow: başlığın üstündeki küçük mono satır; title: [düz kelime, italik serif kelime].
  const tabs = [
    { id: 'overview', label: 'Genel Bakış', eyebrow: 'KATILIM VE AYAK İZİ', title: ['Genel', 'bakış'] },
    { id: 'stats', label: 'İstatistik', eyebrow: 'ÖN TEST – SON TEST', title: ['İstatistik', 'özeti'] },
    {
      id: 'records',
      label: 'Öğrenci Kayıtları',
      count: shown.records.length,
      eyebrow: 'ETKİLEŞİM KAYITLARI',
      title: ['Öğrenci', 'kayıtları'],
    },
    { id: 'codes', label: 'Katılımcı Kodları', count: 60, eyebrow: '30 KONTROL · 30 DENEY', title: ['Katılımcı', 'kodları'] },
    { id: 'methodology', label: 'Metodoloji', eyebrow: 'DENEY DESENİ VE KAYNAKÇA', title: ['Metodoloji', 've kaynakça'] },
  ];
  const current = tabs.find((t) => t.id === tab);

  return (
    <PreviewContext.Provider value={preview}>
      <div className="fixed inset-0 w-full h-full flex flex-col lg:flex-row overflow-hidden bg-paper text-ink">
        {/* ---------- KENAR MENÜSÜ (lg) / ÜST ŞERİT (dar ekran) ---------- */}
        <aside className="shrink-0 bg-ink text-on-dark lg:w-[248px] lg:h-full flex flex-col gap-3 lg:gap-7 px-3 lg:px-4 pt-3 pb-3 sm:pb-2 lg:py-6">
          <div className="flex items-center gap-3 lg:px-2">
            <BrandMark variant="orbit" size={36} tone="dark" />
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold tracking-[-0.02em] truncate">
                Eğitim <span className="font-serif italic font-normal text-[17px]">Asistanı</span>
              </span>
              <span className="font-mono text-[10px] tracking-[0.1em] text-on-dark-2">YÖNETİM</span>
            </div>
            {/* Dar ekranda Yenile ve Çıkış üst şeritte; geniş ekranda menünün altında. */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <DarkIconButton label="Yeni kayıtları şimdi getir" onClick={data.refresh} disabled={data.refreshing}>
                <RefreshCw className={`w-[18px] h-[18px] ${data.refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              </DarkIconButton>
              <DarkIconButton label="Çıkış" onClick={onLogout}>
                <LogOut className="w-[18px] h-[18px]" aria-hidden="true" />
              </DarkIconButton>
            </div>
          </div>

          {/* Telefon (sm altı): sekmeler yerel bir seçim kutusunda. Yatay kayan liste telefonda kesiliyor ve
              sağdaki sekmeler fark edilmiyordu. Yazı 16 px (iOS yakınlaştırmaz), yükseklik 44 px. */}
          <div className="relative sm:hidden">
            <label htmlFor="panel-sekme" className="sr-only">
              Panel sekmesi
            </label>
            <select
              id="panel-sekme"
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              // Düz koyu zemin + color-scheme: dark → tarayıcı açılan seçenek listesini de koyu çizer (beyaz/mavi
              // işletim sistemi görünümü yerine). Seçeneklerin zemini ve metni de belirteçlerden verilir; destekleyen
              // tarayıcılar bunu kullanır. Yerel <select> olarak kalır (klavye ve ekran okuyucu desteği hazır gelir).
              className="w-full h-11 appearance-none rounded-full border border-white/15 bg-ink-2 pl-4 pr-10 text-base font-medium text-on-dark [color-scheme:dark] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {tabs.map((t) => (
                <option key={t.id} value={t.id} className="bg-ink-2 text-on-dark">
                  {tabAccessibleName(t)}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-dark-2"
              aria-hidden="true"
            />
          </div>

          {/* Sekmeler: tablette (sm–lg) yatay kayan hap listesi, geniş ekranda (lg) dikey kenar menüsü */}
          <nav aria-label="Panel sekmeleri" className="hidden sm:block -mx-3 px-3 lg:mx-0 lg:px-0 overflow-x-auto lg:overflow-visible">
            <div className="flex lg:flex-col gap-1 lg:gap-0.5 w-max lg:w-auto">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    aria-label={tabAccessibleName(t)}
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 h-10 lg:h-11 px-3.5 lg:px-3 rounded-full lg:rounded-xl text-[13px] lg:text-sm flex items-center justify-between gap-3 text-left transition-colors ${
                      active ? 'bg-on-dark text-ink font-semibold' : 'text-on-dark-link font-medium hover:bg-white/5'
                    }`}
                  >
                    <span className="whitespace-nowrap">{t.label}</span>
                    {t.count !== undefined && (
                      <span className="font-mono text-[11px] text-text-3">{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Geniş ekran: canlı güncelleme kutusu ve Çıkış menünün altında */}
          <div className="hidden lg:flex flex-1" />
          <div className="hidden lg:flex flex-col gap-1.5 rounded-[14px] border border-white/10 p-3">
            <span className="font-mono text-[10px] tracking-[0.1em] text-on-dark-2">CANLI</span>
            <span className="text-[13px] text-line-2">
              {data.lastUpdated ? `Son güncelleme ${clock(data.lastUpdated)}` : 'Yükleniyor…'}
            </span>
            <span className="text-xs text-on-dark-2">15 sn'de bir yenilenir</span>
            <button
              type="button"
              onClick={data.refresh}
              disabled={data.refreshing}
              title="Yeni kayıtları şimdi getir (otomatik: 15 sn'de bir)"
              className="mt-1.5 h-9 rounded-full border border-white/15 text-xs font-medium text-line-2 hover:bg-white/5 disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${data.refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              Yenile
            </button>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="hidden lg:inline-flex h-11 rounded-full border border-white/15 text-[13px] text-line-2 hover:bg-white/5 items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Çıkış
          </button>
        </aside>

        {/* ---------- SAĞ SÜTUN: başlık çubuğu + içerik ----------
            Kaydırma alanı sağ sütunun tamamıdır. İçinde TEK bir kapsayıcı vardır (en fazla 1440 px, yatayda ortalı):
            başlık çubuğu ve bütün sekmelerin içeriği bu kapsayıcıdadır. Böylece aşama anahtarı kartların sağ kenarıyla
            birebir hizalıdır (kaydırma çubuğu da ikisini aynı oranda daraltır).
            Başlık çubuğu "sticky": içerik kayarken kapsayıcının tepesinde sabit kalır (önizleme bandı kaybolmaz).
            Negatif yan boşluk + aynı iç boşluk: başlığın kâğıt rengi zemini kapsayıcının kenar boşluklarını da örter. */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-9">
            <header className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-9 px-4 sm:px-6 lg:px-9 bg-paper pt-4 lg:pt-7 pb-4 flex flex-col gap-4 border-b border-line lg:border-b-0">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="font-mono text-[11px] tracking-[0.1em] text-text-3">{current.eyebrow}</span>
                  <h1 className="text-[28px] leading-8 lg:text-[36px] lg:leading-10 font-semibold tracking-[-0.035em]">
                    {current.title[0]} <span className="font-serif italic font-normal">{current.title[1]}</span>
                  </h1>
                </div>

                {/* Aktif aşama anahtarı: değişiklik onay penceresiyle yapılır */}
                <div className="flex items-center gap-2.5">
                  <span className="hidden sm:inline text-xs text-text-3">Aktif aşama</span>
                  <div className="flex p-1 rounded-full bg-muted" role="group" aria-label="Aktif aşama">
                    {PHASES.map((id) => {
                      const active = data.phase === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={active}
                          disabled={active || savingPhase || data.phase === null}
                          onClick={() => setPhaseTarget(id)}
                          className={`h-10 px-4 sm:px-[18px] rounded-full text-[13px] transition-colors ${
                            active ? 'bg-ink text-paper font-semibold' : 'text-text-2 font-medium hover:text-ink disabled:hover:text-text-2'
                          }`}
                        >
                          {PHASE_LABELS[id]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Önizleme bandı: sabit başlık çubuğunun içinde, sayfa kaydırılınca kaybolmaz. Bilerek belirgin turuncudur
                  (kontrol listesi "turuncu bant" diye tarif eder): önizleme ekranı gerçek sonuç sanılmamalı. */}
              {preview && (
                <div
                  role="status"
                  data-testid="onizleme-bandi"
                  className="rounded-[14px] border-2 border-amber-500 bg-amber-400 text-amber-950 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px]"
                >
                  <p className="flex items-start gap-2.5">
                    <FlaskConical className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      <b className="font-semibold">ÖRNEK VERİ ÖNİZLEMESİ</b> — gerçek deney verisi değildir. Excel/CSV, silme ve
                      temizleme kapalı.
                      <span className="opacity-80"> Katılımcı Kodları sekmesi ve aşama anahtarı gerçek veriyi gösterir.</span>
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={togglePreview}
                    className="shrink-0 h-9 px-4 rounded-full bg-amber-950 text-white text-xs font-semibold hover:bg-amber-900"
                  >
                    Önizlemeden Çık
                  </button>
                </div>
              )}
            </header>

            <main className="pt-4 lg:pt-1 pb-10">
              <div className="space-y-4">
                {sampleCount > 0 && (
                  <div role="note" className="rounded-[14px] border border-amber-300 bg-warn-bg px-4 py-2.5 text-sm text-warn-ink flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <p>
                      Veritabanında <strong>{sampleCount} örnek kayıt</strong> var. Örnek kayıtlar istatistiklere, grafiklere ve
                      Excel'e girmez; canlı deneyden önce temizlenmelidir.
                    </p>
                  </div>
                )}

                {data.error && (
                  <div role="alert" className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 flex flex-wrap items-center gap-3">
                    <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <p className="flex-1">{data.error}</p>
                    <button
                      type="button"
                      onClick={data.reloadAll}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
                    >
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                      Tekrar Dene
                    </button>
                  </div>
                )}

                {data.loading ? (
                  <div className="py-16 flex justify-center text-text-3">
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
                      <div className="bg-surface rounded-[20px] border border-line p-5 space-y-5">
                        <ExperimentDesignSection />
                        <MethodologyContent />
                      </div>
                    )}
                  </>
                )}

                {!data.loading && (
                  <p className="pt-2 text-[11px] text-text-3">
                    Panel yeni kayıtları 15 sn'de bir otomatik getirir (sekme açıkken). Başka bir cihazdan silinen kayıtlar için
                    <button type="button" onClick={data.reloadAll} className="ml-1 underline hover:text-ink">
                      tümünü yeniden yükle
                    </button>
                    . · TÜBİTAK 2204-A Lise Araştırma Projesi
                  </p>
                )}
              </div>
            </main>
          </div>
        </div>

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

// Siyah şeritteki yuvarlak ikon butonu (44 px dokunma alanı). Yazı görünmez; ad aria-label'dan okunur.
function DarkIconButton({ label, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 text-on-dark flex items-center justify-center disabled:opacity-60"
    >
      {children}
    </button>
  );
}
