'use client';

import { useState } from 'react';
import { academicPeriodReasonError, formatPeriodDate, maxAcademicPeriodReasonLength } from '@/services/admin/academicPeriodsService';
import type { AcademicPeriod, AcademicPeriodActivationAction } from '@/types/academicPeriodApi';
import { SectionDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, destructiveButtonClass, Failure } from '../secciones/sectionUi';

export const academicPeriodActivationLabels: Record<AcademicPeriodActivationAction, { button: string; title: string; confirm: string; busy: string }> = {
  deactivate: { button: 'Desactivar', title: 'Desactivar periodo académico', confirm: 'Confirmar desactivación', busy: 'Desactivando el periodo...' },
  reactivate: { button: 'Reactivar', title: 'Reactivar periodo académico', confirm: 'Confirmar reactivación', busy: 'Reactivando el periodo...' },
};

const descriptions: Record<AcademicPeriodActivationAction, string> = {
  deactivate: 'El periodo quedará inactivo: no se podrán registrar matrículas, crear ni reactivar secciones o cursos de sección, ni abrir bimestres en él. No se modifica ni se borra nada; las notas, los resultados y el historial se conservan. Solo es posible si no tiene matrículas activas, secciones activas, cursos de sección activos ni bimestres Abiertos o En revisión. Se podrá reactivar.',
  reactivate: 'El periodo volverá a estar activo. No se podrá reactivar si sus fechas se solapan con otro periodo activo.',
};

export default function AcademicPeriodActivationDialog({ action, period, busy, error, onCancel, onConfirm }: {
  action: AcademicPeriodActivationAction; period: AcademicPeriod; busy: boolean; error: string;
  onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState('');
  const labels = academicPeriodActivationLabels[action];
  return <SectionDialog title={labels.title} busy={busy} onClose={onCancel}>
    <form aria-label="Cambio de estado del periodo" noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      const invalid = academicPeriodReasonError(reason);
      if (invalid) { setValidation(invalid); return; }
      setValidation('');
      onConfirm(reason.trim());
    }}>
      <p className="text-sm"><strong className="break-words">{period.name}</strong> ({formatPeriodDate(period.startDate)} – {formatPeriodDate(period.endDate)})</p>
      <p className={action === 'deactivate' ? 'text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3' : 'text-xs text-muted'}>{descriptions[action]} El motivo quedará registrado en auditoría.</p>
      <label className={labelClass}>Motivo<textarea tabIndex={0} aria-label="Motivo" aria-describedby="period-reason-help" required rows={3} maxLength={maxAcademicPeriodReasonLength} value={reason} disabled={busy}
        className={`${inputClass} normal-case tracking-normal`} onChange={event => { setReason(event.target.value); setValidation(''); }} /></label>
      <p id="period-reason-help" className="text-xs text-muted">Obligatorio; máximo {maxAcademicPeriodReasonLength} caracteres ({reason.trim().length}/{maxAcademicPeriodReasonLength}).</p>
      {(validation || error) && <Failure message={validation || error} />}
      {busy && <p role="status" className="text-xs text-muted">{labels.busy}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onCancel}>Cancelar</button>
        <button type="submit" className={action === 'deactivate' ? destructiveButtonClass : primaryButtonClass} disabled={busy}>{labels.confirm}</button>
      </div>
    </form>
  </SectionDialog>;
}
