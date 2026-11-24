// @vitest-environment jsdom
// Giriş ekranı testleri (Yön 2b tasarımı, adım 2). Görünüm değişti ama kurallar aynı kalmalı:
// - Demo/önizleme butonu YOK; yalnızca kodla giriş ve altta sade "Yönetici Girişi" bağlantısı (Bölüm 2/4).
// - Kör deney: giriş ekranında çevre/eko çağrışımı ve aşama adı yoktur.
// - Yer tutucu gerçek bir katılımcı kodu göstermez.
// - Öğrenci ve yönetici formları sunucuya doğru isteği gönderir (mantık değişmedi).
// Sunucu istekleri (apiRequest) taklit edilir; gerçek ağa istek gitmez.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../src/lib/api.js', () => ({ apiRequest: (...args) => apiRequest(...args) }));

const { default: LoginScreen } = await import('../src/components/LoginScreen.jsx');

function renderLogin(props = {}) {
  const onStudentLogin = vi.fn();
  const onAdminLogin = vi.fn();
  render(<LoginScreen onStudentLogin={onStudentLogin} onAdminLogin={onAdminLogin} {...props} />);
  return { onStudentLogin, onAdminLogin };
}

beforeEach(() => apiRequest.mockReset());
afterEach(cleanup);

describe('Giriş ekranı', () => {
  it('yalnızca iki buton vardır: Giriş Yap ve Yönetici Girişi (demo butonu yok)', () => {
    renderLogin();
    const adlar = screen.getAllByRole('button').map((b) => b.textContent.trim());
    expect(adlar).toEqual(['Giriş Yap', 'Yönetici Girişi']);
    expect(document.body.textContent).not.toMatch(/demo|önizle/i);
  });

  it('kör deney: çevre/eko çağrışımı ve aşama adı yoktur', () => {
    renderLogin();
    const text = document.body.textContent;
    for (const kelime of ['Eko', 'enerji', 'Enerji', 'karbon', 'CO₂', 'yeşil', 'Ön Test', 'Son Test', 'Kontrol', 'Deney']) {
      expect(text).not.toContain(kelime);
    }
  });

  it('kod kutusu etiketlidir ve yer tutucu gerçek bir katılımcı kodu değildir', () => {
    renderLogin();
    const input = screen.getByLabelText('Katılımcı Kodu');
    expect(input.getAttribute('placeholder')).not.toMatch(/^[KD]\d{3}$/i);
  });

  it('öğrenci kodu /api/login ile doğrulanır', async () => {
    apiRequest.mockResolvedValue({ code: 'K001', group: 'Kontrol', phase: 'pretest' });
    const { onStudentLogin } = renderLogin();
    fireEvent.change(screen.getByLabelText('Katılımcı Kodu'), { target: { value: 'k001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
    await vi.waitFor(() => expect(onStudentLogin).toHaveBeenCalled());
    expect(apiRequest).toHaveBeenCalledWith('/api/login', { method: 'POST', body: { code: 'k001' } });
  });

  it('boş kodda Türkçe hata gösterilir, istek gönderilmez', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));
    expect(screen.getByRole('alert').textContent).toContain('katılımcı kodunu');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('Yönetici Girişi parola formunu açar; geri dönüş bağlantısı çalışır', async () => {
    apiRequest.mockResolvedValue({ token: 't', exp: 1 });
    const { onAdminLogin } = renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Yönetici Girişi' }));
    const pass = screen.getByLabelText('Yönetici Parolası');
    expect(pass.getAttribute('type')).toBe('password');
    fireEvent.change(pass, { target: { value: 'gizli' } });
    fireEvent.click(screen.getByRole('button', { name: 'Yönetici Paneline Gir' }));
    await vi.waitFor(() => expect(onAdminLogin).toHaveBeenCalled());
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/login', { method: 'POST', body: { passcode: 'gizli' } });
  });

  it('yönetici formundan öğrenci girişine dönülür', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Yönetici Girişi' }));
    fireEvent.click(screen.getByRole('button', { name: '← Öğrenci Girişine Dön' }));
    expect(screen.getByLabelText('Katılımcı Kodu')).toBeTruthy();
  });
});
