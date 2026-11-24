// EkoToken oturum özeti (yalnızca Deney grubu + Son Test). Aynı bilgi iki biçimde çizilir; hangisinin
// görüneceğine ekran genişliği karar verir (yalnızca CSS, tek bileşen):
//   - xl (1280 px) altı → SİYAH KART: üst çubuğun devamında, okuma sütunu genişliğinde. Solda istem/token,
//     büyük mono oturum enerjisi, su · CO₂; sağda son 12 istemin küçük sütun grafiği; altta günlük karşılık.
//   - xl ve üstü → BİRİKİM SÜTUNU: okuma sütununun sağındaki boşlukta, kutusuz, solunda ince çizgi.
//     Üstte etiket + toplamlar, ortada ince dikey yığılmış sütun (her istem bir dilim; eskisi altta, en yenisi
//     üstte; sütunun tamamı = oturum toplamı), altta günlük karşılık.
// RENK + BİÇİM = MODEL SINIFI (src/lib/modelColors.js, tek kaynak): Hafif dolu yeşil, Standart içi boş + çerçeve,
// Akıl Yürütme dolu siyah (siyah kartta dolu açık ton). Her grafiğin altında açıklama (lejant) vardır.
// En yeni istem renkle değil, yanındaki küçük bir nokta işaretiyle gösterilir. Model sınıfı mesajın kendi
// modelId alanından gelir.
// İki biçimde de aynı bilgiler görünür (istem, token, enerji, su, CO₂, günlük karşılık): müdahale içeriği azalmaz.
// Metinler önceki özet şeridiyle aynıdır. Toplamlar src/lib/ecoSummary.js → summarizeSession, çizim ölçekleri
// src/lib/ecoVisual.js (promptColumns, stackSlices) ile hesaplanır; yeni formül yoktur.
// Mobil (Dilim 8d): yazarken (klavye açık) bileşenin tamamı ChatScreen tarafından mobilde gizlenir.
import { fmtSmart } from '../../lib/format.js';
import { MODEL_SCALES } from '../../lib/footprint.js';
import { promptColumns, stackSlices } from '../../lib/ecoVisual.js';
import { modelLegend, modelSwatchStyle } from '../../lib/modelColors.js';

export default function EcoSummaryBar({ summary }) {
  return (
    <div data-testid="eko-ozet" className="xl:h-full">
      <div className="xl:hidden">
        <SessionCard summary={summary} />
      </div>
      <div className="hidden xl:flex xl:h-full">
        <SessionColumn summary={summary} />
      </div>
    </div>
  );
}

// Günlük karşılık satırının metni (iki biçimde ortak; henüz istem yoksa ipucu).
function equivalentText({ prompts, equivalents }) {
  return prompts > 0
    ? `Günlük karşılık: ${equivalents.waterPrimary} · ${equivalents.carText}`
    : 'İpucu: Kısa ve net istemler ile Hafif Model en düşük ayak izini üretir.';
}

// "2 İstem · 450 Token"
function countsText({ prompts, totalTokens }) {
  return `${prompts} İstem · ${totalTokens.toLocaleString('tr-TR')} Token`;
}

// Dilim/sütun etiketi: "3. istem · Standart Model · 0,422 Wh" (yalnızca Türkçe sınıf adı).
function sliceLabel(index, modelId, value) {
  const name = MODEL_SCALES[modelId]?.name ?? 'Model';
  return `${index + 1}. istem · ${name} · ${fmtSmart(value)} Wh`;
}

