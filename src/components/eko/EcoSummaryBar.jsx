// EkoToken üst özet şeridi (yalnızca Deney grubu + Son Test).
// Bu aşamadaki istem ve token sayısı, toplam enerji, su, CO₂ ve bir günlük karşılık gösterir.
// Toplamlar src/lib/ecoSummary.js → summarizeSession ile hesaplanır (yeni formül yok).
import { Zap, Droplets, Cloud } from 'lucide-react';
import { fmtSmart } from '../../lib/format.js';

export default function EcoSummaryBar({ summary }) {
  const { prompts, totalTokens, energy, water, co2, equivalents } = summary;

  return (
    <div
      data-testid="eko-ozet"
      className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white border-t border-emerald-600/50"
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] sm:text-xs">
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
          <span className="font-semibold text-emerald-100">
            {prompts} İstem · {totalTokens.toLocaleString('tr-TR')} Token
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            {fmtSmart(energy)} Wh
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Droplets className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
            {fmtSmart(water)} mL
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <Cloud className="w-3.5 h-3.5 text-slate-200" aria-hidden="true" />
            {fmtSmart(co2)} g CO₂
          </span>
        </div>
        <div className="text-[11px] text-emerald-100 font-medium truncate max-w-full">
          {prompts > 0
            ? `Günlük karşılık: ${equivalents.waterPrimary} · ${equivalents.carText}`
            : 'İpucu: Kısa ve net istemler ile Hafif Model en düşük ayak izini üretir.'}
        </div>
      </div>
    </div>
  );
}
