'use client';

import { useEffect, useState } from 'react';
import { Search01Icon, ArrowLeft01Icon, ArrowRight02Icon } from 'hugeicons-react';
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
          <h1 className="text-ink text-2xl font-bold mt-1">Listado de Alumnos</h1>
        </header>
        <div className="bg-white border border-line rounded-xl p-3 flex flex-wrap gap-3 items-center shadow-sm text-xs">
          <form className="flex gap-2 flex-1 min-w-48" onSubmit={event => {
            event.preventDefault();
            setQuery(previous => ({ ...previous, search: searchInput.trim() || undefined, page: 0 }));
          }}>
            <label className="flex items-center gap-2 flex-1">
              <Search01Icon size={16} className="text-muted shrink-0" />
              <input aria-label="Buscar alumnos" placeholder="Buscar alumnos..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="w-full outline-none bg-transparent" />
            </label>
            <button className="bg-accent text-white px-3 py-2 rounded-lg font-bold">Buscar</button>
          </form>
          <label>Nivel
            <select value={query.level ?? ''} onChange={e => setQuery(previous => ({ ...previous, level: (e.target.value || undefined) as StudentLevel | undefined, page: 0 }))} className="ml-2 bg-neutral border border-line rounded px-2 py-1">
              <option value="">Todos</option>
              {Object.entries(studentLevelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Grado
            <input type="number" min={1} step={1} aria-label="Filtrar por grado" placeholder="Todos" value={query.grade ?? ''} onChange={e => {
              const grade = e.target.value === '' ? undefined : Number(e.target.value);
              if (grade === undefined || (Number.isInteger(grade) && grade > 0)) setQuery(previous => ({ ...previous, grade, page: 0 }));
            }} className="ml-2 w-20 bg-neutral border border-line rounded px-2 py-1" />
          </label>
          <label>Estado
            <select value={query.status ?? ''} onChange={e => setQuery(previous => ({ ...previous, status: (e.target.value || undefined) as StudentStatus | undefined, page: 0 }))} className="ml-2 bg-neutral border border-line rounded px-2 py-1">
              <option value="">Todos</option>
              {Object.entries(studentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {loading && <p role="status" className="text-sm text-muted">Cargando alumnos...</p>}
        {error && <div role="alert" className="p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">
          <p>{error}</p>
          <button onClick={() => setRevision(n => n + 1)} className="mt-2 underline font-bold">Reintentar</button>
        </div>}
        {data && data.content.length === 0 && <p className="bg-white border border-line border-dashed p-8 rounded-xl text-sm text-muted">No se encontraron alumnos con los criterios actuales.</p>}
        {data && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.content.map(toAdminStudent).map(student => <TarjetaEstudiante key={student.id} student={student} />)}
        </div>}
        {data && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
          <span>{data.totalElements} alumnos • Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} • Tamaño {data.size}</span>
          {data.totalPages > 1 && <div className="flex gap-2">
            <button aria-label="Página anterior" disabled={data.page <= 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1 }))} className="p-2 bg-white border border-line rounded disabled:opacity-40"><ArrowLeft01Icon size={16} /></button>
            <button aria-label="Página siguiente" disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1 }))} className="p-2 bg-white border border-line rounded disabled:opacity-40"><ArrowRight02Icon size={16} /></button>
          </div>}
        </div>}
      </div>
    </div>
  );
}
