// Yapay zeka yanıtını Markdown + formül olarak çizmeden önce hazırlar (saf fonksiyonlar, testli).
// Sorun: Formüller $...$ ile yazılır; ama "$10 ve $20" gibi para tutarları da $ içerir ve
// formül sanılıp bozulur. Çözüm: para tutarı olan $ işaretlerini \$ ile kaçışlamak.
// Kod blokları (``` ... ``` ve `...`) olduğu gibi bırakılır.
// Dilim 8: tek satırdaki $$ … $$ formülü blok formüle çevrilir (alt alta denklemler yapışmasın diye).
// Tek satır sonlarının korunması ise RichMessage'daki remark-breaks eklentisinin işidir.

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

/**
 * "$" + rakam ile başlayan bir parça satır içi formül mü, para tutarı mı?
 * open: açılış $'ının yeri, close: aynı satırdaki bir sonraki $'ın yeri.
 *
 * 1) Sınır kuralı (Pandoc'un kuralı): kapanış $'ından hemen önce boşluk olamaz ve hemen ardından rakam
 *    gelemez. Para tutarlarında "ikinci $" neredeyse her zaman bir sonraki tutarın başıdır:
 *      "$10 ile $20"  → ikinci $'ın önünde boşluk, ardında rakam var → formül DEĞİL (para).
 *      "$5 + $3 = $8" → "$3 = $" parçasında kapanışın önünde boşluk var → formül değil (Dilim 8 düzeltmesi;
 *                       eski kural içindeki "=" yüzünden bunu formül sanıyordu).
 * 2) İçerik kuralı (biri yeter):
 *    - formül işareti taşır (looksLikeMath),
 *    - rakamın hemen ardından harf ya da komut gelir: "$3x$", "$2n$", "$4\pi$",
 *    - içi yalnızca bir sayıdır: "$12$", "$2,5$". Para metninde kapanış $'ı sayıya bitişik bu biçim doğal
 *      olarak geçmez ("$5 ile 10$" içi saf sayı olmadığı için para kalır).
 *    Eski kural bu üçüncü ve ikinci durumları para sanıp açılış $'ını kaçışlıyordu. "$12$ molekül
 *    $\ce{H2O}$" örneğinde eşini kaybeden $ bir sonraki formülün $'ıyla eşleşiyor, "$ molekül $" formül
 *    olarak çiziliyor ve "\ce{H2O}$" çiğ kalıyordu (Dilim 8, kullanıcının bulduğu hata).
 */
function isInlineFormula(segment, open, close) {
  const before = segment[close - 1];
  const after = segment[close + 1] || '';
  if (/\s/.test(before) || /\d/.test(after)) return false;
  const inner = segment.slice(open + 1, close);
  return looksLikeMath(inner) || /^\d+(?:[.,]\d+)?(?:[A-Za-z\\]|$)/.test(inner);
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

      if (hasClose && isInlineFormula(segment, i, close)) {
        // Formül ($2 + 3 = 5$, $3x$ gibi): kapanışıyla birlikte olduğu gibi bırak.
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

/**
 * Tek başına bir satırda duran $$ … $$ formülünü blok formüle çevirir.
 * Sorun: Markdown'da "$$a=b$$" tek satırda yazılınca SATIR İÇİ formül sayılır; alt alta yazılmış
 * iki denklem aynı satıra yapışır. Çözüm: $$ işaretlerini ayrı satırlara alıp etrafına boş satır koymak:
 *
 *   $$a=b$$          →      (boş satır)
 *                           $$
 *                           a=b
 *                           $$
 *                           (boş satır)
 *
 * Satırın başındaki girinti korunur (liste içindeki formül listede kalır).
 * ``` kod bloklarının içine dokunulmaz. Satırda formülden başka metin varsa dokunulmaz.
 */
export function promoteDisplayMath(text) {
  let inFence = false; // ``` kod bloğunun içinde miyiz?
  return text
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      // girinti + $$ + içerik ($ ve ` içermeyen) + $$ + yalnızca boşluk
      const match = /^(\s*)\$\$([^$`]+)\$\$\s*$/.exec(line);
      if (!match) return line;
      const [, indent, body] = match;
      return ['', `${indent}$$`, `${indent}${body.trim()}`, `${indent}$$`, ''].join('\n');
    })
    .join('\n');
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

// Yanıtı çizime hazırlar, üç adımda:
//   1) \( \) ve \[ \] yazımları $ biçimine çevrilir (kod dışında),
//   2) tek satırdaki $$ … $$ blok formüle çevrilir (kod blokları hariç),
//   3) para tutarları korunur (kod dışında).
export function prepareMarkdown(text) {
  if (typeof text !== 'string') return '';
  const normalized = outsideCode(text, normalizeMathDelimiters);
  const promoted = promoteDisplayMath(normalized);
  return outsideCode(promoted, protectSegment);
}
