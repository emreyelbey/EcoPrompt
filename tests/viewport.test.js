// src/lib/viewport.js testleri: klavye kapalıyken düzen dinamik yüksekliği (100dvh) izler, görünen alan
// değişkenlerine (--app-height / --app-top) yalnızca klavye AÇIKKEN geçilir (mobil-duzeltmeler).
// Eski hata: değişkenler klavye kapalıyken de yazılıyordu; iOS Chrome kaydırırken çubukları küçültünce
// düzen eski yükseklikte kilitli kalıyor, altta boş şerit oluşuyordu.
// Gerçek tarayıcı yerine küçük bir sahte pencere nesnesi kullanılır.
import { describe, it, expect } from 'vitest';
import { trackVisualViewport, computeViewportState, isEditable, KEYBOARD_MIN_PX } from '../src/lib/viewport.js';

// Yalnızca bu yardımcının kullandığı parçaları taklit eden sahte pencere.
// requestAnimationFrame kuyruğa alınır; flush() bir "kare" çalıştırır.
function fakeWindow({ innerHeight = 800, height = 800, offsetTop = 0, scale = 1, focused = null } = {}) {
  const vvListeners = {};
  const winListeners = {};
  const props = {};
  const attrs = {};
  let frames = [];
  const timers = [];
  const vv = {
    height,
    offsetTop,
    scale,
    addEventListener: (type, fn) => (vvListeners[type] = fn),
    removeEventListener: (type) => delete vvListeners[type],
  };
  const root = {
    style: {
      setProperty: (k, v) => (props[k] = v),
      removeProperty: (k) => delete props[k],
    },
    setAttribute: (k, v) => (attrs[k] = v),
    removeAttribute: (k) => delete attrs[k],
  };
  const doc = { documentElement: root, activeElement: focused };
  const win = {
    innerHeight,
    visualViewport: vv,
    document: doc,
    addEventListener: (type, fn) => (winListeners[type] = fn),
    removeEventListener: (type) => delete winListeners[type],
    requestAnimationFrame: (fn) => frames.push(fn),
    cancelAnimationFrame: () => (frames = []),
    setTimeout: (fn) => timers.push(fn),
    clearTimeout: () => {},
  };
  const flush = () => {
    const run = frames;
    frames = [];
    run.forEach((fn) => fn());
  };
  return { win, vv, doc, props, attrs, vvListeners, winListeners, flush, timers, pendingFrames: () => frames.length };
}

// Klavye açtıran ve açtırmayan öğeler.
const input = { tagName: 'INPUT', getAttribute: () => 'text' };
const textarea = { tagName: 'TEXTAREA', getAttribute: () => null };
const button = { tagName: 'BUTTON', getAttribute: () => null };

describe('computeViewportState', () => {
  const base = { innerHeight: 800, vvHeight: 800, vvOffsetTop: 0, scale: 1, editableFocused: false };

  it('klavye kapalı: odak yokken görünen alan küçülse de (çubuklar) dinamik yükseklik', () => {
    expect(computeViewportState(base)).toEqual({ keyboard: false });
    expect(computeViewportState({ ...base, innerHeight: 700, vvHeight: 700 })).toEqual({ keyboard: false });
    expect(computeViewportState({ ...base, vvHeight: 400 })).toEqual({ keyboard: false });
  });

  it('yazı kutusu odakta ama fark küçük (araç çubukları): dinamik yükseklik', () => {
    expect(computeViewportState({ ...base, editableFocused: true, vvHeight: 800 - KEYBOARD_MIN_PX + 1 })).toEqual({ keyboard: false });
  });

  it('yazı kutusu odakta ve görünen alan belirgin küçük: klavye açık, ölçüler döner', () => {
    expect(computeViewportState({ ...base, editableFocused: true, vvHeight: 420, vvOffsetTop: 35 })).toEqual({
      keyboard: true,
      height: 420,
      top: 35,
    });
  });

  it('iki parmakla yakınlaştırma klavye sayılmaz', () => {
    expect(computeViewportState({ ...base, editableFocused: true, vvHeight: 300, scale: 2 })).toEqual({ keyboard: false });
  });
});

