// Ortak pencere kabuğu: Kişisel Rapor ve Metodoloji pencereleri bunu kullanır.
// Arka plana, ✕ butonuna veya Escape tuşuna basınca kapanır. İçerik pencerenin içinde kayar,
// böylece sayfanın kendisi (body) hiç kaymaz (proje rehberi Bölüm 8).
import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, subtitle, onClose, maxWidth = 'max-w-3xl', children }) {
  // Escape tuşu pencereyi kapatır.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pencere-baslik"
        className={`w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()} // Pencerenin içine tıklamak onu kapatmasın.
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-200">
          <div className="min-w-0">
            <h2 id="pencere-baslik" className="text-base font-bold text-slate-900">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
