'use client';

import { useState } from 'react';
import type { AccountStateAction, ChangeAccountStateRequest } from '@/types/staffAccountApi';
import { accountStateActionLabels, accountStateReasons, accountStateValidation, maxAccountStateJustificationLength, toChangeAccountState } from '@/services/admin/accountStateService';
import { SectionDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, destructiveButtonClass, Failure } from '../../(academico)/secciones/sectionUi';

const descriptions: Record<AccountStateAction, string> = {
  DEACTIVATE: 'La cuenta quedará deshabilitada: no podrá iniciar sesión y las sesiones abiertas dejarán de funcionar. Su historial se conserva. Se podrá habilitar de nuevo.',
  REACTIVATE: 'La cuenta volverá a estar habilitada y podrá iniciar sesión con su contraseña actual.',
};

// Shared by the Personal view and the teacher profile; both use the generic account endpoint (BACK #105).
export default function AccountStateDialog({ action, name, email, busy, error, onCancel, onConfirm }: {
  action: AccountStateAction; name: string; email: string; busy: boolean; error: string;
  onCancel: () => void; onConfirm: (request: ChangeAccountStateRequest) => void;
}) {
  const [reasonCode, setReasonCode] = useState('');
  const [justification, setJustification] = useState('');
  const [validation, setValidation] = useState('');
  const labels = accountStateActionLabels[action];
  return <SectionDialog title={labels.title} busy={busy} onClose={onCancel}>
    <form noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      const invalid = accountStateValidation(action, reasonCode, justification);
      if (invalid) { setValidation(invalid); return; }
      setValidation('');
      onConfirm(toChangeAccountState(action, reasonCode, justification));
    }}>
      <p className="text-sm font-bold break-words">{name}<span className="block text-xs font-medium text-muted">{email}</span></p>
      <p className={action === 'DEACTIVATE' ? 'text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3' : 'text-xs text-muted'}>{descriptions[action]} El cambio quedará registrado en auditoría.</p>
      <label className={labelClass}>Motivo<select aria-label="Motivo" required value={reasonCode} disabled={busy} onChange={event => setReasonCode(event.target.value)} className={inputClass}>
        <option value="">Selecciona un motivo</option>
        {Object.entries(accountStateReasons[action]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className={labelClass}>Justificación<textarea tabIndex={0} aria-label="Justificación" aria-describedby="account-state-justification-help" required maxLength={maxAccountStateJustificationLength} value={justification} disabled={busy} onChange={event => setJustification(event.target.value)} rows={4} className={inputClass} /></label>
      <p id="account-state-justification-help" className="text-xs text-muted">Obligatoria; máximo {maxAccountStateJustificationLength} caracteres ({justification.trim().length}/{maxAccountStateJustificationLength}).</p>
      {(validation || error) && <Failure message={validation || error} />}
      {busy && <p role="status">Cambiando el estado de la cuenta...</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className={action === 'DEACTIVATE' ? destructiveButtonClass : primaryButtonClass} disabled={busy}>{labels.confirm}</button>
      </div>
    </form>
  </SectionDialog>;
}
