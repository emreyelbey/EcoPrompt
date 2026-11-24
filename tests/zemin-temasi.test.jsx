// @vitest-environment jsdom
// Sayfa zemini, tarayıcı çubuğu rengi ve pencerelerin klavye davranışı testleri
// (src/lib/screenTheme.js, src/components/Overlay.jsx).
// Telefonda klavye açılınca ekranın dışında kalan alanda html/body zemini görünür. Kural:
// - Giriş ekranı → koyu; sohbet/panel → açık; herhangi bir pencere açık → karartma rengi.
// - Bütün pencereler ortak Overlay kabuğunu kullanır: karartma görünen alanın dışına taşar, pencere
//   görünen alana (app-viewport) oturur, içerik kendi içinde kayar, eylem butonları sabit alt bölümdedir.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { THEME_COLORS, THEME_ATTR, useScreenTheme } from '../src/lib/screenTheme.js';
import { keepFocusedVisible } from '../src/components/Overlay.jsx';

const apiRequest = vi.fn(() => new Promise(() => {})); // sayılar hiç gelmez: pencere açık kalır
vi.mock('../src/lib/api.js', () => ({ apiRequest: (...args) => apiRequest(...args) }));
const { default: LoginScreen } = await import('../src/components/LoginScreen.jsx');
const { default: Modal } = await import('../src/components/Modal.jsx');
const { default: ConfirmModal } = await import('../src/components/ConfirmModal.jsx');
const { default: ClearDataModal } = await import('../src/components/admin/ClearDataModal.jsx');

const themeColor = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
const attr = () => document.documentElement.getAttribute(THEME_ATTR);

afterEach(cleanup);

// Sohbet/panel yerine geçen sade açık ekran.
function LightScreen({ children }) {
  useScreenTheme('light');
  return <div>{children}</div>;
}

describe('Ekran zemini', () => {
  it('giriş ekranı açılınca koyu, kapanınca açık zemine döner', () => {
    const { unmount } = render(<LoginScreen onStudentLogin={() => {}} onAdminLogin={() => {}} />);
    expect(attr()).toBe('koyu');
    expect(themeColor()).toBe(THEME_COLORS.dark);

    unmount();
    expect(attr()).toBeNull();
    expect(themeColor()).toBe(THEME_COLORS.light);
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
  });

  it('girişten panele geçişte (yeni ekran eskisinden önce kurulsa da) zemin açık olur', () => {
    const { rerender } = render(<LoginScreen onStudentLogin={() => {}} onAdminLogin={() => {}} />);
    rerender(<LightScreen />);
    expect(attr()).toBeNull();
    expect(themeColor()).toBe(THEME_COLORS.light);
  });
});

describe('Pencere açıkken zemin karartma rengindedir', () => {
  const dialogs = {
    'Modal (Kişisel Rapor, Metodoloji, kayıt önizleme)': (
      <Modal open title="Pencere" onClose={() => {}}>
        içerik
      </Modal>
    ),
    'ConfirmModal (onaylar, aşama değiştirme)': <ConfirmModal open title="Emin misiniz?" message="Mesaj" onConfirm={() => {}} onCancel={() => {}} />,
    'ClearDataModal (Verileri Temizle)': <ClearDataModal open token="t" onUnauthorized={() => {}} onCleared={() => {}} onCancel={() => {}} />,
  };

  for (const [name, dialog] of Object.entries(dialogs)) {
    it(`${name}: açılınca karartma, kapanınca açık; karartma taşar, pencere görünen alana oturur`, () => {
      const { rerender } = render(<LightScreen>{dialog}</LightScreen>);
      expect(attr()).toBe('karartma');
      expect(themeColor()).toBe(THEME_COLORS.scrim);

      const dialogEl = document.querySelector('[role="dialog"]');
      // Pencere kutusu app-viewport ile görünen alana oturur; pencere bu alandan uzun olamaz.
      expect(dialogEl.parentElement.className).toContain('app-viewport');
      expect(dialogEl.className).toContain('max-h-[min(90dvh,100%)]');
      // İçerik kendi içinde kayar.
      expect(dialogEl.querySelector('[data-pencere-kaydirma]').className).toContain('overflow-y-auto');
      // Karartma katmanı görünen alanın dışına taşan sınıfı taşır.
      expect(document.querySelector('.overlay-scrim')).not.toBeNull();

      rerender(<LightScreen />);
      expect(attr()).toBeNull();
      expect(themeColor()).toBe(THEME_COLORS.light);
    });
  }

  it('iki pencere üst üste açıkken biri kapanınca zemin karartmada kalır', () => {
    const { rerender } = render(
      <LightScreen>
        <Modal open title="A" onClose={() => {}} />
        <ConfirmModal open title="B" message="" onConfirm={() => {}} onCancel={() => {}} />
      </LightScreen>,
    );
    rerender(
      <LightScreen>
        <Modal open title="A" onClose={() => {}} />
      </LightScreen>,
    );
    expect(attr()).toBe('karartma');
  });
});

