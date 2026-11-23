// Sade sohbet ekranı: "Eğitim Asistanı". Ön Testte iki grup da, Son Testte Kontrol grubu bunu görür.
// ÇEVRESEL GÖSTERGE YOKTUR: enerji, su, CO₂, maliyet veya tasarruf bilgisi bu ekranda geçmez
// (sunucu da bu verileri tarayıcıya göndermez).
// Düzen kuralları (proje rehberi Bölüm 8): tam ekran kilitli yerleşim, yalnızca mesaj listesi kayar,
// kaydırma yalnızca container.scrollTo ile yapılır (scrollIntoView YOK), model seçici grid-cols-3.
// Aşama (Ön Test / Son Test) bu ekranda HİÇ YAZMAZ (kör deney). Aşama değişince yalnızca nötr bir
// "Yeni oturum başladı" notu çıkar ve yeni aşamanın mesajları yüklenir.
// Sunucu doğru kaynaktır: /api/messages yanıtındaki aşama onServerPhase ile üst bileşene bildirilir;
// /api/chat yanıtındaki aşama ekrandakinden farklıysa geçmiş yeniden yüklenir.
import { useEffect, useRef, useState } from 'react';
import { GraduationCap, LogOut, Send, RefreshCw, AlertCircle, X, Sparkles, Loader2, Info } from 'lucide-react';
import RichMessage from './RichMessage.jsx';
import { apiRequest } from '../lib/api.js';
import { MODEL_ORDER, MODEL_SCALES } from '../lib/footprint.js';
import { chatResponseAction } from '../lib/phases.js';

// Sunucudaki sınırlarla aynı değerler (asıl kontrol sunucuda yapılır).
const MAX_PROMPT_LENGTH = 4000;
const COOLDOWN_MS = 3000;

// Model seçicideki kısa adlar (mobil) ve nötr açıklamalar. Açıklamalarda çevresel ifade yoktur.
const MODEL_LABELS = {
  light: { short: 'Hafif', desc: 'Hızlı, kısa ve doğrudan yanıtlar' },
  standard: { short: 'Standart', desc: 'Dengeli açıklama ve örneklerle anlatım' },
  reasoning: { short: 'Akıl Yürütme', desc: 'Adım adım, derinlemesine çözüm' },
};

