// Her yanıtın altındaki EkoToken rozetleri (yalnızca Deney grubu + Son Test).
// - Girdi/çıktı token, enerji (min–maks Wh), su (min–maks mL), CO₂ (min–maks g)
// - Açılıp kapanan "Günlük Karşılık" kartı (footprint.js → getDailyEquivalents)
// - Standart veya Akıl Yürütme seçildiyse Tasarruf İpucu (savingsPct > 0)
// Değerler sunucudan gelir (eco alanı); burada yalnızca biçimlendirilir.
import { useState } from 'react';
import { Zap, Droplets, Cloud, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { getDailyEquivalents } from '../../lib/footprint.js';
import { fmtSmart } from '../../lib/format.js';

export default function EcoImpactFooter({ eco }) {
  const [expanded, setExpanded] = useState(false);
  const eq = getDailyEquivalents(eco.waterAvg, eco.energyAvg, eco.co2Avg);
  // Token sayıları tahminle bulunduysa "≈" işareti konur (gerçek sayılar gibi görünmesin).
  const approx = eco.tokenSource === 'tahmini' ? '≈ ' : '';

  return (
    <div data-testid="eko-rozetler" className="mt-3 pt-3 border-t border-emerald-100 space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
          Token: {approx}
          {eco.inputTokens} girdi / {approx}
          {eco.outputTokens} çıktı
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 font-medium">
          <Zap className="w-3 h-3 text-amber-600" aria-hidden="true" />
          {fmtSmart(eco.energyMin)}–{fmtSmart(eco.energyMax)} Wh
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200/80 font-medium">
          <Droplets className="w-3 h-3 text-sky-600" aria-hidden="true" />
          {fmtSmart(eco.waterMin)}–{fmtSmart(eco.waterMax)} mL
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
          <Cloud className="w-3 h-3 text-slate-500" aria-hidden="true" />
          {fmtSmart(eco.co2Min)}–{fmtSmart(eco.co2Max)} g CO₂
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition-colors"
        >
          <span>Günlük Karşılık</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs">
          <div className="flex items-start gap-2">
            <Droplets className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-semibold text-slate-900">Su ({fmtSmart(eco.waterAvg)} mL ort.)</div>
              <div className="text-slate-600">{eq.waterPrimary}</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-semibold text-slate-900">Enerji ({fmtSmart(eco.energyAvg)} Wh ort.)</div>
              <div className="text-slate-600">
                {eq.ledText} · {eq.phoneText}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Cloud className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-semibold text-slate-900">Karbon ({fmtSmart(eco.co2Avg)} g ort.)</div>
              <div className="text-slate-600">
                {eq.carText} · {eq.treeText}
              </div>
            </div>
          </div>
        </div>
      )}

      {eco.savingsPct > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
          <span>
            <strong>Tasarruf İpucu:</strong> Bu soruyu <strong>Hafif Model</strong> ile sorsaydın{' '}
            <strong>%{eco.savingsPct} daha az su ve enerji</strong> harcardın.
          </span>
        </div>
      )}
    </div>
  );
}
