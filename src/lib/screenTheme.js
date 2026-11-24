// Sayfa zemininin (html/body) rengini ve tarayıcı çubuğu rengini (meta theme-color) TEK YERDEN yönetir.
//
// İki ayrı renk vardır:
//   1) Sayfa zemini (html/body): telefonda klavye açılınca veya sayfa kenardan çekilince ekranın dışında
//      kalan alanda görünür. O an açık olan ekranla aynı renkte değilse beyaz/koyu şerit oluşur.
//      CSS karşılığı src/index.css içindedir (<html data-zemin="koyu" | "karartma">).
//   2) Tarayıcı çubuğu (theme-color): Safari üst çubuğu boyar. Ekranın ÜST kenarındaki öğenin rengiyle
//      eşleşmelidir, yoksa çubuk ile sayfa arasında renk kırılması görünür.
//
// Ekran        | Zemin            | Üst kenar (theme-color)
// giriş        | koyu (ink)       | ink (koyu ekran)
// panel        | açık (paper)     | ink (telefonda siyah başlık şeridi)
// sohbet       | açık (paper)     | surface (beyaz üst çubuk)
// pencere açık | karartma tonu    | üst kenar rengi + %50 ink karartma
// (koyu ekranın üstünde pencere açılırsa zemin koyu kalır.)
//
// Ekranlar useScreenTheme('login' | 'admin' | 'chat'), pencereler (src/components/Overlay.jsx)
// useOverlayTheme() kullanır. Hiç ekran yokken (yükleniyor) zemin ve çubuk açıktır (paper).
import { useEffect } from 'react';

export const THEME_ATTR = 'data-zemin';

// Tasarım belirteçleriyle aynı renkler (index.css → --color-ink, --color-paper, --color-surface).
export const COLORS = { ink: '#0A0A0B', paper: '#FAFAF9', surface: '#FFFFFF' };

// Her ekranın sayfa zemini ve üst kenar rengi.
export const SCREENS = {
  login: { page: 'dark', bar: COLORS.ink },
  admin: { page: 'light', bar: COLORS.ink },
  chat: { page: 'light', bar: COLORS.surface },
};
const DEFAULT_SCREEN = { page: 'light', bar: COLORS.paper };

// Pencerelerin arkasındaki karartma: %50 ink. Bir rengin karartma altında nasıl göründüğünü hesaplar
// (her kanal: (ink + renk) / 2, yuvarlanır). Ör. paper → #828282, surface → #858585, ink → ink.
export function scrimOver(hex) {
  const ink = COLORS.ink;
  const channel = (color, i) => parseInt(color.slice(1 + i * 2, 3 + i * 2), 16);
  const mixed = [0, 1, 2].map((i) => Math.round((channel(ink, i) + channel(hex, i)) / 2));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

// Açık ekranların listesi (son açılan geçerli) ve açık pencere sayısı.
// Liste kullanılır çünkü ekran geçişinde eski ekranın temizliği yenisinin kurulumundan sonra da çalışabilir.
const screens = [];
let openOverlays = 0;

/**
 * O anki durumdan zemini ve çubuk rengini hesaplar.
 * @returns {{ page: 'dark' | 'light' | 'scrim', bar: string }}
 */
export function currentTheme() {
  const screen = screens.length > 0 ? SCREENS[screens[screens.length - 1].name] : DEFAULT_SCREEN;
  if (openOverlays === 0) return { page: screen.page, bar: screen.bar };
  return {
    page: screen.page === 'dark' ? 'dark' : 'scrim',
    bar: scrimOver(screen.bar),
  };
}

// Hesaplanan zemini ve çubuk rengini sayfaya yazar: html özniteliği + meta theme-color.
export function applyScreenTheme(doc = document) {
  const { page, bar } = currentTheme();
  const root = doc.documentElement;
  if (page === 'dark') root.setAttribute(THEME_ATTR, 'koyu');
  else if (page === 'scrim') root.setAttribute(THEME_ATTR, 'karartma');
  else root.removeAttribute(THEME_ATTR);

  // meta theme-color index.html'de vardır; yoksa (test ortamı) oluşturulur.
  let meta = doc.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    doc.head.appendChild(meta);
  }
  meta.setAttribute('content', bar);
}

// Ana ekranlar çağırır: ekran görünürken zemini ve çubuğu o ekrana göre ayarlar; ekran kalkınca listeden çıkar.
export function useScreenTheme(name) {
  useEffect(() => {
    const entry = { name };
    screens.push(entry);
    applyScreenTheme();
    return () => {
      screens.splice(screens.indexOf(entry), 1);
      applyScreenTheme();
    };
  }, [name]);
}

// Pencereler çağırır: pencere açıkken zemin ve çubuk karartma tonuna geçer; kapanınca eski hâli geri gelir.
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
