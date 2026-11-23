// @vitest-environment jsdom
// Sohbet ekranı testleri (tarayıcı ortamı): sade görünümde hiçbir çevresel gösterge çıkmaz,
// EkoToken görünümünde özet şeridi, rozetler, tasarruf ipucu ve pencereler çalışır.
// Sunucu istekleri (apiRequest) taklit edilir; gerçek ağa istek gitmez.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { calculateFootprint } from '../src/lib/footprint.js';

const apiRequest = vi.fn();
vi.mock('../src/lib/api.js', () => ({ apiRequest: (...args) => apiRequest(...args) }));

const { default: ChatScreen } = await import('../src/components/ChatScreen.jsx');

// jsdom'da öğelerin scrollTo fonksiyonu yok; ekran bunu çağırdığı için boş bir sürüm eklenir.
Element.prototype.scrollTo = () => {};

// Sunucunun EkoToken görünümünde göndereceği biçimde mesaj.
function ecoMessage(id, modelId, input, output, tokenSource = 'gerçek') {
  const fp = calculateFootprint(input, output, modelId);
  const eco = {
    inputTokens: fp.inputTokens,
    outputTokens: fp.outputTokens,
    tokenSource,
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
  };
  return { id, modelId, prompt: `soru ${id}`, response: `cevap ${id}`, createdAt: '2026-11-23T09:00:00.000Z', eco };
}

function plainMessage(id, modelId) {
  return { id, modelId, prompt: `soru ${id}`, response: `cevap ${id}`, createdAt: '2026-11-23T09:00:00.000Z' };
}

async function renderScreen({ view, student, messages, phase }) {
  apiRequest.mockResolvedValue({ phase, messages });
  render(<ChatScreen student={student} view={view} onServerPhase={() => {}} onLogout={() => {}} />);
  await screen.findByText(`cevap ${messages[0].id}`); // Geçmiş yüklendi.
}

beforeEach(() => apiRequest.mockReset());
afterEach(cleanup);

describe('Sade görünüm (Kontrol grubu veya Ön Test)', () => {
  it('hiçbir çevresel gösterge, rapor veya metodoloji öğesi yoktur', async () => {
    await renderScreen({
      view: 'sade',
      student: { code: 'K001', group: 'Kontrol', phase: 'posttest' },
      messages: [plainMessage('a', 'standard'), plainMessage('b', 'reasoning')],
      phase: 'posttest',
    });
    const text = document.body.textContent;
    expect(text).toContain('Eğitim Asistanı');
    for (const word of ['EkoToken', 'Kişisel Rapor', 'Metodoloji', 'Wh', 'mL', 'CO₂', 'Tasarruf', 'Günlük Karşılık', 'Token', 'İstem']) {
      expect(text).not.toContain(word);
    }
    expect(screen.queryByTestId('eko-ozet')).toBeNull();
    expect(screen.queryByTestId('eko-rozetler')).toBeNull();
  });

  it('mesajda yanlışlıkla eco alanı olsa bile sade görünüm onu göstermez', async () => {
    await renderScreen({
      view: 'sade',
      student: { code: 'D001', group: 'Deney', phase: 'pretest' },
      messages: [ecoMessage('a', 'standard', 100, 50)],
      phase: 'pretest',
    });
    expect(screen.queryByTestId('eko-rozetler')).toBeNull();
    expect(document.body.textContent).not.toContain('Wh');
  });
});

describe('EkoToken görünümü (Deney grubu + Son Test)', () => {
  const student = { code: 'D001', group: 'Deney', phase: 'posttest' };

  it('başlık, özet şeridi ve her yanıtın rozetleri görünür', async () => {
    await renderScreen({
      view: 'ekotoken',
      student,
      messages: [ecoMessage('a', 'light', 100, 50), ecoMessage('b', 'standard', 200, 100)],
      phase: 'posttest',
    });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('EkoToken');
    const bar = screen.getByTestId('eko-ozet');
    expect(bar.textContent).toContain('2 İstem');
    expect(bar.textContent).toContain('450 Token');
    expect(bar.textContent).toContain('Günlük karşılık');
    expect(screen.getAllByTestId('eko-rozetler')).toHaveLength(2);
    expect(screen.getAllByTestId('eko-rozetler')[0].textContent).toContain('100 girdi');
  });

  it('Tasarruf İpucu yalnızca Standart / Akıl Yürütme yanıtlarında çıkar', async () => {
    await renderScreen({
      view: 'ekotoken',
      student,
      messages: [ecoMessage('a', 'light', 100, 50), ecoMessage('b', 'reasoning', 100, 50)],
      phase: 'posttest',
    });
    const [lightBadges, reasoningBadges] = screen.getAllByTestId('eko-rozetler');
    expect(lightBadges.textContent).not.toContain('Tasarruf İpucu');
    const pct = calculateFootprint(100, 50, 'reasoning').savingsPct;
    expect(reasoningBadges.textContent).toContain('Tasarruf İpucu');
    expect(reasoningBadges.textContent).toContain(`%${pct} daha az su ve enerji`);
  });

  it('tahmini tokenlar "≈" ile gösterilir', async () => {
    await renderScreen({
      view: 'ekotoken',
      student,
      messages: [ecoMessage('a', 'light', 10, 5, 'tahmini')],
      phase: 'posttest',
    });
    expect(screen.getByTestId('eko-rozetler').textContent).toContain('≈ 10 girdi');
  });

  it('"Günlük Karşılık" kartı tıklayınca açılır ve kapanır', async () => {
    await renderScreen({ view: 'ekotoken', student, messages: [ecoMessage('a', 'standard', 1000, 500)], phase: 'posttest' });
    const badges = screen.getByTestId('eko-rozetler');
    const toggle = within(badges).getByRole('button', { name: /Günlük Karşılık/ });
    expect(badges.textContent).not.toContain('LED');
    fireEvent.click(toggle);
    expect(badges.textContent).toContain('LED');
    fireEvent.click(toggle);
    expect(badges.textContent).not.toContain('LED');
  });

  it('Metodoloji penceresi açılır, kaynakçayı gösterir, deney tasarımını anlatmaz', async () => {
    await renderScreen({ view: 'ekotoken', student, messages: [ecoMessage('a', 'light', 10, 5)], phase: 'posttest' });
    fireEvent.click(screen.getByRole('button', { name: 'Metodoloji' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Ağırlıklı Token');
    expect(dialog.textContent).toContain('Making AI Less Thirsty');
    for (const word of ['Kontrol', 'Kör Deney', 'Ön Test', 'Son Test', 'Deney grubu']) {
      expect(dialog.textContent).not.toContain(word);
    }
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Kişisel Rapor penceresi açılır ve toplamları gösterir', async () => {
    await renderScreen({
      view: 'ekotoken',
      student,
      messages: [ecoMessage('a', 'light', 100, 50), ecoMessage('b', 'light', 100, 50)],
      phase: 'posttest',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kişisel Rapor' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Kişisel Rapor — D001');
    expect(dialog.textContent).toContain('Toplam Su Ayak İzi');
    expect(dialog.textContent).toContain('Model Tercih Dağılımı');
    expect(dialog.textContent).toContain('2 istem (%100)');
  });
});
