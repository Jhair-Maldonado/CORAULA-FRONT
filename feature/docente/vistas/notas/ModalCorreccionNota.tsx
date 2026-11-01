'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { gradeCorrectionError } from '@/services/teacher/teacherGradesService';
import {
  CORRECTION_JUSTIFICATION_MAX_LENGTH, CORRECTION_JUSTIFICATION_MIN_LENGTH, GRADE_CORRECTION_REASONS, gradeCorrectionReasonLabels,
  type GradeCorrectionReason, type TeacherCorrectCriterionGradeRequest,
} from '@/types/teacherGradesApi';

export interface CorrectionTarget { gradeId: number; studentName: string; criterionName: string; currentGrade: number }
export type CorrectionOutcome = { ok: true } | { ok: false; error: string; reloaded: boolean };

const field = 'w-full px-3 py-2 text-sm text-ink bg-white border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50';
const button = 'min-h-10 px-3 py-2 rounded-lg text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed';

// BACKEND #39: edit of an existing MANUAL grade. expectedGrade is the grade read from the sheet.
export default function ModalCorreccionNota({ target, busy, onClose, onSubmit }: {
  target: CorrectionTarget; busy: boolean; onClose: () => void;
  onSubmit: (gradeId: number, request: TeacherCorrectCriterionGradeRequest) => Promise<CorrectionOutcome>;
}) {
  const [grade, setGrade] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);
  const length = justification.trim().length;

  async function submit() {
    if (busy) return;
    const request = { grade: grade.trim() === '' ? NaN : Number(grade), reasonCode: reasonCode as GradeCorrectionReason, justification, expectedGrade: target.currentGrade };
    const invalid = grade.trim() === '' ? 'Ingresa la nueva nota.' : /^\d+(?:\.\d{1,2})?$/.test(grade.trim()) ? gradeCorrectionError(request) : 'Usa un número con máximo dos decimales.';
    if (invalid) { setError(invalid); return; }
    setError(null);
    const outcome = await onSubmit(target.gradeId, request);
    if (outcome.ok || outcome.reloaded) onClose();
    else setError(outcome.error);
  }

  return (
    <Modal isOpen onClose={() => { if (!busy) onClose(); }} title="Corregir nota" maxWidth="lg">
      <form aria-label="Corrección de nota" noValidate className="flex flex-col gap-4 text-sm" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <p><strong>{target.studentName}</strong> · {target.criterionName}</p>
        <p className="text-muted">Nota actual: <strong className="text-ink">{target.currentGrade}</strong></p>
        <label className="flex flex-col gap-1 font-bold text-ink">Nueva nota
          <input aria-label="Nueva nota" inputMode="decimal" value={grade} disabled={busy} onChange={e => setGrade(e.target.value)} className={field} placeholder="0 a 20, máximo dos decimales" />
        </label>
        <label className="flex flex-col gap-1 font-bold text-ink">Motivo
          <select aria-label="Motivo de la corrección" value={reasonCode} disabled={busy} onChange={e => setReasonCode(e.target.value)} className={field}>
            <option value="">Selecciona un motivo</option>
            {GRADE_CORRECTION_REASONS.map(code => <option key={code} value={code}>{gradeCorrectionReasonLabels[code]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-bold text-ink">Justificación
          <textarea aria-label="Justificación" aria-describedby="correccion-contador" rows={4} maxLength={CORRECTION_JUSTIFICATION_MAX_LENGTH} value={justification} disabled={busy}
            onChange={e => setJustification(e.target.value)} className={field} />
          <span id="correccion-contador" className="text-xs font-normal text-muted">{length}/{CORRECTION_JUSTIFICATION_MAX_LENGTH} · mínimo {CORRECTION_JUSTIFICATION_MIN_LENGTH} caracteres</span>
        </label>
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className={`${button} bg-white border border-line hover:bg-neutral`}>Cancelar</button>
          <button type="submit" disabled={busy} className={`${button} bg-accent text-white hover:bg-accent/90`}>{busy ? 'Guardando...' : 'Guardar corrección'}</button>
        </div>
      </form>
    </Modal>
  );
}
