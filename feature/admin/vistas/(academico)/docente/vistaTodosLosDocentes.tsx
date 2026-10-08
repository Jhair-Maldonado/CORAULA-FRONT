'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Add01Icon, ViewIcon, ArrowLeft01Icon, ArrowRight01Icon } from 'hugeicons-react';
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
          <h1 className="text-ink text-xl font-bold mt-1">Panel de docentes</h1>
          <p className="text-muted text-xs mt-1">Gestiona los datos y el estado de los docentes.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold"><Add01Icon size={16} />Nuevo docente</button>
      </header>
      {created && <div role="status" className="max-w-7xl mx-auto w-full rounded-xl p-3 bg-emerald-50 text-emerald-800 text-sm">
        Docente creado: <Link href={`/administrador/docentes/${created.id}`} className="underline font-bold">{created.fullName}</Link> (Activo).
      </div>}
      <div className="max-w-7xl mx-auto w-full bg-white border border-line rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm text-xs">
        <form className="flex gap-2 flex-1 max-w-md" onSubmit={event => {
          event.preventDefault();
          setQuery(previous => ({ ...previous, search: searchInput.trim() || undefined, page: 0 }));
        }}>
          <input aria-label="Buscar docentes" placeholder="Buscar docentes..." value={searchInput} onChange={e => setSearchInput(e.target.value)} className="w-full px-3 py-2 bg-neutral border border-line rounded-lg outline-none" />
          <button className="px-3 py-2 bg-accent text-white rounded-lg font-bold">Buscar</button>
        </form>
        <label className="font-bold text-muted">Estado
          <select value={query.active === undefined ? 'all' : String(query.active)} onChange={e => setQuery(previous => ({
            ...previous, active: e.target.value === 'all' ? undefined : e.target.value === 'true', page: 0,
          }))} className="ml-2 bg-neutral border border-line rounded-lg px-3 py-2">
            <option value="all">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
          </select>
        </label>
      </div>
      {loading && <p role="status" className="max-w-7xl mx-auto w-full text-sm text-muted">Cargando docentes...</p>}
      {error && <div role="alert" className="max-w-7xl mx-auto w-full p-4 rounded-xl bg-rose-50 text-rose-700 text-sm">
        <p>{error}</p><button onClick={() => setRevision(n => n + 1)} className="mt-2 underline font-bold">Reintentar</button>
      </div>}
      {data && <div className="max-w-7xl mx-auto w-full bg-white rounded-xl border border-line shadow-sm overflow-hidden">
        {data.content.length === 0 ? <p className="p-10 text-center text-sm text-muted">No se encontraron docentes con los criterios seleccionados.</p> :
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral/50 border-b border-line text-[10px] font-bold text-muted uppercase">
                <tr>{['Docente', 'DNI', 'Teléfono', 'Especialidad', 'Estado', 'Acción'].map(label => <th key={label} scope="col" className="py-3 px-4">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line text-xs text-ink">
                {data.content.map(toAdminTeacher).map(teacher => <tr key={teacher.id} className="hover:bg-neutral/30">
                  <td className="py-3 px-4"><div className="flex items-center gap-2"><span className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold shrink-0">{teacher.iniciales}</span><span className="font-bold">{teacher.nombreCompleto}</span></div></td>
                  <td className="py-3 px-4">{teacher.dni}</td>
                  <td className="py-3 px-4">{teacher.phone ?? 'No registrado'}</td>
                  <td className="py-3 px-4">{teacher.specialty ?? 'No registrada'}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full font-bold ${teacher.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral text-muted'}`}>{teacher.estadoLabel}</span></td>
                  <td className="py-3 px-4"><Link href={`/administrador/docentes/${teacher.id}`} aria-label={`Ver perfil de ${teacher.nombreCompleto}`} className="inline-flex p-2 rounded-lg bg-neutral hover:bg-accent hover:text-white"><ViewIcon size={16} /></Link></td>
                </tr>)}
              </tbody>
            </table>
          </div>}
        <div className="p-4 bg-neutral/20 border-t border-line flex flex-wrap justify-between items-center gap-3 text-xs text-muted">
          <span>{data.totalElements} docentes • Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} • Tamaño {data.size}</span>
          {data.totalPages > 1 && <div className="flex gap-2">
            <button aria-label="Página anterior" disabled={data.page <= 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1 }))} className="p-2 bg-white border border-line rounded-lg disabled:opacity-40"><ArrowLeft01Icon size={14} /></button>
            <button aria-label="Página siguiente" disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1 }))} className="p-2 bg-white border border-line rounded-lg disabled:opacity-40"><ArrowRight01Icon size={14} /></button>
          </div>}
        </div>
      </div>}
      {showCreate && <div className="fixed inset-0 bg-ink/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <div role="dialog" aria-modal="true" aria-labelledby="create-teacher-title" className="bg-white rounded-2xl border border-line p-6 max-w-xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 id="create-teacher-title" className="text-base font-bold mb-4">Nuevo docente</h2>
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
