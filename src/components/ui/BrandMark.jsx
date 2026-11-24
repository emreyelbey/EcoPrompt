// Logo işareti ve kelime işareti (Yön 2b tasarımı, reference/tasarim-yon2b/TASARIM.md Bölüm 3.1–3.2).
// - BrandMark variant="orbit": siyah yuvarlak kare; içinde ince çember, çemberin üzerinde DÖNEN küçük
//   nokta (nötr accent), ortada beyaz nokta. Giriş, sade sohbet ekranı ve yönetici panelinde kullanılır.
// - BrandMark variant="ring": aynı kare; içinde DOLAN yeşil halka. YALNIZCA EkoToken ekranında (kör deney).
// - Wordmark: "Eğitim Asistanı" / "EkoToken"; ikinci kelime italik serif. Ekran okuyucu ve testler için
//   metin bölünmez: textContent yine "Eğitim Asistanı" / "EkoToken" olur.
// Logo süslemedir (aria-hidden); ekranın adı her zaman yanındaki görünür metinden okunur.
// Animasyonlar "hareketi azalt" ayarında index.css tarafından kapatılır.

// Logo karesinin zemin rengi: açık zeminde siyah (ink), koyu zeminde bir ton açık (ink-2) ki kare görünsün.
const TILE_BG = { light: 'bg-ink', dark: 'bg-ink-2' };

export function BrandMark({ variant = 'orbit', size = 40, tone = 'light' }) {
  // Köşe yuvarlaklığı kare boyutuyla orantılı (40 px karede 13 px; TASARIM.md: 12–13 px).
  const radius = Math.round(size * 0.325);
  return (
    <div
      aria-hidden="true"
      className={`relative shrink-0 flex items-center justify-center ${TILE_BG[tone]}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {variant === 'ring' ? <RingMark size={size} /> : <OrbitMark />}
    </div>
  );
}

// Dönen yörünge: çember karenin %22,5 içinden geçer; nokta çemberin tepesinde durur ve kapsayıcı döner.
function OrbitMark() {
  return (
    <>
      <div className="absolute rounded-full border-[1.5px] border-text-2b" style={{ inset: '22.5%' }} />
      <div className="absolute animate-orbit" style={{ inset: '22.5%' }}>
        <div className="absolute left-1/2 -top-[3px] -ml-[3px] w-1.5 h-1.5 rounded-full bg-accent" />
      </div>
      <div className="w-1.5 h-1.5 rounded-full bg-paper" />
    </>
  );
}

// Dolan halka (yalnızca EkoToken): çevresi 2πr ≈ 63 olan çember; stroke-dashoffset 24 → yaklaşık %62 dolu.
// SVG -90° döndürülür ki dolma saat 12 yönünden başlasın.
function RingMark({ size }) {
  const svgSize = Math.round(size * 0.65);
  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-text-2b)" strokeWidth="2" />
      <circle
        className="animate-ring"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="var(--color-eco)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="63"
        strokeDashoffset="24"
      />
      <circle cx="12" cy="12" r="2.6" fill="var(--color-paper)" />
    </svg>
  );
}

// Kelime işareti. first + italik second; `as` ile başlık etiketi seçilir (ör. sohbet ekranında h1).
// Örnek: <Wordmark first="Eğitim " second="Asistanı" /> → "Eğitim Asistanı"
export function Wordmark({ first, second, as: Tag = 'span', className = '' }) {
  return (
    <Tag className={`font-semibold tracking-[-0.03em] ${className}`}>
      {first}
      <span className="font-serif italic font-normal tracking-[-0.01em] text-[1.11em]">{second}</span>
    </Tag>
  );
}
