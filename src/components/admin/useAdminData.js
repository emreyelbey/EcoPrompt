// Yönetici paneli veri kancası: kayıtları ve giriş kayıtlarını bellekte tutar, artımlı yeniler.
// Strateji (Firestore okuma kotasını korumak için, proje rehberi Bölüm 7 ve Dilim 6 planı):
//   1) Panel açılınca bir kez tam yükleme (sayfa sayfa).
//   2) Sonra 15 sn'de bir YALNIZCA son görülen zamandan sonra gelen kayıtlar istenir.
//      Sekme arka plandaysa yoklama yapılmaz.
//   3) "Yenile" butonu aynı artımlı isteği hemen yapar; "Tümünü yeniden yükle" önbelleği sıfırlar.
// Silme ve temizleme bu panelden yapıldığında önbellek yerinde güncellenir (yeniden okuma gerekmez).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../../lib/api.js';
import { latestMillis, mergeById } from '../../lib/adminSummary.js';

// Otomatik yenileme aralığı (milisaniye).
export const POLL_INTERVAL_MS = 15_000;

// Sorgu parametrelerinden adres üretir; tanımsız değerler atlanır.
function buildUrl(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `/api/admin/data?${text}` : '/api/admin/data';
}

export default function useAdminData(token, onUnauthorized) {
  const [records, setRecords] = useState(() => new Map());
  const [logins, setLogins] = useState(() => new Map());
  const [phase, setPhase] = useState(null);
  // Sunucunun şu anki yapılandırma özeti (kayıt olmasa da gelir; dondurma kuralı kontrolü için).
  const [currentConfigHash, setCurrentConfigHash] = useState(null);
  const [loading, setLoading] = useState(true); // ilk yükleme sürüyor
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Güncel önbellek ve "şu an istek var mı" bilgisi; zamanlayıcı içinden okunur.
  const cache = useRef({ records: new Map(), logins: new Map() });
  const busy = useRef(false);
  // Oturum düşerse çağrılacak fonksiyon; ref'te tutulur ki değişmesi yoklamayı yeniden başlatmasın.
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;

  const fetchData = useCallback(
    async (full = false) => {
      if (busy.current) return;
      busy.current = true;
      setRefreshing(true);
      try {
        let recs = full ? new Map() : cache.current.records;
        let logs = full ? new Map() : cache.current.logins;

        // İlk sayfa: artımlı ise son görülen zamanları gönder.
        const first = await apiRequest(
          buildUrl({
            since: full ? undefined : latestMillis([...recs.values()], 'createdAt'),
            loginsSince: full ? undefined : latestMillis([...logs.values()], 'lastLoginAt'),
          }),
          { token }
        );
        recs = mergeById(recs, first.interactions);
        logs = mergeById(logs, first.logins || []);

        // Kalan sayfalar (yalnızca çok sayıda yeni kayıt varsa).
        let page = first;
        while (page.hasMore && page.next) {
          page = await apiRequest(buildUrl({ afterT: page.next.t, afterId: page.next.id }), { token });
          recs = mergeById(recs, page.interactions);
        }

        cache.current = { records: recs, logins: logs };
        setRecords(recs);
        setLogins(logs);
        if (first.phase) setPhase(first.phase);
        if (typeof first.currentConfigHash === 'string') setCurrentConfigHash(first.currentConfigHash);
        setLastUpdated(Date.now());
        setError('');
      } catch (err) {
        if (err.status === 401) unauthorized.current();
        else setError(err.message);
      } finally {
        busy.current = false;
        setRefreshing(false);
        setLoading(false);
      }
    },
    [token]
  );

  // İlk yükleme + 15 sn'de bir artımlı yoklama (sekme görünürken).
  useEffect(() => {
    fetchData(true);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData(false);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Bu panelden silinen tek kaydı önbellekten çıkarır.
  const removeRecord = useCallback((id) => {
    const recs = new Map(cache.current.records);
    recs.delete(id);
    cache.current = { ...cache.current, records: recs };
    setRecords(recs);
  }, []);

  // "Verileri Temizle" sonrası önbelleği boşaltır.
  const clearAll = useCallback(() => {
    cache.current = { records: new Map(), logins: new Map() };
    setRecords(cache.current.records);
    setLogins(cache.current.logins);
  }, []);

  // Diziler yalnızca önbellek değişince yeniden oluşur (ekrandaki hesaplar boşuna tekrarlanmasın).
  const recordList = useMemo(() => [...records.values()], [records]);
  const loginList = useMemo(() => [...logins.values()], [logins]);

  return {
    records: recordList,
    logins: loginList,
    phase,
    setPhase,
    currentConfigHash,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: () => fetchData(false),
    reloadAll: () => fetchData(true),
    removeRecord,
    clearAll,
  };
}
