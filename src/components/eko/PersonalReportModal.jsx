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
import { Droplets, Zap, Cloud } from 'lucide-react';
import Modal from '../Modal.jsx';
import { BrandMark } from '../ui/BrandMark.jsx';
import { fmtNum, fmtSmart } from '../../lib/format.js';
import { modelStyle, modelSwatchStyle, STANDARD_STROKE_WIDTH } from '../../lib/modelColors.js';

// Model sınıfı görünümü tek kaynaktan gelir (src/lib/modelColors.js, 'chart' zemini): Hafif dolu yeşil,
// Standart çok açık gri dolgu + koyu çerçeve, Akıl Yürütme dolu siyah. Birikim sütunu ve oturum kartıyla aynı
// eşleme. Renk/biçim tek başına bilgi taşımaz: adlar ve sayılar yazılıdır.
// Token grafiği (Girdi / Çıktı) model sınıfı göstermez; bu yüzden model renkleriyle (yeşil, siyah)
// karışmayan tonlar kullanılır: açık gri ve nötr çivit. İkisi de beyaz zemine karşı en az 3:1.
const TOKEN_COLORS = { Girdi: '#8A8A93', Çıktı: '#4F46E5' };
// Birikimli su / enerji / CO₂ grafikleri (her biri kendi grafiğinde, tek seri). Model sınıfı göstermedikleri için
// yeşil (= Hafif) değil, model renkleriyle karışmayan nötr çivit kullanılır.
const TREND_COLOR = '#4F46E5';

// Eksen ve ızgara çizgileri soluk tutulur; veri öne çıkar.
const AXIS_TICK = { fontSize: 11, fill: '#71717A', fontFamily: 'JetBrains Mono, monospace' };
const GRID_COLOR = '#ECECEA';

// Y ekseni yazılarına ayrılan genişlik (px). "0,0012" veya "120.000" gibi değerler dar ekranda kesilmesin.
const Y_AXIS_WIDTH = 56;

// Token grafiğinde etkileşim başına en az genişlik (px). Etkileşim çoksa ve ekran darsa (mobil 360 px)
// çubuklar sıkışmaz; grafik bu genişliği aşınca kendi kutusu içinde yatay kayar.
const MIN_PX_PER_INTERACTION = 24;

// Grafik kütüphanesinin kendi (JS) animasyonları CSS'teki "hareketi azalt" kuralıyla durmaz; bu yüzden ayar
// burada da okunur ve açıksa çubuklar/alanlar animasyonsuz, hemen son halinde çizilir.
const ANIMATE = !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

// Araç ipucundaki sayıları Türkçe biçimde yazar.
const formatTooltip = (value) => fmtSmart(value);

