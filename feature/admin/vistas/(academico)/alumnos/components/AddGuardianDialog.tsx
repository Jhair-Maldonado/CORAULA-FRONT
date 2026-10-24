'use client';

import { useState } from 'react';
import type { GuardianCreateValues } from '@/types/adminStudent';
import type { CreateStudentGuardianRequest, GuardianRelationship, GuardianSummaryResponse } from '@/types/studentApi';
import { emptyGuardianCreateValues, guardianCreateValidation, guardianRelationshipLabels, hasActivePrimaryGuardian, toCreateGuardian } from '@/adapters/studentAdapter';
import { Failure, SectionDialog, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../../secciones/sectionUi';

const fields: { key: 'dni' | 'firstNames' | 'paternalLastName' | 'maternalLastName' | 'phone'; label: string; maxLength: number; required?: boolean; inputMode?: 'numeric' }[] = [
  { key: 'dni', label: 'DNI', maxLength: 8, required: true, inputMode: 'numeric' },
  { key: 'firstNames', label: 'Nombres', maxLength: 120, required: true },
  { key: 'paternalLastName', label: 'Apellido paterno', maxLength: 120, required: true },
  { key: 'maternalLastName', label: 'Apellido materno', maxLength: 120 },
  { key: 'phone', label: 'Teléfono', maxLength: 30 },
];

// The profile owns the POST (single submission, lifetime and cross-locks); this dialog only validates and serializes.
export default function AddGuardianDialog({ name, guardians, busy, error, onCancel, onConfirm }: {
  name: string; guardians: GuardianSummaryResponse[]; busy: boolean; error: string;
  onCancel: () => void; onConfirm: (request: CreateStudentGuardianRequest) => void;
}) {
  const [values, setValues] = useState<GuardianCreateValues>(emptyGuardianCreateValues);
  const [validation, setValidation] = useState('');
  const primaryTaken = hasActivePrimaryGuardian(guardians);
  const set = (patch: Partial<GuardianCreateValues>) => setValues(previous => ({ ...previous, ...patch }));

  return <SectionDialog title="Agregar apoderado" busy={busy} onClose={onCancel}>
    <form noValidate className="flex flex-col gap-4" onSubmit={event => {
      event.preventDefault();
      if (busy) return;
      const invalid = guardianCreateValidation(values, guardians);
      if (invalid) { setValidation(invalid); return; }
      setValidation('');
      onConfirm(toCreateGuardian(values));
    }}>
      <p className="text-xs text-muted">Se registrará una persona nueva como apoderado de {name}, sin cuenta de acceso.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map(field => <label key={field.key} className={labelClass}>{field.label}{field.required ? ' *' : ''}
          <input aria-label={field.label} type="text" inputMode={field.inputMode} maxLength={field.maxLength} required={field.required}
            value={values[field.key]} disabled={busy} onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))} className={inputClass} />
        </label>)}
        <label className={labelClass}>Relación *<select aria-label="Relación" required value={values.relationship} disabled={busy}
          onChange={event => set({ relationship: event.target.value as GuardianRelationship | '' })} className={inputClass}>
          <option value="">Selecciona la relación</option>
          {(Object.keys(guardianRelationshipLabels) as GuardianRelationship[]).map(option => <option key={option} value={option}>{guardianRelationshipLabels[option]}</option>)}
        </select></label>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs flex gap-2 items-center"><input aria-label="Apoderado principal" aria-describedby="guardian-primary-help" type="checkbox"
          checked={values.primary} disabled={busy || primaryTaken} onChange={event => set({ primary: event.target.checked })} />Apoderado principal</label>
        <p id="guardian-primary-help" className="text-xs text-muted">{primaryTaken && 'El alumno ya tiene un apoderado principal activo. '}Marcarlo no crea una cuenta de acceso.</p>
        <label className="text-xs flex gap-2 items-center"><input aria-label="Autorizado a recoger al alumno" type="checkbox"
          checked={values.authorizedPickup} disabled={busy} onChange={event => set({ authorizedPickup: event.target.checked })} />Autorizado a recoger al alumno</label>
      </div>
      {(validation || error) && <Failure message={validation || error} />}
      {busy && <p role="status" className="text-xs text-muted">Agregando apoderado...</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} disabled={busy} onClick={onCancel}>Cancelar</button>
        <button className={primaryButtonClass} disabled={busy}>Guardar apoderado</button>
      </div>
    </form>
  </SectionDialog>;
}
