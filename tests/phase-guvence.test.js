// GÜVENCE TESTİ: Canlı dinleyici hiç çalışmasa bile (okul ağı veya reklam engelleyici onu durdurursa)
// öğrenci ekranı aşamayı /api/messages ve /api/chat yanıtlarından öğrenir ve doğru görünüme geçer.
// Aksi halde Deney grubu Son Test'te sade ekranda kalır; kayıt "Deney/posttest" olur ama müdahale uygulanmamış olur.
// Burada ekranın kullandığı saf fonksiyonlar (applyPhaseReport, chatResponseAction, getStudentView)
// gerçek uç noktaların yanıtlarıyla zincirlenir.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFakeDb, createReq, createRes } from './helpers/fake-api.js';
import { applyPhaseReport, chatResponseAction, getStudentView } from '../src/lib/phases.js';
import { readFirebaseConfig } from '../src/lib/firebaseClient.js';
import { subscribeToPhase } from '../src/lib/phaseListener.js';

let fakeDb;
vi.mock('../api/_lib/firebase.js', () => ({
  getDb: () => fakeDb,
  serverTimestamp: () => 'SUNUCU_ZAMANI',
  increment: (n) => ({ __increment: n }),
}));

const generateReply = vi.fn();
vi.mock('../api/_lib/ai.js', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, generateReply: (...args) => generateReply(...args) };
});

const { default: loginHandler } = await import('../api/login.js');
const { default: messagesHandler } = await import('../api/messages.js');
const { default: chatHandler } = await import('../api/chat.js');

async function post(handler, body) {
  const res = createRes();
  await handler(createReq({ method: 'POST', body }), res);
  return res.body;
}

beforeEach(() => {
  fakeDb = createFakeDb();
  generateReply.mockReset();
  generateReply.mockResolvedValue({ text: 'yanıt', usageMetadata: undefined, modelVersion: null });
});

describe('Dinleyici çalışmıyor', () => {
  it('istemci ayarı yoksa dinleyici hiçbir şey bildirmez (bu testteki durum)', () => {
    expect(readFirebaseConfig({})).toBe(null);
    const onPhase = vi.fn();
    const stop = subscribeToPhase(onPhase, null);
    stop();
    expect(onPhase).not.toHaveBeenCalled();
  });
});

describe('Sunucu yanıtı görünümü değiştirir', () => {
  it('/api/messages: Deney öğrencisi Son Test başlayınca EkoToken görünümüne geçer', async () => {
    // Öğrenci Ön Test'te giriş yaptı.
    let student = await post(loginHandler, { code: 'D001' });
    expect(getStudentView(student.group, student.phase)).toBe('sade');

    // Yönetici Son Test'e geçirdi; dinleyici bunu ekrana ULAŞTIRAMADI.
    fakeDb.docs.set('settings/experiment', { activePhase: 'posttest' });

    // Ekran geçmişi yeniden yükledi (ör. sayfa yenilendi veya "Tekrar Dene").
    const history = await post(messagesHandler, { code: 'D001' });
    student = applyPhaseReport(student, history.phase);

    expect(student.phase).toBe('posttest');
    expect(getStudentView(student.group, student.phase)).toBe('ekotoken');
    // Bu çağrı öğrenciyi Son Test'te "giriş yapmış" sayar.
    expect(fakeDb.docs.get('logins/D001_posttest').loginCount).toBe(1);
  });

  it('/api/chat: yanıttaki aşama farklıysa geçmiş yeniden yüklenir ve görünüm değişir', async () => {
    let student = await post(loginHandler, { code: 'D002' });
    const shownPhase = (await post(messagesHandler, { code: 'D002' })).phase; // ekranda Ön Test
    expect(shownPhase).toBe('pretest');

    fakeDb.docs.set('settings/experiment', { activePhase: 'posttest' }); // dinleyici sessiz

    // Öğrenci bir istem gönderdi; kayıt Son Test'e yazıldı ve yanıt bunu söylüyor.
    const chat = await post(chatHandler, { code: 'D002', modelId: 'light', prompt: 'merhaba' });
    expect(chat.phase).toBe('posttest');
    expect(chatResponseAction(shownPhase, chat.phase)).toBe('refresh');

    // Ekran 'refresh' kararıyla geçmişi yeniden alır ve sunucunun aşamasını uygular.
    const history = await post(messagesHandler, { code: 'D002' });
    student = applyPhaseReport(student, history.phase);
    expect(getStudentView(student.group, student.phase)).toBe('ekotoken');
    expect(history.messages.map((m) => m.prompt)).toEqual(['merhaba']);
  });

  it('Kontrol grubu Son Test\'te de sade ekranda kalır', async () => {
    fakeDb.docs.set('settings/experiment', { activePhase: 'posttest' });
    let student = { code: 'K001', group: 'Kontrol', phase: 'pretest' };
    student = applyPhaseReport(student, (await post(messagesHandler, { code: 'K001' })).phase);
    expect(student.phase).toBe('posttest');
    expect(getStudentView(student.group, student.phase)).toBe('sade');
  });

  it('aşama değişmediyse /api/chat mesajı listeye eklenir', async () => {
    const shownPhase = (await post(messagesHandler, { code: 'K002' })).phase;
    const chat = await post(chatHandler, { code: 'K002', modelId: 'light', prompt: 'soru' });
    expect(chatResponseAction(shownPhase, chat.phase)).toBe('append');
  });
});
