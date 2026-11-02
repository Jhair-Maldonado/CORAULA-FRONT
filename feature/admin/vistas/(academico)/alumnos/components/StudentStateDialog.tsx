'use client';

import { useState } from 'react';
import type { ChangeStudentStateRequest, StudentStateAction } from '@/types/studentApi';
import { maxStudentStateJustificationLength, studentStateActionLabels, studentStateReasons, studentStateValidation, toChangeStudentState } from '@/services/admin/studentStateService';
import { SectionDialog, buttonClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, destructiveButtonClass, Failure } from '../../secciones/sectionUi';

const dangerButtonClass = `${buttonClass} bg-rose-700 text-white border-rose-700 hover:bg-rose-800`;
const confirmClasses: Record<StudentStateAction, string> = { SUSPEND: destructiveButtonClass, REACTIVATE: primaryButtonClass, DEACTIVATE: dangerButtonClass };
const descriptions: Record<StudentStateAction, string> = {
  SUSPEND: 'El alumno quedará suspendido y su cuenta se deshabilitará. Conserva su matrícula y su cupo. Se podrá reactivar.',
  REACTIVATE: 'El alumno volverá a estar activo. Su cuenta recupera la habilitación que tenía antes de la suspensión.',
  DEACTIVATE: 'La baja es permanente: no se podrá reactivar al alumno. Se deshabilitará su cuenta y se conservará su historial. Requiere que no tenga matrículas activas.',
};

export default function StudentStateDialog({ action, name, busy, error, onCancel, onConfirm }: {
  action: StudentStateAction; name: string; busy: boolean; error: string;
  onCancel: () => void; onConfirm: (request: ChangeStudentStateRequest) => void;
}) {
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');
  const [permanent, setPermanent] = useState(false);
  const [validation, setValidation] = useState('');
  const labels = studentStateActionLabels[action];
  return <SectionDialog title={labels.title} busy={busy} onClose={onCancel}>
    <form noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      const invalid = studentStateValidation(action, reasonCode, justification, permanent);
      if (invalid) { setValidation(invalid); return; }
      setValidation('');
      onConfirm(toChangeStudentState(action, reasonCode, justification));
    }}>
      <p className="text-sm font-bold break-words">{name}</p>
      <p className={action === 'DEACTIVATE' ? 'text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3' : 'text-xs text-muted'}>{descriptions[action]} El cambio quedará registrado en auditoría.</p>
      <label className={labelClass}>Motivo<select aria-label="Motivo" required value={reasonCode} disabled={busy} onChange={event => setReasonCode(event.target.value)} className={inputClass}>
        <option value="">Selecciona un motivo</option>
        {Object.entries(studentStateReasons[action]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className={labelClass}>Justificación<textarea tabIndex={0} aria-label="Justificación" aria-describedby="state-justification-help" required maxLength={maxStudentStateJustificationLength} value={justification} disabled={busy} onChange={event => setJustification(event.target.value)} rows={4} className={inputClass} /></label>
      <p id="state-justification-help" className="text-xs text-muted">Obligatoria; máximo {maxStudentStateJustificationLength} caracteres ({justification.trim().length}/{maxStudentStateJustificationLength}).</p>
      {action === 'DEACTIVATE' && <label className="text-xs font-bold text-rose-800 flex gap-2 items-center"><input aria-label="Entiendo que la baja es permanente" type="checkbox" checked={permanent} disabled={busy} onChange={event => setPermanent(event.target.checked)} />Entiendo que la baja es permanente.</label>}
      {(validation || error) && <Failure message={validation || error} />}
      {busy && <p role="status">Cambiando el estado del alumno...</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className={confirmClasses[action]} disabled={busy}>{labels.confirm}</button>
      </div>
    </form>
  </SectionDialog>;
}
