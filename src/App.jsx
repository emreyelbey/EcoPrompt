// Ana bileşen: hangi ekranın gösterileceğine karar verir.
// Durumlar: 'loading' (kayıtlı oturum kontrol ediliyor) → 'login' | 'student' | 'admin'.
// Kayıtlı oturuma körü körüne güvenilmez: öğrenci kodu /api/login ile, yönetici token'ı
// /api/admin/session ile sunucuda yeniden doğrulanır.
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import LoginScreen from './components/LoginScreen.jsx';
import Placeholder from './components/Placeholder.jsx';
import { apiRequest } from './lib/api.js';
import { saveStudent, saveAdmin, loadSession, clearSession } from './lib/session.js';

// Aşama adlarının Türkçe karşılıkları.
const PHASE_LABELS = { pretest: 'Ön Test', posttest: 'Son Test' };

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
    return (
      <Placeholder
        title="Eğitim Asistanı"
        lines={[`Hoş geldiniz, ${student.code}.`, `Aşama: ${PHASE_LABELS[student.phase]}`, 'Sohbet ekranı yakında burada olacak.']}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'admin' && admin) {
    return (
      <Placeholder
        title="Yönetici Paneli"
        lines={['Yönetici oturumu açık.', 'Panel sekmeleri sonraki adımlarda eklenecek.']}
        onLogout={handleLogout}
      />
    );
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
