// Para birimi koruması ve formül yazımı testleri (proje rehberi Bölüm 8:
// "$0.15, $10 formül sanılıp bozulmaz"). Ayrıca gerçek Markdown çiziminde sonucu denetler.
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { protectCurrency, normalizeMathDelimiters, prepareMarkdown, promoteDisplayMath } from '../src/lib/markdown.js';
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

describe('protectCurrency: rakamla başlayan formül ile para tutarını ayırma (Dilim 8)', () => {
  it('kullanıcının bulduğu örnek: rakamla başlayan, \\ce içeren formüle dokunulmaz', () => {
    expect(protectCurrency('Tepkimede $12 molekül \\ce{H2O}$ oluşur.')).toBe('Tepkimede $12 molekül \\ce{H2O}$ oluşur.');
    expect(protectCurrency('$\\ce{12H2O}$')).toBe('$\\ce{12H2O}$');
  });

  it('rakamın hemen ardından harf veya komut gelen formül ($3x$, $2n$, $4\\pi$) formül kalır', () => {
    expect(protectCurrency('Sonuç $3x$ olur.')).toBe('Sonuç $3x$ olur.');
    expect(protectCurrency('Hücrede $2n$ kromozom var.')).toBe('Hücrede $2n$ kromozom var.');
    expect(protectCurrency('Çevre $4\\pi r$ eder.')).toBe('Çevre $4\\pi r$ eder.');
    expect(protectCurrency('$2,5x + 1$')).toBe('$2,5x + 1$');
  });

  it('para tutarları korunur: "$10 ile $20 arası", "fiyatı $5", ondalık ve noktalama', () => {
    expect(protectCurrency('$10 ile $20 arası')).toBe('\\$10 ile \\$20 arası');
    expect(protectCurrency('Fiyatı $5.')).toBe('Fiyatı \\$5.');
    expect(protectCurrency('Fiyatlar $10, $15 ve $20.')).toBe('Fiyatlar \\$10, \\$15 ve \\$20.');
    expect(protectCurrency('Kalem $0.15, silgi $1.20')).toBe('Kalem \\$0.15, silgi \\$1.20');
  });

  it('içinde = veya + olan para dizileri formül sanılmaz ("$5 + $3 = $8")', () => {
    // Eski kural "$3 = $" parçasını içindeki = yüzünden formül sanıyordu.
    expect(protectCurrency('$5 + $3 = $8')).toBe('\\$5 + \\$3 = \\$8');
    expect(protectCurrency('Toplam: $2 + $2 = $4 eder')).toBe('Toplam: \\$2 + \\$2 = \\$4 eder');
  });

  it('aynı satırda formül ve para tutarı birlikte', () => {
    expect(protectCurrency('Toplam $2\\ce{H2O}$ ve $10 harcandı.')).toBe('Toplam $2\\ce{H2O}$ ve \\$10 harcandı.');
    expect(protectCurrency('Kitap $10, alan $3x^2$ olur.')).toBe('Kitap \\$10, alan $3x^2$ olur.');
    expect(protectCurrency('$5 ile alınır; denklem $x=2$')).toBe('\\$5 ile alınır; denklem $x=2$');
  });

  it('içi yalnızca sayı olan formül ($12$) formül kalır; sonraki formülün $ işareti çalınmaz', () => {
    // Kullanıcının vercel dev'de bulduğu hata: eski kural "$12$" parçasının açılış $'ını kaçışlıyordu.
    // Eşini kaybeden $ sonraki formülün $'ıyla eşleşiyor, "$ molekül $" formül oluyor, "\ce{H2O}$" çiğ kalıyordu.
    const line = String.raw`girenler kısmına $12$ molekül $\ce{H2O}$ yazılır`;
    expect(protectCurrency(line)).toBe(line);
    expect(protectCurrency('$2,5$ mol')).toBe('$2,5$ mol');
    // Para metni etkilenmez: içi saf sayı değil veya kapanış sonraki tutarın başı.
    expect(protectCurrency('$5 ile 10$ arası')).toBe('\\$5 ile 10$ arası');
    expect(protectCurrency('$12 ve $13')).toBe('\\$12 ve \\$13');
  });

  it('formül işareti olmayan belirsiz parça para sayılır (sistem talimatı bunu önler)', () => {
    // "$12 molekül$" ile "$12 ve 13$" ayırt edilemez; güvenli tarafta kalınır ($ kaçışlanır).
    expect(protectCurrency('$12 molekül$')).toBe('\\$12 molekül$');
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

describe('promoteDisplayMath (Dilim 8: alt alta denklemler yapışmasın)', () => {
  it('tek satırdaki $$ … $$ blok formüle çevrilir', () => {
    expect(promoteDisplayMath('$$a=b$$')).toBe('\n$$\na=b\n$$\n');
  });

  it('alt alta iki denklem iki ayrı blok olur', () => {
    const out = promoteDisplayMath('$$x=1$$\n$$y=2$$');
    expect(out).toBe('\n$$\nx=1\n$$\n\n\n$$\ny=2\n$$\n');
  });

  it('girinti korunur (liste içindeki formül)', () => {
    expect(promoteDisplayMath('- adım\n  $$v = a t$$')).toBe('- adım\n\n  $$\n  v = a t\n  $$\n');
  });

  it('satırda başka metin varsa dokunulmaz', () => {
    expect(promoteDisplayMath('Sonuç $$x$$ olur.')).toBe('Sonuç $$x$$ olur.');
  });

  it('``` kod bloğunun içine dokunulmaz', () => {
    const code = '```\n$$a=b$$\n```';
    expect(promoteDisplayMath(code)).toBe(code);
  });

  it('prepareMarkdown: \\[ \\] tek satırda da blok formül olur; para tutarları yine korunur', () => {
    expect(prepareMarkdown('\\[E=mc^2\\]')).toBe('\n$$\nE=mc^2\n$$\n');
    expect(prepareMarkdown('Kitap $10.\n$$x=2$$')).toBe('Kitap \\$10.\n\n$$\nx=2\n$$\n');
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

  it('tek satır sonu korunur (<br>), alt alta formüller ayrı satırda kalır', () => {
    expect(render('birinci satır\nikinci satır')).toContain('<br');
    const html = render('$$x=1$$\n$$y=2$$');
    expect(html.match(/katex-display/g)).toHaveLength(2); // iki ayrı blok formül
  });

  it('kimyasal formül \\ce{} ile hatasız çizilir (mhchem)', () => {
    const html = render('Su $\\ce{H2O}$ ve tepkime $\\ce{6CO2 + 6H2O -> C6H12O6 + 6O2}$.');
    expect(html).toContain('katex');
    // KaTeX tanımadığı komutu hata rengiyle (#cc0000) kırmızı metin olarak çizer. mhchem yüklü değilse
    // \ce böyle çizilirdi; yüklüyse hata rengi yoktur ve element harfleri dik (mathrm) yazılır.
    // (Not: '\ce' metni <annotation> içinde her durumda kalır; ölçüt o değildir.)
    expect(html).not.toContain('cc0000');
    expect(html).not.toContain('katex-error');
    expect(html).toContain('mathrm');
    // Karşılaştırma: tanınmayan bir komut gerçekten hata rengiyle çizilir (ölçüt çalışıyor).
    expect(render('$\\bilinmeyenkomut{x}$')).toContain('cc0000');
  });

  it('rakamla başlayan formül KaTeX ile çizilir, aynı satırdaki para tutarı metin kalır', () => {
    const html = render('Sonuç $3x$ olur, kalem $10 tutar.');
    expect(html).toContain('katex');
    expect(html).toContain('$10');
    // Görünen metinde çiğ "$3x$" kalmamalı (formül çizildi).
    const visible = html.replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g, '').replace(/<[^>]+>/g, '');
    expect(visible).not.toContain('$3x$');
    // Para dizisi formül olmaz.
    expect(render('$5 + $3 = $8')).not.toContain('katex');
  });

  it('gerçek yanıt (fotosentez, vercel dev denemesi): hiçbir formül çiğ kalmaz, hata rengi yok', () => {
    // Kullanıcının ekranda bozuk gördüğü yanıtın ham metni, değiştirilmeden.
    const response = String.raw`Fotosentez, klorofil taşıyan canlıların ışık enerjisini kullanarak inorganik maddelerden organik besin üretmesi olayıdır.

Lise biyoloji ve kimya derslerinde en sık kullanılan **genel fotosentez denklemi** şu şekildedir:

$$\ce{6CO2 + 6H2O ->[\text{Işık Enerjisi}][\text{Klorofil}] C6H12O6 + 6O2}$$

Bu denklemi bileşenlerine ayırarak inceleyelim:

* **Girenler (Reaktifler):**
  * $\ce{6CO2}$ : Karbondioksit (Atmosferden alınır)
  * $\ce{6H2O}$ : Su (Kökler yardımıyla topraktan alınır)

* **Koşullar:**
  * **Işık Enerjisi:** Tepkimenin gerçekleşmesi için gereken enerjiyi sağlar.
  * **Klorofil:** Işık enerjisini soğuran (absorbe eden) pigmenttir.

* **Ürünler:**
  * $\ce{C6H12O6}$ : Glikoz (Üretilen temel organik besin)
  * $\ce{6O2}$ : Oksijen gazı (Yan ürün olarak atmosfere verilir)

---

**Önemli Bir Biyolojik Ayrıntı:**
Daha ayrıntılı biyokimyasal denklemlerde suyun fotolizi (ışıkla parçalanması) ve açığa çıkan oksijenin kaynağını tam olarak göstermek için girenler kısmına $12$ molekül $\ce{H2O}$ yazılır, ürünler kısmına ise su molekülleri yeniden eklenir:

$$\ce{6CO2 + 12H2O ->[\text{Işık Enerjisi}][\text{Klorofil}] C6H12O6 + 6O2 + 6H2O}$$

Her iki denklem de fotosentezi doğru ifade eder; ancak genel ve sadeleştirilmiş gösterim olarak ilk denklem daha yaygın kullanılır.`;

    const html = render(response);
    // Görünen metin: KaTeX'in ekran okuyucu kopyası (<annotation> içinde kaynak formül) çıkarılır.
    const visible = html.replace(/<span class="katex-mathml">[\s\S]*?<\/math><\/span>/g, '').replace(/<[^>]+>/g, '');
    expect(visible).not.toContain('$'); // çiğ $ yok ("$12" ve "\ce{H2O}$" artık görünmüyor)
    expect(visible).not.toContain('\\ce'); // çiğ \ce yok
    expect(html).not.toContain('cc0000'); // tanınmayan komut yok
    // 2 blok formül + 6 satır içi formül (4 liste maddesi, $12$, $\ce{H2O}$).
    expect(html.match(/katex-display/g)).toHaveLength(2);
    expect(html.match(/<span class="katex">/g)).toHaveLength(8);
    expect(visible).toContain('molekül'); // kelime düz metin olarak kalır (formüle girmez)
  });

  it('para tutarı korumaları satır sonu eklentisiyle de bozulmaz', () => {
    const html = render('Kalem $10\nSilgi $0.15');
    expect(html).toContain('$10');
    expect(html).toContain('$0.15');
    expect(html).not.toContain('katex');
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

// Çiğ <br> düzeltmesi (src/lib/remarkBrTags.js): yalnızca <br> etiketleri satır sonuna dönüşür.
// Ham HTML açılmaz; kod içindeki <br> ve başka etiketler metin olarak kalır.
describe('<br> etiketleri gerçek satır sonuna dönüşür (ham HTML kapalı kalır)', () => {
  const render = (content) => renderToStaticMarkup(createElement(RichMessage, { content }));

  it('tablo hücresinde <br> ve <BR /> satır sonu olur', () => {
    const html = render('| Olay | Not |\n|---|---|\n| soğurulur.<br>• Su molekülleri | x<BR />y |');
    expect(html).toContain('<td>soğurulur.<br/>\n• Su molekülleri</td>');
    expect(html).toContain('<td>x<br/>\ny</td>');
    expect(html).not.toContain('&lt;br');
  });

  it('paragrafta <br/> ve <br /> satır sonu olur; art arda iki etiket iki satır sonu', () => {
    expect(render('Birinci<br/>ikinci')).toContain('<p>Birinci<br/>\nikinci</p>');
    expect(render('a <br /> b')).toContain('<p>a <br/>\nb</p>'); // satır sonundan sonraki boşluk Markdown kuralıyla atılır
    expect(render('a<br><br>b')).toContain('<p>a<br/>\n<br/>\nb</p>');
  });

  it('satır başında tek başına duran <br> de satır sonu olur (çiğ metin kalmaz)', () => {
    const html = render('<br>\nSatır');
    expect(html).not.toContain('&lt;br');
    expect(html).toContain('<br/>');
  });

  it('kod bloğunda ve satır içi kodda <br> dokunulmadan metin olarak kalır', () => {
    expect(render('```\na<br>b\n```')).toContain('a&lt;br&gt;b');
    expect(render('Kod: `a<br>b`')).toContain('<code>a&lt;br&gt;b</code>');
  });

  it('blok HTML içindeki <br> dönüşür, geri kalan etiketler yine metindir', () => {
    const html = render('<div>a<br>b</div>');
    expect(html).not.toContain('<div>a');
    expect(html).toContain('&lt;div&gt;a<br/>');
    expect(html).toContain('b&lt;/div&gt;');
  });

  it('<script> ve diğer etiketler metin olarak kalır (çalıştırılmaz, öğe olmaz)', () => {
    const html = render('<script>alert(1)</script> ve <b>kalın</b>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;');
  });

  it('<br> benzeri ama farklı etiketler dönüşmez (<brx>, <br class="a">)', () => {
    const html = render('a<brx>b ve c<br class="a">d');
    expect(html).toContain('&lt;brx&gt;');
    expect(html).toContain('&lt;br class=&quot;a&quot;&gt;');
  });
});
