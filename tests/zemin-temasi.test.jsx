// @vitest-environment jsdom
// Sayfa zemini ve tarayıcı çubuğu rengi (src/lib/screenTheme.js) testleri.
// Telefonda klavye açılınca koyu giriş ekranının altında açık şerit görünüyordu. Kural:
// - Giriş ekranı açıkken <html data-zemin="koyu">, meta theme-color koyu; CSS bu öznitelikte
//   html/body zeminini koyu ve color-scheme'i dark yapar.
// - Giriş ekranı kapanınca (sohbet, panel) öznitelik silinir, theme-color açık renge döner.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { setScreenTheme, THEME_COLORS, THEME_ATTR } from '../src/lib/screenTheme.js';

vi.mock('../src/lib/api.js', () => ({ apiRequest: vi.fn() }));
const { default: LoginScreen } = await import('../src/components/LoginScreen.jsx');

const themeColor = () => document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

afterEach(() => {
  cleanup();
  setScreenTheme('light');
});

describe('setScreenTheme', () => {
  it('koyu: html özniteliği ve koyu theme-color; açık: öznitelik silinir, açık theme-color', () => {
    setScreenTheme('dark');
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe('koyu');
    expect(themeColor()).toBe(THEME_COLORS.dark);

    setScreenTheme('light');
    expect(document.documentElement.hasAttribute(THEME_ATTR)).toBe(false);
    expect(themeColor()).toBe(THEME_COLORS.light);
    // Meta etiketi her seferinde yeniden eklenmez (tek etiket güncellenir).
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
  });
});

describe('Giriş ekranı sayfa zeminini yönetir', () => {
  it('açılınca koyu, kapanınca açık zemine döner', () => {
    const { unmount } = render(<LoginScreen onStudentLogin={() => {}} onAdminLogin={() => {}} />);
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe('koyu');
    expect(themeColor()).toBe(THEME_COLORS.dark);

    unmount();
    expect(document.documentElement.hasAttribute(THEME_ATTR)).toBe(false);
    expect(themeColor()).toBe(THEME_COLORS.light);
  });
});

describe('CSS ve HTML karşılıkları', () => {
  const css = readFileSync('src/index.css', 'utf8');
  const html = readFileSync('index.html', 'utf8');

  it('index.css: koyu öznitelikte html ve body koyu zemin + color-scheme: dark; aşırı kaydırma kapalı', () => {
    const rule = css.match(/html\[data-zemin='koyu'\],\s*html\[data-zemin='koyu'\] body\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toContain('background: var(--color-ink)');
    expect(rule[1]).toContain('color-scheme: dark');
    expect(css).toMatch(/html,\s*body\s*\{[^}]*overscroll-behavior: none/);
    // 8d kuralı korunur: .app-viewport görünen alana oturur.
    expect(css).toMatch(/\.app-viewport\s*\{[^}]*--app-height/);
  });

  it('theme-color renkleri tasarım belirteçleriyle aynı; index.html açık renkle başlar', () => {
    expect(css).toContain(`--color-ink: ${THEME_COLORS.dark};`);
    expect(css).toContain(`--color-paper: ${THEME_COLORS.light};`);
    expect(html).toContain(`<meta name="theme-color" content="${THEME_COLORS.light}" />`);
  });
});
