// Öğrenci sohbet ekranı. İki görünümü vardır (view, App.jsx'te getStudentView ile belirlenir):
// - 'sade': "Eğitim Asistanı". Ön Testte iki grup da, Son Testte Kontrol grubu bunu görür.
//   ÇEVRESEL GÖSTERGE YOKTUR (sunucu da bu verileri tarayıcıya göndermez).
// - 'ekotoken': yalnızca Deney grubu + Son Test. Üstte özet şeridi, yanıt altında rozetler ve
//   tasarruf ipucu, üst çubukta Kişisel Rapor ve Metodoloji pencereleri. Veriler, sunucunun yalnızca
//   bu görünümde eklediği `eco` alanından gelir.
// Gönderme ve aşama güvencesi mantığı iki görünümde ortaktır (kopyalanmaz).
// Düzen kuralları (proje rehberi Bölüm 8): tam ekran kilitli yerleşim, yalnızca mesaj listesi kayar,
// kaydırma yalnızca container.scrollTo ile yapılır (scrollIntoView YOK), model seçici grid-cols-3.
// Mobil (Dilim 8d): dokunma hedefleri en az 40 px. Yazma alanı odaktayken (klavye açık) mobilde ikincil
// satırlar (EkoToken özet şeridi, model açıklaması) gizlenir; böylece klavye açıkken Deney grubunun
// ekranı Kontrol grubununkinden daha sıkışık olmaz (iki grupta üst ve alt çubuk aynı yükseklikte kalır).
// Görünüm (Yön 2b, reference/tasarim-yon2b/Yon2b-Sohbet.dc.html): beyaz üst çubuk, kayan siyah hap ile model
// seçici, siyah kullanıcı balonu, kart olmayan asistan yanıtı, altta yüzen yazma kapsülü. Masaüstünde sohbet
// sütunu en fazla 760 px genişlikte ortalanır (okunabilir satır uzunluğu). Sade görünümde yeşil, yaprak,
// "eko" veya ölçüm izi YOKTUR; yeşil (eco) ve halka logo yalnızca EkoToken görünümündedir.
// Aşama (Ön Test / Son Test) bu ekranda HİÇ YAZMAZ (kör deney). Aşama değişince yalnızca nötr bir
// "Yeni oturum başladı" notu çıkar ve yeni aşamanın mesajları yüklenir.
// Sunucu doğru kaynaktır: /api/messages yanıtındaki aşama onServerPhase ile üst bileşene bildirilir;
// /api/chat yanıtındaki aşama ekrandakinden farklıysa geçmiş yeniden yüklenir.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, ArrowUp, RefreshCw, AlertCircle, X, Loader2, Info, PieChart as PieChartIcon, BookOpen } from 'lucide-react';
import RichMessage from './RichMessage.jsx';
import { BrandMark, Wordmark } from './ui/BrandMark.jsx';
import EcoSummaryBar from './eko/EcoSummaryBar.jsx';
import EcoImpactFooter from './eko/EcoImpactFooter.jsx';
import { summarizeSession } from '../lib/ecoSummary.js';
import { apiRequest } from '../lib/api.js';
import { MODEL_ORDER, MODEL_SCALES } from '../lib/footprint.js';
import { chatResponseAction } from '../lib/phases.js';
import { DEFAULT_MODEL, loadModelChoice, saveModelChoice } from '../lib/session.js';

// Pencereler ihtiyaç anında yüklenir: grafik kütüphanesi ayrı bir parçaya düşer ve
// sade ekrandaki öğrencinin tarayıcısı bu kodu hiç indirmez.
const PersonalReportModal = lazy(() => import('./eko/PersonalReportModal.jsx'));
const MethodologyModal = lazy(() => import('./eko/MethodologyModal.jsx'));

// Sunucudaki sınırlarla aynı değerler (asıl kontrol sunucuda yapılır).
const MAX_PROMPT_LENGTH = 4000;
const COOLDOWN_MS = 3000;

// Model seçicideki kısa adlar (mobil) ve nötr açıklamalar. Açıklamalarda çevresel ifade yoktur.
const MODEL_LABELS = {
  light: { short: 'Hafif', desc: 'Hızlı, kısa ve doğrudan yanıtlar' },
  standard: { short: 'Standart', desc: 'Dengeli açıklama ve örneklerle anlatım' },
  reasoning: { short: 'Akıl Yürütme', desc: 'Adım adım, derinlemesine çözüm' },
};

