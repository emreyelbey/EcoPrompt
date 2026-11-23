// @vitest-environment jsdom
// Yönetici paneli ekran testleri (tarayıcı ortamı). Sunucu istekleri (apiRequest) taklit edilir.
// En önemli güvence: "Verileri Temizle" penceresi sayıları gösterir, yedek uyarısı verir ve kutuya
// büyük harfle "SİL" (veya "SIL") yazılmadan onay butonu pasif kalır.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const apiRequest = vi.fn();
vi.mock('../src/lib/api.js', () => ({ apiRequest: (...args) => apiRequest(...args) }));

const { default: ClearDataModal } = await import('../src/components/admin/ClearDataModal.jsx');
const { default: AdminScreen } = await import('../src/components/admin/AdminScreen.jsx');
const { default: MethodologyModal } = await import('../src/components/eko/MethodologyModal.jsx');

// recharts'ın ResponsiveContainer'ı jsdom'da ResizeObserver ister.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const COUNTS = { interactions: 1234, logins: 58, rateLimits: 60 };

// Süslü parantez önemli: mockReset() taklit fonksiyonu döndürür; Vitest beforeEach'ten dönen
// fonksiyonu "temizlik" sanıp test sonunda çağırır.
beforeEach(() => {
  apiRequest.mockReset();
});
afterEach(cleanup);

describe('Verileri Temizle onay penceresi', () => {
  async function openModal(onCleared = vi.fn()) {
    apiRequest.mockImplementation(async (path, opts = {}) => {
      if (path === '/api/admin/clear' && !opts.method) return { counts: COUNTS };
      if (path === '/api/admin/clear' && opts.method === 'POST') return { deleted: COUNTS };
      throw new Error(`beklenmeyen istek: ${path}`);
    });
    render(<ClearDataModal open token="t" onUnauthorized={() => {}} onCleared={onCleared} onCancel={() => {}} />);
    await screen.findByLabelText('Silinecek kayıt sayıları');
    return onCleared;
  }

  it('silinecek kayıt sayılarını ve yedek uyarısını gösterir', async () => {
    await openModal();
    const list = screen.getByLabelText('Silinecek kayıt sayıları');
    expect(within(list).getByText('1.234')).toBeTruthy();
    expect(within(list).getByText('58')).toBeTruthy();
    expect(within(list).getByText('60')).toBeTruthy();
    expect(list.textContent).toContain('Etkileşim');
    expect(list.textContent).toContain('Giriş');
    expect(list.textContent).toContain('Hız sınırı');
    expect(document.body.textContent).toContain('Silmeden önce Excel/CSV yedeği almanız önerilir');
    expect(document.body.textContent).toContain('geri alınamaz');
  });

  it('"SİL" veya "SIL" tam yazılmadan onay butonu pasif kalır', async () => {
    await openModal();
    const button = screen.getByRole('button', { name: 'Kalıcı Olarak Sil' });
    const input = screen.getByLabelText(/Onaylamak için/);
    expect(button.disabled).toBe(true);

    for (const wrong of ['', 'sil', 'Sil', 'Sİl', 'SILL', 'SİLL', 'SİL ']) {
      fireEvent.change(input, { target: { value: wrong } });
      expect(button.disabled).toBe(true);
    }
    // Pasif butona tıklamak istek göndermez.
    fireEvent.click(button);
    expect(apiRequest).toHaveBeenCalledTimes(1); // yalnızca sayım isteği

    // Kabul edilen iki yazım: Türkçe klavyede SİL, İngilizce klavyede SIL.
    for (const right of ['SİL', 'SIL']) {
      fireEvent.change(input, { target: { value: right } });
      expect(button.disabled).toBe(false);
    }
  });

  it('açıklamada SIL notu görünür', async () => {
    await openModal();
    expect(screen.getByText('(SIL de kabul edilir)')).toBeTruthy();
  });

  it('SIL yazınca sunucuya yazıldığı gibi confirm: "SIL" gider', async () => {
    const onCleared = await openModal();
    fireEvent.change(screen.getByLabelText(/Onaylamak için/), { target: { value: 'SIL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kalıcı Olarak Sil' }));
    await vi.waitFor(() => expect(onCleared).toHaveBeenCalledWith(COUNTS));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/clear', { method: 'POST', body: { confirm: 'SIL' }, token: 't' });
  });

  it('onaylanınca sunucuya confirm: "SİL" gönderilir ve silinen sayılar bildirilir', async () => {
    const onCleared = await openModal();
    fireEvent.change(screen.getByLabelText(/Onaylamak için/), { target: { value: 'SİL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kalıcı Olarak Sil' }));
    await vi.waitFor(() => expect(onCleared).toHaveBeenCalledWith(COUNTS));
    expect(apiRequest).toHaveBeenLastCalledWith('/api/admin/clear', { method: 'POST', body: { confirm: 'SİL' }, token: 't' });
  });
});

