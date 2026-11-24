// Her yanıtın altındaki EkoToken kartları (yalnızca Deney grubu + Son Test). Yön 2b tasarımı:
// 1) "Bu yanıtın ayak izi": enerji / su / CO₂ için büyük mono ortalama, min–maks aralık çubuğu, aralık metni;
//    sağ üstte girdi → çıktı token. Çubuğun tamamı = aynı tokenla Akıl Yürütme sınıfının maks değeri
//    (onaylanan ölçek, src/lib/ecoVisual.js → rangeBands).
// 2) Tasarruf kartı (yalnızca Standart veya Akıl Yürütme seçildiyse, savingsPct > 0): büyük mono −%X, seçilen
//    model ve Hafif Model için iki çubuk, altında Tasarruf İpucu cümlesi (müdahale metni AYNEN korunur).
// 3) Günlük Karşılık: tek satırlık açılır buton ("≈ N su damlası" önizlemeli); açılınca ayrıntılar
//    (footprint.js → getDailyEquivalents).
// Değerler sunucudan gelir (eco alanı); burada yalnızca biçimlendirilir ve çizilir. Çubuklar süsleme
// olarak dolar ("hareketi azalt" açıksa hemen son halinde görünür); bütün sayılar metin olarak da yazılıdır.
import { useState } from 'react';
import { Zap, Droplets, Cloud, ChevronDown } from 'lucide-react';
import { getDailyEquivalents, MODEL_SCALES } from '../../lib/footprint.js';
import { fmtSmart } from '../../lib/format.js';
import { rangeBands, savingsBars } from '../../lib/ecoVisual.js';

// Seçili model çubuğunun kısa etiketi (Tasarruf kartında).
const SHORT_NAMES = { light: 'Hafif', standard: 'Standart', reasoning: 'Akıl Yürütme' };

// Aralık çubuğunun üzerine gelince çıkan açıklama: çubuğun neyi temsil ettiği.
const RANGE_TITLE = 'Koyu bant bu yanıtın en düşük–en yüksek tahminidir. Çubuğun tamamı: aynı soru Akıl Yürütme Modeli ile sorulsaydı çıkabilecek en yüksek değer.';

export default function EcoImpactFooter({ eco, modelId }) {
  const [expanded, setExpanded] = useState(false);
  const eq = getDailyEquivalents(eco.waterAvg, eco.energyAvg, eco.co2Avg);
  const bands = rangeBands(eco);
  // Token sayıları tahminle bulunduysa "≈" işareti konur (gerçek sayılar gibi görünmesin).
  const approx = eco.tokenSource === 'tahmini' ? '≈ ' : '';

  const metrics = [
    { key: 'energy', label: 'Enerji', unit: 'Wh', avg: eco.energyAvg, min: eco.energyMin, max: eco.energyMax },
    { key: 'water', label: 'Su', unit: 'mL', avg: eco.waterAvg, min: eco.waterMin, max: eco.waterMax },
    { key: 'co2', label: 'Karbon', unit: 'g CO₂', avg: eco.co2Avg, min: eco.co2Min, max: eco.co2Max },
  ];

  return (
    <div data-testid="eko-rozetler" className="flex flex-col gap-2.5">
      {/* 1) Bu yanıtın ayak izi */}
      <div className="rounded-2xl border border-line bg-surface px-3.5 py-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-[11px] font-medium tracking-[0.1em] uppercase text-text-3">Bu yanıtın ayak izi</span>
          <span className="font-mono text-[11px] text-text-2b">
            {approx}
            {eco.inputTokens} girdi → {approx}
            {eco.outputTokens} çıktı
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.key} className="min-w-0 flex flex-col gap-1">
              <span className="sr-only">{m.label}:</span>
              <span className="font-mono text-[15px] text-ink truncate">
                {fmtSmart(m.avg)}
                <span className="text-[10px] text-text-3"> {m.unit}</span>
              </span>
              <div className="relative h-1 rounded-full bg-muted overflow-hidden" title={RANGE_TITLE} aria-hidden="true">
                <div
                  className="absolute inset-y-0 rounded-full bg-ink animate-grow origin-grow"
                  style={{ left: `${bands[m.key].left}%`, width: `${bands[m.key].width}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-text-3 truncate">
                {fmtSmart(m.min)}–{fmtSmart(m.max)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2) Tasarruf kartı: yalnızca Standart / Akıl Yürütme seçildiyse */}
      {eco.savingsPct > 0 && <SavingsCard pct={eco.savingsPct} modelId={modelId} />}

      {/* 3) Günlük Karşılık: tek satır önizleme, tıklayınca ayrıntılar */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="min-h-11 px-3.5 rounded-full border border-line bg-surface hover:border-line-2 text-[13px] text-text-2b flex items-center justify-between gap-2 text-left transition-colors"
      >
        <span className="min-w-0 truncate">
          <b className="font-semibold text-ink">Günlük Karşılık</b> · {eq.waterPrimary}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl border border-line bg-surface text-xs">
          <EquivalentItem icon={Droplets} title={`Su (${fmtSmart(eco.waterAvg)} mL ort.)`} text={eq.waterPrimary} />
          <EquivalentItem
            icon={Zap}
            title={`Enerji (${fmtSmart(eco.energyAvg)} Wh ort.)`}
            text={`${eq.ledText} · ${eq.phoneText}`}
          />
          <EquivalentItem
            icon={Cloud}
            title={`Karbon (${fmtSmart(eco.co2Avg)} g ort.)`}
            text={`${eq.carText} · ${eq.treeText}`}
          />
        </div>
      )}
    </div>
  );
}

// Tasarruf kartı: büyük −%X, iki karşılaştırma çubuğu (seçilen model tam, Hafif orantılı kısa) ve ipucu cümlesi.
function SavingsCard({ pct, modelId }) {
  const bars = savingsBars(pct);
  return (
    <div className="rounded-2xl border border-line bg-surface px-3.5 py-3 flex flex-col gap-2.5">
      <span className="font-mono text-xl leading-6 text-eco-ink">−%{pct}</span>
      <div className="grid grid-cols-[84px_1fr] gap-x-2.5 gap-y-1.5 items-center text-[11px] text-text-3" aria-hidden="true">
        <span className="truncate">{SHORT_NAMES[modelId] ?? MODEL_SCALES[modelId]?.name}</span>
        <div className="h-2 rounded-full bg-ink animate-grow origin-grow" style={{ width: `${bars.selected}%` }} />
        <span>Hafif</span>
        <div
          className="h-2 rounded-full bg-eco-2 animate-grow origin-grow"
          style={{ width: `${bars.light}%`, animationDelay: '0.3s' }}
        />
      </div>
      {/* Müdahale metni: önceki sürümle birebir aynı cümle. */}
      <p className="text-[13px] leading-5 text-text-2b">
        <strong className="font-semibold text-ink">Tasarruf İpucu:</strong> Bu soruyu{' '}
        <strong className="font-semibold text-ink">Hafif Model</strong> ile sorsaydın{' '}
        <strong className="font-semibold text-ink">%{pct} daha az su ve enerji</strong> harcardın.
      </p>
    </div>
  );
}

// Günlük karşılık ayrıntısındaki bir satır (ikon + başlık + metin).
function EquivalentItem({ icon: Icon, title, text }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-text-3 shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <div className="font-semibold text-ink">{title}</div>
        <div className="text-text-2 mt-0.5">{text}</div>
      </div>
    </div>
  );
}
