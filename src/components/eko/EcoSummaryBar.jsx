// EkoToken oturum özeti (yalnızca Deney grubu + Son Test). Aynı bilgi iki biçimde çizilir; hangisinin
// görüneceğine ekran genişliği karar verir (yalnızca CSS, tek bileşen):
//   - xl (1280 px) altı → SİYAH KART: üst çubuğun devamında, okuma sütunu genişliğinde. Solda istem/token,
//     büyük mono oturum enerjisi, su · CO₂; sağda son 12 istemin küçük sütun grafiği; altta günlük karşılık.
//   - xl ve üstü → BİRİKİM SÜTUNU: okuma sütununun sağındaki boşlukta, kutusuz, solunda ince çizgi.
//     Üstte etiket + toplamlar, ortada ince dikey yığılmış sütun (her istem bir dilim; eskisi altta, en yenisi
//     üstte ve yeşil; sütunun tamamı = oturum toplamı), altta günlük karşılık.
// İki biçimde de aynı bilgiler görünür (istem, token, enerji, su, CO₂, günlük karşılık): müdahale içeriği azalmaz.
// Metinler önceki özet şeridiyle aynıdır. Toplamlar src/lib/ecoSummary.js → summarizeSession, çizim ölçekleri
// src/lib/ecoVisual.js (promptColumns, stackSlices) ile hesaplanır; yeni formül yoktur.
// Mobil (Dilim 8d): yazarken (klavye açık) bileşenin tamamı ChatScreen tarafından mobilde gizlenir.
import { fmtSmart } from '../../lib/format.js';
import { promptColumns, stackSlices } from '../../lib/ecoVisual.js';

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

/* ---------------------------------------------------------------------------
 * xl ALTI: SİYAH KART
 * ------------------------------------------------------------------------- */
function SessionCard({ summary }) {
  const { energy, water, co2, energyPerPrompt } = summary;
  const columns = promptColumns(energyPerPrompt);

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
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            {/* Sütun grafiği: ekran okuyucuya tek cümleyle anlatılır (değerler zaten yukarıda yazılı). */}
            <div
              role="img"
              aria-label={`İstem başına enerji, son ${columns.length} istem`}
              className="flex items-end h-10"
              style={{ gap: columns.length > 6 ? 3 : 5 }}
            >
              {columns.map((col, i) => (
                <div
                  // Anahtar istemin oturumdaki sırasıdır: yeni istem gelince yalnızca yeni sütun dolarak belirir.
                  key={col.index}
                  className={`rounded-[3px] animate-up origin-up ${i === columns.length - 1 ? 'bg-eco' : 'bg-text-2'}`}
                  style={{
                    width: columns.length > 6 ? 6 : 10,
                    height: `${col.height}%`,
                    animationDelay: `${Math.min(i, 6) * 0.05}s`,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] tracking-[0.06em] uppercase text-on-dark-2">İstem başına</span>
          </div>
        )}
      </div>

      <p className="pt-2 border-t border-white/10 text-[11px] leading-4 text-on-dark-2">{equivalentText(summary)}</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * xl VE ÜSTÜ: BİRİKİM SÜTUNU
 * ------------------------------------------------------------------------- */
function SessionColumn({ summary }) {
  const { energy, water, co2, energyPerPrompt } = summary;
  const slices = stackSlices(energyPerPrompt);
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
          sonra). Yeni istem gelince yeni dilim alttan dolarak belirir, diğerleri yumuşakça küçülür
          ("hareketi azalt" açıksa ikisi de animasyonsuz). */}
      <div className="flex-1 min-h-0 flex">
        <div
          role="list"
          aria-label="İstem başına enerji; sütunun tamamı oturum toplamı"
          className={`w-[18px] h-full flex flex-col-reverse gap-[2px] rounded-[5px] ${slices.length === 0 ? 'bg-muted' : ''}`}
        >
          {slices.map((slice) => {
            const label = `${slice.index + 1}. istem · ${fmtSmart(slice.value)} Wh`;
            const isNewest = slice.index === newest;
            return (
              <div
                key={slice.index}
                role="listitem"
                tabIndex={0}
                title={label}
                aria-label={label}
                // group: üzerine gelince veya klavyeyle odaklanınca yanındaki etiket görünür.
                className={`group relative min-h-[2px] rounded-[3px] outline-none animate-up origin-up transition-[flex-grow] duration-700 ease-out focus-visible:ring-2 focus-visible:ring-accent-ink focus-visible:ring-offset-2 ${
                  isNewest ? 'bg-eco' : slice.index % 2 === 0 ? 'bg-ink' : 'bg-text-2'
                }`}
                style={{ flexGrow: slice.share, flexBasis: 0 }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] text-on-dark opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alt: günlük karşılık */}
      <p className="text-[11px] leading-4 text-text-2">{equivalentText(summary)}</p>
    </div>
  );
}
