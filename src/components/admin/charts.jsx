// Yönetici paneli grafik parçaları (recharts). Kişisel Rapor ile aynı yaklaşım:
// - Farklı birimler/ölçekler aynı eksende birleştirilmez; her ölçü kendi küçük grafiğindedir.
// - Renk varlığı izler: Kontrol ve Deney her grafikte aynı renktedir. Renk tek başına bilgi taşımaz: eksende veya
//   açıklamada ad, sütunda sayı yazılıdır; her grafiğin altında "Tablo olarak göster" bulunur.
// - Model sınıfları öğrenci ekranıyla AYNI eşlemeyi kullanır (src/lib/modelColors.js, 'chart' zemini):
//   Hafif dolu yeşil, Standart çok açık gri + koyu çerçeve, Akıl Yürütme dolu siyah.
// - Görünüm Yön 2b: beyaz kartlar (20 px köşe), ince çizgiler, mono sayılar. Grup ve aşama renkleri nötrdür
//   (model renkleriyle karışmaz); hepsi beyaz zemine karşı en az 3:1 kontrast sağlar.
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import { MODEL_ORDER, MODEL_SCALES } from '../../lib/footprint.js';
import { fmtNum, fmtSmart } from '../../lib/format.js';
import { insetSliceRect, modelStyle, modelSwatchStyle } from '../../lib/modelColors.js';
import { PreviewMark } from './PreviewContext.jsx';

// Kontrol: gri, Deney: nötr çivit (model renkleri olan yeşil/siyah kullanılmaz).
export const GROUP_COLORS = { Kontrol: '#8A8A93', Deney: '#4F46E5' };

// Ön Test / Son Test (grup renklerinden ayrı: burada seri aşamadır, grup eksende yazılı).
// Ön Test açık gri (sütun üstünde sayısı yazılıdır), Son Test mürekkep siyahı.
export const PHASE_COLORS = { 'Ön Test': '#A1A1AA', 'Son Test': '#0A0A0B' };

const MONO = 'JetBrains Mono, monospace';
const AXIS_TICK = { fontSize: 11, fill: '#71717A', fontFamily: MONO };
const GRID_COLOR = '#ECECEA';
const CURSOR = { fill: '#F4F4F5' };
const LABEL_STYLE = { fontSize: 11, fontWeight: 500, fill: '#3F3F46', fontFamily: MONO }; // metin rengi, seri rengi değil

// Grafik kartı: başlık, alt başlık ve içerik. Önizleme modunda "ÖRNEK VERİ" etiketi ve filigranı taşır.
export function ChartCard({ title, subtitle, children }) {
  return (
    <section className="relative bg-surface rounded-[20px] border border-line p-5">
      <PreviewMark />
      <h3 className="text-base font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      {subtitle && <p className="text-xs text-text-3 mt-1">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// Seri açıklaması (lejant): renk örneği + ad. items: [{ key, name, style }]
function SeriesLegend({ items }) {
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-text-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px]" style={item.style} aria-hidden="true" />
          {item.name}
        </li>
      ))}
    </ul>
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
    <div className="rounded-2xl border border-line p-3">
      <h4 className="text-xs font-medium text-text-2">{title}</h4>
      <div className="h-44 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} width={48} tickFormatter={format} />
            <Tooltip formatter={(v) => [format(v), title]} cursor={CURSOR} />
            <Bar dataKey="value" radius={[6, 6, 2, 2]} maxBarSize={52}>
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
 * Model sınıfı görünümü öğrenci ekranıyla aynıdır (modelColors.js): Standart çerçeveli açık gri.
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
    <div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={AXIS_TICK} tickFormatter={(v) => `%${v}`} />
            <YAxis type="category" dataKey="name" tick={AXIS_TICK} width={96} />
            <Tooltip formatter={(v, key) => [`%${fmtNum(v, 1)}`, MODEL_SCALES[key]?.name ?? key]} cursor={CURSOR} />
            {MODEL_ORDER.map((id) => {
              const look = modelStyle(id, 'chart');
              return (
                // Dilim şekli modelColors.js'teki kurala göre çizilir (insetSliceRect): üç sınıf da aynı kalınlıkta
                // çerçeve alır ve çerçeve şeklin İÇİNE çizilir; dış ölçüler birebir aynıdır, aralarında 2 px boşluk kalır.
                <Bar
                  key={id}
                  dataKey={id}
                  stackId="pay"
                  fill={look.fill}
                  shape={(props) => <rect {...insetSliceRect(props, id)} />}
                >
                  <LabelList
                    dataKey={id}
                    position="center"
                    formatter={pct}
                    // Açık gri Standart dilimde koyu, dolu dilimlerde beyaz yazı.
                    style={{ fontSize: 11, fontWeight: 600, fill: look.hollow ? '#0A0A0B' : '#ffffff', fontFamily: MONO }}
                  />
                </Bar>
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend
        items={MODEL_ORDER.map((id) => ({ key: id, name: MODEL_SCALES[id].name, style: modelSwatchStyle(id, 'chart') }))}
      />
    </div>
  );
}

/**
 * Ön Test – Son Test gruplandırılmış sütun grafiği (İstatistik sekmesi).
 * @param {{ name: string, 'Ön Test': number|null, 'Son Test': number|null }[]} data  statsReport.prePostChartData
 */
export function PrePostChart({ title, data, format = fmtSmart }) {
  const label = (v) => (v === null || v === undefined ? '' : format(v));
  return (
    <div className="rounded-2xl border border-line p-3">
      <h4 className="text-xs font-medium text-text-2">{title}</h4>
      <div className="h-52 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} width={52} tickFormatter={format} />
            <Tooltip formatter={(v, key) => [label(v), key]} cursor={CURSOR} />
            {['Ön Test', 'Son Test'].map((phase) => (
              <Bar key={phase} dataKey={phase} fill={PHASE_COLORS[phase]} radius={[6, 6, 2, 2]} maxBarSize={44}>
                <LabelList dataKey={phase} position="top" formatter={label} style={LABEL_STYLE} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SeriesLegend
        items={['Ön Test', 'Son Test'].map((phase) => ({
          key: phase,
          name: phase,
          style: { backgroundColor: PHASE_COLORS[phase] },
        }))}
      />
    </div>
  );
}

// Grafiklerin altındaki "Tablo olarak göster" bölümü.
export function DataTable({ headers, rows }) {
  return (
    <details className="mt-4 rounded-2xl border border-line">
      <summary className="cursor-pointer min-h-10 flex items-center px-3.5 text-xs font-semibold text-text-2b">
        Tablo olarak göster
      </summary>
      <div className="overflow-x-auto px-3.5 pb-3">
        <table className="min-w-full text-xs text-left">
          <thead className="text-text-3">
            <tr>
              {headers.map((h) => (
                <th key={h} className="py-1.5 pr-4 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink">
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i} className={`py-1.5 pr-4 ${i === 0 ? 'font-semibold' : 'font-mono'}`}>
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
