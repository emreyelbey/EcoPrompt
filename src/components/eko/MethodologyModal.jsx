// Metodoloji penceresi (yalnızca Deney grubu + Son Test).
// İçerik MethodologyContent.jsx'tedir (yönetici paneli de aynı içeriği kullanır).
// KÖR DENEY: Deney tasarımı (Kontrol grubunun ne gördüğü vb.) bu pencerede BİLEREK yer almaz;
// o anlatım yalnızca yönetici panelindeki ExperimentDesignSection.jsx dosyasındadır.
import Modal from '../Modal.jsx';
import MethodologyContent from './MethodologyContent.jsx';

export default function MethodologyModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Metodoloji ve Kaynakça" subtitle="Çevresel etki değerleri nasıl hesaplanıyor?">
      <MethodologyContent />
    </Modal>
  );
}
