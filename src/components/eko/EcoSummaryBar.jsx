// EkoToken "Bu oturum" kartı (yalnızca Deney grubu + Son Test). Yön 2b: siyah kart, sohbet sütunu genişliğinde.
// Solda: bu aşamadaki istem ve token sayısı, büyük mono oturum enerjisi, altında su · CO₂.
// Sağda: istem başına küçük sütun grafiği (son 12 istem; her sütun bir istemin enerjisi, en yenisi yeşil).
// Altta: günlük karşılık satırı (henüz istem yoksa ipucu).
// Toplamlar src/lib/ecoSummary.js → summarizeSession, sütun ölçeği src/lib/ecoVisual.js → promptColumns
// ile hesaplanır (yeni formül yok). Metinler önceki özet şeridiyle aynıdır (müdahale içeriği değişmez).
// Mobil (Dilim 8d): günlük karşılık satırı kırpılmaz, alt satıra kayar. Yazarken (klavye açık) kartın tamamı
// ChatScreen tarafından mobilde gizlenir. Sütunlar yalnızca süslemedir; değerler metin olarak da yazılıdır.
import { fmtSmart } from '../../lib/format.js';
import { promptColumns } from '../../lib/ecoVisual.js';

export default function EcoSummaryBar({ summary }) {
  const { prompts, totalTokens, energy, water, co2, equivalents, energyPerPrompt } = summary;
  const columns = promptColumns(energyPerPrompt);

  return (
    <div data-testid="eko-ozet" className="rounded-[18px] bg-ink text-on-dark px-4 py-3.5 flex flex-col gap-2">
      {/* Üst satır tam genişlikte: 360 px'te sütun grafiği yanında sayıların kaymaması için ayrı satırdadır. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-on-dark-2">Bu oturum</span>
        <span className="font-mono text-[11px] text-on-dark-2 truncate">
          {prompts} İstem · {totalTokens.toLocaleString('tr-TR')} Token
        </span>
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

      <p className="pt-2 border-t border-white/10 text-[11px] leading-4 text-on-dark-2">
        {prompts > 0
          ? `Günlük karşılık: ${equivalents.waterPrimary} · ${equivalents.carText}`
          : 'İpucu: Kısa ve net istemler ile Hafif Model en düşük ayak izini üretir.'}
      </p>
    </div>
  );
}
