// Yönetici panelinde sekme değişince içeriği başa kaydırır, kaydırma bitince yeni sekmenin başlığına
// odak verir (animasyonlar dalı, 24.11.2026).
// Neden: panelin içeriği sayfanın kendisinde (window) değil, iç bir kaydırma kabında kayar. Sekme
// değişince bu kap eski konumda kalıyor, yeni içerik ortasından açılıyordu.
// - "Hareketi azalt" açıksa animasyonsuz, anında başa gider.
// - Odak: başlık tabIndex=-1 taşır; focus({ preventScroll: true }) ile sayfa yeniden kaymaz. Görünür odak
//   halkası çıkmaz (başlıkta outline-none; zaten fareyle değil programla odaklanır).
import { prefersReducedMotion } from './motion.js';

// Kaydırma bitişi olayı (scrollend) olmayan veya geç gelen tarayıcılar için en uzun bekleme (ms).
export const SCROLL_FALLBACK_MS = 700;

/**
 * @param {HTMLElement|null} scroller  kayan kap
 * @param {HTMLElement|null} heading   odak verilecek başlık
 * @returns {() => void}  temizleme (sekme hızla yeniden değişirse eski odak işlemi iptal olur)
 */
export function scrollToTopThenFocus(scroller, heading, win = window) {
  const focusHeading = () => heading?.focus?.({ preventScroll: true });
  if (!scroller) {
    focusHeading();
    return () => {};
  }

  const instant = prefersReducedMotion(win) || scroller.scrollTop === 0;
  if (instant) {
    scroller.scrollTop = 0;
    focusHeading();
    return () => {};
  }

  let done = false;
  // scrollend, sekme içeriği değişip kap yüksekliği değişince de erken gelebilir: odak ancak kap gerçekten
  // en üste ulaştığında verilir (yedek süre dolunca her durumda verilir).
  const onScrollEnd = () => {
    if (scroller.scrollTop <= 1) finish();
  };
  const finish = () => {
    if (done) return;
    done = true;
    scroller.removeEventListener('scrollend', onScrollEnd);
    win.clearTimeout(timer);
    focusHeading();
  };
  scroller.addEventListener('scrollend', onScrollEnd);
  const timer = win.setTimeout(finish, SCROLL_FALLBACK_MS);
  scroller.scrollTo({ top: 0, behavior: 'smooth' });

  return () => {
    done = true;
    scroller.removeEventListener('scrollend', onScrollEnd);
    win.clearTimeout(timer);
  };
}