// Üst çubuk, mesaj listesi ve yazma alanı aynı sütunda hizalanır: telefonda tam genişlik (16 px kenar
// boşluğu), masaüstünde en fazla 760 px ve ortada; çok geniş ekranda (2xl = 1536 px ve üstü) 800 px.
// Böylece masaüstünde satırlar okunabilir uzunlukta kalır. İçerik genişliği = sütun − 2 × 24 px kenar boşluğu
// (712 px; 2xl'de 752 px). Bu sayılar aşağıdaki üst çubuk ızgarasında ve kart konumunda da kullanılır.
const COLUMN_CLASS = 'w-full max-w-[760px] 2xl:max-w-[800px] mx-auto px-4 sm:px-6';

// Üst çubuk ızgarası (alan adları JSX'te açıklanmıştır). xl altında okuma sütunu genişliğinde iki satır,
// xl ve üstünde tam genişlikte üç sütun: [logo + ad] [okuma sütununun içerik genişliği] [ikon butonları].
// Not: 2xl:max-w-none da gerekir; yoksa sütunun 2xl:max-w-[800px] sınıfı xl'deki sınırsızlığı ezer.
const HEADER_GRID_CLASS = [
  'w-full max-w-[760px] 2xl:max-w-[800px] mx-auto px-4 sm:px-6 pt-4 pb-3.5',
  'grid grid-cols-[minmax(0,1fr)_auto] gap-3 [grid-template-areas:"brand_actions"_"sel_sel"]',
  'xl:max-w-none 2xl:max-w-none xl:items-start xl:gap-x-6 xl:[grid-template-areas:"brand_sel_actions"]',
  'xl:grid-cols-[minmax(0,1fr)_712px_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1fr)_752px_minmax(0,1fr)]',
].join(' ');

// EkoToken oturum özetinin yeri.
// - xl altı: beyaz şerit, üst çubuğun devamı (alt kenar çizgisi burada), içinde siyah kart.
// - xl ve üstü: "birikim sütunu" alanı. Üst çubuğun hemen altından yazma alanının üstüne kadar uzanır
//   (top-0 bottom-0), solunda ince dikey çizgi vardır, kutusu yoktur. Mesaj listesinin dışında olduğu için
//   mesajlar kayarken yerinde kalır. Sol kenar = ekran ortası + yarım sütun (380 px; 2xl'de 400 px) + 20 px aralık.
//   Genişlik en fazla 280 px; ekran dar kalırsa sağda 20 px boşluk kalacak kadar daralır (1280 px'te 220 px).
const ECO_CARD_PLACEMENT_CLASS = [
  'shrink-0 bg-surface border-b border-line',
  'xl:absolute xl:z-10 xl:top-0 xl:bottom-0 xl:bg-transparent xl:border-b-0 xl:border-l',
  'xl:left-[calc(50%+400px)] xl:w-[min(280px,calc(50%-420px))]',
  '2xl:left-[calc(50%+420px)] 2xl:w-[min(280px,calc(50%-440px))]',
].join(' ');

