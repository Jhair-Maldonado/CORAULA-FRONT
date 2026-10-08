'use client';

import { useRef, useState } from 'react';
import type { AdminStudentDetail, StudentEditValues } from '@/types/adminStudent';
import type { UpdateStudentRequest } from '@/types/studentApi';
import { studentEditValidation, toStudentEditValues, toUpdateStudent } from '@/adapters/studentAdapter';
import { studentErrorMessage } from '@/services/admin/studentsService';

const fields: { key: Exclude<keyof StudentEditValues, 'reason'>; label: string; maxLength?: number; required?: boolean; type?: string }[] = [
  { key: 'studentCode', label: 'Código estudiante', maxLength: 50 },
  { key: 'dni', label: 'DNI', maxLength: 20 },
  { key: 'firstNames', label: 'Nombres', maxLength: 120, required: true },
  { key: 'paternalLastName', label: 'Apellido paterno', maxLength: 120, required: true },
  { key: 'maternalLastName', label: 'Apellido materno', maxLength: 120 },
  { key: 'birthDate', label: 'Fecha de nacimiento', type: 'date' },
  { key: 'phone', label: 'Teléfono', maxLength: 30 },
];

export default function StudentEditForm({ student, onSave, onCancel }: {
  student: AdminStudentDetail;
  onSave: (patch: UpdateStudentRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(() => toStudentEditValues(student));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  return (
    <form className="flex flex-col gap-4" onSubmit={async event => {
      event.preventDefault();
      if (savingRef.current) return;
      const validation = studentEditValidation(values, student);
      if (validation) { setError(validation); return; }
      const patch = toUpdateStudent(values, student);
      if (Object.keys(patch).length === 0) { onCancel(); return; }
      savingRef.current = true;
      setSaving(true);
      setError('');
      try { await onSave(patch); }
      catch (failure) { setError(studentErrorMessage(failure)); }
      finally { savingRef.current = false; setSaving(false); }
    }}>
      <fieldset disabled={saving} className="grid grid-cols-1 sm:grid-cols-2 gap-3 disabled:opacity-70">
        {fields.map(field => (
          <label key={field.key} className="text-xs font-bold text-ink">
            {field.label}
            <input
              type={field.type ?? 'text'}
              required={field.required}
              maxLength={field.maxLength}
              value={values[field.key]}
              onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-line rounded-lg outline-none focus:border-accent"
            />
          </label>
        ))}
        <label className="sm:col-span-2 text-xs font-bold text-ink">Motivo de actualización (opcional)
          <textarea rows={2} value={values.reason} onChange={event => setValues(previous => ({ ...previous, reason: event.target.value }))} className="w-full mt-1 px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" />
        </label>
      </fieldset>
      <p className="text-xs text-muted">Puedes limpiar DNI, apellido materno o teléfono. Un código o fecha de nacimiento existentes no se pueden borrar.</p>
      {error && <p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <button type="button" disabled={saving} onClick={onCancel} className="px-4 py-2 rounded-xl bg-neutral text-xs font-bold disabled:opacity-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
      </div>
    </form>
  );
}
