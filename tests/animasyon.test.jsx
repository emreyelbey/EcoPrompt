// @vitest-environment jsdom
// Hareket sistemi testleri (animasyonlar dalı, 24.11.2026).
// - Süreler ve eğri tek yerde (index.css → :root); JS tarafı aynı değerleri kullanır (motion.js).
// - Yalnızca transform / scale / opacity canlandırılır; "hareketi azalt" açıkken hepsi kapanır.
// - Pencereler kapanırken kısa çıkış animasyonu oynar, sonra kaldırılır (usePresence).
// - Yönetici panelinde sekme değişince iç kaydırma kabı başa kayar, sonra başlığa odak verilir.
// - KÖR DENEY: sade ve EkoToken sohbet ekranlarının ortak öğeleri birebir aynı animasyon sınıflarını taşır.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { calculateFootprint } from '../src/lib/footprint.js';
import { MOTION_FALLBACK_MS, motionMs, parseCssDuration, prefersReducedMotion } from '../src/lib/motion.js';
import { scrollToTopThenFocus, SCROLL_FALLBACK_MS } from '../src/lib/tabScroll.js';

const apiRequest = vi.fn();
vi.mock('../src/lib/api.js', () => ({ apiRequest: (...args) => apiRequest(...args) }));

const { default: Modal } = await import('../src/components/Modal.jsx');
const { default: ConfirmModal } = await import('../src/components/ConfirmModal.jsx');
const { default: ChatScreen } = await import('../src/components/ChatScreen.jsx');
const { default: AdminScreen } = await import('../src/components/admin/AdminScreen.jsx');

Element.prototype.scrollTo ??= function scrollTo() {};
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const css = readFileSync('src/index.css', 'utf8');

// Sahte matchMedia: reduce = "hareketi azalt" açık mı? (diğer sorgular eşleşmez)
function mockMatchMedia(reduce) {
  window.matchMedia = vi.fn((query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

// Süslü parantez önemli: mockReset() taklit fonksiyonu döndürür; Vitest beforeEach'ten dönen fonksiyonu
// "temizlik" sanıp test sonunda çağırır.
beforeEach(() => {
  apiRequest.mockReset();
});
afterEach(() => {
  cleanup();
  delete window.matchMedia;
  vi.useRealTimers();
});

describe('Hareket değişkenleri tek yerde', () => {
  it(':root süreleri ve eğri tanımlı; JS yedek değerleri CSS ile aynı', () => {
    const root = css.match(/:root\s*\{([^}]*)\}/)[1];
    for (const [speed, ms] of Object.entries(MOTION_FALLBACK_MS)) {
      expect(root).toContain(`--motion-${speed}: ${ms}ms;`);
    }
    expect(root).toContain('--ease-motion: cubic-bezier(0.2, 0.8, 0.2, 1);');
    // Tailwind'in transition-* sınıfları da aynı süre ve eğriyi kullanır.
    expect(css).toContain('--default-transition-duration: var(--motion-fast);');
    expect(css).toContain('--default-transition-timing-function: var(--ease-motion);');
  });

  it('mevcut animasyonlar ortak eğriye bağlı; süreleri korunur', () => {
    expect(css).toContain('--animate-ring: ring 1.4s var(--ease-motion) both;');
    expect(css).toContain('--animate-grow: grow 0.9s var(--ease-motion) both;');
    expect(css).toContain('--animate-up: up 0.8s var(--ease-motion) both;');
    expect(css).toContain('--animate-motion-in: rise var(--motion-normal) var(--ease-motion) both;');
  });

  it('keyframe\'ler yalnızca transform / scale / opacity değiştirir (halka: SVG çizgi kayması)', () => {
    const allowed = new Set(['opacity', 'transform', 'scale', 'stroke-dashoffset']);
    const frames = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\s*\}/g)];
    expect(frames.length).toBeGreaterThanOrEqual(12);
    for (const [, name, body] of frames) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      for (const prop of props) expect(allowed.has(prop), `${name}: ${prop}`).toBe(true);
    }
  });

  it('bileşenlerde konum/boyut geçişi yok (left, top, width, height, transition-all)', () => {
    const files = jsxFiles('src');
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/transition-\[(left|right|top|bottom|width|height)\]|transition-all/);
    }
  });

  it('hareketi azalt: animasyon, geçiş ve basınca küçülme kapanır', () => {
    const block = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/)[1];
    expect(block).toMatch(/animation:\s*none\s*!important/);
    expect(block).toMatch(/transition:\s*none\s*!important/);
    expect(block).toMatch(/button:active\s*\{\s*scale:\s*none\s*!important/);
  });

  it('butonlar basınca 0.97 küçülür; renk geçişleri hızlı süreyle', () => {
    expect(css).toMatch(/button:not\(:disabled\):active\s*\{\s*scale: 0\.97;/);
    expect(css).toMatch(/button\s*\{\s*transition-property:[^;]*scale;\s*transition-duration: var\(--motion-fast\);/);
  });
});

