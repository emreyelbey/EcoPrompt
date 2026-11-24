// Ekran telefon genişliğinde mi (Tailwind'in sm sınırı olan 640 px'ten dar)?
// Yönetici panelindeki tablolar telefonda kart listesine döner. Tablo ile kart aynı anda sayfada
// durmasın diye (ekran okuyucu içeriği iki kez okumasın) CSS ile gizlemek yerine bu kanca kullanılır.
// matchMedia olmayan ortamda (eski tarayıcı, test ortamı) false döner: masaüstü tablo düzeni gösterilir.
import { useEffect, useState } from 'react';

export const PHONE_QUERY = '(max-width: 639.98px)';

function matches() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
}

export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(matches);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia(PHONE_QUERY);
    const update = () => setIsPhone(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return isPhone;
}
