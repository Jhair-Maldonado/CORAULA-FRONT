'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Add01Icon, ViewIcon, ArrowLeft01Icon, ArrowRight01Icon, Search01Icon, UserCircleIcon, AlertCircleIcon, Clock01Icon } from 'hugeicons-react';
import { teachersService, teacherErrorMessage } from '@/services/admin/teachersService';
import { toAdminTeacher } from '@/adapters/teacherAdapter';
import type { PagedTeachersResponse, TeacherListParams, TeacherResponse } from '@/types/teacherApi';
import TeacherForm from './TeacherForm';

type ListResult = { key: string; data?: PagedTeachersResponse; error?: string };

export default function VistaTodosLosDocentes() {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState<TeacherListParams>({ page: 0, size: 20 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState<TeacherResponse | null>(null);
  const key = JSON.stringify([query, revision]);
  const loading = result?.key !== key;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    let current = true;
    teachersService.list(query)
      .then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: teacherErrorMessage(error) }); });
    return () => { current = false; };
  }, [query, revision, key]);

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans flex flex-col gap-5">
      <header className="max-w-7xl mx-auto w-full flex flex-wrap justify-between items-end gap-4">
        <div>
          <span className="text-accent text-[10px] font-bold tracking-widest uppercase">EQUIPO ACADÉMICO</span>
          <h1 className="text-ink text-2xl font-bold tracking-tight mt-1">Panel de docentes</h1>
          <p className="text-muted text-xs font-medium mt-1">Gestiona los datos y el estado de los docentes.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold min-h-10 shadow-sm hover:bg-accent/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Add01Icon size={16} aria-hidden="true" />Nuevo docente</button>
      </header>
      {created && <div role="status" className="max-w-7xl mx-auto w-full rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">
        Docente creado: <Link href={`/administrador/docentes/${created.id}`} className="underline font-bold">{created.fullName}</Link> (Activo).
      </div>}
      <div className="max-w-7xl mx-auto w-full bg-white border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm text-xs">
        <form className="flex gap-2 flex-1 min-w-0 w-full sm:min-w-64 max-w-md" onSubmit={event => {
          event.preventDefault();
          setQuery(previous => ({ ...previous, search: searchInput.trim() || undefined, page: 0 }));
        }}>
          <div className="relative min-w-0 flex-1"><Search01Icon size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" /><input aria-label="Buscar docentes" placeholder="Buscar docentes..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="w-full pl-9 pr-3 py-2 min-h-10 text-ink placeholder:text-muted bg-neutral/50 border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" /></div>
          <button className="px-3 py-2 min-h-10 bg-accent text-white rounded-lg font-bold hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Buscar</button>
        </form>
        <label className="text-[11px] font-bold text-muted flex items-center gap-2">Estado
          <select value={query.active === undefined ? 'all' : String(query.active)} onChange={e => setQuery(previous => ({
            ...previous, active: e.target.value === 'all' ? undefined : e.target.value === 'true', page: 0,
          }))} className="bg-neutral/50 border border-line rounded-lg px-3 py-2 min-h-10 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
          </select>
        </label>
      </div>
      {loading && <p role="status" className="max-w-7xl mx-auto w-full p-4 bg-white border border-line rounded-xl shadow-sm text-xs text-muted flex items-center gap-2"><Clock01Icon size={18} aria-hidden="true" className="text-accent shrink-0" />Cargando docentes...</p>}
      {error && <div role="alert" className="max-w-7xl mx-auto w-full p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        <p className="flex items-start gap-2 break-words font-medium"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{error}</p><button onClick={() => setRevision(n => n + 1)} className="mt-3 min-h-10 px-3 py-2 rounded-lg bg-white border border-line font-bold hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Reintentar</button>
      </div>}
      {data && <div className="max-w-7xl mx-auto w-full bg-white rounded-xl border border-line shadow-sm overflow-hidden">
        {data.content.length === 0 ? <div className="m-4 p-8 border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2"><UserCircleIcon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold text-ink">No se encontraron docentes con los criterios seleccionados.</p><p className="text-xs text-muted">Ajusta la búsqueda o el estado para intentar nuevamente.</p></div> :
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral/50 border-b border-line text-[10px] font-bold text-muted uppercase tracking-wider">
                <tr>{['Docente', 'DNI', 'Teléfono', 'Especialidad', 'Estado', 'Acción'].map(label => <th key={label} scope="col" className="py-3 px-4 break-words">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line text-xs text-ink">
                {data.content.map(toAdminTeacher).map(teacher => <tr key={teacher.id} className="group hover:bg-neutral/30 transition-colors">
                  <td className="py-3 px-4 break-words"><div className="flex items-center gap-2"><span className="w-10 h-10 rounded-full border border-accent/20 group-hover:scale-105 transition-transform bg-accent-soft text-accent flex items-center justify-center font-bold shrink-0">{teacher.iniciales}</span><span className="font-bold break-words">{teacher.nombreCompleto}</span></div></td>
                  <td className="py-3 px-4 break-words">{teacher.dni}</td>
                  <td className="py-3 px-4 break-words">{teacher.phone ?? 'No registrado'}</td>
                  <td className="py-3 px-4 break-words">{teacher.specialty ?? 'No registrada'}</td>
                  <td className="py-3 px-4 break-words"><span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${teacher.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral text-muted border-line'}`}>{teacher.estadoLabel}</span></td>
                  <td className="py-3 px-4 break-words"><Link href={`/administrador/docentes/${teacher.id}`} aria-label={`Ver perfil de ${teacher.nombreCompleto}`} className="inline-flex items-center justify-center p-2 min-w-10 min-h-10 rounded-lg bg-neutral text-muted hover:bg-accent hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ViewIcon size={16} aria-hidden="true" /></Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>}
        <div className="p-4 bg-neutral/20 border-t border-line flex flex-wrap justify-between items-center gap-3 text-xs text-muted">
          <span>{data.totalElements} docentes • Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} • Tamaño {data.size}</span>
          {data.totalPages > 1 && <div className="flex gap-2">
            <button aria-label="Página anterior" disabled={data.page <= 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1 }))} className="p-2 min-h-10 min-w-10 bg-white border border-line rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ArrowLeft01Icon size={14} aria-hidden="true" /></button>
            <button aria-label="Página siguiente" disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1 }))} className="p-2 min-h-10 min-w-10 bg-white border border-line rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><ArrowRight01Icon size={14} aria-hidden="true" /></button>
          </div>}
        </div>
      </div>}
      {showCreate && <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div role="dialog" aria-modal="true" aria-labelledby="create-teacher-title" className="bg-white rounded-2xl border border-line border-t-4 border-t-accent p-5 sm:p-6 max-w-xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 id="create-teacher-title" className="text-base font-bold tracking-tight mb-5 pb-3 border-b border-line flex items-center gap-2"><UserCircleIcon size={18} aria-hidden="true" className="text-accent" />Nuevo docente</h2>
          <TeacherForm onCancel={() => setShowCreate(false)} onSave={async payload => {
            const teacher = await teachersService.create(payload);
            setCreated(teacher);
            setShowCreate(false);
            setSearchInput('');
            setQuery({ page: 0, size: 20 });
            setRevision(n => n + 1);
          }} />
        </div>
      </div>}
    </div>
  );
}