describe('isEditable', () => {
  it('yazı kutusu ve metin alanı klavye açtırır; buton, onay kutusu açtırmaz', () => {
    expect(isEditable(input)).toBe(true);
    expect(isEditable(textarea)).toBe(true);
    expect(isEditable({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isEditable(button)).toBe(false);
    expect(isEditable({ tagName: 'INPUT', getAttribute: () => 'checkbox' })).toBe(false);
    expect(isEditable(null)).toBe(false);
  });
});

describe('trackVisualViewport', () => {
  it('açılışta klavye kapalı: değişken yazılmaz (CSS 100dvh kullanılır)', () => {
    const { win, props, attrs } = fakeWindow();
    trackVisualViewport(win);
    expect(props).toEqual({});
    expect(attrs).toEqual({});
  });

  it('çubuklar küçülüp büyüyünce (kaydırma) düzen kilitlenmez: değişken yazılmaz', () => {
    const f = fakeWindow({ innerHeight: 700, height: 700 });
    trackVisualViewport(f.win);
    // Kaydırma: Chrome adres çubuğunu küçültür, alt araç çubuğunu gizler; iki ölçü birlikte büyür.
    f.win.innerHeight = 800;
    f.vv.height = 800;
    f.vvListeners.resize();
    f.winListeners.resize();
    f.flush();
    expect(f.props).toEqual({});
  });

  it('klavye açılınca görünen alan değişkenlerine geçer, kapanınca siler', () => {
    const f = fakeWindow();
    trackVisualViewport(f.win);
    // Yazı kutusuna dokunuldu, klavye açıldı: görünen alan küçüldü ve sayfa kaydı.
    f.doc.activeElement = input;
    f.vv.height = 420;
    f.vv.offsetTop = 30;
    f.vvListeners.resize();
    f.flush();
    expect(f.props).toEqual({ '--app-height': '420px', '--app-top': '30px' });
    expect(f.attrs).toEqual({ 'data-klavye': 'acik' });

    // Klavye kapandı (odak gitti, görünen alan büyüdü).
    f.doc.activeElement = null;
    f.vv.height = 800;
    f.vv.offsetTop = 0;
    f.winListeners.focusout();
    f.flush();
    expect(f.props).toEqual({});
    expect(f.attrs).toEqual({});
  });

  it('görünen alanın kayması (scroll) da güncellenir', () => {
    const f = fakeWindow({ focused: input, height: 420 });
    trackVisualViewport(f.win);
    expect(f.props['--app-top']).toBe('0px');
    f.vv.offsetTop = 55;
    f.vvListeners.scroll();
    f.flush();
    expect(f.props['--app-top']).toBe('55px');
  });

  it('aynı karede gelen olaylar tek güncellemede birleşir (requestAnimationFrame)', () => {
    const f = fakeWindow();
    trackVisualViewport(f.win);
    f.vvListeners.resize();
    f.vvListeners.scroll();
    f.winListeners.resize();
    f.winListeners.focusin();
    expect(f.pendingFrames()).toBe(1);
  });

  it('ekran döndürülünce hemen ve kısa süre sonra bir kez daha ölçülür', () => {
    const f = fakeWindow();
    trackVisualViewport(f.win);
    f.winListeners.orientationchange();
    expect(f.pendingFrames()).toBe(1);
    expect(f.timers).toHaveLength(1);
  });

  it('dinlenen olaylar: görünen alan resize + scroll, pencere resize, orientationchange, odak', () => {
    const f = fakeWindow();
    trackVisualViewport(f.win);
    expect(Object.keys(f.vvListeners).sort()).toEqual(['resize', 'scroll']);
    expect(Object.keys(f.winListeners).sort()).toEqual(['focusin', 'focusout', 'orientationchange', 'resize']);
  });

  it('temizleme dinleyicileri, değişkenleri ve işareti kaldırır', () => {
    const f = fakeWindow({ focused: input, height: 400 });
    const stop = trackVisualViewport(f.win);
    expect(f.props['--app-height']).toBe('400px');
    stop();
    expect(f.vvListeners).toEqual({});
    expect(f.winListeners).toEqual({});
    expect(f.props).toEqual({});
    expect(f.attrs).toEqual({});
  });

  it('visualViewport olmayan tarayıcıda hiçbir şey yapmaz', () => {
    const stop = trackVisualViewport({});
    expect(typeof stop).toBe('function');
  });
});
