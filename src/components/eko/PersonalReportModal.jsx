// Kişisel Rapor penceresi (yalnızca Deney grubu + Son Test).
// İçerik: günlük hayat karşılıkları, etkileşim bazlı girdi/çıktı token grafiği,
// birikimli su / enerji / CO₂ grafikleri, model tercih dağılımı ve tablo görünümü.
// Bu dosya ChatScreen'de React.lazy ile yüklenir: grafik kütüphanesi (recharts) ayrı bir
// parçaya düşer ve sade ekrandaki öğrencinin tarayıcısı onu hiç indirmez.
// Grafik notu: su (mL), enerji (Wh) ve CO₂ (g) farklı birimlerdir; tek eksende birleştirmek
// yanıltıcı olurdu. Bu yüzden her biri kendi küçük grafiğinde gösterilir.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Droplets, Zap, Cloud, Leaf } from 'lucide-react';
import Modal from '../Modal.jsx';
import { fmtNum, fmtSmart } from '../../lib/format.js';

// Renkler: doğrulanmış kategorik paletin ilk üç rengi (renk körlüğünde de ayırt edilebilir).
// Her model sınıfı her grafikte hep aynı rengi alır.
const MODEL_COLORS = { light: '#2a78d6', standard: '#eb6834', reasoning: '#1baf7a' };
const TOKEN_COLORS = { Girdi: '#2a78d6', Çıktı: '#eb6834' };

// Eksen ve ızgara çizgileri soluk tutulur; veri öne çıkar.
const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const GRID_COLOR = '#e2e8f0';

// Araç ipucundaki sayıları Türkçe biçimde yazar.
const formatTooltip = (value) => fmtSmart(value);

export default function PersonalReportModal({ open, onClose, summary, participantCode }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Kişisel Rapor — ${participantCode}`}
      subtitle="Bu oturumdaki etkileşimlerinin özeti ve günlük hayat karşılıkları"
      maxWidth="max-w-4xl"
    >
      {summary.prompts === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <Leaf className="w-10 h-10 mx-auto text-emerald-400 mb-3" aria-hidden="true" />
          <p className="font-medium text-slate-700">Henüz bu oturumda bir etkileşimin yok.</p>
          <p className="text-xs mt-1">İlk sorunu sorduktan sonra kişisel grafiklerin burada oluşacak.</p>
        </div>
      ) : (
        <ReportBody summary={summary} />
      )}
    </Modal>
  );
}

function ReportBody({ summary }) {
  const eq = summary.equivalents;

  return (
    <div className="space-y-5">
      {/* Günlük hayat karşılık kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Droplets className="w-4 h-4" aria-hidden="true" />}
          label="Toplam Su Ayak İzi"
          value={`${fmtSmart(summary.water)} mL`}
          primary={eq.waterPrimary}
          secondary={`${fmtNum(eq.glasses, 3)} su bardağı · ${fmtNum(eq.bottles, 3)} şişe`}
          tone="sky"
        />
        <StatCard
          icon={<Zap className="w-4 h-4" aria-hidden="true" />}
          label="Toplam Enerji Tüketimi"
          value={`${fmtSmart(summary.energy)} Wh`}
          primary={eq.ledText}
          secondary={eq.phoneText}
          tone="amber"
        />
        <StatCard
          icon={<Cloud className="w-4 h-4" aria-hidden="true" />}
          label="Toplam Karbon Emisyonu"
          value={`${fmtSmart(summary.co2)} g CO₂`}
          primary={eq.carText}
          secondary={eq.treeText}
          tone="slate"
        />
      </div>

      {/* Etkileşim bazlı girdi / çıktı token grafiği */}
      <ChartCard title="Etkileşim Bazlı Girdi ve Çıktı Token Sayısı">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.perInteraction} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} width={48} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('tr-TR')} cursor={{ fill: '#f1f5f9' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Girdi" fill={TOKEN_COLORS.Girdi} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Çıktı" fill={TOKEN_COLORS.Çıktı} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Birikimli trendler: her ölçü kendi grafiğinde (farklı birimler) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TrendChart title="Birikimli Su (mL)" dataKey="Su" color="#2a78d6" data={summary.perInteraction} />
        <TrendChart title="Birikimli Enerji (Wh)" dataKey="Enerji" color="#eda100" data={summary.perInteraction} />
        <TrendChart title="Birikimli CO₂ (g)" dataKey="CO2" color="#6250d6" data={summary.perInteraction} />
      </div>

      {/* Model tercih dağılımı */}
      <ChartCard title="Model Tercih Dağılımı">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.modelDistribution}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {summary.modelDistribution.map((item) => (
                    <Cell key={item.id} fill={MODEL_COLORS[item.id]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v} istem`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Açıklama listesi: renk tek başına bilgi taşımasın diye ad ve sayı yazılı */}
          <ul className="flex-1 w-full space-y-1.5">
            {summary.modelDistribution.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MODEL_COLORS[item.id] }} />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-900">
                  {item.count} istem (%{item.pct})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      {/* Tablo görünümü: grafiklerdeki sayıların tamamı */}
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-slate-700">Tablo olarak göster</summary>
        <div className="overflow-x-auto px-4 pb-3">
          <table className="min-w-full text-xs text-left">
            <thead className="text-slate-500">
              <tr>
                <th className="py-1.5 pr-3">Etkileşim</th>
                <th className="py-1.5 pr-3">Girdi token</th>
                <th className="py-1.5 pr-3">Çıktı token</th>
                <th className="py-1.5 pr-3">Birikimli su (mL)</th>
                <th className="py-1.5 pr-3">Birikimli enerji (Wh)</th>
                <th className="py-1.5">Birikimli CO₂ (g)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {summary.perInteraction.map((row) => (
                <tr key={row.name}>
                  <td className="py-1.5 pr-3 font-semibold">{row.name}</td>
                  <td className="py-1.5 pr-3">{row.Girdi.toLocaleString('tr-TR')}</td>
                  <td className="py-1.5 pr-3">{row.Çıktı.toLocaleString('tr-TR')}</td>
                  <td className="py-1.5 pr-3">{fmtSmart(row.Su)}</td>
                  <td className="py-1.5 pr-3">{fmtSmart(row.Enerji)}</td>
                  <td className="py-1.5">{fmtSmart(row.CO2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// Renk tonlarına göre kart sınıfları (Tailwind sınıfları tam yazılır ki derlemede kaybolmasın).
const TONES = {
  sky: 'bg-sky-50 border-sky-200 text-sky-950',
  amber: 'bg-amber-50 border-amber-200 text-amber-950',
  slate: 'bg-slate-100 border-slate-200 text-slate-900',
};

function StatCard({ icon, label, value, primary, secondary, tone }) {
  return (
    <div className={`p-4 rounded-xl border ${TONES[tone]}`}>
      <div className="flex items-center justify-between text-xs font-semibold opacity-80">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      <div className="text-xs mt-1.5 font-medium">{primary}</div>
      <div className="text-[11px] mt-0.5 opacity-75">{secondary}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 bg-white">
      <h3 className="text-sm font-bold text-slate-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

// Tek ölçülü birikimli trend grafiği (başlık ölçüyü ve birimi söyler; ayrı açıklama kutusu gerekmez).
function TrendChart({ title, dataKey, color, data }) {
  return (
    <ChartCard title={title}>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} width={48} tickFormatter={formatTooltip} />
            <Tooltip formatter={formatTooltip} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.15}
              dot={{ r: 3, strokeWidth: 0, fill: color }}
              activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
