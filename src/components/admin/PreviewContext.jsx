// Örnek veri önizleme modu için ortak bilgi ve "ÖRNEK VERİ" işareti.
// AdminScreen önizleme açıkken PreviewContext'e true verir. Kartlar (KPI, grafik, istatistik testi,
// değişim kartı) <PreviewMark /> ile hem kenarda görünen bir etiket hem de arkada soluk bir filigran
// gösterir. Böylece tek bir kartın ekran görüntüsü bile gerçek sonuç sanılamaz.
// Kullanım: kartın en dış kutusu `relative` olmalı; işaret kartın içeriğini kapatmaz (tıklamaları geçirir).
import { createContext, useContext } from 'react';

export const PreviewContext = createContext(false);

// Önizleme modu açık mı?
export function usePreview() {
  return useContext(PreviewContext);
}

export function PreviewMark() {
  const preview = usePreview();
  if (!preview) return null;

  return (
    <>
      {/* Arkadaki soluk, çapraz filigran (kart köşelerinden taşmasın diye kendi kutusunda kırpılır) */}
      {/* rounded-[inherit]: filigran kutusu kartın kendi köşe yuvarlaklığını alır (Yön 2b'de 20 px). */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] flex items-center justify-center">
        <span className="-rotate-12 select-none whitespace-nowrap text-4xl font-bold tracking-widest text-amber-500/15">
          ÖRNEK VERİ
        </span>
      </div>
      {/* Kartın üst kenarına oturan etiket: içerikle çakışmaz */}
      <span
        data-testid="ornek-etiket"
        className="pointer-events-none absolute -top-2.5 right-4 z-10 rounded-full bg-amber-500 px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] text-white shadow-sm"
      >
        ÖRNEK VERİ
      </span>
    </>
  );
}
