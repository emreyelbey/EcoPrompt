// Onay penceresi: tarayıcının confirm() kutusu yerine kullanılır (proje rehberi Bölüm 8).
// Kullanım: <ConfirmModal open title="..." message="..." confirmLabel="..." onConfirm={...} onCancel={...} />
// Arka plana veya "Vazgeç"e tıklamak pencereyi kapatır.
// danger: geri alınamaz işlemler (silme) için kırmızı onay butonu. busyLabel: işlem sürerken buton yazısı.
// Ortak kabuk (Overlay) pencereyi görünen alana oturtur. Metin uzunsa kendi içinde kayar; butonlar alttaki
// sabit bölümde her zaman görünür.
import Overlay from './Overlay.jsx';

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
  if (!open) return null;

  return (
    <Overlay onBackdropClick={busy ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onay-baslik"
        className="w-full max-w-sm max-h-[min(90dvh,100%)] flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-2xl"
      >
        <div data-pencere-kaydirma className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-2">
          <h2 id="onay-baslik" className="text-base font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-2 text-sm text-text-2 leading-relaxed">{message}</p>
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
              danger ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300' : 'bg-ink hover:bg-ink-2 disabled:bg-line-2'
            }`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
