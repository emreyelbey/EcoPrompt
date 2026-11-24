// @vitest-environment jsdom
// Yönetici paneli ekran testleri (tarayıcı ortamı). Sunucu istekleri (apiRequest) taklit edilir.
// En önemli güvence: "Verileri Temizle" penceresi sayıları gösterir, yedek uyarısı verir ve kutuya
// büyük harfle "SİL" (veya "SIL") yazılmadan onay butonu pasif kalır.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fixtureRecords, interaction, loginsFor } from './helpers/stats-fixture.js';

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

  it('yapılandırma özeti: tek değerde onay, iki farklı değerde kırmızı uyarı (dondurma kuralı)', async () => {
    const withHash = (hashes) =>
      apiRequest.mockImplementation(async (path) => {
        if (path.startsWith('/api/admin/data')) {
          const recs = [
            { ...RECORDS[0], id: 'h1', configHash: hashes[0] },
            { ...RECORDS[0], id: 'h2', phase: 'posttest', configHash: hashes[1] },
          ];
          return { interactions: recs, hasMore: false, next: null, logins: [], phase: 'pretest', serverTime: 5000 };
        }
        throw new Error(`beklenmeyen istek: ${path}`);
      });

    withHash(['aaaaaaaaaaaa', 'aaaaaaaaaaaa']);
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'İstatistik' }));
    expect(screen.getByTestId('yapilandirma-ozeti').textContent).toContain('tek değer');
    cleanup();

    withHash(['aaaaaaaaaaaa', 'bbbbbbbbbbbb']);
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'İstatistik' }));
    const alert = screen.getByTestId('yapilandirma-ozeti');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('2 farklı değer');
    expect(alert.textContent).toContain('bbbbbbbbbbbb: 1 kayıt (Ön Test 0, Son Test 1)');
  });

  // Sunucunun şu anki özeti (currentConfigHash) ile kayıtlardaki özeti karşılaştıran yardımcı.
  async function openStatsWith({ records, current }) {
    apiRequest.mockImplementation(async (path) => {
      if (path.startsWith('/api/admin/data')) {
        return { interactions: records, hasMore: false, next: null, logins: [], phase: 'pretest', serverTime: 5000, currentConfigHash: current };
      }
      throw new Error(`beklenmeyen istek: ${path}`);
    });
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'İstatistik' }));
    return screen.getByTestId('yapilandirma-ozeti');
  }

  it('sunucunun şu anki özeti kayıt olmasa da görünür (Ön Test öncesi not için)', async () => {
    const box = await openStatsWith({ records: [], current: 'cccccccccccc' });
    expect(box.getAttribute('role')).toBeNull();
    expect(box.textContent).toContain('Sunucunun şu anki yapılandırma özeti: cccccccccccc');
    expect(box.textContent).toContain('Kayıtlardaki yapılandırma özeti: henüz kayıt yok.');
    expect(screen.getByTestId('sunucu-ozeti').textContent).toBe('cccccccccccc');
  });

  it('kayıtlardaki özet sunucununkiyle aynıysa yeşil onay', async () => {
    const box = await openStatsWith({ records: [{ ...RECORDS[0], configHash: 'cccccccccccc' }], current: 'cccccccccccc' });
    expect(box.getAttribute('role')).toBeNull();
    expect(box.textContent).toContain('Kayıtlardaki yapılandırma özeti: bütün kayıtlarda tek değer cccccccccccc ✓');
  });

  it('kayıtlardaki özet sunucununkinden farklıysa kırmızı uyarı', async () => {
    const box = await openStatsWith({ records: [{ ...RECORDS[0], configHash: 'aaaaaaaaaaaa' }], current: 'cccccccccccc' });
    expect(box.getAttribute('role')).toBe('alert');
    expect(box.textContent).toContain('Sunucunun şu anki yapılandırma özeti: cccccccccccc');
    expect(box.textContent).toContain('Kayıtlardaki yapılandırma özeti: bütün kayıtlarda tek değer aaaaaaaaaaaa');
    expect(box.textContent).not.toContain('✓');
    expect(box.textContent).toContain('Sunucunun şu anki özeti kayıtlardakinden farklı');
  });

  it('önizleme modunda yapılandırma özeti satırı gizlenir', async () => {
    await openStatsWith({ records: [], current: 'cccccccccccc' });
    fireEvent.click(screen.getByRole('button', { name: 'Genel Bakış' }));
    fireEvent.click(screen.getByRole('button', { name: 'Örnek Veriyle Önizle' }));
    fireEvent.click(screen.getByRole('button', { name: 'İstatistik' }));
    expect(screen.queryByTestId('yapilandirma-ozeti')).toBeNull();
    expect(document.body.textContent).not.toContain('cccccccccccc');
  });

  it('5 sekme, aşama anahtarı ve örnek kayıt uyarı bandı', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    for (const label of ['Genel Bakış', 'İstatistik', 'Öğrenci Kayıtları (1)', 'Katılımcı Kodları (60)', 'Metodoloji']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('group', { name: 'Aktif aşama' })).toBeTruthy();
    expect(screen.getByRole('note').textContent).toContain('1 örnek kayıt');
    // İlk istek tam yükleme: since gönderilmez.
    expect(apiRequest.mock.calls[0][0]).toBe('/api/admin/data');
  });

  // Telefonda (sm altı) sekmeler kenar menüsü yerine yerel bir seçim kutusundadır (jsdom CSS çizmez; ikisi de DOM'da).
  // Seçenekler sekme adını ve sayısını içerir; seçim kutusu sekmeyi değiştirir.
  it('telefon sekme seçicisi: etiketli, sayılı seçenekler, seçince sekme değişir', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    const select = screen.getByRole('combobox', { name: 'Panel sekmesi' });
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Genel Bakış', 'İstatistik', 'Öğrenci Kayıtları (1)', 'Katılımcı Kodları (60)', 'Metodoloji']);
    fireEvent.change(select, { target: { value: 'codes' } });
    expect(screen.getByText('D001').closest('tr')).not.toBeNull();
    expect(select.value).toBe('codes');
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

  // modal-duzeltme: Önizle penceresi sekme kabının (belirme animasyonlu, transform taşıyabilir) içinde değil,
  // doğrudan body altında çizilir; yoksa karartma ekran yerine sekme kabına sıkışır.
  it('kayıt önizleme penceresi portal ile body altında; sekme kabının içinde değil', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'Öğrenci Kayıtları (1)' }));
    fireEvent.click(screen.getByText('Fotosentez nedir?'));
    await screen.findByText('Tam yanıt');
    const dialog = screen.getByRole('dialog');
    expect(screen.getByTestId('sekme-icerik').contains(dialog)).toBe(false);
    expect(screen.getByTestId('panel-kaydirma').contains(dialog)).toBe(false);
    const shell = dialog.closest('.fixed.inset-0');
    expect(shell.parentElement).toBe(document.body);
  });

  it('örnek veri önizlemesi: sabit bant, her kartta ÖRNEK VERİ etiketi, Excel/CSV pasif, istek yok', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    const callsBefore = apiRequest.mock.calls.length;
    expect(screen.queryByTestId('onizleme-bandi')).toBeNull();
    expect(screen.queryAllByTestId('ornek-etiket')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Örnek Veriyle Önizle' }));

    // Bant kayan alanda değil, sabit üst çubukta (header) durur.
    const band = screen.getByTestId('onizleme-bandi');
    expect(band.closest('header')).not.toBeNull();
    expect(band.closest('main')).toBeNull();
    expect(band.textContent).toContain('ÖRNEK VERİ ÖNİZLEMESİ');

    // Genel Bakış: KPI ve grafik kartlarının hepsinde etiket; payda örnek kod sayısı (40).
    expect(screen.getAllByTestId('ornek-etiket').length).toBeGreaterThanOrEqual(8);
    expect(document.body.textContent).toContain('/ 40');
    expect(screen.getByRole('button', { name: 'Verileri Temizle' }).disabled).toBe(true);

    // İstatistik: test kartlarında etiket, Excel pasif.
    fireEvent.click(screen.getByRole('button', { name: 'İstatistik' }));
    expect(screen.getAllByTestId('ornek-etiket').length).toBeGreaterThanOrEqual(10);
    expect(screen.getByRole('button', { name: /Excel İndir/ }).disabled).toBe(true);

    // Kayıtlar: yalnızca örnek kodlar; gerçek kayıt yok; CSV pasif; yanıt sunucuya gitmeden açılır.
    fireEvent.click(screen.getByRole('button', { name: /^Öğrenci Kayıtları/ }));
    expect(screen.queryByText('Fotosentez nedir?')).toBeNull();
    expect(screen.getAllByText(/^O[KD]\d\d$/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /CSV İndir/ }).disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: /kaydını önizle/ })[0]);
    await screen.findByText('Asistan Yanıtı');

    // Önizleme hiçbir sunucu isteği yapmadı (veritabanına yazma da yok).
    expect(apiRequest.mock.calls.length).toBe(callsBefore);

    // Çıkınca bant ve etiketler kalkar, gerçek veri geri gelir.
    fireEvent.click(within(band).getByRole('button', { name: 'Önizlemeden Çık' }));
    expect(screen.queryByTestId('onizleme-bandi')).toBeNull();
    expect(screen.queryAllByTestId('ornek-etiket')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Öğrenci Kayıtları (1)' })).toBeTruthy();
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

  it('İstatistik sekmesi: veri yetersizse 4 test de "Hesaplanamadı" ve Türkçe gerekçe gösterir', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'İstatistik' }));
    for (const title of [
      '1. Başlangıç Denkliği (Ön Test: Kontrol – Deney)',
      '2. Kontrol Grubu Değişimi (Ön Test → Son Test)',
      '3. Deney Grubu Değişimi (Ön Test → Son Test)',
      '4. Son Test Grup Farkı (Son Test: Kontrol – Deney)',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
    expect(screen.getAllByText('Hesaplanamadı')).toHaveLength(4);
    expect(document.body.textContent).toContain('en az 2 katılımcı gereklidir');
    expect(screen.getAllByText('p (çift yönlü)')).toHaveLength(4);
    expect(document.body.textContent).toContain('Etki büyüklüğü nasıl hesaplandı?');
    expect(document.body.textContent).toContain('havuzlanmış standart sapma');
  });

  it('İstatistik sekmesi: eşleşen n şeffaf gösterilir, birincil ölçüt enerji, Excel indirilir', async () => {
    const records = [...fixtureRecords(), interaction('D010', 'pretest', 3.0)];
    apiRequest.mockImplementation(async () => ({
      interactions: records,
      hasMore: false,
      next: null,
      logins: loginsFor(records),
      phase: 'posttest',
      serverTime: 5000,
    }));
    const createObjectURL = vi.fn(() => 'blob:test');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    // jsdom sayfa değiştirmeyi desteklemez; indirme bağlantısının tıklanması taklit edilir.
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'İstatistik' }));

    expect(screen.getByRole('combobox', { name: /İstatistik ölçütü/ }).value).toBe('energy');
    expect(screen.getByText('Birincil ölçüt (ana hipotez)')).toBeTruthy();
    expect(document.body.textContent).toContain("Ön Test'te 6, Son Test'te 5, eşleşen 5 kişi");
    expect(document.body.textContent).toContain("Ön Test'te 5, Son Test'te 5, eşleşen 5 kişi");
    expect(screen.getAllByText('Anlamlı')).toHaveLength(2); // Deney değişimi ve Son Test farkı

    // Ölçüt değişince ikincil ölçüt etiketi görünür.
    fireEvent.change(screen.getByRole('combobox', { name: /İstatistik ölçütü/ }), { target: { value: 'prompts' } });
    expect(screen.getByText('İkincil ölçüt')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Excel İndir (.xlsx)' }));
    await screen.findByText('Excel dosyası indirildi (4 veri sayfası + değişken sözlüğü).');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(anchorClick).toHaveBeenCalledTimes(1);
    anchorClick.mockRestore();
  });

  it('Metodoloji sekmesi deney tasarımını gösterir (yalnızca yönetici)', async () => {
    mockServer();
    render(<AdminScreen token="t" onLogout={() => {}} />);
    await screen.findByText('Aktif Katılımcılar');
    fireEvent.click(screen.getByRole('button', { name: 'Metodoloji' }));
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
