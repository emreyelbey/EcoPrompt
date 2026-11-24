// Asistan yanıtını zengin biçimde gösterir: Markdown (6 başlık seviyesi, tablo, alıntı,
// iç içe liste, kod bloğu) ve KaTeX formülleri. Para tutarları formül sanılmaz (src/lib/markdown.js).
// KaTeX yazı tipleri ve CSS'i npm paketinden gelir; dışarıdan (CDN) hiçbir şey yüklenmez.
// Dilim 8: remark-breaks tek satır sonunu korur (alt alta yazılan satırlar birleşmez).
// mhchem eklentisi kimyasal formülleri \ce{H2O} ile dik ve doğru alt simgeli çizer (KaTeX paketinin
// parçasıdır; çiziciyle aynı KaTeX kopyasına kaydolur, package.json → overrides tek kopya sağlar).
// İsteğe bağlı "Kopyala" butonu yanıtın ham metnini panoya kopyalar.
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import 'katex/contrib/mhchem'; // \ce{...} komutunu KaTeX'e ekler (yan etkili içe aktarma)
import { Copy, Check } from 'lucide-react';
import { prepareMarkdown } from '../lib/markdown.js';

// Bağlantılar yeni sekmede açılır; böylece öğrenci sohbet sayfasından çıkmış olmaz.
const components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

// textClassName: metnin boyutu ve rengi. Sohbet ekranı daha büyük okuma metni verir (Yön 2b);
// yönetici panelindeki kayıt önizlemesi varsayılanı kullanır.
const DEFAULT_TEXT_CLASS = 'text-sm text-slate-800 leading-relaxed';

// Kopyala butonunun erişilebilir adı (ikon butonu olduğu için ad buradan gelir).
const COPY_LABELS = { idle: 'Kopyala', done: 'Kopyalandı', failed: 'Kopyalanamadı' };

export default function RichMessage({ content, showCopyButton = false, textClassName = DEFAULT_TEXT_CLASS }) {
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'done' | 'failed'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyState('done');
    } catch {
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div>
      <div className={`rich-message break-words ${textClassName}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
          components={components}
        >
          {prepareMarkdown(content)}
        </ReactMarkdown>
      </div>

      {showCopyButton && (
        // Yön 2b: yanıtın altında solda yuvarlak ikon butonu (40 px dokunma alanı, Dilim 8d).
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={COPY_LABELS[copyState]}
            title={COPY_LABELS[copyState]}
            className="w-10 h-10 rounded-full border border-line-2 bg-surface text-text-2b hover:text-ink hover:border-text-3 flex items-center justify-center transition-colors"
          >
            {copyState === 'done' ? (
              <Check className="w-[15px] h-[15px]" aria-hidden="true" />
            ) : (
              <Copy className="w-[15px] h-[15px]" aria-hidden="true" />
            )}
          </button>
          {/* Sonuç ekran okuyucuya da okunur; görünür kısa not yalnızca kopyalandıktan sonra çıkar. */}
          <span role="status" className="text-xs text-text-3">
            {copyState === 'idle' ? '' : COPY_LABELS[copyState]}
          </span>
        </div>
      )}
    </div>
  );
}
