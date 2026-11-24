// Ortak pencere kabuğu: Kişisel Rapor, Metodoloji ve yönetici panelindeki pencereler bunu kullanır.
// Arka plana, ✕ butonuna veya Escape tuşuna basınca kapanır. İçerik pencerenin içinde kayar,
// böylece sayfanın kendisi (body) hiç kaymaz (proje rehberi Bölüm 8).
// Yükseklik dvh ile ve ortak kabuğun (Overlay) görünen alanıyla sınırlanır: telefonda klavye açıkken de
// pencere klavyenin üstünde kalan alana sığar, içerik kendi içinde kayar (Overlay.jsx).
// Görünüm (Yön 2b): kâğıt beyazı gövde (içindeki beyaz kartlar öne çıksın), beyaz başlık şeridi,
// 20 px köşe, 40 px yuvarlak kapat butonu. title metin veya öğe olabilir (ör. ikinci kelimesi italik serif).
import { useEffect } from 'react';
import { X } from 'lucide-react';
import Overlay from './Overlay.jsx';

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
    <Overlay onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pencere-baslik"
        className={`w-full ${maxWidth} max-h-[min(90dvh,100%)] flex flex-col overflow-hidden rounded-[20px] bg-paper text-ink shadow-2xl`}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-surface">
          <div className="min-w-0">
            <h2 id="pencere-baslik" className="text-lg leading-6 font-semibold tracking-[-0.02em]">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-text-3 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="shrink-0 w-10 h-10 rounded-full bg-muted hover:bg-line-2 text-ink flex items-center justify-center transition-colors"
          >
            <X className="w-[18px] h-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div data-pencere-kaydirma className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5">
          {children}
        </div>
      </div>
    </Overlay>
  );
}
