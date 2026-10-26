'use client';

import { useRef, useState } from 'react';
import { AlertCircleIcon } from 'hugeicons-react';
import { Check } from 'lucide-react';
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
        {fields.map(field => {
          const val = values[field.key] || '';
          const isDni = field.key === 'dni';
          const isPhone = field.key === 'phone';

          return (
            <div key={field.key} className="flex flex-col">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {field.label} {field.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                required={field.required}
                maxLength={field.maxLength}
                value={val}
                onChange={event => setValues(previous => ({ ...previous, [field.key]: event.target.value }))}
                className="w-full min-w-0 mt-1 px-3 py-2 min-h-10 bg-neutral/50 text-xs font-medium text-ink normal-case tracking-normal border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              {isDni && (
                <div className="flex items-center justify-between text-[11px] mt-1 font-medium px-0.5">
                  <span className={val.trim().length === 8 ? 'text-emerald-700 font-bold' : 'text-muted'}>
                    {val.trim().length}/8 caracteres
                  </span>
                  {val.trim().length === 8 && (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      <Check size={12} className="stroke-[3]" /> Requisito cumplido
                    </span>
                  )}
                </div>
              )}
              {isPhone && (
                <div className="flex items-center justify-between text-[11px] mt-1 font-medium px-0.5">
                  <span className={val.trim().length === 9 ? 'text-emerald-700 font-bold' : 'text-muted'}>
                    {val.trim().length}/9 caracteres
                  </span>
                  {val.trim().length === 9 && (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      <Check size={12} className="stroke-[3]" /> Requisito cumplido
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </fieldset>
      <p className="text-xs text-muted">DNI: 8 caracteres alfanuméricos. Teléfono: 9 dígitos. Apellido materno y especialidad son opcionales.</p>
      {error && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-start gap-2 break-words"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <button type="button" disabled={saving} onClick={props.onCancel} className="px-4 py-2 min-h-10 rounded-xl bg-white border border-line text-ink text-xs font-bold hover:bg-neutral disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Cancelar</button>
        <button disabled={saving} className="px-4 py-2 min-h-10 rounded-xl bg-accent text-white text-xs font-bold shadow-sm hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{saving ? 'Guardando...' : 'Guardar docente'}</button>
      </div>
    </form>
  );
}
