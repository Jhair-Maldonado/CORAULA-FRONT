'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, BookOpen, AlertTriangle, CheckCircle2, Clock, Save, Users } from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import { Modal } from '@/components/ui/Modal';
import JustificacionAsistencia from '@/components/attendance/JustificacionAsistencia';
import { ATTENDANCE_STATUS_UI, attendanceStatusUi } from '@/lib/attendanceStatusUi';
import { effectiveStatus, isAttendanceDirty, planBulkStatus, type AttendanceDraft, type BulkPlan } from '@/lib/attendanceDraft';
import {
  ATTENDANCE_REASON_MAX_LENGTH,
  DEFAULT_CONTINGENCY_CAUSE,
  REASON_REQUIRED_MESSAGE,
  REASON_TOO_LONG_MESSAGE,
  isFirstCapture,
  isReasonValid
} from '@/lib/attendanceJustification';
import { formatDayLong, isRealDay, limaToday } from '@/lib/limaClock';
import { teacherAttendanceService, teacherAttendanceLoadErrorMessage, teacherAttendanceSaveErrorMessage } from '@/services/teacher/teacherAttendanceService';
import type { TeacherAttendanceResponse, TeacherAttendanceStatus, TeacherContingencyCause } from '@/types/teacherAttendanceApi';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';
import FilaAlumnoAsistencia from './FilaAlumnoAsistencia';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const alertBox = 'p-4 bg-accent-soft border border-accent/30 text-accent rounded-xl text-sm break-words';
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Asistencia del docente por curso, fecha y sesión.
 * `initialCourseId` e `initialDate` vienen del enlace «Tomar lista» del inicio (`?curso=&fecha=`): solo valen si el curso
 * es del docente y la fecha existe en el calendario (YYYY-MM-DD); si no, se conserva el comportamiento habitual (hoy en Lima).
 */
export default function VistaAsistenciaDocente({ initialCourseId, initialDate }: { initialCourseId?: number; initialDate?: string } = {}) {
  const { cursos, cursoActivo, setCursoActivo, isLoading, coursesError, refreshCursos } = useDocenteSession();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [date, setDate] = useState(() => (initialDate && isRealDay(initialDate) ? initialDate : limaToday()));
  const course = cursos.find(c => c.sectionCourseId === selectedCourseId)
    ?? cursos.find(c => c.sectionCourseId === initialCourseId)
    ?? cursos.find(c => String(c.sectionCourseId) === cursoActivo?.id) ?? cursos[0];

  if (isLoading) return <div role="status" className="space-y-4"><p className="text-sm text-muted">Cargando cursos...</p>{[0, 1, 2].map(n => <div key={n} className="h-24 rounded-xl border border-line bg-white animate-pulse" />)}</div>;
  if (coursesError) return <div role="alert" className={alertBox}><p>{coursesError}</p><button type="button" onClick={refreshCursos} className={`mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg font-bold text-xs text-ink ${focus}`}>Reintentar</button></div>;
  if (!course) return <div className="p-8 border border-dashed border-line bg-white rounded-xl text-center"><BookOpen size={28} aria-hidden="true" className="mx-auto text-accent mb-3" /><h1 className="font-bold text-ink">No tienes cursos asignados</h1><p className="text-xs text-muted mt-2">La asistencia estará disponible cuando tengas un curso asignado.</p></div>;

  return <AttendancePanel key={`${course.sectionCourseId}:${date}`} course={course} courses={cursos} date={date}
    onCourseChange={id => {
      setSelectedCourseId(id);
      const found = cursos.find(c => c.sectionCourseId === id);
      if (found) setCursoActivo({ id: String(id), nombre: found.name, grado: `${found.grade}° grado` });
    }} onDateChange={setDate} />;
}

