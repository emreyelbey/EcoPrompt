// src/lib/phases.js saf fonksiyon testleri: aşama doğrulama, görünüm seçimi, aşama bildirimi uygulama.
import { describe, it, expect } from 'vitest';
import {
  normalizePhase,
  isValidPhase,
  getStudentView,
  applyPhaseReport,
  chatResponseAction,
} from '../src/lib/phases.js';

describe('normalizePhase', () => {
  it('geçerli aşamalar olduğu gibi döner', () => {
    expect(normalizePhase('pretest')).toBe('pretest');
    expect(normalizePhase('posttest')).toBe('posttest');
  });

  it('eksik veya beklenmeyen değer pretest olur', () => {
    expect(normalizePhase(undefined)).toBe('pretest');
    expect(normalizePhase('Son Test')).toBe('pretest');
    expect(normalizePhase(null)).toBe('pretest');
    expect(isValidPhase('POSTTEST')).toBe(false);
  });
});

describe('getStudentView', () => {
  it.each([
    ['Kontrol', 'pretest', 'sade'],
    ['Kontrol', 'posttest', 'sade'],
    ['Deney', 'pretest', 'sade'],
    ['Deney', 'posttest', 'ekotoken'],
  ])('%s + %s → %s', (group, phase, view) => {
    expect(getStudentView(group, phase)).toBe(view);
  });
});

describe('applyPhaseReport', () => {
  const student = { code: 'D001', group: 'Deney', phase: 'pretest' };

  it('farklı geçerli aşama uygulanır, kod ve grup korunur', () => {
    expect(applyPhaseReport(student, 'posttest')).toEqual({ code: 'D001', group: 'Deney', phase: 'posttest' });
  });

  it('aynı veya geçersiz aşamada aynı nesne döner', () => {
    expect(applyPhaseReport(student, 'pretest')).toBe(student);
    expect(applyPhaseReport(student, undefined)).toBe(student);
    expect(applyPhaseReport(student, 'bozuk')).toBe(student);
  });

  it('öğrenci yoksa (çıkış yapılmış) null kalır', () => {
    expect(applyPhaseReport(null, 'posttest')).toBe(null);
  });
});

describe('chatResponseAction', () => {
  it('aynı aşamada mesaj eklenir, farklıysa geçmiş yeniden yüklenir', () => {
    expect(chatResponseAction('pretest', 'pretest')).toBe('append');
    expect(chatResponseAction('pretest', 'posttest')).toBe('refresh');
    expect(chatResponseAction('posttest', 'pretest')).toBe('refresh');
  });
});
