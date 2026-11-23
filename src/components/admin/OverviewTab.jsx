// Sekme 1: Genel Bakış & Grafikler.
// Aşama filtresi, 5 KPI kartı, Kontrol vs Deney istem karşılaştırması, istem başına ortalama
// enerji/su/CO₂ ve model tercih dağılımı. Örnek kayıtlar hesaplara girmez (AdminScreen ayıklar).
// Verileri Temizle butonu da buradadır (onay penceresi AdminScreen'de).
// "Örnek veriyle önizle" anahtarı da buradadır (Dilim 8). Önizleme açıkken AdminScreen örnek seti ve
// örnek kod listesini (codeGroups) verir; Verileri Temizle pasiftir.
import { useMemo, useState } from 'react';
import { Users, MessageSquare, Zap, Droplets, Cloud, Trash2, FlaskConical } from 'lucide-react';
import { overviewStats, PHASE_LABELS } from '../../lib/adminSummary.js';
import { MODEL_ORDER, MODEL_SCALES } from '../../lib/footprint.js';
import { fmtNum, fmtSmart } from '../../lib/format.js';
import { ChartCard, GroupBarChart, ModelShareChart, DataTable } from './charts.jsx';
import { PreviewMark, usePreview } from './PreviewContext.jsx';

const PHASE_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'pretest', label: PHASE_LABELS.pretest },
  { id: 'posttest', label: PHASE_LABELS.posttest },
];

const fmtInt = (v) => Number(v).toLocaleString('tr-TR');
const fmtAvg = (v) => fmtNum(v, 2);

export default function OverviewTab({ records, logins, codeGroups, onClearClick, onTogglePreview }) {
  const preview = usePreview();
  const [phase, setPhase] = useState('all');
  const s = useMemo(() => overviewStats(records, logins, phase, codeGroups), [records, logins, phase, codeGroups]);
  const k = s.groups.Kontrol;
  const d = s.groups.Deney;

  return (
    <div className="space-y-4">
      {/* Kontrol çubuğu: aşama filtresi + Verileri Temizle */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl" role="group" aria-label="Aşama filtresi">
          {PHASE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={phase === f.id}
              onClick={() => setPhase(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                phase === f.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Örnek veri yalnızca tarayıcıda üretilir; veritabanına hiçbir şey yazılmaz. */}
          <button
            type="button"
            onClick={onTogglePreview}
            aria-pressed={preview}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${
              preview
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            <FlaskConical className="w-4 h-4" aria-hidden="true" />
            {preview ? 'Önizlemeden Çık' : 'Örnek Veriyle Önizle'}
          </button>
          <button
            type="button"
            onClick={onClearClick}
            disabled={preview}
            title={preview ? 'Örnek veri önizlemesinde veri temizlenemez' : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Verileri Temizle
          </button>
        </div>
      </div>

      {/* 5 KPI kartı */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={Users} label="Aktif Katılımcılar" value={fmtInt(s.activeParticipants)} unit={`/ ${s.totalCodes}`} note={`Giriş yapan: ${s.loggedInParticipants}`} />
        <Kpi icon={MessageSquare} label="Toplam İstem" value={fmtInt(s.totalPrompts)} />
        <Kpi icon={Zap} label="Toplam Enerji" value={fmtSmart(s.totalEnergy)} unit="Wh" />
        <Kpi icon={Droplets} label="Toplam Su" value={fmtSmart(s.totalWater)} unit="mL" />
        <Kpi icon={Cloud} label="Toplam CO₂" value={fmtSmart(s.totalCo2)} unit="g" className="col-span-2 lg:col-span-1" />
      </div>

      {/* Ana karşılaştırma: iki ayrı ölçek → iki ayrı grafik */}
      <ChartCard
        title="Kontrol ve Deney Grubu — İstem Sayıları"
        subtitle="Aktif katılımcı: en az bir istem yazan öğrenci. Toplam ve öğrenci başına ortalama farklı ölçekte olduğu için ayrı çizilir."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GroupBarChart title="Toplam istem sayısı" values={{ Kontrol: k.prompts, Deney: d.prompts }} format={fmtInt} />
          <GroupBarChart title="Öğrenci başına ortalama istem" values={{ Kontrol: k.avgPrompts, Deney: d.avgPrompts }} format={fmtAvg} />
        </div>
        <DataTable
          headers={['Grup', 'Aktif öğrenci', 'Toplam istem', 'Öğrenci başına istem']}
          rows={[
            ['Kontrol', k.users, fmtInt(k.prompts), fmtAvg(k.avgPrompts)],
            ['Deney', d.users, fmtInt(d.prompts), fmtAvg(d.avgPrompts)],
          ]}
        />
      </ChartCard>

      {/* İstem başına çevresel etki: üç birim → üç grafik */}
      <ChartCard title="İstem Başına Ortalama Çevresel Etki" subtitle="Bir sorunun ortalama enerji, su ve karbon değeri (ortalama katsayılarla)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <GroupBarChart title="Enerji (Wh)" values={{ Kontrol: k.avgEnergy, Deney: d.avgEnergy }} />
          <GroupBarChart title="Su (mL)" values={{ Kontrol: k.avgWater, Deney: d.avgWater }} />
          <GroupBarChart title="CO₂ (g)" values={{ Kontrol: k.avgCo2, Deney: d.avgCo2 }} />
        </div>
        <DataTable
          headers={['Grup', 'Enerji (Wh)', 'Su (mL)', 'CO₂ (g)']}
          rows={[
            ['Kontrol', fmtSmart(k.avgEnergy), fmtSmart(k.avgWater), fmtSmart(k.avgCo2)],
            ['Deney', fmtSmart(d.avgEnergy), fmtSmart(d.avgWater), fmtSmart(d.avgCo2)],
          ]}
        />
      </ChartCard>

      <ChartCard title="Model Ölçeği Tercih Dağılımı (%)" subtitle="Her grubun istemlerinin model sınıflarına dağılımı">
        <ModelShareChart groups={s.groups} />
        <DataTable
          headers={['Grup', ...MODEL_ORDER.map((id) => MODEL_SCALES[id].name)]}
          rows={['Kontrol', 'Deney'].map((g) => [
            g,
            ...MODEL_ORDER.map((id) => `${s.groups[g].models[id].count} istem (%${fmtNum(s.groups[g].models[id].pct, 1)})`),
          ])}
        />
      </ChartCard>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, unit, note, className = '' }) {
  return (
    <div className={`relative bg-white rounded-2xl border border-slate-200 p-4 ${className}`}>
      <PreviewMark />
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
      </div>
      <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
        {value} {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
      </div>
      {note && <div className="text-[11px] text-slate-500 mt-0.5">{note}</div>}
    </div>
  );
}
