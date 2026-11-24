// Canlı aşama dinleyicisi testleri (src/lib/phaseListener.js).
// Firebase kodu artık dinamik import() ile ayrı parçadan iner. Bu testler şunu güvenceye alır:
// - subscribeToPhase durdurma fonksiyonunu HEMEN (eşzamanlı) döner,
// - yükleme bitince belge gerçekten dinlenir ve yönetici aşama değiştirince onPhase çağrılır,
// - yükleme bitmeden durdurulursa dinleme hiç başlamaz, başladıysa durdurulur.
// firebase/firestore sahte bir sürümle değiştirilir; gerçek ağa bağlanılmaz.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listeners = []; // Her onSnapshot çağrısı: { path, onNext, onError, unsubscribe }
vi.mock('firebase/firestore', () => ({
  doc: (db, ...segments) => ({ db, path: segments.join('/') }),
  onSnapshot: (ref, onNext, onError) => {
    const entry = { path: ref.path, onNext, onError, unsubscribe: vi.fn() };
    listeners.push(entry);
    return entry.unsubscribe;
  },
}));

// Bağlantı yüklemesi (firebaseClient.js) elle çözülen bir sözle taklit edilir: yavaş ağ.
let resolveDb;
const loadClientDb = vi.fn(
  () =>
    new Promise((resolve) => {
      resolveDb = resolve;
    })
);
vi.mock('../src/lib/firebaseClient.js', () => ({ loadClientDb: () => loadClientDb() }));

const { subscribeToPhase } = await import('../src/lib/phaseListener.js');

// Bekleyen sözlerin (Promise) ve dinamik import'un tamamlanmasını bekler.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Firestore belge anlık görüntüsünün sahte hali.
const snapshot = (data) => ({ exists: () => data !== undefined, data: () => data });

const FAKE_DB = { ad: 'sahte-veritabani' };

beforeEach(() => {
  listeners.length = 0;
  loadClientDb.mockClear();
});

describe('subscribeToPhase', () => {
  it('durdurma fonksiyonunu eşzamanlı döner', () => {
    const stop = subscribeToPhase(() => {}, FAKE_DB);
    expect(typeof stop).toBe('function');
    stop();
  });

  it('settings/experiment belgesini dinler; aşama değişince onPhase çağrılır', async () => {
    const onPhase = vi.fn();
    const stop = subscribeToPhase(onPhase, FAKE_DB);
    await flush();

    expect(listeners).toHaveLength(1);
    expect(listeners[0].path).toBe('settings/experiment');

    // Yönetici Son Test'e geçirdi, sonra Ön Test'e geri aldı.
    listeners[0].onNext(snapshot({ activePhase: 'posttest' }));
    listeners[0].onNext(snapshot({ activePhase: 'pretest' }));
    expect(onPhase.mock.calls).toEqual([['posttest'], ['pretest']]);

    stop();
    expect(listeners[0].unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('belge yoksa veya değer geçersizse Ön Test varsayılır', async () => {
    const onPhase = vi.fn();
    subscribeToPhase(onPhase, FAKE_DB);
    await flush();
    listeners[0].onNext(snapshot(undefined));
    listeners[0].onNext(snapshot({ activePhase: 'bozuk' }));
    expect(onPhase.mock.calls).toEqual([['pretest'], ['pretest']]);
  });

  it('yükleme bitmeden durdurulursa dinleme hiç başlamaz', async () => {
    const onPhase = vi.fn();
    const stop = subscribeToPhase(onPhase, FAKE_DB);
    stop(); // Ekran hemen kapandı (ör. React StrictMode'un çift çalıştırması).
    await flush();
    expect(listeners).toHaveLength(0);
    expect(onPhase).not.toHaveBeenCalled();
  });

  it('db verilmezse bağlantı yüklenir; yükleniyorken durdurulursa dinleme başlamaz', async () => {
    const stop = subscribeToPhase(() => {}); // Uygulamadaki gibi: db verilmedi.
    expect(loadClientDb).toHaveBeenCalledTimes(1);
    stop(); // Bağlantı henüz yüklenmedi.
    resolveDb(FAKE_DB);
    await flush();
    expect(listeners).toHaveLength(0);
  });

  it('db verilmezse yükleme bitince dinleme başlar', async () => {
    const onPhase = vi.fn();
    subscribeToPhase(onPhase);
    resolveDb(FAKE_DB);
    await flush();
    expect(listeners).toHaveLength(1);
    listeners[0].onNext(snapshot({ activePhase: 'posttest' }));
    expect(onPhase).toHaveBeenCalledWith('posttest');
  });

  it('ayar yoksa (db = null) hiçbir şey dinlenmez', async () => {
    const onPhase = vi.fn();
    const stop = subscribeToPhase(onPhase, null);
    await flush();
    stop();
    expect(listeners).toHaveLength(0);
    expect(onPhase).not.toHaveBeenCalled();
  });

  it('dinleyici hatası öğrenciye yansımaz, yalnızca uyarı yazılır', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    subscribeToPhase(() => {}, FAKE_DB);
    await flush();
    expect(() => listeners[0].onError({ code: 'permission-denied' })).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