function AttendancePanel({ course, courses, date, onCourseChange, onDateChange }: {
  course: TeacherCourseSummaryResponse; courses: TeacherCourseSummaryResponse[]; date: string;
  onCourseChange: (id: number) => void; onDateChange: (date: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: TeacherAttendanceResponse; error?: string } | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AttendanceDraft>({});
  const [contingencyCause, setContingencyCause] = useState<TeacherContingencyCause>(DEFAULT_CONTINGENCY_CAUSE);
  const [reason, setReason] = useState('');
  const [bulk, setBulk] = useState<{ status: TeacherAttendanceStatus; plan: BulkPlan } | null>(null);
  const [bulkNote, setBulkNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useRef(false);
  const mounted = useRef(true);
  const loading = result?.revision !== revision;
  const data = loading ? undefined : result?.data;
  const loadError = loading ? undefined : result?.error;
  const session = data?.sessions.find(s => s.scheduleId === selectedScheduleId) ?? data?.sessions[0];
  const students = useMemo(() => session?.students ?? [], [session]);
  const pending = students.filter(s => effectiveStatus(s, draft) === null).length;
  const dirty = isAttendanceDirty(students, draft);
  // Primera toma: causa + motivo. Corrección con cambios: solo motivo (RF-16 / RF-42).
  const firstCapture = useMemo(() => isFirstCapture(students.map(s => s.enrollmentId), Object.fromEntries(students.map(s => [s.enrollmentId, s.status]))), [students]);
  const reasonRequired = firstCapture || dirty;
  const canSave = Boolean(session && students.length > 0 && students.length === session.totalStudents && pending === 0 && dirty
    && isReasonValid(reason, reasonRequired) && !loading && !saving);

  useEffect(() => {
    mounted.current = true;
    let current = true;
    if (date) {
      teacherAttendanceService.getAttendance(course.sectionCourseId, date).then(data => {
        if (current) setResult({ revision, data });
      }).catch(error => {
        if (current) setResult({ revision, error: teacherAttendanceLoadErrorMessage(error) });
      });
    }
    return () => { current = false; mounted.current = false; };
  }, [course.sectionCourseId, date, revision]);

  function clearFeedback() { setSaveError(''); setNotice(''); setBulkNote(''); }

  function assign(ids: number[], status: TeacherAttendanceStatus) {
    setDraft(previous => ({ ...previous, ...Object.fromEntries(ids.map(id => [id, status])) }));
  }

  function changeStatus(enrollmentId: number, status: TeacherAttendanceStatus) {
    if (mutation.current) return;
    assign([enrollmentId], status);
    clearFeedback();
  }

  // DECISION(FRONT #158): «Todos X» solo asigna a quien no tiene estado; pisar a otros pide confirmación y nunca toca justificaciones aprobadas.
  function markAll(status: TeacherAttendanceStatus) {
    if (mutation.current) return;
    const plan = planBulkStatus(students, draft, status);
    clearFeedback();
    assign(plan.fill, status);
    if (plan.locked.length > 0) setBulkNote(lockedNote(plan.locked.length));
    if (plan.overwrite.length > 0) setBulk({ status, plan });
  }

  function resolveBulk(change: boolean) {
    if (!bulk) return;
    if (change) assign(bulk.plan.overwrite, bulk.status);
    setBulk(null);
  }

  async function saveAttendance() {
    if (!canSave || !session || mutation.current) return;
    const trimmed = reason.trim();
    if (reasonRequired && trimmed.length === 0) { setSaveError(REASON_REQUIRED_MESSAGE); return; }
    if (trimmed.length > ATTENDANCE_REASON_MAX_LENGTH) { setSaveError(REASON_TOO_LONG_MESSAGE); return; }
    const records = students.map(student => ({ enrollmentId: student.enrollmentId, status: effectiveStatus(student, draft) }));
    if (records.some(record => record.status === null)) return;
    mutation.current = true; setSaving(true); clearFeedback();
    try {
      await teacherAttendanceService.saveAttendance(course.sectionCourseId, session.scheduleId, date, {
        records: records.map(record => ({ enrollmentId: record.enrollmentId, status: record.status! })),
        reason: trimmed || undefined,
        contingencyCause: firstCapture ? contingencyCause : undefined
      });
      if (!mounted.current) return;
      // El aviso de éxito solo aparece tras la respuesta 2xx del PUT.
      setNotice('La asistencia se guardó correctamente.');
      setReason(''); setContingencyCause(DEFAULT_CONTINGENCY_CAUSE);
      try {
        const refreshed = await teacherAttendanceService.getAttendance(course.sectionCourseId, date);
        if (!mounted.current) return;
        setResult({ revision, data: refreshed }); setDraft({});
      } catch (error) {
        if (mounted.current) setSaveError('La asistencia se guardó, pero no se pudo actualizar la vista. ' + teacherAttendanceLoadErrorMessage(error));
      }
    } catch (error) {
      if (mounted.current) setSaveError(teacherAttendanceSaveErrorMessage(error));
    } finally {
      mutation.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const bulkUi = bulk ? attendanceStatusUi(bulk.status) : null;
  const summary = session && [
    { label: 'Presentes', value: session.presentCount, icon: CheckCircle2, color: attendanceStatusUi('PRESENTE').soft },
    { label: 'Tardanzas', value: session.lateCount, icon: Clock, color: attendanceStatusUi('TARDANZA').soft },
    { label: 'Inasistencias', value: session.absenceCount, icon: AlertTriangle, color: attendanceStatusUi('INASISTENCIA').soft },
    { label: 'Pendientes', value: session.pendingCount, icon: Users, color: 'bg-neutral text-muted border-line' },
  ];

  return <div className="flex flex-col gap-6">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-line shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/docente" aria-label="Volver a mis cursos" className={`p-2 min-h-10 min-w-10 rounded-lg hover:bg-neutral text-muted hover:text-ink transition-colors border border-line shrink-0 ${focus}`}><ArrowLeft size={18} aria-hidden="true" /></Link>
        <div className="min-w-0"><h1 className="text-lg sm:text-xl font-bold text-ink break-words">{data?.courseName ?? course.name} · {data?.grade ?? course.grade}° grado · Sección {data?.sectionName ?? course.sectionName}</h1><p className="text-xs text-muted mt-0.5">Registro diario de asistencia de estudiantes</p></div>
      </div>
      <button type="button" onClick={saveAttendance} disabled={!canSave} className={`flex items-center justify-center gap-1.5 min-h-10 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${focus}`}><Save size={16} aria-hidden="true" />{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
    </header>
    {notice && <p role="status" className="p-3 bg-success border border-success-ink/30 text-success-ink rounded-xl text-xs font-semibold flex items-start gap-2"><CheckCircle2 size={16} aria-hidden="true" className="shrink-0" />{notice}</p>}
    {saveError && <div role="alert" className={alertBox}><p>{saveError}</p><button type="button" disabled={saving} onClick={() => { setDraft({}); setSaveError(''); setRevision(n => n + 1); }} className={`mt-3 min-h-10 px-3 py-2 bg-white rounded-lg border border-line text-xs font-bold text-ink ${focus}`}>Volver a consultar</button></div>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-3.5 rounded-xl border border-line flex items-center gap-3 shadow-xs"><span className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0"><BookOpen size={18} aria-hidden="true" /></span><label className="flex-1 min-w-0"><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Curso / Grado / Sección</span><select aria-label="Curso" value={course.sectionCourseId} disabled={saving} onChange={e => onCourseChange(Number(e.target.value))} className={`w-full min-h-10 text-xs font-bold text-ink bg-transparent cursor-pointer disabled:opacity-50 ${focus}`}>{courses.map(c => <option key={c.sectionCourseId} value={c.sectionCourseId}>{c.name} · {c.grade}° · {c.sectionName}</option>)}</select></label></div>
      <div className="bg-white p-3.5 rounded-xl border border-line flex items-center gap-3 shadow-xs"><span className="w-10 h-10 rounded-lg bg-neutral text-muted flex items-center justify-center shrink-0"><Calendar size={18} aria-hidden="true" /></span><label className="flex-1 min-w-0"><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Fecha</span><input aria-label="Fecha de asistencia" type="date" required value={date} disabled={saving} onChange={e => { if (e.target.value) onDateChange(e.target.value); }} className={`w-full min-h-10 text-xs font-bold text-ink bg-transparent disabled:opacity-50 ${focus}`} /></label></div>
    </div>
    {loading ? <div role="status" className="space-y-3"><p className="text-sm text-muted">Cargando asistencia...</p><div className="h-24 bg-white border border-line rounded-xl animate-pulse" /></div>
      : loadError ? <div role="alert" className={alertBox}><p>{loadError}</p><button type="button" onClick={() => setRevision(n => n + 1)} className={`mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink ${focus}`}>Reintentar</button></div>
      : !session ? <div className="bg-white p-8 rounded-xl border border-dashed border-line text-center"><Calendar size={28} aria-hidden="true" className="text-accent mx-auto mb-3" /><p className="text-sm font-bold text-ink">No hay clases programadas para este curso en la fecha seleccionada.</p></div>
      : <>
        <div className="bg-white p-4 rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <label className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink min-w-0 max-w-full"><Clock size={18} aria-hidden="true" className="text-accent" />Sesión<select aria-label="Sesión programada" value={session.scheduleId} disabled={saving} onChange={e => { setSelectedScheduleId(Number(e.target.value)); setDraft({}); setReason(''); clearFeedback(); }} className={`min-h-10 min-w-0 w-full sm:w-auto bg-neutral/50 border border-line rounded-lg px-3 py-2 max-w-full disabled:opacity-50 ${focus}`}>{data?.sessions.map(s => <option key={s.scheduleId} value={s.scheduleId}>{s.startTime} – {s.endTime}{s.classroom ? ' · ' + s.classroom : ''}</option>)}</select></label>
          {session.classroom !== null && <span className="text-xs font-medium text-muted break-words">Aula: {session.classroom}</span>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-line shadow-xs min-w-0 xl:col-span-2"><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Curso</span><span className="text-sm font-extrabold text-ink break-words">{data?.courseName}</span><span className="text-[11px] text-muted block">{data?.grade}.° {data?.sectionName} · {session.startTime} – {session.endTime}</span></div>
          <div className="bg-white p-3.5 rounded-xl border border-line shadow-xs min-w-0"><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Fecha</span><span className="text-sm font-extrabold text-ink break-words">{formatDayLong(date)}</span></div>
          {summary?.map(metric => <div key={metric.label} className="bg-white p-3.5 rounded-xl border border-line flex items-center gap-3 shadow-xs min-w-0"><span className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${metric.color}`}><metric.icon size={18} aria-hidden="true" /></span><div><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">{metric.label}</span><span className="text-base font-extrabold text-ink">{metric.value}</span></div></div>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl border border-line">
          <div className="text-xs font-bold text-muted"><p>Marcar asistencia ({students.length} {plural(students.length, 'estudiante', 'estudiantes')})</p><p className="text-[10px] font-medium mt-1">El resumen refleja lo guardado en el servidor. Completa todos los estados antes de guardar.</p><span className="inline-block mt-2 px-2 py-1 rounded-full bg-neutral border border-line text-ink">{pending} {plural(pending, 'pendiente', 'pendientes')} de seleccionar</span></div>
          <div className="flex flex-wrap items-center gap-2">{ATTENDANCE_STATUS_UI.map(status => <button key={status.status} type="button" disabled={saving || students.length === 0} onClick={() => markAll(status.status)} className={`min-h-10 px-2.5 py-1 text-[11px] font-bold border rounded-md transition-colors hover:bg-neutral disabled:opacity-50 ${status.soft} ${focus}`}>{status.bulkLabel}</button>)}</div>
        </div>
        {bulkNote && <p role="status" className="text-xs font-medium text-muted">{bulkNote}</p>}
        {students.length === 0 ? <p className="bg-white p-8 border border-dashed border-line rounded-xl text-center text-sm text-muted">No hay estudiantes con matrícula activa en esta sesión.</p> : <>
          <div className="flex flex-col gap-3">
            {students.map(student => <FilaAlumnoAsistencia key={student.enrollmentId} student={student} selected={effectiveStatus(student, draft)} disabled={saving} onChange={status => changeStatus(student.enrollmentId, status)} />)}
          </div>
          <JustificacionAsistencia firstCapture={firstCapture} reasonRequired={reasonRequired} contingencyCause={contingencyCause} onContingencyCauseChange={setContingencyCause}
            reason={reason} onReasonChange={value => { setReason(value); setSaveError(''); }} disabled={saving} />
        </>}
      </>}
    <Modal isOpen={bulk !== null} onClose={() => setBulk(null)} title={`Marcar a todos: ${bulkUi?.label ?? ''}`}>
      <p className="text-sm text-ink">{bulk?.plan.overwrite.length} {bulk && plural(bulk.plan.overwrite.length, 'estudiante ya tiene estado', 'estudiantes ya tienen estado')}. ¿Cambiarlos también a {bulkUi?.label}?</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={() => resolveBulk(false)} className={`min-h-10 px-4 py-2 rounded-lg border border-line bg-white hover:bg-neutral text-xs font-bold text-ink ${focus}`}>Mantener</button>
        <button type="button" onClick={() => resolveBulk(true)} className={`min-h-10 px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-bold ${focus}`}>Cambiar</button>
      </div>
    </Modal>
  </div>;
}

function lockedNote(count: number): string {
  return `${count} ${plural(count, 'estudiante con justificación aprobada no se modificó', 'estudiantes con justificación aprobada no se modificaron')}.`;
}
