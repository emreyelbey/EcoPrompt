// Ölçü ikonu: açık tonlu küçük yuvarlak zemin (30 px) içinde koyu tonlu ikon. Renkler tek kaynaktan gelir
// (src/lib/metricColors.js): Enerji amber, Su mavi, CO₂ kurşuni; ölçü olmayan ikonlar için 'neutral' (gri).
// İkon süslemedir (aria-hidden); anlamı her zaman yanındaki görünür etiket taşır.
import { metricIconStyle } from '../../lib/metricColors.js';

export default function MetricIcon({ icon: Icon, metric = 'neutral', size = 30 }) {
  return (
    <span
      aria-hidden="true"
      className="shrink-0 inline-flex items-center justify-center rounded-full"
      style={{ width: size, height: size, ...metricIconStyle(metric) }}
    >
      <Icon className="w-4 h-4" strokeWidth={2} />
    </span>
  );
}
