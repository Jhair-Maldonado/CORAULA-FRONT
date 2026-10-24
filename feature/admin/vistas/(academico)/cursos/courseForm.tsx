'use client';

import { useRef, useState } from 'react';
import { AlertCircleIcon } from 'hugeicons-react';
import type { CourseFormValues } from '@/types/cursos';
import { courseErrorMessage } from '@/services/admin/coursesService';

const emptyForm: CourseFormValues = {
  nombre: '', codigo: '', nivel: 'Secundaria', area: '', horasTotalesSemana: 1, descripcion: '',
};
const inputClass = 'w-full min-w-0 min-h-10 mt-1.5 px-3 py-2 rounded-lg border border-line bg-neutral/50 text-xs font-medium normal-case tracking-normal text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-muted';

export default function CourseForm({ initialValues, onSave, onCancel }: {
  initialValues?: CourseFormValues;
  onSave: (values: CourseFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CourseFormValues>(initialValues ?? emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const change = <K extends keyof CourseFormValues>(field: K, value: CourseFormValues[K]) =>
    setValues(previous => ({ ...previous, [field]: value }));

  return <form className="flex flex-col gap-3" onSubmit={async event => {
    event.preventDefault();
    if (savingRef.current) return;
    if (!values.nombre.trim() || !values.codigo.trim() || !values.area.trim() ||
      !Number.isInteger(values.horasTotalesSemana) || values.horasTotalesSemana < 1 || values.horasTotalesSemana > 40) {
      setError('Completa nombre, código y área. Las horas deben ser un entero entre 1 y 40.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try { await onSave(values); }
    catch (failure) { setError(courseErrorMessage(failure)); }
    finally { savingRef.current = false; setSaving(false); }
  }}>
    <fieldset disabled={saving} className="grid grid-cols-1 sm:grid-cols-2 gap-3 disabled:opacity-70">
      <label className={`${labelClass} sm:col-span-2`}>Nombre<input className={inputClass} required maxLength={120} value={values.nombre} onChange={e => change('nombre', e.target.value)} /></label>
      <label className={labelClass}>Código<input className={inputClass} required maxLength={20} value={values.codigo} onChange={e => change('codigo', e.target.value)} /></label>
      <label className={labelClass}>Nivel<select className={inputClass} value={values.nivel} onChange={e => change('nivel', e.target.value as CourseFormValues['nivel'])}><option>Primaria</option><option>Secundaria</option></select></label>
      <label className={labelClass}>Área<input className={inputClass} required maxLength={80} value={values.area} onChange={e => change('area', e.target.value)} /></label>
      <label className={labelClass}>Horas semanales<input className={inputClass} type="number" required min={1} max={40} step={1} value={values.horasTotalesSemana} onChange={e => change('horasTotalesSemana', Number(e.target.value))} /></label>
      <label className={`${labelClass} sm:col-span-2`}>Descripción (opcional)<textarea className={inputClass} maxLength={1000} rows={3} value={values.descripcion ?? ''} onChange={e => change('descripcion', e.target.value)} /></label>
    </fieldset>
    {error && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2 break-words"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{error}</p>}
    <div className="flex justify-end gap-2 border-t border-line pt-3">
      <button type="button" disabled={saving} onClick={onCancel} className="min-h-10 px-4 py-2 rounded-xl bg-neutral border border-line text-xs font-bold disabled:opacity-50 hover:bg-neutral/80 focus-visible:outline-2 focus-visible:outline-accent">Cancelar</button>
      <button disabled={saving} className="min-h-10 px-4 py-2 rounded-xl bg-accent text-white shadow-sm text-xs font-bold disabled:opacity-50 hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{saving ? 'Guardando...' : 'Guardar curso'}</button>
    </div>
  </form>;
}
