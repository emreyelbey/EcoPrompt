// Para birimi koruması ve formül yazımı testleri (proje rehberi Bölüm 8:
// "$0.15, $10 formül sanılıp bozulmaz"). Ayrıca gerçek Markdown çiziminde sonucu denetler.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { protectCurrency, normalizeMathDelimiters, prepareMarkdown } from '../src/lib/markdown.js';
import RichMessage from '../src/components/RichMessage.jsx';

describe('protectCurrency', () => {
  it('tek para tutarı kaçışlanır', () => {
    expect(protectCurrency('Fiyatı $0.15 oldu.')).toBe('Fiyatı \\$0.15 oldu.');
  });

  it('aynı satırdaki iki para tutarı formül sanılmaz', () => {
    expect(protectCurrency('Biri $10 ve diğeri $20.')).toBe('Biri \\$10 ve diğeri \\$20.');
  });

  it('formüllere dokunulmaz', () => {
    expect(protectCurrency('Alan $x^2$ olur.')).toBe('Alan $x^2$ olur.');
    expect(protectCurrency('$$E = mc^2$$')).toBe('$$E = mc^2$$');
    expect(protectCurrency('Sonuç $2 + 3 = 5$ çıkar.')).toBe('Sonuç $2 + 3 = 5$ çıkar.');
    expect(protectCurrency('$2^{10}$')).toBe('$2^{10}$');
  });

  it('kod bloklarına dokunulmaz', () => {
    expect(protectCurrency('`echo $10`')).toBe('`echo $10`');
    expect(protectCurrency('```\nprice = "$5"\n```')).toBe('```\nprice = "$5"\n```');
  });

  it('zaten kaçışlanmış $ iki kez kaçışlanmaz', () => {
    expect(protectCurrency('\\$10')).toBe('\\$10');
  });
});

describe('normalizeMathDelimiters', () => {
  it('\\( \\) ve \\[ \\] yazımları $ biçimine çevrilir', () => {
    expect(normalizeMathDelimiters('a \\(x+1\\) b')).toBe('a $x+1$ b');
    expect(normalizeMathDelimiters('\\[\\frac{1}{2}\\]')).toBe('$$\\frac{1}{2}$$');
  });

  it('prepareMarkdown kod içindeki yazımlara dokunmaz', () => {
    expect(prepareMarkdown('`\\(x\\)`')).toBe('`\\(x\\)`');
  });
});

describe('RichMessage çizimi', () => {
  const render = (content) => renderToStaticMarkup(createElement(RichMessage, { content }));

  it('para tutarları metin olarak kalır, KaTeX çizilmez', () => {
    const html = render('Kitap $10, defter $0.15 tutar.');
    expect(html).toContain('$10');
    expect(html).toContain('$0.15');
    expect(html).not.toContain('katex');
  });

  it('formül KaTeX ile çizilir', () => {
    expect(render('Alan $x^2$ olur.')).toContain('katex');
  });

  it('başlık, tablo, alıntı ve iç içe liste çizilir', () => {
    const html = render(
      ['#### Dördüncü seviye', '', '| A | B |', '|---|---|', '| 1 | 2 |', '', '> alıntı', '', '- bir', '  - iki'].join('\n')
    );
    expect(html).toContain('<h4');
    expect(html).toContain('<table');
    expect(html).toContain('<blockquote');
    expect(html).toMatch(/<ul>[\s\S]*<ul>/);
  });
});
