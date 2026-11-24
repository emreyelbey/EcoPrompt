// Onay penceresi: tarayıcının confirm() kutusu yerine kullanılır (proje rehberi Bölüm 8).
// Kullanım: <ConfirmModal open title="..." message="..." confirmLabel="..." onConfirm={...} onCancel={...} />
// Arka plana veya "Vazgeç"e tıklamak pencereyi kapatır.
// danger: geri alınamaz işlemler (silme) için kırmızı onay butonu. busyLabel: işlem sürerken buton yazısı.
// Ortak kabuk (Overlay) pencereyi görünen alana oturtur. Metin uzunsa kendi içinde kayar; butonlar alttaki
// sabit bölümde her zaman görünür.
import { useRef } from 'react';
import Overlay from './Overlay.jsx';
import { usePresence } from '../lib/motion.js';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Onayla',
  busy = false,
  busyLabel = 'Kaydediliyor…',
  danger = false,
  onConfirm,
  onCancel,
}) {
  // Kapanırken kısa çıkış animasyonu oynar; o sırada son açık hâlin metinleri gösterilir.
  const { mounted, closing } = usePresence(open);
  const last = useRef({ title, message, confirmLabel, busyLabel, danger });
  if (open) last.current = { title, message, confirmLabel, busyLabel, danger };
  if (!mounted) return null;
  const t = open ? { title, message, confirmLabel, busyLabel, danger } : last.current;

  return (
    <Overlay onBackdropClick={busy || closing ? undefined : onCancel} closing={closing}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onay-baslik"
        className="motion-dialog w-full max-w-sm max-h-[min(90dvh,100%)] flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-2xl"
      >
        <div data-pencere-kaydirma className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-2">
          <h2 id="onay-baslik" className="text-base font-semibold text-ink">
            {t.title}
          </h2>
          <p className="mt-2 text-sm text-text-2 leading-relaxed">{t.message}</p>
        </div>
        {/* Sabit alt bölüm: içerik kaysa da butonlar görünür kalır. */}
        <div data-pencere-eylemler className="shrink-0 flex justify-end gap-2 px-6 pt-3 pb-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 px-4 rounded-full text-sm font-semibold text-text-2 bg-muted hover:bg-line-2 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`h-10 px-4 rounded-full text-sm font-semibold text-white ${
              t.danger ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300' : 'bg-ink hover:bg-ink-2 disabled:bg-line-2'
            }`}
          >
            {busy ? t.busyLabel : t.confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
