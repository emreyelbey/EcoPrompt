// Ana bileşen: hangi ekranın gösterileceğine karar verir.
// Durumlar: 'loading' (kayıtlı oturum kontrol ediliyor) → 'login' | 'student' | 'admin'.
// Kayıtlı oturuma körü körüne güvenilmez: öğrenci kodu /api/login ile, yönetici token'ı
// /api/admin/session ile sunucuda yeniden doğrulanır.
// Aktif aşama iki yoldan öğrenilir: canlı dinleyici (hızlı) ve API yanıtları (doğru kaynak).
// İkisi de applyPhaseReport ile aynı yere yazar; dinleyici hiç çalışmasa da ekran doğru aşamaya geçer.
import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LoginScreen from './components/LoginScreen.jsx';
import AdminScreen from './components/AdminScreen.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import { apiRequest } from './lib/api.js';
import { applyPhaseReport, getStudentView } from './lib/phases.js';
import { subscribeToPhase } from './lib/phaseListener.js';
import { saveStudent, saveAdmin, loadSession, clearSession } from './lib/session.js';

export default function App() {
  const [view, setView] = useState('loading');
  const [student, setStudent] = useState(null); // { code, group, phase }
  const [admin, setAdmin] = useState(null); // { token, exp }
  // Kayıtlı oturum doğrulanamazsa giriş ekranında gösterilecek bilgiler.
  const [loginHint, setLoginHint] = useState({ code: '', error: '' });

  // Sayfa ilk açıldığında kayıtlı oturumu sunucuda doğrula.
  useEffect(() => {
    let cancelled = false; // Bileşen kapanırsa geç gelen yanıt yok sayılır.

    async function restore() {
      const saved = loadSession();

      if (saved?.role === 'admin') {
        try {
          await apiRequest('/api/admin/session', { token: saved.token });
          if (cancelled) return;
          setAdmin({ token: saved.token, exp: saved.exp });
          setView('admin');
        } catch (err) {
          if (cancelled) return;
          clearSession();
          setLoginHint({ code: '', error: err.status === 401 ? '' : err.message });
          setView('login');
        }
        return;
      }

      if (saved?.role === 'student') {
        try {
          // Kod yeniden doğrulanır; bu aşamanın giriş kaydı da tazelenir.
          const data = await apiRequest('/api/login', { method: 'POST', body: { code: saved.code } });
          if (cancelled) return;
          setStudent(data);
          setView('student');
        } catch (err) {
          if (cancelled) return;
          clearSession();
          // Kod artık geçersizse alan boş gelir; geçici bir hatada kod hazır yazılı durur.
          setLoginHint({ code: err.status === 400 ? '' : saved.code, error: err.message });
          setView('login');
        }
        return;
      }

      setView('login');
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Yeni bir aşama bildirimi (dinleyiciden veya sunucu yanıtından) öğrenci durumuna uygulanır.
  // Aşama değişmediyse durum aynı kalır.
  const handlePhaseReport = useCallback((phase) => {
    setStudent((current) => applyPhaseReport(current, phase));
  }, []);

  // Öğrenci ekranı açıkken settings/experiment belgesini canlı dinle (salt okunur).
  const studentCode = view === 'student' ? student?.code : null;
  useEffect(() => {
    if (!studentCode) return undefined;
    return subscribeToPhase(handlePhaseReport); // Ekran kapanınca dinleme durur.
  }, [studentCode, handlePhaseReport]);

  const handleStudentLogin = (data) => {
    saveStudent(data.code);
    setStudent(data);
    setView('student');
  };

  const handleAdminLogin = (data) => {
    saveAdmin(data.token, data.exp);
    setAdmin(data);
    setView('admin');
  };

  const handleLogout = () => {
    clearSession();
    setStudent(null);
    setAdmin(null);
    setLoginHint({ code: '', error: '' });
    setView('login');
  };

  if (view === 'loading') {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-slate-50 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" aria-label="Yükleniyor" />
      </div>
    );
  }

  if (view === 'student' && student) {
    const studentView = getStudentView(student.group, student.phase);
    // DİLİM 5: studentView === 'ekotoken' (Deney + Son Test) olduğunda EkoToken arayüzü gösterilecek.
    // Şimdilik iki durumda da sade sohbet ekranı açılır; aşama bilgisinin doğru aktığı testlerle doğrulanır.
    return (
      <ChatScreen
        student={student}
        onServerPhase={handlePhaseReport}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'admin' && admin) {
    return <AdminScreen token={admin.token} onLogout={handleLogout} />;
  }

  return (
    <LoginScreen
      onStudentLogin={handleStudentLogin}
      onAdminLogin={handleAdminLogin}
      initialCode={loginHint.code}
      initialError={loginHint.error}
    />
  );
}