describe('motion.js', () => {
  it('CSS süresi okunur (".15s", "150ms", "0.22s")', () => {
    expect(parseCssDuration('.15s')).toBe(150);
    expect(parseCssDuration(' 150ms ')).toBe(150);
    expect(parseCssDuration('0.22s')).toBe(220);
    expect(parseCssDuration('')).toBeNull();
  });

  it('hareketi azalt açıksa süre 0; matchMedia yoksa 0; değilse CSS değeri ya da yedek', () => {
    expect(motionMs('fast')).toBe(0); // jsdom: matchMedia yok
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(motionMs('fast')).toBe(0);
    mockMatchMedia(false);
    expect(motionMs('fast')).toBe(MOTION_FALLBACK_MS.fast); // jsdom'da CSS değişkeni yok → yedek
    document.documentElement.style.setProperty('--motion-fast', '.2s');
    expect(motionMs('fast')).toBe(200);
    document.documentElement.style.removeProperty('--motion-fast');
  });
});

describe('Pencereler: açılış ve kapanış animasyonu', () => {
  it('her pencere .motion-dialog taşır (src içindeki bütün role="dialog" öğeleri)', () => {
    for (const file of jsxFiles('src').filter((f) => readFileSync(f, 'utf8').includes('role="dialog"'))) {
      expect(readFileSync(file, 'utf8'), file).toMatch(/className=\{?[`"]motion-dialog /);
    }
  });

  it('kapanınca kısa süre "kapanıyor" durumunda kalır (son içerik görünür), sonra kaldırılır', () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    const { rerender } = render(<ConfirmModal open title="Kayıt silinsin mi?" message="K001 kaydı" onConfirm={() => {}} onCancel={() => {}} />);
    expect(document.querySelector('.overlay-closing')).toBeNull();

    // Kapandı: metinler boşaltılsa da son açık hâlin metni görünür kalır.
    rerender(<ConfirmModal open={false} title="" message="" onConfirm={() => {}} onCancel={() => {}} />);
    expect(document.querySelector('.overlay-closing')).not.toBeNull();
    expect(screen.getByText('K001 kaydı')).toBeTruthy();

    act(() => vi.advanceTimersByTime(MOTION_FALLBACK_MS.fast));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('hareketi azalt açıksa kapanınca anında kaldırılır', () => {
    mockMatchMedia(true);
    const { rerender } = render(
      <Modal open title="Pencere" onClose={() => {}}>
        içerik
      </Modal>,
    );
    rerender(
      <Modal open={false} title="Pencere" onClose={() => {}}>
        içerik
      </Modal>,
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('kapanırken karartmaya dokunmak ikinci kez kapatmaz; yeniden açılırsa kapanış iptal olur', () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open title="A" onClose={onClose}>
        x
      </Modal>,
    );
    rerender(
      <Modal open={false} title="A" onClose={onClose}>
        x
      </Modal>,
    );
    fireEvent.click(document.querySelector('.overlay-scrim'));
    expect(onClose).not.toHaveBeenCalled();
    rerender(
      <Modal open title="A" onClose={onClose}>
        x
      </Modal>,
    );
    expect(document.querySelector('.overlay-closing')).toBeNull();
    act(() => vi.advanceTimersByTime(500));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});

describe('Yönetici paneli: sekme değişince başa kaydırma ve başlığa odak', () => {
  function fakeScroller(scrollTop) {
    const listeners = {};
    return {
      scrollTop,
      scrollTo: vi.fn(function scrollTo({ top }) {
        this.scrollTop = top;
      }),
      addEventListener: (type, fn) => (listeners[type] = fn),
      removeEventListener: (type) => delete listeners[type],
      listeners,
    };
  }

  it('aşağıdayken yumuşak kaydırır, kaydırma bitince (scrollend) başlığa odak verir', () => {
    mockMatchMedia(false);
    const scroller = fakeScroller(900);
    const heading = { focus: vi.fn() };
    scrollToTopThenFocus(scroller, heading);
    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(heading.focus).not.toHaveBeenCalled();
    scroller.listeners.scrollend();
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('erken gelen scrollend (kap henüz üstte değil) odak vermez; üste varınca verir', () => {
    mockMatchMedia(false);
    const scroller = fakeScroller(900);
    scroller.scrollTo = vi.fn(); // kaydırma sürüyor: scrollTop henüz değişmedi
    const heading = { focus: vi.fn() };
    scrollToTopThenFocus(scroller, heading);
    scroller.listeners.scrollend();
    expect(heading.focus).not.toHaveBeenCalled();
    scroller.scrollTop = 0;
    scroller.listeners.scrollend();
    expect(heading.focus).toHaveBeenCalledTimes(1);
  });

  it('scrollend gelmezse en geç yedek süre sonunda odak verilir; temizlenirse odak verilmez', () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    const a = { scroller: fakeScroller(400), heading: { focus: vi.fn() } };
    scrollToTopThenFocus(a.scroller, a.heading);
    vi.advanceTimersByTime(SCROLL_FALLBACK_MS);
    expect(a.heading.focus).toHaveBeenCalledTimes(1);

    const b = { scroller: fakeScroller(400), heading: { focus: vi.fn() } };
    const cancel = scrollToTopThenFocus(b.scroller, b.heading);
    cancel();
    vi.advanceTimersByTime(SCROLL_FALLBACK_MS);
    expect(b.heading.focus).not.toHaveBeenCalled();
  });

  it('hareketi azalt açıksa animasyonsuz, anında başa gider ve odak verir', () => {
    mockMatchMedia(true);
    const scroller = fakeScroller(700);
    const heading = { focus: vi.fn() };
    scrollToTopThenFocus(scroller, heading);
    expect(scroller.scrollTo).not.toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(0);
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('panelde: sekme seçilince iç kaydırma kabı başa döner, h1 odak alır, içerik belirme sınıfıyla yeniden kurulur', async () => {
    apiRequest.mockImplementation(async (path) => {
      if (path.startsWith('/api/admin/data')) {
        return { interactions: [], hasMore: false, next: null, logins: [], phase: 'pretest', serverTime: 1 };
      }
      throw new Error(`beklenmeyen istek: ${path}`);
    });
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    const scroller = screen.getByTestId('panel-kaydirma');
    const firstContent = screen.getByTestId('sekme-icerik');
    expect(firstContent.className).toContain('animate-motion-in');
    // Açılışta odak başlığa taşınmaz.
    expect(document.activeElement.tagName).not.toBe('H1');

    scroller.scrollTop = 600;
    fireEvent.change(screen.getByRole('combobox', { name: 'Panel sekmesi' }), { target: { value: 'codes' } });
    // jsdom'da matchMedia yok → hareketi azalt gibi davranılmaz ama scrollend de yok; yedek süre beklenir.
    await act(async () => {
      await new Promise((r) => setTimeout(r, SCROLL_FALLBACK_MS + 20));
    });
    const heading = screen.getByRole('heading', { level: 1 });
    expect(document.activeElement).toBe(heading);
    expect(heading.getAttribute('tabindex')).toBe('-1');
    expect(heading.className).toContain('outline-none');
    // Yeni sekmenin içeriği yeni bir öğedir (belirme animasyonu baştan oynar).
    expect(screen.getByTestId('sekme-icerik')).not.toBe(firstContent);
  });
});

describe('KÖR DENEY: sade ve EkoToken sohbet ekranının ortak öğeleri aynı animasyonları kullanır', () => {
  // Animasyon/geçiş ile ilgili sınıflar.
  const MOTION_CLASS = /^(animate-|transition|duration-|ease-|motion-|origin-)/;

  // Görünüme özel (bilerek farklı) bölümler çıkarıldıktan sonra, her öğenin etiket adı + animasyon sınıfları.
  function motionSignature(container) {
    const clone = container.cloneNode(true);
    clone
      .querySelectorAll('[data-gorunume-ozel], [data-testid="eko-ozet"], [data-testid="eko-rozetler"]')
      .forEach((el) => el.remove());
    return [...clone.querySelectorAll('*')].map((el) => {
      const classes = (el.getAttribute('class') || '').split(/\s+/).filter((c) => MOTION_CLASS.test(c));
      return `${el.tagName.toLowerCase()}[${classes.sort().join(' ')}]`;
    });
  }

  function message(id, modelId, withEco) {
    const fp = calculateFootprint(120, 300, modelId);
    const base = { id, modelId, prompt: `soru ${id}`, response: `cevap ${id}`, createdAt: '2026-11-23T09:00:00.000Z' };
    if (!withEco) return base;
    return {
      ...base,
      eco: {
        inputTokens: fp.inputTokens,
        outputTokens: fp.outputTokens,
        tokenSource: 'gerçek',
        energyMin: fp.energyMin,
        energyAvg: fp.energyAvg,
        energyMax: fp.energyMax,
        waterMin: fp.waterMin,
        waterAvg: fp.waterAvg,
        waterMax: fp.waterMax,
        co2Min: fp.co2Min,
        co2Avg: fp.co2Avg,
        co2Max: fp.co2Max,
        savingsPct: fp.savingsPct,
      },
    };
  }

  async function signatureFor(view) {
    const withEco = view === 'ekotoken';
    apiRequest.mockResolvedValue({ phase: 'posttest', messages: [message('a', 'standard', withEco), message('b', 'light', withEco)] });
    const { container, unmount } = render(
      <ChatScreen student={{ code: 'D001', group: 'Deney', phase: 'posttest' }} view={view} onServerPhase={() => {}} onLogout={() => {}} />,
    );
    await screen.findByText('cevap b');
    const signature = motionSignature(container);
    unmount();
    return signature;
  }

  it('mesajlar, model seçici, yazma kutusu, butonlar: iki görünümde birebir aynı', async () => {
    const sade = await signatureFor('sade');
    const eko = await signatureFor('ekotoken');
    expect(eko).toEqual(sade);
    // Ortak öğelerin animasyonları gerçekten yerinde (test boş karşılaştırma yapmıyor).
    expect(sade.filter((s) => s.includes('animate-rise')).length).toBeGreaterThanOrEqual(4); // 2 soru + 2 yanıt balonu
    expect(sade.some((s) => s.includes('duration-(--motion-slow)'))).toBe(true); // model seçici hapı
  });

  it('model seçici hapı transform ile kayar (left canlandırılmaz)', async () => {
    apiRequest.mockResolvedValue({ phase: 'pretest', messages: [message('a', 'standard', false)] });
    render(<ChatScreen student={{ code: 'K001', group: 'Kontrol', phase: 'pretest' }} view="sade" onServerPhase={() => {}} onLogout={() => {}} />);
    await screen.findByText('cevap a');
    const pill = screen.getByTestId('model-hap');
    expect(pill.className).toContain('transition-transform');
    expect(pill.style.left).toBe('');
    expect(pill.style.transform).toContain('translateX(calc(');
  });
});

// src altındaki bütün .jsx dosyaları
function jsxFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsxFiles(path);
    return path.endsWith('.jsx') ? [path] : [];
  });
}
