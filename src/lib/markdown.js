// Yapay zeka yanıtını Markdown + formül olarak çizmeden önce hazırlar (saf fonksiyonlar, testli).
// Sorun: Formüller $...$ ile yazılır; ama "$10 ve $20" gibi para tutarları da $ içerir ve
// formül sanılıp bozulur. Çözüm: para tutarı olan $ işaretlerini \$ ile kaçışlamak.
// Kod blokları (``` ... ``` ve `...`) olduğu gibi bırakılır.
// Dilim 8: tek satırdaki $$ … $$ formülü blok formüle çevrilir (alt alta denklemler yapışmasın diye).
// Tek satır sonlarının korunması ise RichMessage'daki remark-breaks eklentisinin işidir.
// formul-duzeltme (24.11.2026): formül içindeki Türkçe kelimeler \text{…} içine alınır ve yapay zekanın
// bazen yazdığı LaTeX harf aksanları (\c{s}, \i, \u{g} …) gerçek Türkçe harfe çevrilir (fixMathText).

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

// ---------------------------------------------------------------------------
// Formül içindeki Türkçe metin (formul-duzeltme, 24.11.2026)
// Sorun: KaTeX matematik modunda Türkçe harfleri (ı, ğ, ş, ç, ö, ü, İ …) metin gibi dizmez; yapay zeka da
// bazen "Işık" kelimesini LaTeX metin aksanlarıyla yazar: I\c{s}\i\u{g}. \i komutu matematik modunda
// TANIMSIZDIR ve KaTeX kırmızı hata gösterir (gerçek kayıt: tests/markdown.test.js → regresyon testi).
// Çözüm (yalnızca $…$ ve $$…$$ içinde, kod dışında):
//   1) LaTeX Türkçe harf aksanları gerçek harfe çevrilir: \c{s} → ş, \u{g} → ğ, \i → ı, \"{o} → ö, \.{I} → İ.
//   2) Türkçe harf içeren kelimeler \text{…} içine alınır (yanındaki küçük harfli kelimeler de: "Işık enerjisi").
//      Zaten \text{…}, \mathrm{…} gibi bir metin komutunun içindeyse dokunulmaz.
//   Türkçe harf veya aksan komutu içermeyen formül hiç değişmez; kimyasal formüller ve sayılar etkilenmez.
// ---------------------------------------------------------------------------

// Türkçe'ye özgü harfler (ASCII'de olmayanlar).
const TURKISH_CHAR = /[çğıöşüÇĞİÖŞÜ]/;
// Kelime: Latin + Türkçe harfler (rakam yok: H2O, C6H12O6 kelime değildir).
const WORD = /[A-Za-zçğıöşüÇĞİÖŞÜ]+/g;
// Yanına eklenebilecek komşu kelime: en az 2 küçük harf ("enerjisi"); büyük harfli element simgeleri eklenmez.
const NEIGHBOR_WORD = /^[a-zçğıöşü]{2,}$/;
// İçi zaten metin olan komutlar: argümanlarına dokunulmaz.
const TEXT_COMMANDS = new Set([
  'text', 'textrm', 'textit', 'textbf', 'textsf', 'texttt', 'textnormal',
  'mathrm', 'mathit', 'mathbf', 'mathsf', 'mathtt', 'operatorname', 'mbox',
]);

// LaTeX harf aksanı → Türkçe harf. Biçimler: {\c s}, {\c{s}}, \c{s}, \c s (aynısı \u için), \"{o}, \"o, \.{I}, \i.
const CEDILLA = { s: 'ş', S: 'Ş', c: 'ç', C: 'Ç' };
const BREVE = { g: 'ğ', G: 'Ğ' };
const UMLAUT = { o: 'ö', O: 'Ö', u: 'ü', U: 'Ü' };

