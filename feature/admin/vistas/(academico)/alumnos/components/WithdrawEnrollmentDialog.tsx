'use client';

import { useState } from 'react';
import type { WithdrawEnrollmentRequest } from '@/types/enrollmentApi';
import { formatWithdrawalReason, localToday, withdrawalReasons, withdrawalValidation } from '@/services/admin/enrollmentsService';
import { SectionDialog, inputClass, labelClass, secondaryButtonClass, destructiveButtonClass, Failure } from '../../secciones/sectionUi';

export default function WithdrawEnrollmentDialog({ name, enrollmentId, enrollmentDate, busy, error, onCancel, onConfirm }: {
  name: string; enrollmentId: number; enrollmentDate: string | null; busy: boolean; error: string;
  onCancel: () => void; onConfirm: (request: WithdrawEnrollmentRequest) => void;
}) {
  const [date, setDate] = useState(localToday);
  const [reason, setReason] = useState('');
  const [justification, setJustification] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState('');
  return <SectionDialog title="Retirar matrícula" busy={busy} onClose={onCancel}>
    <form noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      const invalid = withdrawalValidation(date, enrollmentDate, reason, justification);
      if (invalid || !confirmed) { setValidation(invalid || 'Confirma que deseas retirar esta matrícula.'); return; }
      setValidation('');
      onConfirm({ withdrawalDate: date, withdrawalReason: formatWithdrawalReason(reason, justification) });
    }}>
      <p className="text-sm font-bold">{name} · Matrícula #{enrollmentId}</p>
      <p className="text-xs text-muted">Se retirará la matrícula. Se conservarán el alumno y su historial. El retiro quedará registrado en auditoría.</p>
      <label className={labelClass}>Fecha de retiro<input aria-label="Fecha de retiro" type="date" required min={enrollmentDate ?? undefined} max={localToday()} value={date} disabled={busy} onChange={event => setDate(event.target.value)} className={inputClass} /></label>
      <label className={labelClass}>Motivo del retiro<select aria-label="Motivo del retiro" required value={reason} disabled={busy} onChange={event => setReason(event.target.value)} className={inputClass}>
        <option value="">Selecciona un motivo</option>{withdrawalReasons.map(option => <option key={option} value={option}>{option}</option>)}
      </select></label>
      <label className={labelClass}>Justificación<textarea tabIndex={0} aria-label="Justificación" aria-describedby="withdraw-justification-help" required maxLength={300} value={justification} disabled={busy} onChange={event => setJustification(event.target.value)} className={inputClass} /></label>
      <p id="withdraw-justification-help" className="text-xs text-muted">Mínimo 10 caracteres sin contar espacios; máximo 300. {reason === 'Otro' && 'Explica el motivo del retiro.'}</p>
      <label className="text-xs flex gap-2 items-center"><input aria-label="Confirmar retiro" type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Confirmo que deseo retirar esta matrícula.</label>
      {(validation || error) && <Failure message={validation || error} />}
      {busy && <p role="status">Retirando matrícula y verificando el perfil...</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className={destructiveButtonClass} disabled={busy}>Confirmar retiro de matrícula</button>
      </div>
    </form>
  </SectionDialog>;
}
