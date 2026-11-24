// src/lib/viewport.js testleri: görünen alan (visualViewport) bilgisinin CSS değişkenlerine yazılması.
// Gerçek tarayıcı yerine küçük bir sahte pencere nesnesi kullanılır.
import { describe, it, expect } from 'vitest';
import { trackVisualViewport } from '../src/lib/viewport.js';

// Yalnızca bu yardımcının kullandığı parçaları taklit eden sahte pencere.
function fakeWindow({ height = 640, offsetTop = 0, scale = 1 } = {}) {
  const listeners = {};
  const props = {};
  const vv = {
    height,
    offsetTop,
    scale,
    addEventListener: (type, fn) => (listeners[type] = fn),
    removeEventListener: (type) => delete listeners[type],
  };
  const style = {
    setProperty: (k, v) => (props[k] = v),
    removeProperty: (k) => delete props[k],
  };
  return { win: { visualViewport: vv, document: { documentElement: { style } } }, vv, listeners, props };
}

describe('trackVisualViewport', () => {
  it('açılışta yükseklik ve üst kaymayı yazar', () => {
    const { win, props } = fakeWindow({ height: 640 });
    trackVisualViewport(win);
    expect(props).toEqual({ '--app-height': '640px', '--app-top': '0px' });
  });

  it('klavye açılınca (görünen alan küçülünce) değerleri günceller', () => {
    const { win, vv, listeners, props } = fakeWindow({ height: 640 });
    trackVisualViewport(win);
    vv.height = 380;
    vv.offsetTop = 120;
    listeners.resize();
    expect(props).toEqual({ '--app-height': '380px', '--app-top': '120px' });
  });

  it('iki parmakla yakınlaştırmada değişkenleri siler (düzen tam ekrana döner)', () => {
    const { win, vv, listeners, props } = fakeWindow({ height: 640 });
    trackVisualViewport(win);
    vv.scale = 2;
    vv.height = 320;
    listeners.resize();
    expect(props).toEqual({});
  });

  it('temizleme dinleyicileri ve değişkenleri kaldırır', () => {
    const { win, listeners, props } = fakeWindow();
    const stop = trackVisualViewport(win);
    stop();
    expect(listeners).toEqual({});
    expect(props).toEqual({});
  });

  it('visualViewport olmayan tarayıcıda hata vermez', () => {
    expect(() => trackVisualViewport({ document: {} })()).not.toThrow();
  });
});