export default function PersonalReportModal({ open, onClose, summary, participantCode }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      // Başlık metni değişmedi ("Kişisel Rapor — D001"); yalnızca ikinci kelime italik serif, kod mono.
      title={
        <>
          Kişisel <span className="font-serif italic font-normal text-[1.1em]">Rapor</span> —{' '}
          <span className="font-mono text-[0.85em] font-medium">{participantCode}</span>
        </>
      }
      subtitle="Bu oturumdaki etkileşimlerinin özeti ve günlük hayat karşılıkları"
      maxWidth="max-w-4xl"
    >
      {summary.prompts === 0 ? (
        <div className="py-12 flex flex-col items-center text-center text-text-3">
          <div className="mb-4">
            <BrandMark variant="ring" size={48} />
          </div>
          <p className="font-medium text-ink">Henüz bu oturumda bir etkileşimin yok.</p>
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
        />
        <StatCard
          icon={<Zap className="w-4 h-4" aria-hidden="true" />}
          label="Toplam Enerji Tüketimi"
          value={`${fmtSmart(summary.energy)} Wh`}
          primary={eq.ledText}
          secondary={eq.phoneText}
        />
        <StatCard
          icon={<Cloud className="w-4 h-4" aria-hidden="true" />}
          label="Toplam Karbon Emisyonu"
          value={`${fmtSmart(summary.co2)} g CO₂`}
          primary={eq.carText}
          secondary={eq.treeText}
        />
      </div>

      {/* Etkileşim bazlı girdi / çıktı token grafiği */}
      <ChartCard title="Etkileşim Bazlı Girdi ve Çıktı Token Sayısı">
        <div className="overflow-x-auto">
          <div className="h-56 w-full" style={{ minWidth: summary.perInteraction.length * MIN_PX_PER_INTERACTION }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.perInteraction} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} width={Y_AXIS_WIDTH} />
              <Tooltip formatter={(v) => Number(v).toLocaleString('tr-TR')} cursor={{ fill: '#F4F4F5' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={ANIMATE} dataKey="Girdi" fill={TOKEN_COLORS.Girdi} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar isAnimationActive={ANIMATE} dataKey="Çıktı" fill={TOKEN_COLORS.Çıktı} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>

      {/* Birikimli trendler: her ölçü kendi grafiğinde (farklı birimler) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TrendChart title="Birikimli Su (mL)" dataKey="Su" color={TREND_COLOR} data={summary.perInteraction} />
        <TrendChart title="Birikimli Enerji (Wh)" dataKey="Enerji" color={TREND_COLOR} data={summary.perInteraction} />
        <TrendChart title="Birikimli CO₂ (g)" dataKey="CO2" color={TREND_COLOR} data={summary.perInteraction} />
      </div>

      {/* Model tercih dağılımı */}
      <ChartCard title="Model Tercih Dağılımı">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie isAnimationActive={ANIMATE}
                  data={summary.modelDistribution}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {/* Standart: çok açık gri dolgu + koyu çerçeve; diğerleri dolu (aralarında beyaz boşluk çizgisi). */}
                  {summary.modelDistribution.map((item) => {
                    const look = modelStyle(item.id, 'chart');
                    return (
                      <Cell
                        key={item.id}
                        fill={look.fill}
                        stroke={look.stroke ?? '#ffffff'}
                        strokeWidth={look.stroke ? STANDARD_STROKE_WIDTH : 2}
                      />
                    );
                  })}
                </Pie>
                <Tooltip formatter={(v) => `${v} istem`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Açıklama listesi: renk tek başına bilgi taşımasın diye ad ve sayı yazılı */}
          <ul className="flex-1 w-full space-y-1.5">
            {summary.modelDistribution.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-text-2b">
                  <span className="w-3 h-3 rounded-full" style={modelSwatchStyle(item.id, 'chart')} aria-hidden="true" />
                  {item.name}
                </span>
                <span className="font-mono text-[13px] text-ink">
                  {item.count} istem (%{item.pct})
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      {/* Tablo görünümü: grafiklerdeki sayıların tamamı */}
      <details className="rounded-2xl border border-line bg-surface">
        <summary className="cursor-pointer min-h-11 flex items-center px-4 text-sm font-semibold text-ink">Tablo olarak göster</summary>
        <div className="overflow-x-auto px-4 pb-3">
          <table className="min-w-full text-xs text-left font-mono">
            <thead className="text-text-3 font-sans">
              <tr>
                <th className="py-1.5 pr-3">Etkileşim</th>
                <th className="py-1.5 pr-3">Girdi token</th>
                <th className="py-1.5 pr-3">Çıktı token</th>
                <th className="py-1.5 pr-3">Birikimli su (mL)</th>
                <th className="py-1.5 pr-3">Birikimli enerji (Wh)</th>
                <th className="py-1.5">Birikimli CO₂ (g)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {summary.perInteraction.map((row) => (
                <tr key={row.name}>
                  <td className="py-1.5 pr-3">{row.name}</td>
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

// Toplam kartı: etiket + ikon, büyük mono değer, günlük hayat karşılıkları. Üç kart da nötr beyazdır.
function StatCard({ icon, label, value, primary, secondary }) {
  return (
    <div className="p-4 rounded-2xl border border-line bg-surface">
      <div className="flex items-center justify-between text-xs font-medium text-text-3">
        <span>{label}</span>
        {icon}
      </div>
      <div className="font-mono text-[22px] leading-7 text-ink mt-1.5">{value}</div>
      <div className="text-xs mt-1.5 font-medium text-text-2b">{primary}</div>
      <div className="text-[11px] mt-0.5 text-text-3">{secondary}</div>
    </div>
  );
}

// Grafik kartı: başlık + içerik.
function ChartCard({ title, children }) {
  return (
    <div className="p-4 rounded-2xl border border-line bg-surface">
      <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink mb-3">{title}</h3>
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
            <YAxis tick={AXIS_TICK} width={Y_AXIS_WIDTH} tickFormatter={formatTooltip} />
            <Tooltip formatter={formatTooltip} />
            <Area isAnimationActive={ANIMATE}
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