// Renk açıklaması: küçük renk örneği + kısa sınıf adı. tone: 'light' (kâğıt zemin) | 'dark' (siyah kart).
function Legend({ tone, className = '' }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] ${className}`}>
      {modelLegend(tone).map((item) => (
        <li key={item.id} className="flex items-center gap-1.5">
          {/* Renk örneği dilimlerle aynı biçimde: dolu / içi boş (çerçeveli) / dolu. */}
          <span className="w-2.5 h-2.5 rounded-[2px]" style={item.style} aria-hidden="true" />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------------------
 * xl ALTI: SİYAH KART
 * ------------------------------------------------------------------------- */
function SessionCard({ summary }) {
  const { energy, water, co2, energyPerPrompt, modelPerPrompt } = summary;
  const columns = promptColumns(energyPerPrompt, modelPerPrompt);
  const barWidth = columns.length > 6 ? 6 : 10;
  const barGap = columns.length > 6 ? 3 : 5;

  return (
    <div className="rounded-[18px] bg-ink text-on-dark px-4 py-3.5 flex flex-col gap-2">
      {/* Üst satır tam genişlikte: 360 px'te sütun grafiği yanında sayıların kaymaması için ayrı satırdadır. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="shrink-0 text-[11px] font-medium tracking-[0.1em] uppercase text-on-dark-2">Bu oturum</span>
        <span className="font-mono text-[11px] text-on-dark-2 truncate">{countsText(summary)}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <span className="font-mono text-[26px] leading-7">
            {fmtSmart(energy)}
            <span className="text-[13px] text-on-dark-2"> Wh</span>
          </span>
          <span className="font-mono text-[11px] text-on-dark-2">
            {fmtSmart(water)} mL su · {fmtSmart(co2)} g CO₂
          </span>
        </div>

        {columns.length > 0 && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            {/* Sütun grafiği (son 12 istem). Değerler yukarıda metin olarak da yazılıdır. */}
            <div
              role="img"
              aria-label={`İstem başına enerji, son ${columns.length} istem; renk model sınıfını gösterir`}
              className="flex items-end h-10"
              style={{ gap: barGap }}
            >
              {columns.map((col, i) => (
                <div
                  // Anahtar istemin oturumdaki sırasıdır: yeni istem gelince yalnızca yeni sütun dolarak belirir.
                  key={col.index}
                  title={sliceLabel(col.index, col.modelId, col.value)}
                  className="rounded-[3px] animate-up origin-up"
                  style={{
                    width: barWidth,
                    height: `${col.height}%`,
                    ...modelSwatchStyle(col.modelId, 'dark'),
                    animationDelay: `${Math.min(i, 6) * 0.05}s`,
                  }}
                />
              ))}
            </div>
            {/* En yeni istem işareti: en sağdaki sütunun altında küçük nokta (renk yerine işaret). */}
            <div className="flex" style={{ gap: barGap }} aria-hidden="true">
              {columns.map((col, i) => (
                <span key={col.index} className="flex justify-center" style={{ width: barWidth }}>
                  {i === columns.length - 1 && <span className="w-1 h-1 rounded-full bg-on-dark" />}
                </span>
              ))}
            </div>
            <span className="text-[10px] tracking-[0.06em] uppercase text-on-dark-2">İstem başına</span>
          </div>
        )}
      </div>

      {columns.length > 0 && <Legend tone="dark" className="text-on-dark-2" />}

      <p className="pt-2 border-t border-white/10 text-[11px] leading-4 text-on-dark-2">{equivalentText(summary)}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * xl VE ÜSTÜ: BİRİKİM SÜTUNU
 * ------------------------------------------------------------------------- */
function SessionColumn({ summary }) {
  const { energy, water, co2, energyPerPrompt, modelPerPrompt } = summary;
  const slices = stackSlices(energyPerPrompt, modelPerPrompt);
  const newest = slices.length - 1;

  return (
    <div className="h-full w-full flex flex-col gap-5 py-8 pl-5">
      {/* Üst: etiket ve toplamlar */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-text-3">Bu oturum</span>
        <span className="font-mono text-[28px] leading-8 text-ink">
          {fmtSmart(energy)}
          <span className="text-sm text-text-3"> Wh</span>
        </span>
        <span className="font-mono text-[11px] text-text-2">
          {fmtSmart(water)} mL su · {fmtSmart(co2)} g CO₂
        </span>
        <span className="font-mono text-[11px] text-text-2">{countsText(summary)}</span>
      </div>

      {/* Orta: dikey yığılmış birikim sütunu. Kalan yüksekliğin tamamını kaplar; sütunun tamamı oturum toplamıdır.
          flex-col-reverse: dizideki ilk (en eski) istem en altta, en yenisi en üstte durur.
          Her dilimin yüksekliği flex-grow ile o istemin payına oranlanır (dilimler arası 2 px boşluk düşüldükten
          sonra). Dilimin rengi ve biçimi o istemin model sınıfıdır. Yeni istem gelince yeni dilim alttan dolarak belirir,
          diğerleri yumuşakça küçülür ("hareketi azalt" açıksa ikisi de animasyonsuz). */}
      <div className="flex-1 min-h-0 flex">
        <div
          role="list"
          aria-label="İstem başına enerji; sütunun tamamı oturum toplamı, renk model sınıfı"
          className={`w-[18px] h-full flex flex-col-reverse gap-[2px] rounded-[5px] ${slices.length === 0 ? 'bg-muted' : ''}`}
        >
          {slices.map((slice) => {
            const label = sliceLabel(slice.index, slice.modelId, slice.value);
            const isNewest = slice.index === newest;
            return (
              <div
                key={slice.index}
                role="listitem"
                tabIndex={0}
                title={label}
                aria-label={label}
                data-newest={isNewest ? 'true' : undefined}
                // group: üzerine gelince veya klavyeyle odaklanınca yanındaki etiket görünür.
                className="group relative min-h-[2px] rounded-[3px] outline-none animate-up origin-up transition-[flex-grow] duration-700 ease-out focus-visible:ring-2 focus-visible:ring-accent-ink focus-visible:ring-offset-2"
                style={{ flexGrow: slice.share, flexBasis: 0, ...modelSwatchStyle(slice.modelId) }}
              >
                {/* En yeni istem işareti: dilimin sağında küçük nokta (renk yerine işaret). */}
                {isNewest && (
                  <span
                    aria-hidden="true"
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-1.5 w-1.5 h-1.5 rounded-full bg-ink"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-10 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] text-on-dark opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Renk açıklaması ve günlük karşılık */}
      <div className="flex flex-col gap-3">
        {slices.length > 0 && <Legend tone="light" className="text-text-2" />}
        <p className="text-[11px] leading-4 text-text-2">{equivalentText(summary)}</p>
      </div>
    </div>
  );
}
