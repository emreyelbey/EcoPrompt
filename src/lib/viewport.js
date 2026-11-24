// Mobil klavye açıkken ekranın gerçekten görünen kısmını CSS değişkenlerine yazar (Dilim 8d).
// Neden: iOS Safari klavye açılınca sabit (fixed) düzeni küçültmez; klavye ekranın altını örter ve
// tarayıcı sayfayı kaydırır. Böylece üst çubuk ekrandan çıkar ya da yazma alanı klavyenin altında kalır.
// Tarayıcının visualViewport bilgisi (görünen alanın yüksekliği ve üstten kayması) okunup
//   --app-height : görünen alanın yüksekliği (px)
//   --app-top    : görünen alanın sayfanın üstünden kayması (px)
// değişkenlerine yazılır. index.css → .app-viewport sınıfı ana görünümleri bu alana oturtur.
// Android Chrome'da aynı işi index.html'deki "interactive-widget=resizes-content" ayarı yapar;
// orada bu değerler zaten tam ekranla aynı çıkar, yardımcı zararsızdır.

export function trackVisualViewport(win = window) {
  const vv = win.visualViewport;
  if (!vv) return () => {}; // Eski tarayıcı veya test ortamı: CSS varsayılanları (tam ekran) geçerli kalır.

  const root = win.document.documentElement;

  const update = () => {
    if (Math.abs(vv.scale - 1) > 0.01) {
      // Kullanıcı iki parmakla yakınlaştırdıysa görünen alan küçülür ama bu klavye değildir:
      // düzen tam ekrana döner (değişkenler silinir, CSS varsayılanı kullanılır).
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--app-top');
      return;
    }
    root.style.setProperty('--app-height', `${vv.height}px`);
    root.style.setProperty('--app-top', `${vv.offsetTop}px`);
  };

  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);

  // Temizleme: dinleyicileri kaldır, değişkenleri sil.
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
    root.style.removeProperty('--app-height');
    root.style.removeProperty('--app-top');
  };
}
