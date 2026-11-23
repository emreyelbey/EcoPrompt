// Kayıt önizleme penceresi: tam öğrenci istemi + biçimlendirilmiş asistan yanıtı (RichMessage).
// Tam yanıt listede yoktur; pencere açılınca /api/admin/record?id=... ile tek kayıt istenir.
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../Modal.jsx';
import RichMessage from '../RichMessage.jsx';
import { apiRequest } from '../../lib/api.js';
import { PHASE_LABELS } from '../../lib/adminSummary.js';
import { MODEL_SCALES } from '../../lib/footprint.js';
import { fmtSmart } from '../../lib/format.js';

export default function RecordPreviewModal({ id, token, onUnauthorized, onClose }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setRecord(null);
    setError('');
    apiRequest(`/api/admin/record?id=${encodeURIComponent(id)}`, { token })
      .then((data) => {
        if (!cancelled) setRecord(data.record);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) onUnauthorized();
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, token, onUnauthorized]);

  const subtitle = record
    ? `${PHASE_LABELS[record.phase] ?? record.phase} · ${MODEL_SCALES[record.modelId]?.name ?? record.modelId} · ${
        record.createdAt ? new Date(record.createdAt).toLocaleString('tr-TR') : ''
      }`
    : '';

  return (
    <Modal
      open={Boolean(id)}
      onClose={onClose}
      title={record ? `Etkileşim Detayı — ${record.code} (${record.group})` : 'Etkileşim Detayı'}
      subtitle={subtitle}
    >
      {!record && !error && (
        <div className="py-10 flex justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" aria-label="Yükleniyor" />
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}
      {record && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200">
            <div className="text-[11px] font-bold uppercase text-slate-500 mb-1">Öğrenci İstemi</div>
            <p className="text-sm text-slate-900 whitespace-pre-wrap">{record.prompt}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat label={`Token (${record.tokenSource ?? '—'})`} value={`${record.inputTokens ?? 0} girdi / ${record.outputTokens ?? 0} çıktı`} />
            <Stat label="Enerji (ort.)" value={`${fmtSmart(record.energyAvg)} Wh`} />
            <Stat label="Su (ort.)" value={`${fmtSmart(record.waterAvg)} mL`} />
            <Stat label="CO₂ (ort.)" value={`${fmtSmart(record.co2Avg)} g`} />
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold uppercase text-slate-500 mb-2">Asistan Yanıtı</div>
            <RichMessage content={record.response} showCopyButton />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
      <div className="text-slate-500">{label}</div>
      <div className="font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}
