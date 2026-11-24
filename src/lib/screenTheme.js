// Sayfa zemininin (html/body) rengini ve tarayıcı çubuğu rengini (meta theme-color) tek yerden yönetir.
// Neden: telefonda giriş ekranı koyudur ama html/body açık kâğıt rengindedir. Klavye açılınca veya sayfa
// kenardan çekilince (aşırı kaydırma) ekranın altında açık bir şerit görünüyordu.
// Giriş ekranı açılınca setScreenTheme('dark') → <html data-zemin="koyu">, kapanınca 'light' → öznitelik silinir.
// CSS karşılığı src/index.css içindedir (html[data-zemin="koyu"]: koyu zemin + color-scheme: dark).
import { useEffect } from 'react';

export const THEME_ATTR = 'data-zemin';

// Tarayıcı çubuğu renkleri: tasarım belirteçleriyle aynı (index.css → --color-ink, --color-paper).
export const THEME_COLORS = { dark: '#0A0A0B', light: '#FAFAF9' };

export function setScreenTheme(theme, doc = document) {
  const root = doc.documentElement;
  if (theme === 'dark') root.setAttribute(THEME_ATTR, 'koyu');
  else root.removeAttribute(THEME_ATTR);

  // meta theme-color index.html'de vardır; yoksa (test ortamı) oluşturulur.
  let meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    doc.head.appendChild(meta);
  }
  meta.setAttribute('content', theme === 'dark' ? THEME_COLORS.dark : THEME_COLORS.light);
}

// Bileşen ekrandayken sayfayı koyu zemine alır; ekrandan kalkınca açık zemine döndürür.
export function useDarkScreenTheme() {
  useEffect(() => {
    setScreenTheme('dark');
    return () => setScreenTheme('light');
  }, []);
}
