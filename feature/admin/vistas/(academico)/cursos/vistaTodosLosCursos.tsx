'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Add01Icon, BookOpen01Icon, ArrowRight01Icon } from 'hugeicons-react';
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
        <h1 className="text-ink text-2xl font-bold mt-0.5">Gestión de Cursos Académicos</h1>
        <p className="text-muted text-xs mt-1">Administra los cursos y su carga horaria semanal.</p>
      </div>
      <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-xs shadow-sm"><Add01Icon size={16} />Agregar Nuevo Curso</button>
    </div>
    <div className="max-w-7xl mx-auto w-full bg-white rounded-xl border border-line p-3 flex flex-col md:flex-row justify-between gap-3 shadow-xs">
      <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); setQuery(previous => ({ ...previous, search: searchInput.trim(), page: 0 })); }}>
        <input aria-label="Buscar por nombre o código" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Buscar por nombre o código..." className="bg-neutral border border-line rounded-lg px-3 py-2 text-xs w-full md:w-80" />
        <button className="bg-accent text-white px-3 py-2 rounded-lg text-xs font-bold">Buscar</button>
      </form>
      <label className="flex items-center gap-3 text-xs font-bold text-muted">Nivel:
        <select value={query.level ? (query.level === toCourseLevel('Primaria') ? 'Primaria' : 'Secundaria') : 'Todos'} onChange={e => setQuery(previous => ({
          ...previous, level: e.target.value === 'Todos' ? undefined : toCourseLevel(e.target.value as 'Primaria' | 'Secundaria'), page: 0,
        }))} className="bg-neutral border border-line rounded-lg px-3 py-2 text-ink">
          <option value="Todos">Todos los niveles</option><option>Primaria</option><option>Secundaria</option>
        </select>
      </label>
    </div>
    {loading && <p role="status" className="max-w-7xl mx-auto w-full text-sm text-muted">Cargando cursos...</p>}
    {error && <div role="alert" className="max-w-7xl mx-auto w-full p-4 bg-rose-50 text-rose-700 rounded-xl"><p>{error}</p><button onClick={() => setRevision(n => n + 1)} className="mt-2 underline font-bold text-xs">Reintentar</button></div>}
    {data && data.content.length === 0 && <p className="max-w-7xl mx-auto w-full p-6 bg-white border border-line rounded-xl text-sm text-muted">No hay cursos para los criterios seleccionados.</p>}
    {data && <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.content.map(toCurso).map(curso => <Link key={curso.id} href={`/administrador/cursos/asignatura/${curso.id}`} className="bg-white rounded-2xl border border-line p-4 shadow-xs hover:shadow-md hover:border-accent/40 transition-all flex flex-col justify-between group">
        <div><div className="flex items-start justify-between mb-3"><div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20"><BookOpen01Icon size={20} /></div><span className="text-[10px] font-bold bg-neutral px-2 py-1 rounded-md">{curso.codigo}</span></div>
          <h2 className="text-sm font-bold text-ink group-hover:text-accent">{curso.nombre}</h2><p className="text-[11px] text-muted mt-1">{curso.nivel} • {curso.area}</p>
          <div className="p-3 rounded-xl bg-neutral/40 border border-line/60 my-3"><span className="text-[9px] text-muted uppercase block">Horas semanales</span><span className="text-xs font-bold">{curso.horasTotalesSemana} hrs/sem</span></div>
        </div>
        <div className="pt-2 border-t border-line/50 flex items-center justify-between"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${curso.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral text-muted'}`}>{curso.active ? 'Activo' : 'Inactivo'}</span><ArrowRight01Icon size={16} className="text-accent" /></div>
      </Link>)}
    </div>}
    {data && <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
      <span>{data.totalElements} cursos • Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} • Tamaño {data.size}</span>
      {data.totalPages > 1 && <div className="flex gap-2"><button disabled={data.page <= 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1 }))} className="px-3 py-2 bg-white border border-line rounded-lg disabled:opacity-40">Anterior</button><button disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1 }))} className="px-3 py-2 bg-white border border-line rounded-lg disabled:opacity-40">Siguiente</button></div>}
    </div>}
    {showModal && <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div role="dialog" aria-modal="true" aria-labelledby="create-course-title" className="bg-white rounded-2xl border border-line p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 id="create-course-title" className="text-base font-bold mb-4">Registrar nuevo curso</h2>
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
