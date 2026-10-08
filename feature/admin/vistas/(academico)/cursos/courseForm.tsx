'use client';

import { useRef, useState } from 'react';
import type { CourseFormValues } from '@/types/cursos';
import { courseErrorMessage } from '@/services/admin/coursesService';

const emptyForm: CourseFormValues = {
  nombre: '', codigo: '', nivel: 'Secundaria', area: '', horasTotalesSemana: 1, descripcion: '',
};
const inputClass = 'w-full px-3 py-2 rounded-lg border border-line text-xs text-ink outline-none focus:border-accent';

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
    <fieldset disabled={saving} className="flex flex-col gap-3 disabled:opacity-70">
      <label className="text-xs font-bold">Nombre<input className={inputClass} required maxLength={120} value={values.nombre} onChange={e => change('nombre', e.target.value)} /></label>
      <label className="text-xs font-bold">Código<input className={inputClass} required maxLength={20} value={values.codigo} onChange={e => change('codigo', e.target.value)} /></label>
      <label className="text-xs font-bold">Nivel<select className={inputClass} value={values.nivel} onChange={e => change('nivel', e.target.value as CourseFormValues['nivel'])}><option>Primaria</option><option>Secundaria</option></select></label>
      <label className="text-xs font-bold">Área<input className={inputClass} required maxLength={80} value={values.area} onChange={e => change('area', e.target.value)} /></label>
      <label className="text-xs font-bold">Horas semanales<input className={inputClass} type="number" required min={1} max={40} step={1} value={values.horasTotalesSemana} onChange={e => change('horasTotalesSemana', Number(e.target.value))} /></label>
      <label className="text-xs font-bold">Descripción (opcional)<textarea className={inputClass} maxLength={1000} rows={3} value={values.descripcion ?? ''} onChange={e => change('descripcion', e.target.value)} /></label>
    </fieldset>
    {error && <p role="alert" className="text-xs text-rose-700 bg-rose-50 p-3 rounded-lg">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-line pt-3">
      <button type="button" disabled={saving} onClick={onCancel} className="px-4 py-2 rounded-xl bg-neutral text-xs font-bold disabled:opacity-50">Cancelar</button>
      <button disabled={saving} className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar curso'}</button>
    </div>
  </form>;
}
