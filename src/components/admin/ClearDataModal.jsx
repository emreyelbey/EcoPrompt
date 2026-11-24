// "Verileri Temizle" onay penceresi. GERİ ALINAMAZ bir işlem olduğu için iki güvence vardır:
//   1) Pencere açılınca sunucudan silinecek kayıt sayıları alınır ve gösterilir.
//   2) Kullanıcı metin kutusuna büyük harfle "SİL" (veya İngilizce klavyede "SIL") yazmadan kırmızı onay
//      butonu pasif kalır.
// Sunucu da aynı kuralı uygular (api/admin/clear.js); kabul edilen metinler src/lib/clearConfirm.js'tedir.
// Telefonda klavye açıkken (SİL kutusuna yazarken) pencere görünen alana sığar: içerik kendi içinde kayar,
// odaklanan kutu görünür kalır, "Vazgeç" ve "Kalıcı Olarak Sil" alttaki sabit bölümdedir (Overlay.jsx).
import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../lib/api.js';
import { isClearConfirmed } from '../../lib/clearConfirm.js';
import Overlay from '../Overlay.jsx';

const COUNT_LABELS = [
  ['interactions', 'Etkileşim kaydı (öğrenci soruları ve yanıtlar)'],
  ['logins', 'Giriş kaydı'],
  ['rateLimits', 'Hız sınırı kaydı'],
];

export default function ClearDataModal({ open, token, onUnauthorized, onCleared, onCancel }) {
  const [counts, setCounts] = useState(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Pencere her açıldığında sayılar yeniden alınır ve kutu boşaltılır.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setCounts(null);
    setTyped('');
    setError('');
    apiRequest('/api/admin/clear', { token })
      .then((data) => {
        if (!cancelled) setCounts(data.counts);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) onUnauthorized();
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token, onUnauthorized]);

  if (!open) return null;

  const canConfirm = isClearConfirmed(typed) && counts !== null && !busy;

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await apiRequest('/api/admin/clear', { method: 'POST', body: { confirm: typed }, token });
      onCleared(data.deleted);
    } catch (err) {
      if (err.status === 401) onUnauthorized();
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Overlay onBackdropClick={busy ? undefined : onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="temizle-baslik"
        className="w-full max-w-md max-h-[min(90dvh,100%)] flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-2xl"
      >
        <div data-pencere-kaydirma className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-2">
          <h2 id="temizle-baslik" className="text-base font-semibold text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            Tüm deney verileri silinecek
          </h2>
          <p className="mt-2 text-sm text-text-2 leading-relaxed">
            Bu işlem <strong>geri alınamaz</strong>. Ön Test ve Son Test'teki bütün kayıtlar kalıcı olarak silinir. Aktif aşama
            ayarı değişmez.
          </p>

          <div className="mt-3 rounded-xl border border-line bg-paper px-3 py-2.5">
            {counts === null && !error && (
              <div className="flex items-center gap-2 text-sm text-text-3">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Silinecek kayıtlar sayılıyor…
              </div>
            )}
            {counts !== null && (
              <ul className="space-y-1 text-sm" aria-label="Silinecek kayıt sayıları">
                {COUNT_LABELS.map(([key, label]) => (
                  <li key={key} className="flex items-center justify-between gap-3">
                    <span className="text-text-2">{label}</span>
                    <strong className="text-ink tabular-nums">{counts[key].toLocaleString('tr-TR')}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p role="note" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            Silmeden önce Excel/CSV yedeği almanız önerilir.
          </p>

          <label htmlFor="temizle-onay" className="mt-4 block text-sm text-text-2b">
            Onaylamak için kutuya büyük harfle <strong className="font-mono">SİL</strong> yazın{' '}
            <span className="text-text-3">(SIL de kabul edilir)</span>:
          </label>
          <input
            id="temizle-onay"
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            className="mt-1.5 w-full rounded-xl border border-line-2 px-3 py-2 text-base sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
          />

          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}
        </div>

        {/* Sabit alt bölüm: klavye açıkken ve içerik kayarken de butonlar görünür kalır. */}
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
            onClick={confirm}
            disabled={!canConfirm}
            className="h-10 px-4 rounded-full text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed"
          >
            {busy ? 'Siliniyor…' : 'Kalıcı Olarak Sil'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
