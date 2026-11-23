// Yönetici paneli grafik parçaları (recharts). Dilim 5'teki Kişisel Rapor ile aynı yaklaşım:
// - Farklı birimler/ölçekler aynı eksende birleştirilmez; her ölçü kendi küçük grafiğindedir.
// - Renk varlığı izler: Kontrol ve Deney her grafikte aynı renktedir; model sınıfları Dilim 5'teki
//   renkleri kullanır. Renk tek başına bilgi taşımaz: eksende veya açıklamada ad, sütunda sayı yazılıdır.
// - Renkler doğrulanmış kategorik paletten seçildi (renk körlüğü ayrımı kontrol edildi). Sarı renk açık
//   zeminde düşük kontrastlı olduğu için sütun üstünde sayı etiketi ve "Tablo olarak göster" bulunur.
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { MODEL_ORDER, MODEL_SCALES } from '../../lib/footprint.js';
import { fmtNum, fmtSmart } from '../../lib/format.js';

export const GROUP_COLORS = { Kontrol: '#6250d6', Deney: '#eda100' };
export const MODEL_COLORS = { light: '#2a78d6', standard: '#eb6834', reasoning: '#1baf7a' };

const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const GRID_COLOR = '#e2e8f0';
const LABEL_STYLE = { fontSize: 11, fontWeight: 600, fill: '#334155' }; // metin rengi, seri rengi değil

export function ChartCard({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Kontrol ve Deney için tek ölçülü küçük sütun grafiği.
 * @param {{ Kontrol: number, Deney: number }} values
 * @param {(v: number) => string} format  sayı biçimi (etiket ve araç ipucu)
 */
export function GroupBarChart({ title, values, format = fmtSmart }) {
  const data = [
    { name: 'Kontrol', value: values.Kontrol },
    { name: 'Deney', value: values.Deney },
  ];
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
      <div className="h-44 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} width={48} tickFormatter={format} />
            <Tooltip formatter={(v) => [format(v), title]} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((d) => (
                <Cell key={d.name} fill={GROUP_COLORS[d.name]} />
              ))}
              <LabelList dataKey="value" position="top" formatter={format} style={LABEL_STYLE} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Model tercih dağılımı: her grup için %100'lük yığılmış yatay sütun.
 * @param {object} groups  overviewStats().groups
 */
export function ModelShareChart({ groups }) {
  const data = ['Kontrol', 'Deney'].map((g) => {
    const row = { name: `${g} Grubu` };
    for (const id of MODEL_ORDER) row[id] = Number(groups[g].models[id].pct.toFixed(1));
    return row;
  });
  const pct = (v) => (v >= 6 ? `%${fmtNum(v, 1)}` : ''); // dar dilimlere etiket sığmaz; tabloda yazılı

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} tickFormatter={(v) => `%${v}`} />
          <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={96} />
          <Tooltip formatter={(v, key) => [`%${fmtNum(v, 1)}`, MODEL_SCALES[key]?.name ?? key]} cursor={{ fill: '#f1f5f9' }} />
          <Legend formatter={(key) => MODEL_SCALES[key]?.name ?? key} wrapperStyle={{ fontSize: 12 }} />
          {MODEL_ORDER.map((id) => (
            // Beyaz kenar: yan yana dilimler arasında 2 px boşluk.
            <Bar key={id} dataKey={id} stackId="pay" fill={MODEL_COLORS[id]} stroke="#ffffff" strokeWidth={2}>
              <LabelList dataKey={id} position="center" formatter={pct} style={{ fontSize: 11, fontWeight: 700, fill: '#ffffff' }} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Ön Test / Son Test renkleri (grup renklerinden ayrı: burada seri aşamadır, grup eksende yazılı).
export const PHASE_COLORS = { 'Ön Test': '#94a3b8', 'Son Test': '#4f46e5' };

/**
 * Ön Test – Son Test gruplandırılmış sütun grafiği (İstatistik sekmesi).
 * @param {{ name: string, 'Ön Test': number|null, 'Son Test': number|null }[]} data  statsReport.prePostChartData
 */
export function PrePostChart({ title, data, format = fmtSmart }) {
  const label = (v) => (v === null || v === undefined ? '' : format(v));
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
      <div className="h-52 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} width={52} tickFormatter={format} />
            <Tooltip formatter={(v, key) => [label(v), key]} cursor={{ fill: '#f1f5f9' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {['Ön Test', 'Son Test'].map((phase) => (
              <Bar key={phase} dataKey={phase} fill={PHASE_COLORS[phase]} radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList dataKey={phase} position="top" formatter={label} style={LABEL_STYLE} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Grafiklerin altındaki "Tablo olarak göster" bölümü.
export function DataTable({ headers, rows }) {
  return (
    <details className="mt-3 rounded-xl border border-slate-200">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600">Tablo olarak göster</summary>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="min-w-full text-xs text-left">
          <thead className="text-slate-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="py-1.5 pr-4 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i} className={`py-1.5 pr-4 ${i === 0 ? 'font-semibold' : 'tabular-nums'}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
