// Test aşamaları (Ön Test / Son Test) ile ilgili ortak sabitler ve saf karar fonksiyonları.
// Hem tarayıcı hem sunucu (/api) bu dosyayı kullanır.
// KURAL: Aşamanın doğru kaynağı her zaman sunucudur. Tarayıcıdaki canlı dinleyici yalnızca
// hız kazandırır; /api/messages ve /api/chat yanıtlarındaki aşama farklıysa sunucunun dediği geçerlidir.

export const PHASES = ['pretest', 'posttest'];
export const DEFAULT_PHASE = 'pretest';

// Geçerli bir aşama mı?
export function isValidPhase(value) {
  return PHASES.includes(value);
}

// Beklenmeyen veya eksik değeri güvenli varsayılana ('pretest') çevirir.
export function normalizePhase(value) {
  return isValidPhase(value) ? value : DEFAULT_PHASE;
}

// Öğrencinin hangi arayüzü görmesi gerektiğini söyler.
// Yalnızca Deney grubu Son Test'te EkoToken arayüzünü görür; diğer herkes sade ekranı.
export function getStudentView(group, phase) {
  return group === 'Deney' && phase === 'posttest' ? 'ekotoken' : 'sade';
}

// Öğrenci nesnesine yeni bildirilen aşamayı uygular (dinleyiciden veya /api/messages yanıtından).
// Aşama geçersizse veya değişmemişse AYNI nesne döner (React gereksiz yeniden çizim yapmaz).
export function applyPhaseReport(student, reportedPhase) {
  if (!student || !isValidPhase(reportedPhase) || student.phase === reportedPhase) return student;
  return { ...student, phase: reportedPhase };
}

// /api/chat yanıtı geldiğinde ne yapılacağını söyler.
// - Yanıttaki aşama ekrandakiyle aynıysa: mesaj listeye eklenir ('append').
// - Farklıysa: mesaj eklenmez, geçmiş /api/messages ile yeniden yüklenir ('refresh').
//   Neden doğrudan aşamayı değiştirmiyoruz? /api/chat aşamayı isteğin BAŞINDA okur; istek sürerken
//   yönetici aşamayı değiştirdiyse bu değer eskimiş olabilir. /api/messages ise aşamayı o an okur.
export function chatResponseAction(currentPhase, responsePhase) {
  return responsePhase === currentPhase ? 'append' : 'refresh';
}
