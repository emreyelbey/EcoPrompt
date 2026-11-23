// Yapay zeka yanıtını Markdown + formül olarak çizmeden önce hazırlar (saf fonksiyonlar, testli).
// Sorun: Formüller $...$ ile yazılır; ama "$10 ve $20" gibi para tutarları da $ içerir ve
// formül sanılıp bozulur. Çözüm: para tutarı olan $ işaretlerini \$ ile kaçışlamak.
// Kod blokları (``` ... ``` ve `...`) olduğu gibi bırakılır.

// \( ... \) ve \[ ... \] formül yazımlarını $ ... $ ve $$ ... $$ biçimine çevirir.
export function normalizeMathDelimiters(text) {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, body) => `$$${body}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, body) => `$${body}$`);
}

// İki $ arasındaki metin formül gibi görünüyor mu? (=, ^, _, \, {, } veya "+ 3" gibi işlem)
function looksLikeMath(inner) {
  return /[=^_\\{}]/.test(inner) || /[+\-*/×÷]\s*\d/.test(inner);
}

// Kod içermeyen bir metin parçasında para tutarlarını kaçışlar.
function protectSegment(segment) {
  let out = '';
  let i = 0;
  while (i < segment.length) {
    const ch = segment[i];

    // Zaten kaçışlanmış karakter (\$ gibi): olduğu gibi geç.
    if (ch === '\\') {
      out += segment.slice(i, i + 2);
      i += 2;
      continue;
    }

    // $$ ... $$ blok formülü: kapanışına kadar dokunmadan geç.
    if (ch === '$' && segment[i + 1] === '$') {
      const end = segment.indexOf('$$', i + 2);
      const stop = end === -1 ? segment.length : end + 2;
      out += segment.slice(i, stop);
      i = stop;
      continue;
    }

    // Tek $ ve hemen ardından rakam: para tutarı mı, formül mü?
    if (ch === '$' && /\d/.test(segment[i + 1] || '')) {
      // Aynı satırdaki bir sonraki $ işaretini bul.
      const lineEnd = segment.indexOf('\n', i);
      const limit = lineEnd === -1 ? segment.length : lineEnd;
      const close = segment.indexOf('$', i + 1);
      const hasClose = close !== -1 && close < limit;

      if (hasClose && looksLikeMath(segment.slice(i + 1, close))) {
        // Formül ($2 + 3 = 5$ gibi): kapanışıyla birlikte olduğu gibi bırak.
        out += segment.slice(i, close + 1);
        i = close + 1;
        continue;
      }
      // Para tutarı ($10, $0.15): kaçışla.
      out += '\\$';
      i += 1;
      continue;
    }

    // Tek $ ve ardından rakam olmayan karakter ($x^2$ gibi): formül başlangıcı, dokunma.
    out += ch;
    i += 1;
  }
  return out;
}

// Metni kod parçalarına göre böler; `fn` yalnızca kod OLMAYAN parçalara uygulanır.
// Bölme sonucu: çift sıralar normal metin, tek sıralar kod parçasıdır.
function outsideCode(text, fn) {
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/);
  return parts.map((part, index) => (index % 2 === 1 ? part : fn(part))).join('');
}

// Para tutarlarındaki $ işaretlerini kaçışlar; kod bloklarına dokunmaz.
export function protectCurrency(text) {
  return outsideCode(text, protectSegment);
}

// Yanıtı çizime hazırlar: önce formül yazımları birleştirilir, sonra para tutarları korunur.
// İkisi de yalnızca kod dışındaki metne uygulanır.
export function prepareMarkdown(text) {
  if (typeof text !== 'string') return '';
  return outsideCode(text, (part) => protectSegment(normalizeMathDelimiters(part)));
}
