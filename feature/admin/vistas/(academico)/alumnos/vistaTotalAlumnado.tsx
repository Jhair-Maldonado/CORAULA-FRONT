'use client';

import { useEffect, useState } from 'react';
import { Search01Icon, ArrowLeft01Icon, ArrowRight02Icon, UserCircleIcon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { studentsService, studentErrorMessage } from '@/services/admin/studentsService';
import { studentLevelLabels, studentStatusLabels, toAdminStudent } from '@/adapters/studentAdapter';
import type { PagedStudentsResponse, StudentLevel, StudentListParams, StudentStatus } from '@/types/studentApi';
import { TarjetaEstudiante } from './components/TarjetaEstudiante';

type ListResult = { key: string; data?: PagedStudentsResponse; error?: string };

export default function VistaTotalAlumnado() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState<StudentListParams>({ page: 0, size: 20 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const key = JSON.stringify([query, revision]);
  const loading = result?.key !== key;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    let current = true;
    studentsService.list(query)
      .then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: studentErrorMessage(error) }); });
    return () => { current = false; };
  }, [query, revision, key]);

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header>
          <span className="text-accent text-[11px] font-bold tracking-widest uppercase">Alumnado</span>
          <h1 className="text-ink text-2xl font-bold tracking-tight mt-1">Listado de Alumnos</h1>
        </header>
        <div className="bg-white border border-line rounded-xl p-3 flex flex-wrap gap-3 items-center shadow-sm text-xs">
          <form className="flex gap-2 flex-1 min-w-0 w-full sm:min-w-64" onSubmit={event => {
            event.preventDefault();
            setQuery(previous => ({ ...previous, search: searchInput.trim() || undefined, page: 0 }));
          }}>
            <label className="flex items-center gap-2 flex-1 min-w-0 bg-neutral/50 border border-line rounded-lg px-3 focus-within:border-accent">
              <Search01Icon size={16} aria-hidden="true" className="text-muted shrink-0" />
              <input aria-label="Buscar alumnos" placeholder="Buscar alumnos..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="w-full min-w-0 min-h-10 bg-transparent text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
            </label>
            <button className="bg-accent text-white px-3 py-2 min-h-10 rounded-lg font-bold hover:bg-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Buscar</button>
          </form>
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted">Nivel
            <select value={query.level ?? ''} onChange={e => setQuery(previous => ({ ...previous, level: (e.target.value || undefined) as StudentLevel | undefined, page: 0 }))} className="bg-neutral/50 border border-line rounded-lg px-3 py-2 min-h-10 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <option value="">Todos</option>
              {Object.entries(studentLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted">Grado
            <input type="number" min={1} step={1} aria-label="Filtrar por grado" placeholder="Todos" value={query.grade ?? ''} onChange={e => {
              const grade = e.target.value === '' ? undefined : Number(e.target.value);
              if (grade === undefined || (Number.isInteger(grade) && grade > 0)) setQuery(previous => ({ ...previous, grade, page: 0 }));
            }} className="w-20 bg-neutral/50 border border-line rounded-lg px-3 py-2 min-h-10 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
          </label>
          <label className="flex items-center gap-2 text-[11px] font-bold text-muted">Estado
            <select value={query.status ?? ''} onChange={e => setQuery(previous => ({ ...previous, status: (e.target.value || undefined) as StudentStatus | undefined, page: 0 }))} className="bg-neutral/50 border border-line rounded-lg px-3 py-2 min-h-10 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <option value="">Todos</option>
              {Object.entries(studentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {loading && <p role="status" className="p-4 bg-white border border-line rounded-xl shadow-sm text-xs text-muted flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="text-accent shrink-0" />Cargando alumnos...</p>}
        {error && <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <p className="flex items-start gap-2 break-words font-medium"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{error}</p>
          <button onClick={() => setRevision(n => n + 1)} className="mt-3 min-h-10 px-3 py-2 rounded-lg bg-white border border-line font-bold hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
        </div>}
        {data && data.content.length === 0 && <div className="bg-white border border-line border-dashed p-8 rounded-xl text-center flex flex-col items-center gap-2"><UserCircleIcon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold text-ink">No se encontraron alumnos con los criterios actuales.</p><p className="text-xs text-muted">Ajusta los filtros para intentar nuevamente.</p></div>}
        {data && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.content.map(toAdminStudent).map(student => <TarjetaEstudiante key={student.id} student={student} />)}
        </div>}
        {data && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <span>{data.totalElements} alumnos • Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} • Tamaño {data.size}</span>
          {data.totalPages > 1 && <div className="flex gap-2">
            <button aria-label="Página anterior" disabled={data.page <= 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1 }))} className="p-2 min-h-10 min-w-10 bg-white border border-line rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ArrowLeft01Icon size={16} aria-hidden="true" /></button>
            <button aria-label="Página siguiente" disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1 }))} className="p-2 min-h-10 min-w-10 bg-white border border-line rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ArrowRight02Icon size={16} aria-hidden="true" /></button>
          </div>}
        </div>}
      </div>
    </div>
  );
}