// Mesaj saatini "14:05" biçiminde yazar.
function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ student, onServerPhase, onLogout }) {
  const [messages, setMessages] = useState([]); // Sunucudan gelen, kaydı yazılmış mesajlar
  const [historyState, setHistoryState] = useState('loading'); // 'loading' | 'ready' | hata metni
  const [selectedModel, setSelectedModel] = useState('standard');
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(null); // Gönderilen ama henüz yanıtı gelmemiş istem: { prompt, modelId }
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(''); // Son gönderimin hata mesajı
  const [cooldown, setCooldown] = useState(false); // İki gönderim arası 3 sn bekleme
  const [sessionNote, setSessionNote] = useState(false); // Nötr "Yeni oturum başladı" notu

  const containerRef = useRef(null);
  // Ekranda mesajları gösterilen aşama (son başarılı /api/messages yanıtından). İlk açılışta null.
  const loadedPhaseRef = useRef(null);
  // Her geçmiş yüklemesine sıra numarası verilir; geç gelen eski yanıt yok sayılır.
  const historyRequestRef = useRef(0);

  // Aktif aşamadaki kendi mesajlarımızı sunucudan yükle. Bu çağrı sunucuda giriş kaydını da günceller.
  const loadHistory = async () => {
    const requestNo = ++historyRequestRef.current;
    setHistoryState('loading');
    try {
      const data = await apiRequest('/api/messages', { method: 'POST', body: { code: student.code } });
      if (requestNo !== historyRequestRef.current) return; // Daha yeni bir yükleme başladı.
      // Ekrandaki aşamadan farklı bir aşamaya geçildiyse nötr not gösterilir (ilk açılışta gösterilmez).
      if (loadedPhaseRef.current !== null && loadedPhaseRef.current !== data.phase) setSessionNote(true);
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
    }
    loadHistory();
  }, [student.code, student.phase]);

  // Yeni mesaj, bekleme göstergesi veya hata kartı gelince listenin en altına kaydır.
  useEffect(() => {
    const container = containerRef.current;
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
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

  const canSend = input.trim().length > 0 && !isSending && !cooldown && historyState === 'ready';

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col overflow-hidden bg-slate-50 text-slate-800">
      {/* SABİT ÜST ÇUBUK */}
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-indigo-600 text-white">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">Eğitim Asistanı</h1>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                    {student.code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate hidden sm:block">Ders ve araştırma destek sohbet arayüzü</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>

          {/* Model seçici: mobilde de sağdan taşmayan 3 eşit sütun */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            {MODEL_ORDER.map((id) => {
              const active = selectedModel === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedModel(id)}
                  aria-pressed={active}
                  className={`py-1.5 px-1.5 sm:px-3 rounded-lg text-center transition-all text-[11px] sm:text-xs font-semibold truncate ${
                    active ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="sm:hidden">{MODEL_LABELS[id].short}</span>
                  <span className="hidden sm:inline">{MODEL_SCALES[id].name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* KAYAN MESAJ LİSTESİ */}
      <main ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-5 py-5">
        <div className="max-w-4xl mx-auto space-y-5">
          {sessionNote && (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600" />
                <p className="flex-1">Yeni oturum başladı. Önceki mesajlar bu ekranda gösterilmiyor.</p>
                <button
                  type="button"
                  onClick={() => setSessionNote(false)}
                  aria-label="Kapat"
                  className="shrink-0 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {historyState === 'loading' && (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" aria-label="Yükleniyor" />
            </div>
          )}

          {historyState !== 'loading' && historyState !== 'ready' && (
            <ErrorCard message={historyState} onRetry={loadHistory} />
          )}

          {historyState === 'ready' && messages.length === 0 && !pending && (
            <div className="py-12 sm:py-16 text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-indigo-100 text-indigo-700">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Eğitim Asistanına Hoş Geldin</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Ders konuların, ödevlerin veya merak ettiğin herhangi bir konuda sorularını aşağıdan yazabilirsin.
              </p>
            </div>
          )}

          {messages.map((item) => (
            <div key={item.id} className="space-y-3">
              <UserBubble text={item.prompt} />
              <div className="flex justify-start">
                <div className="w-full sm:max-w-[92%] rounded-2xl rounded-tl-sm px-4 sm:px-5 py-4 bg-white border border-slate-200">
                  <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      Eğitim Asistanı
                      <span className="font-normal text-slate-400">· {MODEL_SCALES[item.modelId]?.name}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{formatTime(item.createdAt)}</span>
                  </div>
                  <RichMessage content={item.response} showCopyButton />
                </div>
              </div>
            </div>
          ))}

          {/* Gönderilen, yanıtı beklenen istem */}
          {pending && <UserBubble text={pending.prompt} />}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm px-4 py-3.5 bg-white border border-slate-200 flex items-center gap-3 text-sm text-slate-600">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Yanıt hazırlanıyor ({MODEL_SCALES[pending.modelId].name})…</span>
              </div>
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

      {/* SABİT ALT ÇUBUK: istem yazma alanı */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-3 sm:px-5 py-3">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder="Sorunu buraya yaz…"
              aria-label="İstem"
              className="flex-1 min-w-0 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gönder</span>
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-400 px-0.5">
            <span className="truncate">{MODEL_LABELS[selectedModel].desc}</span>
            <span className="shrink-0">
              {input.length}/{MAX_PROMPT_LENGTH}
            </span>
          </div>
        </form>
      </footer>
    </div>
  );
}

// Öğrencinin kendi mesaj balonu.
function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] sm:max-w-[78%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed bg-indigo-600 text-white">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}

// Türkçe hata kartı: mesaj + "Tekrar Dene" (+ isteğe bağlı kapat).
function ErrorCard({ message, onRetry, retryDisabled = false, onDismiss }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <p className="flex-1">{message}</p>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Kapat" className="shrink-0 text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {onRetry && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onRetry}
            disabled={retryDisabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}
