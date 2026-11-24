// Onay penceresi: tarayıcının confirm() kutusu yerine kullanılır (proje rehberi Bölüm 8).
// Kullanım: <ConfirmModal open title="..." message="..." confirmLabel="..." onConfirm={...} onCancel={...} />
// Arka plana veya "Vazgeç"e tıklamak pencereyi kapatır.
// danger: geri alınamaz işlemler (silme) için kırmızı onay butonu. busyLabel: işlem sürerken buton yazısı.

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onay-baslik"
        className="w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Pencerenin içine tıklamak onu kapatmasın.
      >
        <h2 id="onay-baslik" className="text-base font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-text-2 leading-relaxed">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
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
    </div>
  );
}