describe('Klavye açıkken eylem butonları görünür', () => {
  it('Verileri Temizle: "Vazgeç" ve "Kalıcı Olarak Sil" kayan bölümün dışında, sabit alt bölümde; SİL kutusu kayan bölümde', () => {
    render(<ClearDataModal open token="t" onUnauthorized={() => {}} onCleared={() => {}} onCancel={() => {}} />);
    const footer = document.querySelector('[data-pencere-eylemler]');
    const scroller = document.querySelector('[data-pencere-kaydirma]');
    expect(footer.className).toContain('shrink-0');
    expect([...footer.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Vazgeç', 'Kalıcı Olarak Sil']);
    expect(scroller.contains(footer)).toBe(false);
    expect(scroller.contains(document.getElementById('temizle-onay'))).toBe(true);
  });

  it('onay penceresi: butonlar sabit alt bölümde', () => {
    render(<ConfirmModal open title="Aşama değiştirilsin mi?" message="Mesaj" confirmLabel="Değiştir" onConfirm={() => {}} onCancel={() => {}} />);
    const footer = document.querySelector('[data-pencere-eylemler]');
    expect([...footer.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Vazgeç', 'Değiştir']);
    expect(document.querySelector('[data-pencere-kaydirma]').contains(footer)).toBe(false);
  });

  it('karartmaya ve pencere kutusunun boş kısmına dokunmak kapatır, pencerenin içine dokunmak kapatmaz', () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="T" message="M" onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.click(document.querySelector('[role="dialog"]'));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('[role="dialog"]').parentElement);
    fireEvent.click(document.querySelector('.overlay-scrim'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});

describe('keepFocusedVisible: odaklanan kutu kayan bölümün görünen kısmında kalır', () => {
  function setup(boxTop, boxBottom) {
    const scroller = document.createElement('div');
    scroller.setAttribute('data-pencere-kaydirma', '');
    const input = document.createElement('input');
    scroller.appendChild(input);
    document.body.appendChild(scroller);
    scroller.scrollTop = 100;
    scroller.getBoundingClientRect = () => ({ top: 0, bottom: 300 });
    input.getBoundingClientRect = () => ({ top: boxTop, bottom: boxBottom });
    return { scroller, input };
  }

  it('alt kenarın altında kalan kutu için aşağı kaydırır (12 px boşlukla)', () => {
    const { scroller, input } = setup(320, 360);
    keepFocusedVisible(input);
    expect(scroller.scrollTop).toBe(100 + (360 - 300 + 12));
    scroller.remove();
  });

  it('üst kenarın üstünde kalan kutu için yukarı kaydırır; görünürse dokunmaz', () => {
    const above = setup(-40, -10);
    keepFocusedVisible(above.input);
    expect(above.scroller.scrollTop).toBe(100 - (12 + 40));
    above.scroller.remove();

    const visible = setup(50, 90);
    keepFocusedVisible(visible.input);
    expect(visible.scroller.scrollTop).toBe(100);
    visible.scroller.remove();
  });
});

describe('Bütün pencereler ortak kabuğu kullanır', () => {
  // src altında role="dialog" yazan her dosya Overlay'i içe aktarmalıdır (kendi karartmasını yazmamalı).
  function jsxFiles(dir) {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return jsxFiles(path);
      return path.endsWith('.jsx') ? [path] : [];
    });
  }

  it('role="dialog" olan her bileşen Overlay kullanır ve kendi bg-ink/50 karartmasını tanımlamaz', () => {
    const dialogFiles = jsxFiles('src').filter((f) => readFileSync(f, 'utf8').includes('role="dialog"'));
    expect(dialogFiles.length).toBeGreaterThanOrEqual(3);
    for (const file of dialogFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).toMatch(/import Overlay from/);
      expect(source, file).not.toContain('bg-ink/50');
    }
  });
});

describe('CSS ve HTML karşılıkları', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const html = readFileSync('index.html', 'utf8');

  it('index.css: koyu ve karartma öznitelikleri html ve body zeminini değiştirir; aşırı kaydırma kapalı', () => {
    const dark = css.match(/html\[data-zemin='koyu'\],\s*html\[data-zemin='koyu'\] body\s*\{([^}]*)\}/);
    expect(dark[1]).toContain('background: var(--color-ink)');
    expect(dark[1]).toContain('color-scheme: dark');
    const scrim = css.match(/html\[data-zemin='karartma'\],\s*html\[data-zemin='karartma'\] body\s*\{([^}]*)\}/);
    expect(scrim[1]).toContain('color-mix(in srgb, var(--color-ink) 50%, var(--color-paper))');
    expect(css).toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior: none/);
    // Karartma görünen alanın dışına taşar.
    expect(css).toMatch(/\.overlay-scrim\s*\{[^}]*top: -100vh;[^}]*bottom: -100vh;/);
    // 8d kuralı korunur: .app-viewport görünen alana oturur.
    expect(css).toMatch(/\.app-viewport\s*\{[^}]*--app-top[^}]*--app-height/);
  });

  it('theme-color renkleri belirteçlerle aynı; karartma rengi %50 ink + %50 paper karışımı', () => {
    expect(css).toContain(`--color-ink: ${THEME_COLORS.dark};`);
    expect(css).toContain(`--color-paper: ${THEME_COLORS.light};`);
    const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const mixed = channels(THEME_COLORS.dark).map((c, i) => Math.round((c + channels(THEME_COLORS.light)[i]) / 2));
    expect(channels(THEME_COLORS.scrim)).toEqual(mixed);
    expect(html).toContain(`<meta name="theme-color" content="${THEME_COLORS.light}" />`);
  });
});