// Mesaj saatini "14:05" biçiminde yazar.
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ student, view = 'sade', onServerPhase, onLogout }) {
  const isEco = view === 'ekotoken';
  const [messages, setMessages] = useState([]); // Sunucudan gelen, kaydı yazılmış mesajlar
  const [historyState, setHistoryState] = useState('loading'); // 'loading' | 'ready' | hata metni
  // Seçili model sayfa yenilenince korunur (sessionStorage, kod + aşama başına); yoksa Standart.
  const [selectedModel, setSelectedModel] = useState(() => loadModelChoice(student.code, student.phase));
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null); // Gönderilen ama henüz yanıtı gelmemiş istem: { prompt, modelId }
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(''); // Son gönderimin hata mesajı
  const [cooldown, setCooldown] = useState(false); // İki gönderim arası 3 sn bekleme
  const [sessionNote, setSessionNote] = useState(false); // Nötr "Yeni oturum başladı" notu
  const [reportOpen, setReportOpen] = useState(false); // Kişisel Rapor penceresi (yalnız EkoToken)
  const [methodologyOpen, setMethodologyOpen] = useState(false); // Metodoloji penceresi (yalnız EkoToken)
  const [inputFocused, setInputFocused] = useState(false); // Yazma alanı odakta mı (mobilde klavye açık demek)

  // EkoToken özeti: yalnızca `eco` alanı olan mesajlardan hesaplanır (sade görünümde gösterilmez).
  const ecoSummary = useMemo(() => summarizeSession(messages), [messages]);

  const containerRef = useRef(null);
  const blurTimerRef = useRef(null); // Odak kaybını biraz geciktiren zamanlayıcı (aşağıda açıklama var)
  // Ekranda mesajları gösterilen aşama (son başarılı /api/messages yanıtından). İlk açılışta null.
  const loadedPhaseRef = useRef(null);
  // Her geçmiş yüklemesine sıra numarası verilir; geç gelen eski yanıt yok sayılır.
  const historyRequestRef = useRef(0);

  // Kullanıcı bir model seçti: ekranda göster ve bu kod + aşama için hatırla.
  const chooseModel = (modelId) => {
    setSelectedModel(modelId);
    saveModelChoice(student.code, student.phase, modelId);
  };

  // Aşama değişti: seçim varsayılana (Standart) döner. Varsayılan yeni aşamanın anahtarına da yazılır;
  // böylece o aşamadan kalmış eski bir seçim (ör. Son Test'ten Ön Test'e dönüş) geri gelmez.
  const resetModelForPhase = (phase) => {
    setSelectedModel(DEFAULT_MODEL);
    saveModelChoice(student.code, phase, DEFAULT_MODEL);
  };

  // Aktif aşamadaki kendi mesajlarımızı sunucudan yükle. Bu çağrı sunucuda giriş kaydını da günceller.
  const loadHistory = async () => {
    const requestNo = ++historyRequestRef.current;
    setHistoryState('loading');
    try {
      const data = await apiRequest('/api/messages', { method: 'POST', body: { code: student.code } });
      if (requestNo !== historyRequestRef.current) return; // Daha yeni bir yükleme başladı.
      // Ekrandaki aşamadan farklı bir aşamaya geçildiyse nötr not gösterilir (ilk açılışta gösterilmez).
      if (loadedPhaseRef.current !== null && loadedPhaseRef.current !== data.phase) {
        setSessionNote(true);
        resetModelForPhase(data.phase);
      } else if (loadedPhaseRef.current === null && data.phase !== student.phase) {
        // İlk açılışta sunucu farklı bir aşama söyledi: seçim o aşamanın kaydından okunur.
        setSelectedModel(loadModelChoice(student.code, data.phase));
      }
      loadedPhaseRef.current = data.phase;
      setMessages(data.messages);
      setHistoryState('ready');
      onServerPhase?.(data.phase); // Sunucunun aşaması ekrandakinden farklıysa üst bileşen günceller.
    } catch (err) {
      if (requestNo !== historyRequestRef.current) return;
      setHistoryState(err.message);
    }
  };

  // Açılışta ve aşama değiştiğinde geçmişi yükle.
  useEffect(() => {
    // Bu aşamanın mesajları zaten ekrandaysa (aşamayı bize /api/messages söylediyse) yeniden yükleme.
    if (loadedPhaseRef.current === student.phase) return;

    // Ekran açıkken aşama değişti: eski aşamaya ait bekleyen istem ve hata temizlenir, nötr not gösterilir.
    if (loadedPhaseRef.current !== null) {
      setMessages([]);
      setPending(null);
      setError('');
      setSessionNote(true);
      resetModelForPhase(student.phase);
    }
    loadHistory();
  }, [student.code, student.phase]);

  // Yazma alanı odak kazandı/kaybetti. Odak kaybı 200 ms gecikmeyle uygulanır: öğrenci klavye açıkken bir
  // butona (Gönder, Tekrar Dene, Kopyala…) dokunduğunda gizli satırlar hemen geri gelirse ekran kayar ve
  // dokunuş butonu ıskalayabilir. Gecikme, dokunuş tamamlandıktan sonra düzenin değişmesini sağlar.
  const handleInputFocus = () => {
    clearTimeout(blurTimerRef.current);
    setInputFocused(true);
  };
  const handleInputBlur = () => {
    clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => setInputFocused(false), 200);
  };
  useEffect(() => () => clearTimeout(blurTimerRef.current), []); // Ekran kapanınca zamanlayıcıyı temizle.

  // Yeni mesaj, bekleme göstergesi veya hata kartı gelince listenin en altına kaydır.
  // "Hareketi azalt" açıksa yumuşak kaydırma yerine anında kaydırılır (CSS kuralı JS'teki 'smooth'u durduramaz).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({ top: container.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages.length, pending, error, historyState]);

  // İstemi sunucuya gönderir. Başarısız olursa istem kaybolmaz: "Tekrar Dene" aynı istemi yollar.
  const send = async (prompt, modelId) => {
    const clean = prompt.trim();
    if (!clean || isSending || cooldown) return;
    if (clean.length > MAX_PROMPT_LENGTH) {
      setError(`İstem en fazla ${MAX_PROMPT_LENGTH} karakter olabilir.`);
      return;
    }

    setPending({ prompt: clean, modelId });
    setIsSending(true);
    setError('');
    setInput('');
    setCooldown(true);
    setTimeout(() => setCooldown(false), COOLDOWN_MS);
    const phaseAtStart = loadedPhaseRef.current;

    try {
      const data = await apiRequest('/api/chat', {
        method: 'POST',
        body: { code: student.code, modelId, prompt: clean },
      });
      setPending(null);
      if (chatResponseAction(loadedPhaseRef.current, data.phase) === 'append') {
        setMessages((old) => [...old, data.message]);
      } else {
        // Kayıt ekrandakinden farklı bir aşamaya yazıldı: geçmişi sunucudan yeniden al.
        // /api/messages yanıtı güncel aşamayı söyler ve ekran ona göre güncellenir.
        loadHistory();
      }
    } catch (err) {
      // İstek sürerken aşama değiştiyse eski aşamanın hatası yeni ekranda gösterilmez.
      if (loadedPhaseRef.current !== phaseAtStart) return;
      // Sahte yanıt gösterilmez; Türkçe hata kartı + Tekrar Dene.
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input, selectedModel);
  };

  // Enter gönderir, Shift+Enter yeni satır açar.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input, selectedModel);
    }
  };

  // Hatayı kapatınca istem metin kutusuna geri konur; öğrenci düzenleyip yeniden gönderebilir.
  const dismissError = () => {
    if (pending) setInput(pending.prompt);
    setPending(null);
    setError('');
  };

  // Sınıra 400 karakterden az kaldıysa sayaç, mobilde yazarken de görünür.
  const nearLimit = input.length > MAX_PROMPT_LENGTH - 400;
  const canSend = input.trim().length > 0 && !isSending && !cooldown && historyState === 'ready';

  // Seçili modelin model seçicideki sırası (kayan siyah hapın konumu için).
  const selectedIndex = Math.max(0, MODEL_ORDER.indexOf(selectedModel));

  return (
    <div className="app-viewport fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-paper text-ink">
      {/* SABİT ÜST ÇUBUK. Izgara düzeni (alan adları: brand = logo + ad, actions = ikon butonları,
          sel = model seçici + açıklama):
          - Telefon/tablet (xl altı): okuma sütunu genişliğinde iki satır → "brand actions" / "sel sel".
          - Masaüstü (xl = 1280 px ve üstü): tam genişlikte tek satır → "brand sel actions". Orta sütun
            okuma sütununun içerik genişliğine eşittir (712 px; 2xl'de 752 px), böylece model seçici mesajlarla
            aynı hizada durur. EkoToken'da xl altında alt kenar çizgisini "Bu oturum" kartının şeridi çizer. */}
      <header className={`shrink-0 bg-surface border-b border-line ${isEco ? 'max-xl:border-b-0' : ''}`}>
        <div className={HEADER_GRID_CLASS}>
          <div className="[grid-area:brand] min-w-0 flex items-center gap-3 xl:h-12">
            {/* Logo: sade görünümde dönen yörünge (nötr), EkoToken'da dolan yeşil halka */}
            <BrandMark variant={isEco ? 'ring' : 'orbit'} size={40} />
            <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
              {/* Not: sekme başlığı her görünümde "Eğitim Asistanı" kalır (kör deney). */}
              {isEco ? (
                <Wordmark as="h1" first="Eko" second="Token" className="text-lg leading-5 truncate" />
              ) : (
                <Wordmark as="h1" first="Eğitim " second="Asistanı" className="text-lg leading-5 truncate" />
              )}
              <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-text-3 truncate">
                {isEco ? (
                  <>
                    {student.code} · <span className="uppercase">{ecoSummary.prompts} İstem</span>
                  </>
                ) : (
                  <>
                    {/* "Oturum açık" nabzı: nötr vurgu rengi */}
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-ink animate-pulse-dot shrink-0" aria-hidden="true" />
                    {student.code} · OTURUM AÇIK
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="[grid-area:actions] justify-self-end flex items-center gap-1.5 xl:h-12">
            {isEco && (
              <>
                <IconButton label="Kişisel Rapor" onClick={() => setReportOpen(true)}>
                  <PieChartIcon className="w-[19px] h-[19px]" aria-hidden="true" />
                </IconButton>
                <IconButton label="Metodoloji" onClick={() => setMethodologyOpen(true)}>
                  <BookOpen className="w-[19px] h-[19px]" aria-hidden="true" />
                </IconButton>
              </>
            )}
            <IconButton label="Çıkış" onClick={onLogout}>
              <LogOut className="w-[19px] h-[19px]" aria-hidden="true" />
            </IconButton>
          </div>

          <div className="[grid-area:sel] min-w-0 flex flex-col gap-3">
            {/* Model seçici: tam yuvarlak segment, mobilde de sağdan taşmayan 3 eşit sütun (grid-cols-3).
                Seçili modelin arkasında siyah bir hap kayar (yalnızca süs; "hareketi azalt"ta anında geçer).
                Butonlar en az 40 px yüksek, aralarında 8 px boşluk: yanlış dokunma (= kayıtta yanlış ölçek
                sınıfı) olasılığı azalır (Dilim 8d). */}
            <div className="relative grid grid-cols-3 gap-2 p-1 rounded-full bg-muted">
              <div
                aria-hidden="true"
                className="absolute top-1 bottom-1 rounded-full bg-ink transition-[left] duration-[350ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                // Sütun genişliği = (kutu − 2×4 px iç boşluk − 2×8 px aralık) / 3; hap seçili sütunun soluna oturur.
                style={{
                  width: 'calc((100% - 24px) / 3)',
                  left: `calc(4px + ${selectedIndex} * ((100% - 24px) / 3 + 8px))`,
                }}
              />
              {MODEL_ORDER.map((id) => {
                const active = selectedModel === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => chooseModel(id)}
                    aria-pressed={active}
                    className={`relative z-10 min-h-10 px-1.5 rounded-full text-center text-[13px] tracking-[-0.01em] truncate touch-manipulation transition-colors duration-[350ms] ${
                      active ? 'text-paper font-semibold' : 'text-text-2 font-medium hover:text-ink'
                    }`}
                  >
                    <span className="sm:hidden">{MODEL_LABELS[id].short}</span>
                    <span className="hidden sm:inline">{MODEL_SCALES[id].name}</span>
                  </button>
                );
              })}
            </div>

            {/* Seçili modelin kısa açıklaması (bugünkü nötr metinler). Mobilde yazarken (klavye açık) gizlenir. */}
            <p className={`text-xs text-text-3 text-center truncate ${inputFocused ? 'hidden sm:block' : ''}`}>
              {MODEL_LABELS[selectedModel].desc}
            </p>
          </div>
        </div>
      </header>

        {/* Üst çubuğun altındaki alan: EkoToken kartı (varsa) + kayan mesaj listesi. "relative": xl'de kart bu
            alanın içinde, mesaj listesinin üstünde sabit durur (liste kayar, kart kaymaz). */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          {/* EkoToken oturum özeti (yalnızca Deney + Son Test). Tek bir kopya vardır:
              - xl altı: üst çubuğun devamı gibi, kaymayan beyaz şeritte siyah kart, okuma sütunu genişliğinde.
              - xl ve üstü: okuma sütununun sağındaki boşlukta "birikim sütunu"; üst çubuğun hemen altından
                yazma alanına kadar uzanır (~280 px; 1280 px ekranda boşluk daralınca 220 px'e iner). Mutlak konumlu
                olduğu için okuma sütununu itmez: sütunun yeri ve genişliği iki grupta birebir aynıdır.
              Mobilde yazarken (klavye açık) gizlenir, yazma bitince geri gelir: klavye açıkken iki grubun mesaj
              alanı eşit kalır (Dilim 8d). */}
          {isEco && (
            <div
              data-testid="eko-ozet-kapsayici"
              className={`${ECO_CARD_PLACEMENT_CLASS}${inputFocused ? ' hidden sm:block' : ''}`}
            >
              <div className={`${COLUMN_CLASS} pb-3.5 xl:max-w-none 2xl:max-w-none xl:p-0 xl:h-full`}>
                <EcoSummaryBar summary={ecoSummary} />
              </div>
            </div>
          )}

        {/* KAYAN MESAJ LİSTESİ. scrollbar-gutter: kaydırma çubuğu iki yanda eşit yer ayırır; böylece sütun,
            kaydırma çubuğu olmayan üst çubukla tam aynı yatay hizada (ekranın ortasında) kalır. */}
        <main ref={containerRef} className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable_both-edges]">
          <div className={`${COLUMN_CLASS} py-5 sm:py-8 flex flex-col gap-5 sm:gap-6`}>
            {sessionNote && (
              <div role="status" className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-text-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
                  <p className="flex-1">Yeni oturum başladı. Önceki mesajlar bu ekranda gösterilmiyor.</p>
                  <button
                    type="button"
                    onClick={() => setSessionNote(false)}
                    aria-label="Kapat"
                    className="shrink-0 p-2 -m-2 text-text-3 hover:text-ink"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {historyState === 'loading' && (
              <div className="py-12 flex justify-center text-text-3">
                <Loader2 className="w-6 h-6 animate-spin" aria-label="Yükleniyor" />
              </div>
            )}

            {historyState !== 'loading' && historyState !== 'ready' && (
              <ErrorCard message={historyState} onRetry={loadHistory} />
            )}

            {historyState === 'ready' && messages.length === 0 && !pending && (
              <div className="py-12 sm:py-20 flex flex-col items-center text-center max-w-md mx-auto">
                <BrandMark variant={isEco ? 'ring' : 'orbit'} size={52} />
                <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em]">Eğitim Asistanına Hoş Geldin</h2>
                <p className="text-[15px] text-text-2 mt-2 leading-relaxed">
                  Ders konuların, ödevlerin veya merak ettiğin herhangi bir konuda sorularını aşağıdan yazabilirsin.
                </p>
              </div>
            )}

            {messages.map((item) => (
              <div key={item.id} className="flex flex-col gap-4">
                <UserBubble text={item.prompt} />
                <article className="flex flex-col gap-3 animate-rise">
                  <AssistantLabel modelId={item.modelId} time={formatTime(item.createdAt)} />
                  <RichMessage
                    content={item.response}
                    showCopyButton
                    textClassName="text-base 2xl:text-[17px] leading-[1.625] text-ink-2"
                  />
                  {/* Rozetler yalnızca EkoToken görünümünde ve sunucu eco alanını gönderdiyse */}
                  {isEco && item.eco && <EcoImpactFooter eco={item.eco} modelId={item.modelId} />}
                </article>
              </div>
            ))}

            {/* Gönderilen, yanıtı beklenen istem */}
            {pending && <UserBubble text={pending.prompt} />}

            {/* Asistan yazıyor: üç nokta dalgası. Ekran okuyucu için açık metin gizli olarak okunur. */}
            {isSending && (
              <div role="status" className="flex items-center gap-2.5 animate-rise">
                <span className="text-[13px] font-semibold">Asistan</span>
                <span className="flex gap-1 px-3.5 py-2.5 rounded-full border border-line bg-surface" aria-hidden="true">
                  {[0, 0.15, 0.3].map((delay) => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-ink animate-typing"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </span>
                <span className="sr-only">Yanıt hazırlanıyor ({MODEL_SCALES[pending.modelId].name})…</span>
              </div>
            )}

            {error && !isSending && (
              <ErrorCard
                message={error}
                onRetry={pending ? () => send(pending.prompt, pending.modelId) : undefined}
                retryDisabled={cooldown}
                onDismiss={dismissError}
              />
            )}
          </div>
        </main>
      </div>

      {/* SABİT ALT ALAN: yüzen yazma kapsülü */}
      <footer className="shrink-0 pt-2 pb-3 sm:pb-5">
        <form onSubmit={handleSubmit} className={COLUMN_CLASS}>
          <div className="flex items-end gap-2 p-1.5 pl-[18px] rounded-[26px] border border-line-2 bg-surface shadow-capsule focus-within:border-text-3 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              rows={1}
              placeholder="Bir şey sor..."
              aria-label="İstem"
              // Yazı her ekranda 16 px (text-base): iOS Safari 16 px'ten küçük yazı alanına dokununca sayfayı yakınlaştırır.
              // Mobilde tek satır yükseklik (h-11, kutu içinde kayar): klavye açıkken mesaj alanına yer kalsın.
              // Masaüstünde iki satır yükseklik.
              className="flex-1 min-w-0 h-11 sm:h-[66px] resize-none border-0 bg-transparent py-[11px] text-base leading-[22px] text-ink placeholder:text-[#8A8A93] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Gönder" // Yalnızca ikon görünür; erişilebilir ad buradan gelir.
              className="shrink-0 w-11 h-11 rounded-full bg-ink hover:bg-ink-2 disabled:bg-line-2 text-paper disabled:text-text-3 flex items-center justify-center transition-colors"
            >
              <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
          {/* Karakter sayacı. Mobilde yazarken (klavye açık) gizlenir; sınıra yaklaşınca yine görünür. */}
          <div
            className={`mt-1.5 px-3 items-center justify-end font-mono text-[11px] text-text-3 ${
              inputFocused && !nearLimit ? 'hidden sm:flex' : 'flex'
            }`}
          >
            <span>
              {input.length}/{MAX_PROMPT_LENGTH}
            </span>
          </div>
        </form>
      </footer>

      {/* EkoToken pencereleri: yalnızca açıldıklarında yüklenir */}
      {isEco && (reportOpen || methodologyOpen) && (
        <Suspense fallback={null}>
          {reportOpen && (
            <PersonalReportModal
              open
              onClose={() => setReportOpen(false)}
              summary={ecoSummary}
              participantCode={student.code}
            />
          )}
          {methodologyOpen && <MethodologyModal open onClose={() => setMethodologyOpen(false)} />}
        </Suspense>
      )}
    </div>
  );
}

// Üst çubuktaki yuvarlak ikon butonu (44 px dokunma alanı). Yazı görünmez; ad aria-label'dan okunur.
function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-11 h-11 rounded-full bg-muted hover:bg-line-2 text-ink flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  );
}

