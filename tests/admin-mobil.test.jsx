// @vitest-environment jsdom
// Yönetici paneli telefon görünümü testleri (sm altı, 640 px'ten dar).
// jsdom CSS çizmediği için ekran genişliği window.matchMedia taklidiyle verilir (useIsPhone bunu okur).
// Telefonda tablolar yerine kart listesi çıkar; tablo ile kart aynı anda sayfada olmaz.
// Masaüstü tablo düzeni admin-ekran.test.jsx'teki testlerle (matchMedia yok → tablo) denetlenir.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../src/lib/api.js', () => ({ apiRequest: (...args) => apiRequest(...args) }));

const { default: AdminScreen } = await import('../src/components/admin/AdminScreen.jsx');

// recharts'ın ResponsiveContainer'ı jsdom'da ResizeObserver ister.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const RECORDS = [
  { id: 'r1', code: 'K001', group: 'Kontrol', phase: 'pretest', modelId: 'light', prompt: 'Fotosentez nedir?', energyAvg: 0.05, waterAvg: 0.05, co2Avg: 0.02, isSample: false, createdAt: 1000 },
];
const LOGINS = [
  { id: 'D001_pretest', code: 'D001', phase: 'pretest', firstLoginAt: 1000, lastLoginAt: 1000, loginCount: 4, sessionCount: null },
  { id: 'K001_pretest', code: 'K001', phase: 'pretest', firstLoginAt: 1000, lastLoginAt: 1000, loginCount: 9, sessionCount: 2 },
];

function mockServer() {
  apiRequest.mockImplementation(async (path) => {
    if (path.startsWith('/api/admin/data')) {
      return { interactions: RECORDS, hasMore: false, next: null, logins: LOGINS, phase: 'pretest', serverTime: 5000 };
    }
    if (path.startsWith('/api/admin/record?id=r1')) {
      return { record: { ...RECORDS[0], tokenSource: 'gerçek', response: '**Tam yanıt** metni' } };
    }
    throw new Error(`beklenmeyen istek: ${path}`);
  });
}

// Telefon genişliği: bütün medya sorguları eşleşir.
beforeEach(() => {
  apiRequest.mockReset();
  window.matchMedia = vi.fn((query) => ({
    matches: true,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  cleanup();
  delete window.matchMedia;
});

async function openPanel() {
  mockServer();
  render(<AdminScreen token="t" onLogout={() => {}} />);
  await screen.findByText('Aktif Katılımcılar');
}

describe('Yönetici paneli telefonda kart listesi gösterir', () => {
  it('Katılımcı Kodları: 60 kart, tablo yok; kod, grup, statü ve aşama bilgileri etiketli', async () => {
    await openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Katılımcı Kodları (60)' }));

    const cards = screen.getAllByTestId('kod-karti');
    expect(cards).toHaveLength(60);
    expect(document.querySelector('table')).toBeNull();

    const k001 = cards.find((c) => c.textContent.includes('K001'));
    // Kod görünür (taşmaz) ve grup/statü aynı satırdadır.
    expect(within(k001).getByText('K001').className).toContain('font-mono');
    expect(k001.textContent).toContain('Kontrol');
    expect(k001.textContent).toContain('Asıl');
    // Ekran okuyucu etiketleri aşama adını içerir: "Ön Test İstem" → 1, "Son Test İstem" → 0.
    const value = (term) => [...k001.querySelectorAll('dt')].find((dt) => dt.textContent === term).nextElementSibling.textContent;
    expect(value('Ön Test İstem')).toBe('1');
    expect(value('Son Test İstem')).toBe('0');
    expect(value('Ön Test Giriş sayısı')).toBe('2');
    expect(value('Son Test Giriş')).toContain('Yok');

    // Kopyala butonu etiketli ve en az 44 px.
    const copy = within(k001).getByRole('button', { name: 'K001 kodunu kopyala' });
    expect(copy.className).toContain('min-h-11');

    // Giriş sayacı olmayan eski belge: "sayı yok" ve açıklama.
    const d001 = cards.find((c) => c.textContent.includes('D001'));
    const unknown = within(d001).getByText('sayı yok');
    expect(unknown.getAttribute('title')).toBe('Bu belge giriş sayacı eklenmeden önce oluşturuldu');
  });

  it('Öğrenci Kayıtları: her kayıt bir kart; etiketli bilgiler, 44 px Önizle/Sil, önizleme açılır', async () => {
    await openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Öğrenci Kayıtları (1)' }));

    const cards = screen.getAllByTestId('kayit-karti');
    expect(cards).toHaveLength(1);
    expect(document.querySelector('table')).toBeNull();
    const card = cards[0];
    expect(card.textContent).toContain('Kod: K001');
    expect(card.textContent).toContain('Aşama: Ön Test');
    expect(card.textContent).toContain('Model: Hafif Model');
    // İstem en fazla 2 satır (devamı kesilir).
    expect(within(card).getByText('Fotosentez nedir?').className).toContain('line-clamp-2');
    expect(card.textContent).toContain('Enerji ortalaması:');
    // Gerçek veride ÖRNEK VERİ etiketi yok.
    expect(within(card).queryByTestId('ornek-etiket')).toBeNull();

    const del = within(card).getByRole('button', { name: 'K001 kaydını sil' });
    const open = within(card).getByRole('button', { name: 'K001 kaydını önizle' });
    expect(del.className).toContain('min-h-11');
    expect(open.className).toContain('min-h-11');
    fireEvent.click(open);
    await screen.findByText('Tam yanıt');
  });

  it('Örnek veri önizlemesinde her kayıt kartı ÖRNEK VERİ etiketi taşır ve silinemez', async () => {
    await openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Örnek Veriyle Önizle' }));
    fireEvent.click(screen.getByRole('button', { name: /^Öğrenci Kayıtları/ }));

    const cards = screen.getAllByTestId('kayit-karti');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(within(card).getByTestId('ornek-etiket').textContent).toBe('ÖRNEK VERİ');
      expect(within(card).getByRole('button', { name: /kaydını sil/ }).disabled).toBe(true);
    }
  });

  it('Genel Bakış: "Tablo olarak göster" telefonda tablo değil, etiketli satır kartları', async () => {
    await openPanel();
    const lists = screen.getAllByTestId('tablo-kartlari');
    expect(lists).toHaveLength(3);
    expect(document.querySelector('details table')).toBeNull();
    // Sütun adı satır adıyla birlikte okunur (ör. "Kontrol Toplam istem").
    const terms = [...lists[0].querySelectorAll('dt')].map((dt) => dt.textContent);
    expect(terms).toContain('Kontrol Toplam istem');
    expect(terms).toContain('Deney Öğrenci başına istem');
  });
});
