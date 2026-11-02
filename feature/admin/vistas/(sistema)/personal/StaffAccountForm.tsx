'use client';

import { useRef, useState } from 'react';
import { emptyStaffForm, isUncertainStaffCreate, staffAccountsService, staffCreateErrorMessage, staffFormValidation, toCreateStaffAccount, type StaffFormValues } from '@/services/admin/staffAccountsService';
import { maxAccountEmailLength } from '@/services/admin/teachersService';
import type { CreateStaffAccountResponse } from '@/types/staffAccountApi';
import { SectionDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass, Failure } from '../../(academico)/secciones/sectionUi';

const fields: { key: keyof StaffFormValues; label: string; maxLength: number; optional?: boolean; inputMode?: 'numeric' | 'email' | 'tel' }[] = [
  { key: 'dni', label: 'DNI', maxLength: 8, inputMode: 'numeric' },
  { key: 'firstNames', label: 'Nombres', maxLength: 120 },
  { key: 'paternalLastName', label: 'Apellido paterno', maxLength: 120 },
  { key: 'maternalLastName', label: 'Apellido materno', maxLength: 120, optional: true },
  { key: 'phone', label: 'Teléfono', maxLength: 30, optional: true, inputMode: 'tel' },
  { key: 'email', label: 'Correo de la cuenta', maxLength: maxAccountEmailLength, inputMode: 'email' },
];

// Uncertain outcomes (no response or 5xx) close the form so the list is read again instead of re-sending.
export default function StaffAccountForm({ onCancel, onCreated, onUncertain }: {
  onCancel: () => void; onCreated: (created: CreateStaffAccountResponse) => void; onUncertain: (message: string) => void;
}) {
  const [values, setValues] = useState<StaffFormValues>(emptyStaffForm);
  const [validation, setValidation] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const request = toCreateStaffAccount(values);

  async function confirm() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      onCreated(await staffAccountsService.create(request));
    } catch (failure) {
      if (isUncertainStaffCreate(failure)) { onUncertain(staffCreateErrorMessage(failure)); return; }
      setError(staffCreateErrorMessage(failure));
      setConfirming(false);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return <SectionDialog title="Registrar personal de Secretaría" busy={busy} onClose={onCancel}>
    {error && <div className="mb-4"><Failure message={error} /></div>}
    {confirming ? <div className="flex flex-col gap-4">
      <p className="text-sm break-words">Se registrará a <strong>{[request.firstNames, request.paternalLastName, request.maternalLastName].filter(Boolean).join(' ')}</strong> (DNI {request.dni}) con la cuenta <strong>{request.email}</strong> y rol Secretaría. ¿Confirmar?</p>
      <p className="text-xs text-muted">La contraseña inicial será su DNI y deberá cambiarla en el primer acceso.</p>
      {busy && <p role="status" className="text-xs text-muted">Registrando cuenta...</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={secondaryButtonClass}>Volver</button>
        <button type="button" disabled={busy} onClick={confirm} className={primaryButtonClass}>{busy ? 'Registrando...' : 'Confirmar alta'}</button>
      </div>
    </div> : <form noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      const problem = staffFormValidation(values);
      setValidation(problem ?? '');
      setError('');
      if (!problem) setConfirming(true);
    }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(field => <label key={field.key} className={labelClass}>{field.label}{field.optional ? ' (opcional)' : ''}
          <input aria-label={field.label} autoComplete="off" inputMode={field.inputMode} maxLength={field.maxLength} value={values[field.key]}
            onChange={event => { const value = event.target.value; setValues(previous => ({ ...previous, [field.key]: value })); setValidation(''); }}
            className={inputClass} />
        </label>)}
      </div>
      {validation && <Failure message={validation} />}
      <p className="text-xs text-muted">La contraseña inicial será el DNI; se pedirá cambiarla en el primer acceso.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>Cancelar</button>
        <button type="submit" className={primaryButtonClass}>Continuar</button>
      </div>
    </form>}
  </SectionDialog>;
}
