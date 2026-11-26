'use client';

import Link from 'next/link';
import { BookOpen, Users, Clock, ChevronRight, CalendarOff } from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import { courseGradeLabel, type DayBlock } from '@/adapters/teacherDayScheduleAdapter';
import { useTeacherDaySchedule, type UseTeacherDayScheduleOptions } from '@/hooks/useTeacherDaySchedule';
import { courseBarClass } from '@/lib/courseColor';
import { formatLimaDay } from '@/lib/limaClock';

const focus = 'focus-visible:outline-2 focus-visible:outline-accent';

const attendanceHref = (sectionCourseId: number, day: string) => `/docente/asistencia?curso=${sectionCourseId}&fecha=${day}`;

/** `scheduleOptions` solo lo usan las pruebas (reloj inyectado). */
export default function VistaCursosDocente({ scheduleOptions }: { scheduleOptions?: UseTeacherDayScheduleOptions }) {
  const { cursos, isLoading, coursesError, refreshCursos, setCursoActivo } = useDocenteSession();
  const { loading: scheduleLoading, today, schedule, reload } = useTeacherDaySchedule(cursos, scheduleOptions);
  const { current, timeline, failedCourses, isEmpty } = schedule;
  const allFailed = failedCourses.length > 0 && failedCourses.length === cursos.length;

  const takeAttendance = (block: DayBlock) => {
    const course = cursos.find(c => c.sectionCourseId === block.sectionCourseId);
    if (course) setCursoActivo({ id: String(course.sectionCourseId), nombre: course.name, grado: `${course.grade}° grado` });
  };

  return <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <header className="lg:col-span-12 flex items-end justify-between gap-3 border-b border-line pb-3">
      <div><span className="text-[10px] font-bold uppercase tracking-widest text-accent">Portal Docente</span><h2 className="text-xl font-bold tracking-tight text-ink mt-1">Mis Cursos Asignados</h2>
      <p className="text-xs text-muted mt-1">Cursos y secciones a tu cargo.</p></div><span className="p-2.5 rounded-xl bg-accent-soft text-accent border border-accent/10"><BookOpen size={20} aria-hidden="true" /></span>
    </header>
    {isLoading ? <p role="status" className="lg:col-span-12 p-5 bg-white border border-line rounded-xl shadow-sm text-sm text-muted flex items-center gap-2">Cargando cursos...</p>
      : coursesError ? <div role="alert" className="lg:col-span-12 p-5 rounded-xl border border-accent/30 bg-accent-soft text-accent break-words">
        <p>{coursesError}</p><button type="button" onClick={refreshCursos} className={`mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink ${focus}`}>Reintentar</button>
      </div> : cursos.length === 0 ? <div className="lg:col-span-12 p-8 bg-white border border-dashed border-line rounded-xl flex flex-col items-center gap-2 text-center">
        <BookOpen size={28} aria-hidden="true" className="text-muted" /><p className="font-bold text-ink">No tienes cursos asignados</p>
      </div> : <><section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 min-w-0">
        {cursos.map(curso => <article key={curso.sectionCourseId} className="bg-white rounded-xl border border-line p-4 flex items-center justify-between gap-4 hover:border-accent/40 hover:shadow-sm transition-all group min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <span aria-hidden="true" className={`w-1.5 h-14 rounded-full shrink-0 ${courseBarClass(curso.sectionCourseId)}`} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-bold text-base text-ink group-hover:text-accent transition-colors truncate">{curso.name}</h3>
                <span className="text-[11px] font-semibold text-muted bg-neutral px-2 py-0.5 rounded-md shrink-0">{curso.code}</span>
              </div>
              <span className="text-xs text-muted font-medium truncate mt-0.5">{courseGradeLabel(curso)}</span>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-muted">
                <span className="flex items-center gap-1"><Users size={12} aria-hidden="true" />{curso.studentCount} alumnos</span>
                <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" />{curso.weeklyHours} h semanales</span>
              </div>
            </div>
          </div>
          <Link href={`/docente/cursos/${curso.sectionCourseId}`} onClick={() => setCursoActivo({ id: String(curso.sectionCourseId), nombre: curso.name, grado: `${curso.grade}° grado` })} className={`shrink-0 flex items-center gap-1.5 min-h-10 px-4 py-2 rounded-lg bg-neutral text-ink hover:bg-accent hover:text-white group-hover:bg-accent group-hover:text-white text-xs font-semibold transition-all shadow-xs ${focus}`}>Ingresar<ChevronRight size={14} aria-hidden="true" /></Link>
        </article>)}
      </section><aside aria-labelledby="horario-hoy" className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 min-w-0">
        <div className="border-b border-line pb-3">
          <h2 id="horario-hoy" className="text-xl font-bold text-ink">Mi horario de hoy</h2>
          <p className="text-xs text-muted capitalize">{formatLimaDay(today)}</p>
        </div>
        {scheduleLoading ? <p role="status" className="p-4 bg-white border border-line rounded-xl text-sm text-muted">Cargando tu horario...</p>
          : allFailed ? <div role="alert" className="p-4 rounded-xl border border-accent/30 bg-accent-soft text-accent">
            <p className="text-sm">No se pudo cargar tu horario de hoy.</p>
            <button type="button" onClick={reload} className={`mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink ${focus}`}>Reintentar</button>
          </div> : <>
            {current && <div className="bg-accent text-white rounded-xl p-5 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-white/90 tracking-wide uppercase flex items-center gap-1.5"><span aria-hidden="true" className="w-2 h-2 rounded-full bg-white motion-safe:animate-pulse" />Clase en curso ahora</span>
                <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{current.remainingLabel}</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white mt-1 break-words">{current.courseName}</h3>
              <p className="text-xs text-white/90 font-medium">{current.gradeSection}{current.classroom ? ` · ${current.classroom}` : ''}</p>
              <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-white/20 text-xs">
                <span className="text-white/90 font-medium">Horario: {current.startTime} – {current.endTime}</span>
                <Link href={attendanceHref(current.sectionCourseId, today)} onClick={() => takeAttendance(current)} className={`font-bold underline hover:text-white/90 focus-visible:outline-2 focus-visible:outline-white`}>Tomar lista →</Link>
              </div>
            </div>}
            {isEmpty ? <div className="bg-white rounded-xl border border-dashed border-line p-6 flex flex-col items-center gap-2 text-center">
              <CalendarOff size={28} aria-hidden="true" className="text-muted" /><p className="font-bold text-ink text-sm">Sin clases programadas hoy</p>
              <p className="text-xs text-muted">Cuando tengas sesiones en el día, aparecerán aquí.</p>
            </div> : timeline.length > 0 && <div className="bg-white rounded-xl border border-line p-4 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Cronograma del día</h3>
              <ol className="flex flex-col pl-6 space-y-4 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                {timeline.map(block => {
                  const live = block.state === 'live';
                  return <li key={block.key} className={`relative flex flex-col gap-0.5 ${live ? 'font-semibold' : ''}`}>
                    <span aria-hidden="true" className={`absolute -left-6 top-1 w-3 h-3 rounded-full ring-2 ${live ? 'bg-accent ring-accent/30' : 'bg-muted ring-white'}`} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-muted">{block.startTime} – {block.endTime}</span>
                      {live && <span className="text-[10px] font-bold text-accent bg-accent-soft px-1.5 py-0.5 rounded">En vivo</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm break-words min-w-0 ${live ? 'text-accent font-bold' : 'text-ink font-semibold'}`}>{block.courseName}</span>
                      <span className="text-xs text-muted shrink-0">{block.gradeSection}</span>
                    </div>
                    {block.classroom && <span className="text-[11px] text-muted">{block.classroom}</span>}
                    {block.state !== 'upcoming' && block.pendingCount > 0 && <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-warning-ink">{block.pendingCount} {block.pendingCount === 1 ? 'pendiente' : 'pendientes'} de asistencia</span>
                      <Link href={attendanceHref(block.sectionCourseId, today)} onClick={() => takeAttendance(block)} className={`text-[11px] font-bold text-accent underline ${focus}`}>Tomar lista</Link>
                    </div>}
                  </li>;
                })}
              </ol>
            </div>}
            {failedCourses.length > 0 && !allFailed && <div role="alert" className="p-4 rounded-xl border border-accent/30 bg-accent-soft text-accent text-xs">
              <p className="font-bold">No se pudo cargar:</p>
              <ul className="mt-1 list-disc pl-4">{failedCourses.map(f => <li key={f.sectionCourseId}>{f.courseName}</li>)}</ul>
              <button type="button" onClick={reload} className={`mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold text-ink ${focus}`}>Reintentar</button>
            </div>}
          </>}
      </aside></>}
  </div>;
}
