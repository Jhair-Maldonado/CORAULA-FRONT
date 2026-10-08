'use client';

import { useRef, useState } from 'react';
import type { AdminTeacher, TeacherFormValues } from '@/types/adminTeacher';
import type { CreateTeacherRequest, UpdateTeacherRequest } from '@/types/teacherApi';
import { teacherFormValidation, toCreateTeacher, toTeacherForm, toUpdateTeacher } from '@/adapters/teacherAdapter';
import { teacherErrorMessage } from '@/services/admin/teachersService';

const emptyForm: TeacherFormValues = { dni: '', firstNames: '', paternalLastName: '', maternalLastName: '', phone: '', specialty: '' };
const fields: { key: keyof TeacherFormValues; label: string; maxLength: number; required?: boolean }[] = [
  { key: 'dni', label: 'DNI', maxLength: 12, required: true },
  { key: 'firstNames', label: 'Nombres', maxLength: 120, required: true },
  { key: 'paternalLastName', label: 'Apellido paterno', maxLength: 120, required: true },
  { key: 'maternalLastName', label: 'Apellido materno', maxLength: 120 },
  { key: 'phone', label: 'Teléfono', maxLength: 30 },
  { key: 'specialty', label: 'Especialidad', maxLength: 100 },
];

type FormProps = { onCancel: () => void } & (
  { teacher?: undefined; onSave: (payload: CreateTeacherRequest) => Promise<void> } |
  { teacher: AdminTeacher; onSave: (payload: UpdateTeacherRequest) => Promise<void> }
);

export default function TeacherForm(props: FormProps) {
  const [values, setValues] = useState(() => props.teacher ? toTeacherForm(props.teacher) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);

  return (
    <form className="flex flex-col gap-4" onSubmit={async event => {
      event.preventDefault();
      if (savingRef.current) return;
      const validation = teacherFormValidation(values);
      if (validation) { setError(validation); return; }
      savingRef.current = true;
      setSaving(true);
      setError('');
      try {
        if (props.teacher) {
          const patch = toUpdateTeacher(values, props.teacher);
          if (Object.keys(patch).length === 0) { props.onCancel(); return; }
          await props.onSave(patch);
        } else {
          await props.onSave(toCreateTeacher(values));
        }
      } catch (failure) { setError(teacherErrorMessage(failure)); }
      finally { savingRef.current = false; setSaving(false); }
    }}>
      <fieldset disabled={saving} className="grid grid-cols-1 sm:grid-cols-2 gap-3 disabled:opacity-70">
        {fields.map(field => <label key={field.key} className="text-xs font-bold text-ink">
          {field.label}
          <input required={field.required} maxLength={field.maxLength} value={values[field.key]}
            onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))}
            className="w-full mt-1 px-3 py-2 border border-line rounded-lg outline-none focus:border-accent" />
        </label>)}
      </fieldset>
      <p className="text-xs text-muted">DNI: entre 8 y 12 caracteres alfanuméricos. Apellido materno, teléfono y especialidad son opcionales.</p>
      {error && <p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <button type="button" disabled={saving} onClick={props.onCancel} className="px-4 py-2 rounded-xl bg-neutral text-xs font-bold disabled:opacity-50">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar docente'}</button>
      </div>
    </form>
  );
}
