// Sayfa zemininin (html/body) rengini ve tarayıcı çubuğu rengini (meta theme-color) TEK YERDEN yönetir.
// Neden: telefonda klavye açılınca veya sayfa kenardan çekilince (aşırı kaydırma) ekranın dışında kalan
// alanda html/body zemini görünür. Zemin o an açık olan ekranla/pencereyle aynı renkte değilse koyu
// ekranın altında beyaz şerit oluşur.
//
// Kural (hangisi açıksa):
//   - Giriş ekranı              → koyu (ink)            <html data-zemin="koyu">
//   - Sohbet, yönetici paneli   → açık (paper)          (öznitelik yok)
//   - Herhangi bir pencere açık → karartma rengi        <html data-zemin="karartma">
//     (pencerelerin arkasındaki %50 ink katmanının açık zemin üstünde göründüğü renk; koyu ekranın
//     üstünde pencere açılırsa zemin koyu kalır)
// CSS karşılığı src/index.css içindedir. Ekranlar useScreenTheme('dark' | 'light'), pencereler
// (src/components/Overlay.jsx) useOverlayTheme() kullanır.
import { useEffect } from 'react';

export const THEME_ATTR = 'data-zemin';

// Tarayıcı çubuğu renkleri. dark/light tasarım belirteçleriyle aynıdır (index.css → --color-ink, --color-paper).
// scrim: %50 ink'in paper üstündeki karışımı: (0x0A + 0xFA) / 2 = 0x82 (üç kanalda da).
export const THEME_COLORS = { dark: '#0A0A0B', light: '#FAFAF9', scrim: '#828282' };

// Açık ekranların listesi (son açılan geçerli) ve açık pencere sayısı.
// Liste kullanılır çünkü ekran geçişinde eski ekranın temizliği yenisinin kurulumundan sonra da çalışabilir.
const screens = [];
let openOverlays = 0;

// O anki durumdan hangi zeminin geçerli olduğunu hesaplar.
export function currentTheme() {
  const base = screens.length > 0 ? screens[screens.length - 1].theme : 'light';
  if (openOverlays > 0 && base !== 'dark') return 'scrim';
  return base;
}

// Hesaplanan zemini sayfaya yazar: html özniteliği + meta theme-color.
export function applyScreenTheme(doc = document) {
  const theme = currentTheme();
  const root = doc.documentElement;
  if (theme === 'dark') root.setAttribute(THEME_ATTR, 'koyu');
  else if (theme === 'scrim') root.setAttribute(THEME_ATTR, 'karartma');
  else root.removeAttribute(THEME_ATTR);

  // meta theme-color index.html'de vardır; yoksa (test ortamı) oluşturulur.
  let meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    doc.head.appendChild(meta);
  }
  meta.setAttribute('content', THEME_COLORS[theme]);
}

// Ana ekranlar çağırır: ekran görünürken zemini 'dark' veya 'light' yapar; ekran kalkınca listeden çıkar.
export function useScreenTheme(theme) {
  useEffect(() => {
    const entry = { theme };
    screens.push(entry);
    applyScreenTheme();
    return () => {
      screens.splice(screens.indexOf(entry), 1);
      applyScreenTheme();
    };
  }, [theme]);
}

// Pencereler çağırır: pencere açıkken zemin karartma rengine geçer; kapanınca eski zemin geri gelir.
export function useOverlayTheme(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    openOverlays += 1;
    applyScreenTheme();
    return () => {
      openOverlays -= 1;
      applyScreenTheme();
    };
  }, [active]);
}
