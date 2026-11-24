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

export default function RichMessage({ content, showCopyButton = false }) {
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
      <div className="rich-message text-sm text-slate-800 leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
          components={components}
        >
          {prepareMarkdown(content)}
        </ReactMarkdown>
      </div>

      {showCopyButton && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 min-h-9 sm:min-h-0 px-2.5 sm:px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            {copyState === 'done' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copyState === 'done' ? 'Kopyalandı' : copyState === 'failed' ? 'Kopyalanamadı' : 'Kopyala'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
