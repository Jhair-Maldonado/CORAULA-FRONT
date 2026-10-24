'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft01Icon, Add01Icon, Calendar01Icon, BookOpen01Icon, FilterIcon } from 'hugeicons-react';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionCoursesService } from '@/services/admin/sectionCoursesService';
import { schedulesService, scheduleError, type ScheduleError } from '@/services/admin/schedulesService';
import type { SectionResponse } from '@/types/sectionApi';
import type { SectionCourseResponse } from '@/types/sectionCourseApi';
import type { ScheduleResponse, SchoolDay } from '@/types/scheduleApi';
import ScheduleTimeline from './components/ScheduleTimeline';
import ScheduleForm from './components/ScheduleForm';
import ScheduleDetails from './components/ScheduleDetails';
import ScheduleDialog from './components/ScheduleDialog';
import ScheduleConflictError from './components/ScheduleConflictError';
import { SCHOOL_DAYS, buttonClass, inputClass, dayLabel } from './components/scheduleUi';

type Result<T> = { revision: number; data?: T; error?: ScheduleError };
type Action = { kind: 'create' } | { kind: 'details' | 'edit' | 'delete'; block: ScheduleResponse };

export default function HorarioDelGrado() {
  const { id } = useParams<{ id: string }>();
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return <div className="p-6"><Link href="/administrador/horario" className={buttonClass}>Regresar a horarios</Link><h1 className="text-xl font-bold mt-5">Sección no encontrada</h1><p>El identificador de sección no es válido.</p></div>;
  return <SectionSchedule key={id} sectionId={Number(id)} />;
}