describe('Yönetici paneli', () => {
  const RECORDS = [
    { id: 'r1', code: 'K001', group: 'Kontrol', phase: 'pretest', modelId: 'light', prompt: 'Fotosentez nedir?', energyAvg: 0.05, waterAvg: 0.05, co2Avg: 0.02, isSample: false, createdAt: 1000 },
    { id: 'r2', code: 'D001', group: 'Deney', phase: 'pretest', modelId: 'standard', prompt: 'Örnek soru', energyAvg: 0.2, waterAvg: 0.2, co2Avg: 0.09, isSample: true, createdAt: 2000 },
  ];

  function mockServer() {
    apiRequest.mockImplementation(async (path) => {
      if (path.startsWith('/api/admin/data')) {
        return { interactions: RECORDS, hasMore: false, next: null, logins: [], phase: 'pretest', serverTime: 5000 };
      }
      if (path.startsWith('/api/admin/record?id=r1')) {
        return { record: { ...RECORDS[0], tokenSource: 'gerçek', response: '**Tam yanıt** metni' } };
      }
      throw new Error(`beklenmeyen istek: ${path}`);
    });
  }

  it('5 sekme, aşama anahtarı ve örnek kayıt uyarı bandı', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    for (const label of ['Genel Bakış & Grafikler', 'Ön Test – Son Test & İstatistik', 'Öğrenci Kayıtları (1)', 'Katılımcı Kodları (60)', 'Metodoloji & Kaynakça']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('group', { name: 'Aktif aşama' })).toBeTruthy();
    expect(screen.getByRole('note').textContent).toContain('1 örnek kayıt');
    // İlk istek tam yükleme: since gönderilmez.
    expect(apiRequest.mock.calls[0][0]).toBe('/api/admin/data');
  });

  it('kayıt satırına tıklayınca tam yanıt ayrı istekle gelir', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'Öğrenci Kayıtları (1)' }));
    // Örnek kayıt varsayılan olarak listede yok.
    expect(screen.queryByText('Örnek soru')).toBeNull();
    fireEvent.click(screen.getByText('Fotosentez nedir?'));
    await screen.findByText('Tam yanıt');
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/record?id=r1', { token: 't' });
  });

  it('Verileri Temizle butonu onay penceresini açar', async () => {
    mockServer();
    apiRequest.mockImplementationOnce(async () => ({ interactions: [], hasMore: false, next: null, logins: [], phase: 'pretest' }));
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    apiRequest.mockImplementation(async () => ({ counts: COUNTS }));
    fireEvent.click(screen.getByRole('button', { name: 'Verileri Temizle' }));
    await screen.findByLabelText('Silinecek kayıt sayıları');
    expect(screen.getByRole('button', { name: 'Kalıcı Olarak Sil' }).disabled).toBe(true);
  });

  it('giriş sayacı olmayan eski belgede "sayı yok" ve açıklama gösterilir', async () => {
    apiRequest.mockImplementation(async () => ({
      interactions: [],
      hasMore: false,
      next: null,
      phase: 'pretest',
      logins: [
        { id: 'D001_pretest', code: 'D001', phase: 'pretest', firstLoginAt: 1000, lastLoginAt: 1000, loginCount: 4, sessionCount: null },
        { id: 'K001_pretest', code: 'K001', phase: 'pretest', firstLoginAt: 1000, lastLoginAt: 1000, loginCount: 9, sessionCount: 2 },
      ],
    }));
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'Katılımcı Kodları (60)' }));

    const d001 = screen.getByText('D001').closest('tr');
    const label = within(d001).getByText('· sayı yok');
    expect(label.getAttribute('title')).toBe('Bu belge giriş sayacı eklenmeden önce oluşturuldu');
    expect(d001.textContent).not.toContain('—');

    const k001 = screen.getByText('K001').closest('tr');
    expect(within(k001).getByText('· 2 giriş')).toBeTruthy();
  });

  it('Metodoloji sekmesi deney tasarımını gösterir (yalnızca yönetici)', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'Metodoloji & Kaynakça' }));
    expect(document.body.textContent).toContain('Ön Test – Son Test Kontrol Gruplu Kör Deney');
    expect(document.body.textContent).toContain('Akademik Kaynakça');
  });
});

describe('Kör deney: deney tasarımı öğrenciye sızmaz', () => {
  it('öğrencinin Metodoloji penceresinde deney tasarımı anlatılmaz', () => {
    render(<MethodologyModal open onClose={() => {}} />);
    const text = document.body.textContent;
    expect(text).toContain('Ağırlıklı Token');
    for (const word of ['Kontrol', 'Deney grubu', 'Ön Test', 'Son Test', 'Araştırma Deseni']) {
      expect(text).not.toContain(word);
    }
  });

  it('öğrenci tarafı dosyalar yönetici klasöründen hiçbir şey import etmez', () => {
    const studentFiles = [
      join('src', 'components', 'ChatScreen.jsx'),
      ...readdirSync(join('src', 'components', 'eko')).map((f) => join('src', 'components', 'eko', f)),
    ];
    for (const file of studentFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from ['"][^'"]*admin\//);
      expect(source, file).not.toMatch(/import[^;]*ExperimentDesignSection/);
    }
  });
});
