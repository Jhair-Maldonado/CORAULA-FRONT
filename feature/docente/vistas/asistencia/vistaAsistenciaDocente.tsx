'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, BookOpen, AlertTriangle, CheckCircle2, Clock, Save, Users } from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import { teacherAttendanceService, teacherAttendanceErrorMessage } from '@/services/teacher/teacherAttendanceService';
import type { TeacherAttendanceResponse, TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';

const statuses = [
  { value: 'PRESENTE', label: 'Presente', shortcut: 'P', active: 'bg-emerald-600 text-white', soft: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100', all: 'Todos Presentes' },
  { value: 'TARDANZA', label: 'Tardanza', shortcut: 'T', active: 'bg-amber-500 text-ink', soft: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100', all: 'Todos Tardanza' },
  { value: 'INASISTENCIA', label: 'Inasistencia', shortcut: 'I', active: 'bg-rose-600 text-white', soft: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100', all: 'Todos Inasistencia' },
] as const;
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function localAttendanceDate() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

export default function VistaAsistenciaDocente() {
  const { cursos, cursoActivo, setCursoActivo, isLoading, coursesError, refreshCursos } = useDocenteSession();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [date, setDate] = useState(localAttendanceDate);
  const course = cursos.find(c => c.sectionCourseId === selectedCourseId)
    ?? cursos.find(c => String(c.sectionCourseId) === cursoActivo?.id) ?? cursos[0];

  if (isLoading) return <div role="status" className="space-y-4"><p className="text-sm text-muted">Cargando cursos...</p>{[0, 1, 2].map(n => <div key={n} className="h-24 rounded-xl border border-line bg-white animate-pulse" />)}</div>;
  if (coursesError) return <div role="alert" className="p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl"><p>{coursesError}</p><button type="button" onClick={refreshCursos} className={`mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg font-bold text-xs ${focus}`}>Reintentar</button></div>;
  if (!course) return <div className="p-8 border border-dashed border-line bg-white rounded-xl text-center"><BookOpen size={28} aria-hidden="true" className="mx-auto text-accent mb-3" /><h1 className="font-bold text-ink">No tienes cursos asignados</h1><p className="text-xs text-muted mt-2">La asistencia estará disponible cuando tengas un curso asignado.</p></div>;

  return <AttendancePanel key={`${course.sectionCourseId}:${date}`} course={course} courses={cursos} date={date}
    onCourseChange={id => {
      setSelectedCourseId(id);
      const found = cursos.find(c => c.sectionCourseId === id);
      if (found) setCursoActivo({ id: String(id), nombre: found.name, grado: `${found.grade}\u00b0 grado` });
    }} onDateChange={setDate} />;
}

function AttendancePanel({ course, courses, date, onCourseChange, onDateChange }: {
  course: TeacherCourseSummaryResponse; courses: TeacherCourseSummaryResponse[]; date: string;
  onCourseChange: (id: number) => void; onDateChange: (date: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: TeacherAttendanceResponse; error?: string } | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<number, TeacherAttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useRef(false);
  const mounted = useRef(true);
  const loading = result?.revision !== revision;
  const data = loading ? undefined : result?.data;
  const loadError = loading ? undefined : result?.error;
  const session = data?.sessions.find(s => s.scheduleId === selectedScheduleId) ?? data?.sessions[0];
  const students = session?.students ?? [];
  const statusFor = (enrollmentId: number, status: TeacherAttendanceStatus | null) => draft[enrollmentId] ?? status;
  const pending = students.filter(s => statusFor(s.enrollmentId, s.status) === null).length;
  const canSave = Boolean(session && students.length > 0 && students.length === session.totalStudents && pending === 0 && !loading && !saving);

  useEffect(() => {
    mounted.current = true;
    let current = true;
    if (date) {
      teacherAttendanceService.getAttendance(course.sectionCourseId, date).then(data => {
        if (current) setResult({ revision, data });
      }).catch(error => {
        if (current) setResult({ revision, error: teacherAttendanceErrorMessage(error) });
      });
    }
    return () => { current = false; mounted.current = false; };
  }, [course.sectionCourseId, date, revision]);

  function changeStatus(enrollmentId: number, status: TeacherAttendanceStatus) {
    if (mutation.current) return;
    setDraft(previous => ({ ...previous, [enrollmentId]: status }));
    setSaveError(''); setNotice('');
  }

  async function saveAttendance() {
    if (!canSave || !session || mutation.current) return;
    const records = students.map(student => ({ enrollmentId: student.enrollmentId, status: statusFor(student.enrollmentId, student.status) }));
    if (records.some(record => record.status === null)) return;
    mutation.current = true; setSaving(true); setSaveError(''); setNotice('');
    try {
      await teacherAttendanceService.saveAttendance(course.sectionCourseId, session.scheduleId, date, {
        records: records.map(record => ({ enrollmentId: record.enrollmentId, status: record.status! })),
      });
      if (!mounted.current) return;
      setNotice('La asistencia se guardó correctamente en el servidor.');
      try {
        const refreshed = await teacherAttendanceService.getAttendance(course.sectionCourseId, date);
        if (!mounted.current) return;
        setResult({ revision, data: refreshed }); setDraft({});
      } catch (error) {
        if (mounted.current) setSaveError('La asistencia se guardó, pero no se pudo actualizar la vista. ' + teacherAttendanceErrorMessage(error));
      }
    } catch (error) {
      if (mounted.current) setSaveError(teacherAttendanceErrorMessage(error));
    } finally {
      mutation.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return <div className="flex flex-col gap-6">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-line shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/docente" aria-label="Volver a mis cursos" className={`p-2 min-h-10 min-w-10 rounded-lg hover:bg-neutral text-muted hover:text-ink transition-colors border border-line shrink-0 ${focus}`}><ArrowLeft size={18} aria-hidden="true" /></Link>
        <div className="min-w-0"><h1 className="text-lg sm:text-xl font-bold text-ink break-words">{data?.courseName ?? course.name} · {data?.grade ?? course.grade}° grado · Sección {data?.sectionName ?? course.sectionName}</h1><p className="text-xs text-muted mt-0.5">Registro diario de asistencia de estudiantes</p></div>
      </div>
      <button type="button" onClick={saveAttendance} disabled={!canSave} className={`flex items-center justify-center gap-1.5 min-h-10 px-4 py-2 bg-accent hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${focus}`}><Save size={16} aria-hidden="true" />{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
    </header>
    {notice && <p role="status" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2"><CheckCircle2 size={16} aria-hidden="true" className="shrink-0" />{notice}</p>}
    {saveError && <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm break-words"><p>{saveError}</p><button type="button" disabled={saving} onClick={() => { setDraft({}); setRevision(n => n + 1); }} className={`mt-3 min-h-10 px-3 py-2 bg-white rounded-lg border border-line text-xs font-bold ${focus}`}>Volver a consultar</button></div>}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-3.5 rounded-xl border border-line flex items-center gap-3 shadow-xs"><span className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0"><BookOpen size={18} aria-hidden="true" /></span><label className="flex-1 min-w-0"><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Curso / Grado / Sección</span><select aria-label="Curso" value={course.sectionCourseId} disabled={saving} onChange={e => onCourseChange(Number(e.target.value))} className={`w-full min-h-10 text-xs font-bold text-ink bg-transparent cursor-pointer disabled:opacity-50 ${focus}`}>{courses.map(c => <option key={c.sectionCourseId} value={c.sectionCourseId}>{c.name} · {c.grade}° · {c.sectionName}</option>)}</select></label></div>
      <div className="bg-white p-3.5 rounded-xl border border-line flex items-center gap-3 shadow-xs"><span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Calendar size={18} aria-hidden="true" /></span><label className="flex-1 min-w-0"><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Fecha</span><input aria-label="Fecha de asistencia" type="date" required value={date} disabled={saving} onChange={e => { if (e.target.value) onDateChange(e.target.value); }} className={`w-full min-h-10 text-xs font-bold text-ink bg-transparent disabled:opacity-50 ${focus}`} /></label></div>
    </div>
    {loading ? <div role="status" className="space-y-3"><p className="text-sm text-muted">Cargando asistencia...</p><div className="h-24 bg-white border border-line rounded-xl animate-pulse" /></div>
      : loadError ? <div role="alert" className="p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl"><p>{loadError}</p><button type="button" onClick={() => setRevision(n => n + 1)} className={`mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold ${focus}`}>Reintentar</button></div>
      : !session ? <div className="bg-white p-8 rounded-xl border border-dashed border-line text-center"><Calendar size={28} aria-hidden="true" className="text-accent mx-auto mb-3" /><p className="text-sm font-bold text-ink">No hay clases programadas para este curso en la fecha seleccionada.</p></div>
      : <>
        <div className="bg-white p-4 rounded-xl border border-line flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <label className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink min-w-0 max-w-full"><Clock size={18} aria-hidden="true" className="text-accent" />Sesión<select aria-label="Sesión programada" value={session.scheduleId} disabled={saving} onChange={e => { setSelectedScheduleId(Number(e.target.value)); setDraft({}); setNotice(''); setSaveError(''); }} className={`min-h-10 min-w-0 w-full sm:w-auto bg-neutral/50 border border-line rounded-lg px-3 py-2 max-w-full disabled:opacity-50 ${focus}`}>{data?.sessions.map(s => <option key={s.scheduleId} value={s.scheduleId}>{s.startTime} – {s.endTime}{s.classroom ? ' · ' + s.classroom : ''}</option>)}</select></label>
          {session.classroom !== null && <span className="text-xs font-medium text-muted break-words">Aula: {session.classroom}</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total estudiantes', value: session.totalStudents, icon: Users, color: 'bg-accent-soft text-accent' },
            { label: 'Presentes', value: session.presentCount, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Tardanzas', value: session.lateCount, icon: Clock, color: 'bg-amber-50 text-amber-600' },
            { label: 'Inasistencias', value: session.absenceCount, icon: AlertTriangle, color: 'bg-rose-50 text-rose-600' },
          ].map(metric => <div key={metric.label} className="bg-white p-3.5 rounded-xl border border-line flex items-center gap-3 shadow-xs"><span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${metric.color}`}><metric.icon size={18} aria-hidden="true" /></span><div><span className="text-[10px] font-bold text-muted uppercase tracking-wider block">{metric.label}</span><span className="text-base font-extrabold text-ink">{metric.value}</span></div></div>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-xl border border-line">
          <div className="text-xs font-bold text-muted"><p>Marcar asistencia ({students.length} estudiantes)</p><p className="text-[10px] font-medium mt-1">Métricas guardadas en el servidor. Completa todos los estados antes de guardar.</p><span className="inline-block mt-2 px-2 py-1 rounded-full bg-neutral border border-line text-ink">{pending} pendientes de seleccionar</span><span className="ml-2 text-[10px]">{session.pendingCount} pendientes en servidor</span></div>
          <div className="flex flex-wrap items-center gap-2">{statuses.map(status => <button key={status.value} type="button" disabled={saving || students.length === 0} onClick={() => { setDraft(Object.fromEntries(students.map(s => [s.enrollmentId, status.value]))); setSaveError(''); setNotice(''); }} className={`min-h-10 px-2.5 py-1 text-[11px] font-bold border rounded-md transition-colors disabled:opacity-50 ${status.soft} ${focus}`}>{status.all}</button>)}</div>
        </div>
        {students.length === 0 ? <p className="bg-white p-8 border border-dashed border-line rounded-xl text-center text-sm text-muted">No hay estudiantes con matrícula activa en esta sesión.</p> : <div className="flex flex-col gap-3">
          {students.map(student => {
            const selected = statusFor(student.enrollmentId, student.status);
            const label = statuses.find(s => s.value === selected);
            const initials = student.fullName.trim().split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('');
            return <article key={student.enrollmentId} className="bg-white rounded-xl border border-line p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-accent/30 hover:shadow-xs transition-all">
              <div className="flex items-center gap-3.5 min-w-0 flex-1"><span className="w-10 h-10 rounded-full bg-accent-soft text-accent font-extrabold text-xs flex items-center justify-center shrink-0 border border-accent/20 shadow-xs" aria-hidden="true">{initials}</span><div className="min-w-0"><h2 className="font-bold text-sm text-ink break-words">{student.fullName}</h2><p className="text-[11px] text-muted break-words">Código: {student.studentCode ?? 'No registrado'}</p><p className="text-[10px] text-muted mt-1">Registro: {student.attendanceId ?? 'Pendiente de guardar'}</p></div></div>
              <span className={`w-fit text-[11px] font-bold px-2 py-1 rounded-full border ${label ? label.soft : 'bg-neutral text-muted border-line'}`}>{label?.label ?? 'Sin seleccionar'}</span>
              <div className="flex flex-wrap gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-line">{statuses.map(status => <button key={status.value} type="button" disabled={saving} aria-pressed={selected === status.value} aria-label={status.label + ': ' + student.fullName} title={status.label} onClick={() => changeStatus(student.enrollmentId, status.value)} className={`min-h-10 min-w-10 px-2.5 py-1 text-xs rounded-md transition-all font-bold disabled:opacity-50 ${selected === status.value ? status.active : 'bg-neutral text-muted hover:bg-line hover:text-ink'} ${focus}`}>{status.shortcut}<span className="hidden xl:inline ml-1">{status.label}</span></button>)}</div>
            </article>;
          })}
        </div>}
      </>}
  </div>;
}
