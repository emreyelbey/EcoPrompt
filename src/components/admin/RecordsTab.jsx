// Sekme 3: Öğrenci Kayıtları.
// Kod/istem arama, grup/aşama/model filtreleri, filtrelenmiş CSV.
// Liste yanıt metnini taşımaz; satıra tıklanınca tam yanıt RecordPreviewModal'da ayrı istekle gelir.
// Örnek veri önizlemesinde (Dilim 8) AdminScreen örnek kayıtları verir: yanıt kaydın içindedir (sunucuya
// istek yok), CSV ve silme pasiftir.
// Tek kayıt silme kendi onay penceremizle yapılır (tarayıcı confirm() kullanılmaz).
import { useMemo, useState } from 'react';
import { Search, FileDown, Eye, Trash2 } from 'lucide-react';
import ConfirmModal from '../ConfirmModal.jsx';
import RecordPreviewModal from './RecordPreviewModal.jsx';
import { apiRequest } from '../../lib/api.js';
import { filterRecords, PHASE_LABELS } from '../../lib/adminSummary.js';
import { MODEL_ORDER, MODEL_SCALES } from '../../lib/footprint.js';
import { fmtSmart } from '../../lib/format.js';
import { recordsCsv, downloadCsv, fileDate } from '../../lib/csv.js';
import { usePreview } from './PreviewContext.jsx';

// Tablodaki kısa tarih: 23.11 14:05
function shortDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Mobilde yazı 16 px (text-base): iOS Safari daha küçük yazılı kutuya dokununca sayfayı yakınlaştırır.
// Telefonda (sm altı) filtreler ve CSV butonu tam genişlikte, alt alta, en az 44 px yüksekliğindedir.
const SELECT_CLASS = 'w-full sm:w-auto h-11 sm:h-10 px-3.5 rounded-full border border-line-2 text-base sm:text-xs font-semibold text-text-2b bg-surface';

export default function RecordsTab({ records, token, onUnauthorized, onDeleted, onToast }) {
  const preview = usePreview();
  const [filters, setFilters] = useState({ query: '', group: 'all', phase: 'all', model: 'all' });
  const [previewId, setPreviewId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // silinecek kayıt
  const [deleting, setDeleting] = useState(false);

  const list = useMemo(() => filterRecords(records, filters), [records, filters]);
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  // Örnek kayıtların yanıtı kaydın içindedir; önizleme penceresi sunucuya gitmez.
  const previewRecord = previewId ? records.find((r) => r.id === previewId && typeof r.response === 'string') : null;

  const exportCsv = () => {
    if (preview) return; // örnek veri önizlemesinde dışa aktarma yok
    downloadCsv(`Kayitlar_${fileDate()}.csv`, recordsCsv(list));
    onToast(`${list.length} kayıt CSV olarak indirildi.`);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/record?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE', token });
      onDeleted(deleteTarget.id);
      onToast('Kayıt silindi.');
    } catch (err) {
      if (err.status === 401) onUnauthorized();
      else if (err.status === 404) {
        onDeleted(deleteTarget.id); // zaten silinmiş: listeden de çıkar
        onToast(err.message);
      } else onToast(err.message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="bg-surface rounded-[20px] border border-line overflow-hidden">
      {/* Filtreler: tek satırda, grafiklerin/tablonun üstünde */}
      <div className="p-3 border-b border-line flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-2">
        <div className="relative w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
          <Search className="w-4 h-4 text-text-3 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={filters.query}
            onChange={set('query')}
            placeholder="Kod veya istem içinde ara…"
            aria-label="Kod veya istem içinde ara"
            className="w-full h-11 sm:h-10 pl-9 pr-3.5 rounded-full border border-line-2 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-accent-ink/40"
          />
        </div>
        <select value={filters.group} onChange={set('group')} aria-label="Grup" className={SELECT_CLASS}>
          <option value="all">Grup: Tümü</option>
          <option value="Kontrol">Kontrol</option>
          <option value="Deney">Deney</option>
        </select>
        <select value={filters.phase} onChange={set('phase')} aria-label="Aşama" className={SELECT_CLASS}>
          <option value="all">Aşama: Tümü</option>
          <option value="pretest">{PHASE_LABELS.pretest}</option>
          <option value="posttest">{PHASE_LABELS.posttest}</option>
        </select>
        <select value={filters.model} onChange={set('model')} aria-label="Model" className={SELECT_CLASS}>
          <option value="all">Model: Tümü</option>
          {MODEL_ORDER.map((id) => (
            <option key={id} value={id}>
              {MODEL_SCALES[id].name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportCsv}
          disabled={list.length === 0 || preview}
          title={preview ? 'Örnek veri önizlemesinde CSV indirilemez' : undefined}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 sm:h-10 px-4 rounded-full bg-ink hover:bg-ink-2 text-white text-[13px] sm:text-xs font-semibold disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" aria-hidden="true" />
          CSV İndir ({list.length})
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-paper text-text-2 font-semibold border-b border-line">
            <tr>
              <th className="px-3 py-2.5">Tarih</th>
              <th className="px-3 py-2.5">Kod / Grup</th>
              <th className="px-3 py-2.5">Aşama</th>
              <th className="px-3 py-2.5">Model</th>
              <th className="px-3 py-2.5">İstem</th>
              <th className="px-3 py-2.5">Enerji / Su / CO₂ (ort.)</th>
              <th className="px-3 py-2.5 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-text-3">
                  Seçili filtrelere uygun kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              list.map((r) => (
                <tr key={r.id} onClick={() => setPreviewId(r.id)} className="hover:bg-paper cursor-pointer">
                  <td className="px-3 py-2.5 whitespace-nowrap text-text-3">{shortDate(r.createdAt)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-ink">{r.code}</span>
                    <span className="ml-1.5 text-text-3">{r.group}</span>
                    {r.isSample && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">Örnek</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{PHASE_LABELS[r.phase] ?? r.phase}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{MODEL_SCALES[r.modelId]?.name ?? r.modelId}</td>
                  <td className="px-3 py-2.5 max-w-xs truncate text-ink">{r.prompt}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-text-2">
                    {fmtSmart(r.energyAvg)} Wh · {fmtSmart(r.waterAvg)} mL · {fmtSmart(r.co2Avg)} g
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setPreviewId(r.id)}
                      title="Önizle"
                      aria-label={`${r.code} kaydını önizle`}
                      className="p-1.5 rounded-lg text-text-3 hover:bg-line-2 hover:text-ink"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      disabled={preview}
                      title={preview ? 'Örnek kayıt silinemez' : 'Kaydı Sil'}
                      aria-label={`${r.code} kaydını sil`}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RecordPreviewModal
        id={previewId}
        localRecord={previewRecord}
        token={token}
        onUnauthorized={onUnauthorized}
        onClose={() => setPreviewId(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        title="Kayıt silinsin mi?"
        message={
          deleteTarget
            ? `${deleteTarget.code} kodunun ${shortDate(deleteTarget.createdAt)} tarihli kaydı kalıcı olarak silinecek. Bu işlem geri alınamaz.`
            : ''
        }
        confirmLabel="Kaydı Sil"
        busyLabel="Siliniyor…"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
