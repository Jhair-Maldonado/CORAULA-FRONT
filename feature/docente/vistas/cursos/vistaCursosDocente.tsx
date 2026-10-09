'use client';

import Link from 'next/link';
import { BookOpen, Users, Clock, ChevronRight } from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export default function VistaCursosDocente() {
  const { cursos, isLoading, coursesError, refreshCursos, setCursoActivo } = useDocenteSession();

  return <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <header className="lg:col-span-12 flex items-end justify-between gap-3 border-b border-line pb-3">
      <div><span className="text-[10px] font-bold uppercase tracking-widest text-accent">Portal Docente</span><h2 className="text-xl font-bold tracking-tight text-ink mt-1">Mis Cursos Asignados</h2>
      <p className="text-xs text-muted mt-1">Cursos y secciones a tu cargo.</p></div><span className="p-2.5 rounded-xl bg-accent-soft text-accent border border-accent/10"><BookOpen size={20} aria-hidden="true" /></span>
    </header>
    {isLoading ? <p role="status" className="lg:col-span-12 p-5 bg-white border border-line rounded-xl shadow-sm text-sm text-muted flex items-center gap-2">Cargando cursos...</p>
      : coursesError ? <div role="alert" className="lg:col-span-12 p-5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 break-words">
        <p>{coursesError}</p><button type="button" onClick={refreshCursos} className="mt-3 min-h-10 px-3 py-2 bg-white border border-line rounded-lg text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent">Reintentar</button>
      </div> : cursos.length === 0 ? <div className="lg:col-span-12 p-8 bg-white border border-dashed border-line rounded-xl flex flex-col items-center gap-2 text-center">
        <BookOpen size={28} aria-hidden="true" className="text-muted" /><p className="font-bold text-ink">No tienes cursos asignados</p>
      </div> : <><section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 min-w-0">
        {cursos.map(curso => <article key={curso.sectionCourseId} className="bg-white rounded-xl border border-line border-l-4 border-l-accent p-4 shadow-sm hover:shadow-md hover:border-accent/40 transition-all group min-w-0">
          <div className="flex items-start gap-4">
            <span className="p-3 bg-accent-soft text-accent rounded-xl border border-accent/10 shrink-0 group-hover:scale-105 transition-transform"><BookOpen size={20} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1"><span className="text-[10px] font-bold text-muted bg-neutral border border-line rounded-md px-2 py-0.5 inline-block mb-1">{curso.code}</span>
              <h3 className="font-bold text-base text-ink break-words group-hover:text-accent transition-colors">{curso.name}</h3>
              <p className="text-xs text-muted mt-1 break-words">{curso.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · {curso.grade}° grado · Sección {curso.sectionName}</p>
              <p className="text-xs text-muted mt-1 break-words">Área: {curso.area}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-line">
            <div className="flex flex-wrap gap-3 text-[11px] font-medium text-muted">
              <span className="flex items-center gap-1"><Users size={14} aria-hidden="true" />{curso.studentCount} alumnos</span>
              <span className="flex items-center gap-1"><Clock size={14} aria-hidden="true" />{curso.weeklyHours} horas semanales</span>
            </div>
            <Link href={`/docente/cursos/${curso.sectionCourseId}`} onClick={() => setCursoActivo({ id: String(curso.sectionCourseId), nombre: curso.name, grado: `${curso.grade}° grado` })} className="flex items-center gap-1 min-h-10 px-3 py-2 rounded-lg bg-neutral text-ink hover:bg-accent hover:text-white group-hover:bg-accent group-hover:text-white text-xs font-bold transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-accent">Ingresar<ChevronRight size={16} aria-hidden="true" /></Link>
          </div>
        </article>)}
      </section><aside className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 min-w-0">
        <div className="bg-accent text-white rounded-xl p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Cursos por sección</span>
          <h3 className="text-lg font-bold tracking-tight mt-2">Tu carga lectiva</h3>
          <p className="text-xs text-white/90 mt-1 leading-relaxed">Horas semanales de tus cursos asignados.</p>
        </div>
        <section className="bg-white rounded-xl border border-line shadow-sm overflow-hidden">
          <h3 className="text-xs font-bold text-ink p-4 border-b border-line bg-neutral/30 flex items-center gap-2"><Clock size={16} aria-hidden="true" className="text-accent" />Horas por curso</h3>
          <ul className="divide-y divide-line px-4">{cursos.map(curso => <li key={curso.sectionCourseId} className="py-3 flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs font-bold text-ink break-words">{curso.name}</p><p className="text-[11px] text-muted mt-1 break-words">{curso.grade}° grado · Sección {curso.sectionName}</p></div>
            <span className="shrink-0 rounded-lg bg-accent-soft text-accent px-2 py-1 text-[11px] font-bold">{curso.weeklyHours} h/sem</span>
          </li>)}</ul>
        </section>
      </aside></>}
  </div>;
}
