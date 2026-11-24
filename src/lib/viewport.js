// Ana görünümlerin ve pencerelerin yüksekliğini yönetir (Dilim 8d; mobil-duzeltmeler, 24.11.2026).
//
// İki durum vardır:
//   1) Klavye KAPALI: düzen tarayıcının dinamik yüksekliğini (100dvh) izler. Değişkenler silinir, CSS
//      varsayılanı geçerli olur (index.css → .app-viewport). Tarayıcı kaydırırken adres çubuğunu küçültüp
//      alt araç çubuğunu gizlerse dvh kendiliğinden büyür; düzen eski yükseklikte kilitli kalmaz.
//   2) Klavye AÇIK: iOS klavye açılınca sabit (fixed) düzeni küçültmez; klavye ekranın altını örter ve
//      sayfayı kaydırır. Bu durumda görünen alanın (visualViewport) ölçüleri yazılır:
//        --app-height : görünen alanın yüksekliği (px)
//        --app-top    : görünen alanın sayfanın üstünden kayması (px)
//      ve <html data-klavye="acik"> işaretlenir.
//
// Eski hata: değişkenler klavye kapalıyken de yazılıyordu. iOS Chrome çubukları küçülttüğünde güncel
// değer bazen kaçıyor, düzen çubuklar açıkken ölçülen yüksekliğe kilitleniyordu (altta boş şerit).
// Android Chrome'da klavye işini index.html'deki "interactive-widget=resizes-content" yapar: orada klavye
// sayfanın kendisini küçülttüğü için fark oluşmaz ve 1. durum geçerli kalır.

// Pencere yüksekliği ile görünen alan arasında bu kadar fark varsa klavye açık sayılır (px).
// Araç çubuklarının küçülüp büyümesi iki değeri birlikte değiştirir; fark yalnızca klavyede oluşur.
export const KEYBOARD_MIN_PX = 120;

// Klavye açtıran öğe mi? (yazı kutusu, metin alanı, düzenlenebilir alan)
export function isEditable(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color', 'image', 'hidden'].includes(type);
}

/**
 * O anki ölçülerden düzenin hangi durumda olacağını hesaplar (saf fonksiyon, testli).
 * @returns {{ keyboard: false } | { keyboard: true, height: number, top: number }}
 */
export function computeViewportState({ innerHeight, vvHeight, vvOffsetTop, scale, editableFocused }) {
  // İki parmakla yakınlaştırma klavye değildir: düzen dinamik yükseklikte kalır.
  if (Math.abs(scale - 1) > 0.01) return { keyboard: false };
  if (!editableFocused) return { keyboard: false };
  if (innerHeight - vvHeight < KEYBOARD_MIN_PX) return { keyboard: false };
  return { keyboard: true, height: vvHeight, top: vvOffsetTop };
}

export function trackVisualViewport(win = window) {
  const vv = win.visualViewport;
  if (!vv) return () => {}; // Eski tarayıcı veya test ortamı: CSS varsayılanları (tam ekran) geçerli kalır.

  const root = win.document.documentElement;

  const apply = () => {
    const state = computeViewportState({
      innerHeight: win.innerHeight,
      vvHeight: vv.height,
      vvOffsetTop: vv.offsetTop,
      scale: vv.scale,
      editableFocused: isEditable(win.document.activeElement),
    });
    if (state.keyboard) {
      root.style.setProperty('--app-height', `${state.height}px`);
      root.style.setProperty('--app-top', `${state.top}px`);
      root.setAttribute('data-klavye', 'acik');
    } else {
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--app-top');
      root.removeAttribute('data-klavye');
    }
  };

  // Aynı karede gelen olaylar tek güncellemede birleşir; güncelleme bir sonraki karede yapılır
  // (tarayıcı o zamana kadar yeni ölçüleri hesaplamış olur).
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = win.requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  };
  // Ekran döndürülünce iOS yeni ölçüleri geç bildirebilir: kısa bir süre sonra bir kez daha ölçülür.
  let rotateTimer = 0;
  const onRotate = () => {
    schedule();
    win.clearTimeout(rotateTimer);
    rotateTimer = win.setTimeout(schedule, 300);
  };

  apply();
  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  win.addEventListener('resize', schedule);
  win.addEventListener('orientationchange', onRotate);
  // Odak değişince (klavye açılıp kapanır) de ölçülür.
  win.addEventListener('focusin', schedule);
  win.addEventListener('focusout', schedule);

  // Temizleme: dinleyicileri kaldır, değişkenleri sil.
  return () => {
    vv.removeEventListener('resize', schedule);
    vv.removeEventListener('scroll', schedule);
    win.removeEventListener('resize', schedule);
    win.removeEventListener('orientationchange', onRotate);
    win.removeEventListener('focusin', schedule);
    win.removeEventListener('focusout', schedule);
    if (frame) win.cancelAnimationFrame(frame);
    win.clearTimeout(rotateTimer);
    root.style.removeProperty('--app-height');
    root.style.removeProperty('--app-top');
    root.removeAttribute('data-klavye');
  };
}
