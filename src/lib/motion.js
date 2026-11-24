// Hareket sisteminin JavaScript tarafı (animasyonlar dalı, 24.11.2026).
// Süreler ve eğri TEK YERDE, src/index.css → :root (--motion-fast, --motion-normal, --motion-slow,
// --ease-motion) içinde tanımlıdır. Bu dosya onları okur; kendi süresini uydurmaz.
//   - prefersReducedMotion(): işletim sisteminde "hareketi azalt" açık mı?
//   - motionMs('fast'): CSS değişkenindeki süre (ms). Hareketi azalt açıksa 0.
//   - usePresence(open): pencere kapanırken kısa çıkış animasyonu oynasın diye pencereyi o süre kadar
//     sayfada tutar ("kapanıyor" durumu), sonra kaldırır.

import { useEffect, useState } from 'react';

// CSS okunamazsa (eski tarayıcı) kullanılacak değerler; index.css ile aynı olmalı (testle denetlenir).
export const MOTION_FALLBACK_MS = { fast: 150, normal: 220, slow: 350 };

export function prefersReducedMotion(win = typeof window === 'undefined' ? undefined : window) {
  return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

// "150ms" veya "0.15s" biçimindeki CSS süresini milisaniyeye çevirir; okunamazsa null.
export function parseCssDuration(value) {
  const text = String(value ?? '').trim();
  const match = text.match(/^([\d.]+)(ms|s)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return match[2] === 's' ? n * 1000 : n;
}

/**
 * Hareket süresini milisaniye olarak döner.
 * - Hareketi azalt açıksa 0 (anında geçiş).
 * - matchMedia olmayan ortamda (test ortamı, çok eski tarayıcı) 0: orada animasyon da çalışmaz,
 *   pencereyi bekletmek yalnızca gecikme yaratır.
 */
export function motionMs(speed = 'normal', win = typeof window === 'undefined' ? undefined : window) {
  if (!win?.matchMedia || prefersReducedMotion(win)) return 0;
  const css = win.getComputedStyle?.(win.document.documentElement).getPropertyValue(`--motion-${speed}`);
  return parseCssDuration(css) ?? MOTION_FALLBACK_MS[speed];
}

/**
 * Pencere görünürlüğü + çıkış animasyonu.
 * @param {boolean} open  pencere açık olmalı mı?
 * @returns {{ mounted: boolean, closing: boolean }}
 *   mounted: pencere sayfada çizilmeli mi (açık VEYA kapanış animasyonu sürüyor)
 *   closing: kapanış animasyonu sürüyor mu (Overlay → .overlay-closing)
 */
export function usePresence(open) {
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Açık → kapalı geçişinde kapanış animasyonu başlar (render sırasında durum güncellemesi: React'in önerdiği
  // "önceki değeri hatırla" kalıbı; ek bir boş kare çizilmez).
  if (open !== wasOpen) {
    setWasOpen(open);
    setLeaving(!open && motionMs('fast') > 0);
  }

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setLeaving(false), motionMs('fast'));
    return () => clearTimeout(timer);
  }, [leaving]);

  return { mounted: open || leaving, closing: !open && leaving };
}
