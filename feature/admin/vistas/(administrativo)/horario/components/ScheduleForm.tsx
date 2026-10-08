'use client';

import { useId, useRef, useState } from 'react';
import { UserIcon } from 'hugeicons-react';
import type { ScheduleResponse } from '@/types/scheduleApi';
import type { SectionCourseResponse } from '@/types/sectionCourseApi';
import { schedulesService, scheduleError, type ScheduleError } from '@/services/admin/schedulesService';
import ScheduleConflictError from './ScheduleConflictError';
import ScheduleDialog from './ScheduleDialog';
import { SCHOOL_DAYS, buttonClass, inputClass, createPayload, updatePayload, validateSchedule, type ScheduleValues } from './scheduleUi';

type Props = { courses: SectionCourseResponse[]; onClose: () => void; onSaved: () => void } &
  ({ mode: 'CREATE'; block?: never } | { mode: 'EDIT'; block: ScheduleResponse });

export default function ScheduleForm(props: Props) {
  const { block, courses, onClose, onSaved } = props;
  const creating = props.mode === 'CREATE';
  const prefix = useId();
  const [values, setValues] = useState<ScheduleValues>({ sectionCourseId: block?.sectionCourseId ?? null, day: block?.day ?? 'LUNES', startTime: block?.startTime ?? '', endTime: block?.endTime ?? '', classroom: block?.classroom ?? '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ScheduleError>();
  const submitting = useRef(false);
  const activeCourses = courses.filter(course => course.active);
  const selected = activeCourses.find(course => course.id === values.sectionCourseId);
  const teacher = creating ? selected?.teacherName : block?.teacherName;
  function close() { if (!submitting.current) onClose(); }
  async function submit() {
    if (submitting.current) return;
    const validation = validateSchedule(values, creating) ?? (creating && !selected ? 'Selecciona un curso activo de esta sección.' : undefined);
    if (validation) { setError({ message: validation, details: [] }); return; }
    const patch = block ? updatePayload(block, values) : undefined;
    if (patch && Object.keys(patch).length === 0) { onClose(); return; }
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      if (creating) await schedulesService.create(createPayload(values));
      else await schedulesService.update(block!.id, patch!);
      onSaved();
    } catch (failure) { setError(scheduleError(failure)); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <ScheduleDialog title={creating ? 'Crear bloque de horario' : 'Editar bloque de horario'} busy={busy} onClose={close}>
    <form onSubmit={event => { event.preventDefault(); void submit(); }} className="flex flex-col gap-4">
      <fieldset disabled={busy} className="flex flex-col gap-4">
        {creating ? <div>
          <label htmlFor={`${prefix}-course`} className="block text-[10px] text-muted uppercase tracking-wider font-bold mb-1.5">Curso de la sección</label>
          <select id={`${prefix}-course`} required className={inputClass} value={values.sectionCourseId ?? ''} onChange={event => setValues(previous => ({ ...previous, sectionCourseId: event.target.value ? Number(event.target.value) : null }))}>
            <option value="">Selecciona un curso</option>
            {activeCourses.map(course => <option key={course.id} value={course.id}>{course.courseCode} · {course.courseName} · {course.teacherName ?? 'Sin docente asignado'}</option>)}
          </select>
        </div> : <div className="rounded-xl border border-line bg-neutral/50 p-3 text-xs"><p className="font-bold break-words">Curso: {block!.courseName}</p><p className="text-muted mt-1 leading-relaxed">Para cambiar de curso, elimina este bloque y crea otro.</p></div>}
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-line bg-accent-soft/40"><UserIcon size={18} aria-hidden="true" className="text-accent shrink-0" /><div className="min-w-0"><p className="text-[10px] text-muted font-bold uppercase tracking-wider">Docente actual</p><p className={`text-xs font-bold mt-1 break-words ${teacher == null ? 'text-muted' : 'text-ink'}`}>{teacher ?? 'Sin docente asignado'}</p></div></div>
        {(creating ? selected && teacher == null : teacher == null) && <p className="p-3 bg-neutral/60 border border-line text-muted rounded-xl text-xs leading-relaxed">Este curso no tiene un docente asignado actualmente. El bloque puede registrarse y mostrará al docente cuando exista una asignación activa.</p>}
        <div><label htmlFor={`${prefix}-day`} className="block text-[10px] text-muted uppercase tracking-wider font-bold mb-1.5">Día</label>
          <select id={`${prefix}-day`} required className={inputClass} value={values.day} onChange={event => setValues(previous => ({ ...previous, day: event.target.value as ScheduleValues['day'] }))}>
            {SCHOOL_DAYS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(['startTime', 'endTime'] as const).map(field => <div key={field}>
          <label htmlFor={`${prefix}-${field}`} className="block text-[10px] text-muted uppercase tracking-wider font-bold mb-1.5">{field === 'startTime' ? 'Inicio' : 'Fin'}</label>
          <input id={`${prefix}-${field}`} type="time" step={60} required className={inputClass} value={values[field]} onChange={event => setValues(previous => ({ ...previous, [field]: event.target.value }))} />
        </div>)}</div>
        <p className="text-[11px] text-muted">Introduce la hora exacta de inicio y fin, con precisión de minutos.</p>
        <div><label htmlFor={`${prefix}-classroom`} className="block text-[10px] text-muted uppercase tracking-wider font-bold mb-1.5">Aula (opcional)</label>
          <input id={`${prefix}-classroom`} maxLength={50} className={inputClass} value={values.classroom} onChange={event => setValues(previous => ({ ...previous, classroom: event.target.value }))} />
        </div>
      </fieldset>
      {error && <ScheduleConflictError error={error} />}
      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <button type="button" disabled={busy} className={`${buttonClass} bg-neutral`} onClick={close}>Cancelar</button>
        <button disabled={busy || (creating && activeCourses.length === 0)} className={`${buttonClass} bg-accent text-white shadow-sm`}>{busy ? 'Guardando...' : creating ? 'Crear bloque' : 'Guardar cambios'}</button>
      </div>
    </form>
  </ScheduleDialog>;
}
