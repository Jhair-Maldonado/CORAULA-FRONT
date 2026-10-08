'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Add01Icon, BookOpen01Icon, ArrowRight01Icon, Search01Icon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { coursesService, courseErrorMessage } from '@/services/admin/coursesService';
import { toCurso, toCreateCourse, toCourseLevel } from '@/adapters/courseAdapter';
import type { CourseLevel, PagedCourseResponse } from '@/types/courseApi';
import CourseForm from './courseForm';

type ListState = { key: string; data?: PagedCourseResponse; error?: string };

export default function VistaTodosLosCursos() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState<{ search: string; level?: CourseLevel; page: number }>({ search: '', page: 0 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ListState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const key = JSON.stringify([query, revision]);
  const loading = result?.key !== key;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    let current = true;
    coursesService.list({ ...query, search: query.search || undefined, size: 20 })
      .then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: courseErrorMessage(error) }); });
    return () => { current = false; };
  }, [query, revision, key]);

  return <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
    <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><span className="text-accent text-[10px] font-bold tracking-widest uppercase">CATÁLOGO ACADÉMICO</span>
        <h1 className="text-ink text-2xl font-bold tracking-tight mt-0.5">Gestión de Cursos Académicos</h1>
        <p className="text-muted text-xs font-medium mt-1">Administra los cursos y su carga horaria semanal.</p>
      </div>
      <button onClick={() => setShowModal(true)} className="flex items-center gap-2 min-h-10 px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-xs shadow-sm hover:bg-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent w-fit"><Add01Icon size={16} aria-hidden="true" />Agregar Nuevo Curso</button>
    </div>
    <div className="max-w-7xl mx-auto w-full bg-white rounded-xl border border-line p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
      <form className="flex items-center gap-2 min-w-0" onSubmit={event => { event.preventDefault(); setQuery(previous => ({ ...previous, search: searchInput.trim(), page: 0 })); }}>
        <div className="relative min-w-0 flex-1"><Search01Icon size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" /><input aria-label="Buscar por nombre o código" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Buscar por nombre o código..." className="bg-neutral/50 border border-line rounded-lg pl-9 pr-3 py-2 min-h-10 text-xs font-medium text-ink placeholder:text-muted w-full md:w-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /></div>
        <button className="bg-accent text-white px-3 py-2 min-h-10 rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Buscar</button>
      </form>
      <label className="flex items-center gap-3 text-xs font-bold text-muted">Nivel:
        <select value={query.level ? (query.level === toCourseLevel('Primaria') ? 'Primaria' : 'Secundaria') : 'Todos'} onChange={e => setQuery(previous => ({
          ...previous, level: e.target.value === 'Todos' ? undefined : toCourseLevel(e.target.value as 'Primaria' | 'Secundaria'), page: 0,
        }))} className="bg-neutral/50 border border-line rounded-lg px-3 py-2 min-h-10 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <option value="Todos">Todos los niveles</option><option>Primaria</option><option>Secundaria</option>
        </select>
      </label>
    </div>
    {loading && <p role="status" className="max-w-7xl mx-auto w-full p-4 bg-white border border-line rounded-xl shadow-sm text-xs text-muted flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="text-accent shrink-0" />Cargando cursos...</p>}
    {error && <div role="alert" className="max-w-7xl mx-auto w-full p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs"><p className="flex items-start gap-2 font-medium break-words"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{error}</p><button onClick={() => setRevision(n => n + 1)} className="mt-3 min-h-10 px-3 py-2 rounded-xl bg-white border border-line font-bold text-xs hover:bg-neutral focus-visible:outline-2 focus-visible:outline-accent">Reintentar</button></div>}
    {data && data.content.length === 0 && <div className="max-w-7xl mx-auto w-full p-8 bg-white border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2"><BookOpen01Icon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold text-ink">No hay cursos para los criterios seleccionados.</p><p className="text-xs text-muted">Ajusta la búsqueda o el nivel para intentar nuevamente.</p></div>}
    {data && <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.content.map(toCurso).map(curso => <Link key={curso.id} href={`/administrador/cursos/asignatura/${curso.id}`} className="min-w-0 bg-white rounded-2xl border border-line p-4 shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex flex-col justify-between group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <div><div className="flex items-start justify-between gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20 shrink-0 group-hover:scale-105 transition-transform"><BookOpen01Icon size={20} aria-hidden="true" /></div><span className="text-[10px] font-bold tracking-wider bg-neutral px-2 py-1 rounded-md border border-line break-words">{curso.codigo}</span></div>
          <h2 className="text-sm font-bold text-ink group-hover:text-accent transition-colors leading-snug break-words">{curso.nombre}</h2><p className="text-[11px] font-medium text-muted mt-1 break-words">{curso.nivel} • {curso.area}</p>
          <div className="p-3 rounded-xl bg-neutral/40 border border-line/60 my-3"><span className="text-[9px] text-muted uppercase block">Horas semanales</span><span className="text-xs font-bold">{curso.horasTotalesSemana} hrs/sem</span></div>
        </div>
        <div className="pt-2 border-t border-line/50 flex items-center justify-between"><span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${curso.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral text-muted border-line'}`}>{curso.active ? 'Activo' : 'Inactivo'}</span><span className="w-9 h-9 rounded-lg bg-neutral text-muted group-hover:bg-accent group-hover:text-white flex items-center justify-center transition-colors"><ArrowRight01Icon size={16} aria-hidden="true" /></span></div>
      </Link>)}
    </div>}
    {data && <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
      <span>{data.totalElements} cursos • Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} • Tamaño {data.size}</span>
      {data.totalPages > 1 && <div className="flex gap-2"><button disabled={data.page <= 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1 }))} className="min-h-10 px-3 py-2 bg-white border border-line rounded-lg disabled:opacity-40 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-accent">Anterior</button><button disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1 }))} className="min-h-10 px-3 py-2 bg-white border border-line rounded-lg disabled:opacity-40 hover:bg-neutral focus-visible:outline-2 focus-visible:outline-accent">Siguiente</button></div>}
    </div>}
    {showModal && <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="create-course-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-5 sm:p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 id="create-course-title" className="text-base font-bold tracking-tight mb-5 pb-3 border-b border-line flex items-center gap-2"><BookOpen01Icon size={18} aria-hidden="true" className="text-accent" />Registrar nuevo curso</h2>
        <CourseForm onCancel={() => setShowModal(false)} onSave={async values => {
          await coursesService.create(toCreateCourse(values));
          setShowModal(false);
          setQuery(previous => ({ ...previous, page: 0 }));
          setRevision(n => n + 1);
        }} />
      </div>
    </div>}
  </div>;
}
