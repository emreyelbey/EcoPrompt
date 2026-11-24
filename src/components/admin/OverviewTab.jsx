// Sekme 1: Genel Bakış (görünüm Yön 2b).
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
import MetricIcon from '../ui/MetricIcon.jsx';

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
      {/* Kontrol çubuğu: aşama filtresi + Örnek Veriyle Önizle + Verileri Temizle.
          Telefonda (sm altı) hepsi tam genişlikte, alt alta: filtre üç eşit sütun, butonlar eşit yükseklikte (44 px). */}
      <div className="bg-surface rounded-[20px] border border-line p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="grid grid-cols-3 sm:flex sm:items-center p-1 rounded-full bg-muted" role="group" aria-label="Aşama filtresi">
          {PHASE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={phase === f.id}
              onClick={() => setPhase(f.id)}
              className={`h-10 px-2 sm:px-4 rounded-full text-[13px] transition-colors ${
                phase === f.id ? 'bg-ink text-paper font-semibold' : 'text-text-2 font-medium hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Telefonda iki buton arasında biraz daha geniş boşluk: geri alınamaz "Verileri Temizle"ye yanlışlıkla dokunulmasın. */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3.5 sm:gap-2">
          {/* Örnek veri yalnızca tarayıcıda üretilir; veritabanına hiçbir şey yazılmaz. */}
          <button
            type="button"
            onClick={onTogglePreview}
            aria-pressed={preview}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-full border text-[13px] font-semibold ${
              preview
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                : 'bg-warn-bg hover:bg-amber-100 text-warn-ink border-amber-300'
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-full bg-surface hover:bg-rose-50 text-rose-700 border border-rose-300 text-[13px] font-semibold disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Verileri Temizle
          </button>
        </div>
      </div>

      {/* 5 KPI kartı */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Kpi icon={Users} metric="neutral" label="Aktif Katılımcılar" value={fmtInt(s.activeParticipants)} unit={`/ ${s.totalCodes}`} note={`Giriş yapan: ${s.loggedInParticipants}`} />
        <Kpi icon={MessageSquare} metric="neutral" label="Toplam İstem" value={fmtInt(s.totalPrompts)} />
        <Kpi icon={Zap} metric="energy" label="Toplam Enerji" value={fmtSmart(s.totalEnergy)} unit="Wh" />
        <Kpi icon={Droplets} metric="water" label="Toplam Su" value={fmtSmart(s.totalWater)} unit="mL" />
        <Kpi icon={Cloud} metric="co2" label="Toplam CO₂" value={fmtSmart(s.totalCo2)} unit="g" className="col-span-2 lg:col-span-1" />
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

// KPI kartı. İkon renkli yuvarlak zeminde (src/lib/metricColors.js): Enerji/Su/CO₂ renkli, katılımcı ve istem nötr gri.
function Kpi({ icon, metric, label, value, unit, note, className = '' }) {
  return (
    <div className={`relative bg-surface rounded-[20px] border border-line p-5 ${className}`}>
      <PreviewMark />
      <div className="flex items-center justify-between gap-2 text-xs text-text-3">
        <span>{label}</span>
        <MetricIcon icon={icon} metric={metric} />
      </div>
      <div className="mt-2 font-mono text-[26px] leading-8 text-ink">
        {value} {unit && <span className="text-sm text-text-3">{unit}</span>}
      </div>
      {note && <div className="text-[11px] text-text-3 mt-1">{note}</div>}
    </div>
  );
}