export function latexAccentsToTurkish(body) {
  return body
    .replace(/\{\\c\s*\{?\s*([sScC])\s*\}?\}/g, (_, l) => CEDILLA[l])
    .replace(/\\c\s*\{\s*([sScC])\s*\}/g, (_, l) => CEDILLA[l])
    .replace(/\\c\s+([sScC])(?![A-Za-z])/g, (_, l) => CEDILLA[l])
    .replace(/\{\\u\s*\{?\s*([gG])\s*\}?\}/g, (_, l) => BREVE[l])
    .replace(/\\u\s*\{\s*([gG])\s*\}/g, (_, l) => BREVE[l])
    .replace(/\\u\s+([gG])(?![A-Za-z])/g, (_, l) => BREVE[l])
    .replace(/\{\\"\s*\{?\s*([oOuU])\s*\}?\}/g, (_, l) => UMLAUT[l])
    .replace(/\\"\s*\{\s*([oOuU])\s*\}/g, (_, l) => UMLAUT[l])
    .replace(/\\"([oOuU])/g, (_, l) => UMLAUT[l])
    .replace(/\{\\\.\s*\{?\s*I\s*\}?\}/g, 'İ')
    .replace(/\\\.\s*\{\s*I\s*\}/g, 'İ')
    .replace(/\\\.I/g, 'İ')
    .replace(/\{\\i\}|\\i\{\}|\\i(?![A-Za-z])/g, 'ı');
}

// Komut ve süslü parantez içermeyen düz bir formül parçasında Türkçe kelimeleri \text{…} içine alır.
function wrapTurkishWords(plain) {
  if (!TURKISH_CHAR.test(plain)) return plain;
  const words = [...plain.matchAll(WORD)].map((m) => ({ start: m.index, end: m.index + m[0].length, text: m[0] }));
  // Arada yalnızca boşluk var mı?
  const onlySpaces = (a, b) => /^ +$/.test(plain.slice(words[a].end, words[b].start));
  const groups = []; // [ilk kelime, son kelime] sıra numaraları
  for (let i = 0; i < words.length; i++) {
    if (!TURKISH_CHAR.test(words[i].text)) continue;
    let first = i;
    let last = i;
    // Arada yalnızca boşluk olan küçük harfli (veya Türkçe harfli) komşu kelimeler aynı \text{}'e katılır.
    const joinable = (w) => NEIGHBOR_WORD.test(w.text) || TURKISH_CHAR.test(w.text);
    while (first > 0 && onlySpaces(first - 1, first) && joinable(words[first - 1])) first -= 1;
    while (last < words.length - 1 && onlySpaces(last, last + 1) && joinable(words[last + 1])) last += 1;
    groups.push([first, last]);
    i = last;
  }
  let out = '';
  let pos = 0;
  for (const [first, last] of groups) {
    out += plain.slice(pos, words[first].start) + `\\text{${plain.slice(words[first].start, words[last].end)}}`;
    pos = words[last].end;
  }
  return out + plain.slice(pos);
}

// Açılış süslü parantezinin kapanışını bulur (iç içe parantezleri sayar); bulunamazsa metnin sonu.
function matchingBrace(body, open) {
  let depth = 0;
  for (let i = open; i < body.length; i++) {
    if (body[i] === '\\') {
      i += 1; // kaçışlı karakter (\{ \}) sayılmaz
    } else if (body[i] === '{') {
      depth += 1;
    } else if (body[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return body.length - 1;
}

/**
 * Bir formülün içini düzeltir (yalnızca $…$ / $$…$$ arasındaki metin).
 * Komutlar ve süslü parantezler olduğu gibi kopyalanır; aralarındaki düz parçalarda Türkçe kelimeler sarılır.
 */
export function fixMathText(body) {
  const src = latexAccentsToTurkish(body);
  if (!TURKISH_CHAR.test(src)) return src;
  let out = '';
  let plain = '';
  const flush = () => {
    out += wrapTurkishWords(plain);
    plain = '';
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      flush();
      const command = /^\\([A-Za-z]+)/.exec(src.slice(i));
      if (!command) {
        out += src.slice(i, i + 2); // \{ \, \\ gibi kaçışlar
        i += 2;
        continue;
      }
      const end = i + command[0].length;
      if (TEXT_COMMANDS.has(command[1])) {
        // Metin komutu: argümanı (süslü parantez içi) dokunulmadan kopyalanır.
        let k = end;
        while (src[k] === ' ') k += 1;
        if (src[k] === '{') {
          const close = matchingBrace(src, k);
          out += src.slice(i, close + 1);
          i = close + 1;
          continue;
        }
      }
      out += command[0];
      i = end;
      continue;
    }
    if (ch === '{' || ch === '}') {
      flush();
      out += ch;
      i += 1;
      continue;
    }
    plain += ch;
    i += 1;
  }
  flush();
  return out;
}

// Kod içermeyen bir metin parçasında $$…$$ ve $…$ formüllerini bulup içlerini fixMathText ile düzeltir.
// \$ (kaçışlanmış para işareti) formül sayılmaz. Tek $ formülü paragraf sınırını (boş satır) aşmaz.
function fixMathInSegment(segment) {
  let out = '';
  let i = 0;
  while (i < segment.length) {
    const ch = segment[i];
    if (ch === '\\') {
      out += segment.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (ch === '$') {
      const display = segment[i + 1] === '$';
      const mark = display ? '$$' : '$';
      const start = i + mark.length;
      let close = -1;
      for (let k = start; k < segment.length; k++) {
        if (segment[k] === '\\') {
          k += 1;
          continue;
        }
        if (!display && segment[k] === '\n' && segment[k + 1] === '\n') break;
        if (segment.startsWith(mark, k)) {
          close = k;
          break;
        }
      }
      if (close === -1) {
        out += mark;
        i = start;
        continue;
      }
      out += mark + fixMathText(segment.slice(start, close)) + mark;
      i = close + mark.length;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

// Yanıtı çizime hazırlar, dört adımda:
//   1) \( \) ve \[ \] yazımları $ biçimine çevrilir (kod dışında),
//   2) tek satırdaki $$ … $$ blok formüle çevrilir (kod blokları hariç),
//   3) para tutarları korunur (kod dışında),
//   4) formüllerin içindeki Türkçe kelimeler ve LaTeX harf aksanları düzeltilir (kod dışında).
export function prepareMarkdown(text) {
  if (typeof text !== 'string') return '';
  const normalized = outsideCode(text, normalizeMathDelimiters);
  const promoted = promoteDisplayMath(normalized);
  const protectedText = outsideCode(promoted, protectSegment);
  return outsideCode(protectedText, fixMathInSegment);
}