function SectionSchedule({ sectionId }: { sectionId: number }) {
  const [sectionRevision, setSectionRevision] = useState(0);
  const [coursesRevision, setCoursesRevision] = useState(0);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [sectionResult, setSectionResult] = useState<Result<SectionResponse>>();
  const [coursesResult, setCoursesResult] = useState<Result<SectionCourseResponse[]>>();
  const [scheduleResult, setScheduleResult] = useState<Result<ScheduleResponse[]>>();
  const [day, setDay] = useState<SchoolDay | ''>('');
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const deleting = useRef(false);
  const [actionError, setActionError] = useState<ScheduleError>();
  const [notice, setNotice] = useState('');
  const [deleted, setDeleted] = useState(false);
  const sectionLoading = sectionResult?.revision !== sectionRevision;
  const coursesLoading = coursesResult?.revision !== coursesRevision;
  const scheduleLoading = scheduleResult?.revision !== scheduleRevision;
  const section = sectionLoading ? undefined : sectionResult?.data;
  const courses = coursesLoading ? undefined : coursesResult?.data;
  const blocks = scheduleLoading ? undefined : scheduleResult?.data;

  useEffect(() => {
    let current = true;
    sectionsService.getById(sectionId).then(data => { if (current) setSectionResult({ revision: sectionRevision, data }); })
      .catch(error => { if (current) setSectionResult({ revision: sectionRevision, error: scheduleError(error) }); });
    return () => { current = false; };
  }, [sectionId, sectionRevision]);
  useEffect(() => {
    let current = true;
    sectionCoursesService.list(sectionId).then(data => { if (current) setCoursesResult({ revision: coursesRevision, data }); })
      .catch(error => { if (current) setCoursesResult({ revision: coursesRevision, error: scheduleError(error) }); });
    return () => { current = false; };
  }, [sectionId, coursesRevision]);
  useEffect(() => {
    let current = true;
    schedulesService.listBySection(sectionId).then(data => { if (current) setScheduleResult({ revision: scheduleRevision, data }); })
      .catch(error => { if (current) setScheduleResult({ revision: scheduleRevision, error: scheduleError(error) }); });
    return () => { current = false; };
  }, [sectionId, scheduleRevision]);

  function refresh() {
    setSectionRevision(n => n + 1);
    setCoursesRevision(n => n + 1);
    setScheduleRevision(n => n + 1);
  }
  function saved() {
    setAction(null);
    setDeleted(false);
    setNotice('El bloque se guardó.');
    setScheduleRevision(n => n + 1);
    setCoursesRevision(n => n + 1);
  }
  async function remove() {
    if (action?.kind !== 'delete' || deleting.current) return;
    deleting.current = true;
    setBusy(true);
    setActionError(undefined);
    try {
      await schedulesService.remove(action.block.id);
      setAction(null);
      setDeleted(true);
      setNotice('El bloque se eliminó.');
      setScheduleRevision(n => n + 1);
    } catch (error) { setActionError(scheduleError(error)); }
    finally { deleting.current = false; setBusy(false); }
  }
  const refreshFailed = !!notice && !scheduleLoading && !!scheduleResult?.error;
  return <div className="w-full h-full overflow-y-auto p-6 bg-canvas text-ink"><div className="max-w-7xl mx-auto flex flex-col gap-6">
    <Link href="/administrador/horario" className="text-muted hover:text-accent transition-colors text-xs font-bold w-fit min-h-10 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-accent"><ArrowLeft01Icon size={14} aria-hidden="true" />Regresar a lista de horarios</Link>
    {sectionLoading ? <p role="status">Cargando sección...</p> : sectionResult?.error ? <div><h1 className="text-xl font-bold mb-3">{sectionResult.error.status === 404 ? 'Sección no encontrada' : 'No se pudo cargar la sección'}</h1><ScheduleConflictError error={sectionResult.error} retry={() => setSectionRevision(n => n + 1)} /></div> : section && <>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0"><p className="text-accent text-[11px] font-bold uppercase tracking-widest">Horario escolar</p><h1 className="text-2xl font-bold tracking-tight mt-0.5 break-words">{section.grade}° grado · {section.name}</h1><p className="text-muted text-xs font-medium mt-1">{section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · {section.active ? 'Sección activa' : 'Sección inactiva'}</p><p className="text-muted text-xs font-medium mt-1">Consulta los bloques por día. Selecciona una clase para ver sus detalles.</p></div>
        <div className="flex flex-wrap items-center gap-2"><button className={`${buttonClass} bg-white shadow-sm`} disabled={busy || !!action} onClick={refresh}>Actualizar</button><button className={`${buttonClass} bg-accent text-white shadow-sm flex items-center gap-1.5`} disabled={busy || !!action || coursesLoading || !courses?.some(course => course.active)} onClick={() => setAction({ kind: 'create' })}><Add01Icon size={16} aria-hidden="true" />Agregar clase</button></div>
      </header>
      {notice && <p role="status" className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-sm">{refreshFailed ? `${deleted ? 'La eliminación se realizó' : 'El bloque se guardó'}, pero no pudo actualizarse la vista. Reintenta la carga del horario.` : notice}</p>}
      {coursesLoading ? <p role="status" className="p-4 bg-white border border-line rounded-xl text-xs text-muted">Cargando cursos de la sección...</p> : coursesResult?.error ? <ScheduleConflictError error={coursesResult.error} retry={() => setCoursesRevision(n => n + 1)} /> : !courses?.some(course => course.active) && <div className="flex items-start gap-3 p-5 bg-white border border-dashed border-line rounded-xl"><BookOpen01Icon size={24} aria-hidden="true" className="text-muted shrink-0" /><div><p className="text-xs font-bold">Sin cursos activos disponibles</p><p className="text-xs text-muted mt-1">Esta sección no tiene cursos activos disponibles para crear bloques.</p></div></div>}
      <div className="bg-white border border-line rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"><span className="text-xs font-bold flex items-center gap-2"><FilterIcon size={16} aria-hidden="true" className="text-accent" />Filtros de vista</span><div className="flex items-center gap-2"><label htmlFor="schedule-day-filter" className="text-[10px] uppercase tracking-wider font-bold text-muted">Día</label><select id="schedule-day-filter" className={`${inputClass} sm:max-w-60`} value={day} onChange={event => setDay(event.target.value as SchoolDay | '')}><option value="">Todos los días</option>{SCHOOL_DAYS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></div>
      {scheduleLoading ? <p role="status">Cargando horario...</p> : scheduleResult?.error ? <ScheduleConflictError error={scheduleResult.error} retry={() => setScheduleRevision(n => n + 1)} /> : blocks && <>
        {blocks.length === 0 && <div className="p-8 rounded-xl border border-dashed border-line bg-white text-center flex flex-col items-center gap-2"><Calendar01Icon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold">Sin horario registrado</p><p className="text-xs text-muted">Esta sección todavía no tiene bloques de horario.</p></div>}
        <ScheduleTimeline blocks={blocks} day={day} onSelect={block => setAction({ kind: 'details', block })} />
      </>}
    </>}
    {section && action?.kind === 'create' && courses && <ScheduleForm mode="CREATE" courses={courses} onClose={() => setAction(null)} onSaved={saved} />}
    {section && action?.kind === 'edit' && <ScheduleForm mode="EDIT" block={action.block} courses={courses ?? []} onClose={() => setAction(null)} onSaved={saved} />}
    {section && action?.kind === 'details' && <ScheduleDetails block={action.block} onClose={() => setAction(null)} onEdit={() => setAction({ kind: 'edit', block: action.block })} onDelete={() => { setActionError(undefined); setAction({ kind: 'delete', block: action.block }); }} />}
    {section && action?.kind === 'delete' && <ScheduleDialog title="Eliminar bloque de horario" busy={busy} onClose={() => { if (!deleting.current) setAction(null); }}>
      <p className="text-sm">¿Deseas eliminar {action.block.courseName}, {dayLabel(action.block.day)}, {action.block.startTime} – {action.block.endTime}, {action.block.classroom ?? 'Sin aula'}?</p>
      {actionError && <div className="mt-4"><ScheduleConflictError error={actionError} /></div>}
      <div className="flex justify-end gap-2 mt-5"><button className={buttonClass} disabled={busy} onClick={() => setAction(null)}>Cancelar</button><button className={`${buttonClass} bg-rose-700 text-white`} disabled={busy} onClick={() => void remove()}>{busy ? 'Eliminando...' : 'Confirmar eliminación'}</button></div>
    </ScheduleDialog>}
  </div></div>;
}