// Öğrencinin kendi mesaj balonu: siyah, sağda, sağ alt köşesi küçük.
function UserBubble({ text }) {
  return (
    <div className="self-end max-w-[85%] sm:max-w-[78%] rounded-[20px_20px_6px_20px] px-4 py-3 bg-ink text-paper text-[15px] 2xl:text-base leading-[22px] 2xl:leading-6 animate-rise">
      <p className="whitespace-pre-wrap break-words">{text}</p>
    </div>
  );
}

// Asistan yanıtının başlık satırı: "Asistan" + ince çizgi + mono model adı ve saat (ör. "STANDART · 10:42").
function AssistantLabel({ modelId, time }) {
  const short = MODEL_LABELS[modelId]?.short ?? '';
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-semibold">Asistan</span>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
      <span className="font-mono text-[11px] text-text-3">
        {short.toLocaleUpperCase('tr-TR')}
        {time && ` · ${time}`}
      </span>
    </div>
  );
}

// Türkçe hata kartı: mesaj + "Tekrar Dene" (+ isteğe bağlı kapat).
function ErrorCard({ message, onRetry, retryDisabled = false, onDismiss }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="flex-1">{message}</p>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Kapat" className="shrink-0 p-2 -m-2 text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {onRetry && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-rose-700 hover:bg-rose-800 disabled:bg-rose-300 text-white text-[13px] font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}
