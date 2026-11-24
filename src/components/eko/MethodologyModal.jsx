// Metodoloji penceresi (yalnızca Deney grubu + Son Test).
// İçerik MethodologyContent.jsx'tedir (yönetici paneli de aynı içeriği kullanır).
// KÖR DENEY: Deney tasarımı (Kontrol grubunun ne gördüğü vb.) bu pencerede BİLEREK yer almaz;
// o anlatım yalnızca yönetici panelindeki ExperimentDesignSection.jsx dosyasındadır.
import Modal from '../Modal.jsx';
import MethodologyContent from './MethodologyContent.jsx';

export default function MethodologyModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      // Başlık metni değişmedi ("Metodoloji ve Kaynakça"); yalnızca son kelime italik serif.
      title={
        <>
          Metodoloji ve <span className="font-serif italic font-normal text-[1.1em]">Kaynakça</span>
        </>
      }
      subtitle="Çevresel etki değerleri nasıl hesaplanıyor?"
    >
      <MethodologyContent />
    </Modal>
  );
}
