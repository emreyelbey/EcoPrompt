// Bütün pencerelerin ortak dış kabuğu: arka karartma + pencereyi ekranın görünen alanına oturtan kutu.
// Modal (Kişisel Rapor, Metodoloji, kayıt önizleme), ConfirmModal (onaylar, aşama değiştirme) ve
// ClearDataModal bunu kullanır. Yeni bir pencere eklenirse o da bu kabuğu kullanmalıdır.
//
// Telefonda klavye açıkken (Dilim 8d kuralları):
//   - Karartma katmanı ekranın dışına da taşar (klavyenin arkasında kalan alan da kararır) ve sayfa zemini
//     karartma rengine geçer (useOverlayTheme, src/lib/screenTheme.js): beyaz şerit görünmez.
//   - Pencereyi taşıyan kutu app-viewport sınıfıyla klavyenin üstünde kalan görünen alana oturur.
//     Pencere bu alandan uzun olamaz; içerik kendi içinde kayar, eylem butonları alttaki sabit bölümde kalır.
//   - Odaklanan yazı kutusu, klavye açılıp alan daralınca da görünür kalacak şekilde pencere içinde kaydırılır
//     (scrollIntoView kullanılmaz; yalnızca kayan kutunun scrollTop değeri değişir, proje rehberi Bölüm 8).
// Pencerenin içindeki kayan bölüm data-pencere-kaydirma özniteliğini taşımalıdır.
// Hareket (animasyonlar dalı): karartma belirir, pencere (.motion-dialog sınıfını taşımalı) hafif ölçek +
// yukarı kayma ile gelir, telefonda alttan yükselir. closing=true iken kısa çıkış animasyonu oynar
// (index.css → .overlay-closing); pencereyi o süre boyunca sayfada tutmak usePresence'ın işidir (motion.js).
// Portal (modal-duzeltme): pencere, onu açan bileşenin içinde değil doğrudan <body> altında çizilir.
// Sebep: transform taşıyan bir üst öğe (ör. belirme animasyonlu sekme kabı) position: fixed için yeni bir
// konumlandırma bağlamı oluşturur; karartma ekran yerine o kaba sıkışıyordu. body altında hiçbir üst öğe
// pencereyi sınırlayamaz. React olayları (tıklama, Esc) portalda da bileşen ağacı üzerinden çalışır.
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayTheme } from '../lib/screenTheme.js';

const EDGE_GAP = 12; // odaklanan kutu ile kayan bölümün kenarı arasında bırakılan boşluk (px)

// Odaklanan öğe kayan bölümün görünen kısmının dışındaysa bölümü kaydırır.
export function keepFocusedVisible(el) {
  const scroller = el?.closest?.('[data-pencere-kaydirma]');
  if (!scroller) return;
  const box = el.getBoundingClientRect();
  const area = scroller.getBoundingClientRect();
  if (box.bottom > area.bottom - EDGE_GAP) scroller.scrollTop += box.bottom - area.bottom + EDGE_GAP;
  else if (box.top < area.top + EDGE_GAP) scroller.scrollTop -= area.top + EDGE_GAP - box.top;
}

export default function Overlay({ onBackdropClick, closing = false, children }) {
  const boxRef = useRef(null);
  useOverlayTheme();

  // Odak değişince ve görünen alan küçülünce (klavye açıldı) odaklanan öğeyi görünür tut.
  useEffect(() => {
    const box = boxRef.current;
    const check = () => {
      const el = document.activeElement;
      if (box && el && box.contains(el)) keepFocusedVisible(el);
    };
    // Klavye açılınca önce görünen alan, sonra --app-height değişir; bir kare sonra ölçülür.
    const later = () => requestAnimationFrame(check);
    box?.addEventListener('focusin', later);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', later);
    return () => {
      box?.removeEventListener('focusin', later);
      vv?.removeEventListener('resize', later);
    };
  }, []);

  return createPortal(
    <div className={`fixed inset-0 z-50 ${closing ? 'overlay-closing' : ''}`} data-kapaniyor={closing ? 'true' : undefined}>
      {/* Karartma: ekranın her yönünde dışarı taşar (klavyenin arkası, aşırı kaydırma). */}
      <div aria-hidden="true" className="overlay-scrim fixed bg-ink/50" onClick={onBackdropClick} />
      {/* Pencere kutusu: görünen alana oturur. Boş kısmına dokunmak da karartmaya dokunmak sayılır. */}
      <div
        ref={boxRef}
        className="app-viewport fixed inset-x-0 flex items-center justify-center p-3 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onBackdropClick?.();
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
