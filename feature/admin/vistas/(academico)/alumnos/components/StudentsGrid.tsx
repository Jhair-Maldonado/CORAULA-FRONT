'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search01Icon } from 'hugeicons-react';
import { studentsService, studentErrorMessage } from '@/services/admin/studentsService';
import { studentLevelLabels, toAdminStudent } from '@/adapters/studentAdapter';
import type { SectionResponse } from '@/types/sectionApi';
import type { PagedStudentsResponse } from '@/types/studentApi';
import { Failure, SectionEmpty, SectionLoading, primaryButtonClass, secondaryButtonClass, sectionName } from '../../secciones/sectionUi';
import { TarjetaEstudiante } from './TarjetaEstudiante';

type ListResult = { key: string; data?: PagedStudentsResponse; error?: string };

export function StudentsGrid({ section }: { section: SectionResponse }) {
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState({ search: '', page: 0 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ListResult>();
  const key = JSON.stringify([section.id, query, revision]);
  const loading = result?.key !== key;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    let current = true;
    studentsService.list({ sectionId: section.id, search: query.search || undefined, page: query.page, size: 20 })
      .then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: studentErrorMessage(error) }); });
    return () => { current = false; };
  }, [section.id, query, revision, key]);

  return <>
    <header>
      <Link href="/administrador/alumnos" className="text-muted text-[13px] font-medium hover:text-accent transition-colors flex items-center gap-2 mb-2 w-fit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><span aria-hidden="true">&larr;</span> Regresar al panel general</Link>
      <h1 className="text-ink text-xl font-bold font-sans">Alumnos - {sectionName(section.name)}</h1>
      <p className="text-muted text-[13px] mt-1">{[`${section.grade}° grado`, (studentLevelLabels as Record<string, string | undefined>)[section.level], 'Matrículas activas'].filter(Boolean).join(' · ')}</p>
    </header>
    <hr className="border-line" />
    <form className="w-full max-w-4xl bg-white border border-line rounded-xl flex items-center gap-3 px-4 py-2 shadow-sm shrink-0" onSubmit={event => {
      event.preventDefault();
      setQuery({ search: searchInput.trim(), page: 0 });
    }}>
      <Search01Icon size={18} aria-hidden="true" className="text-muted shrink-0" />
      <input aria-label="Buscar alumnos" placeholder="Buscar por nombre, apellidos, DNI o código" className="flex-1 min-w-0 min-h-10 bg-transparent text-xs font-medium text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" value={searchInput} onChange={event => setSearchInput(event.target.value)} />
      <button className={primaryButtonClass}>Buscar</button>
    </form>
    {loading && <SectionLoading>Cargando alumnos...</SectionLoading>}
    {error && <Failure message={error} retry={() => setRevision(n => n + 1)} />}
    {data && <>
      {data.content.length === 0 ? <SectionEmpty title={query.search ? 'No se encontraron alumnos con esta búsqueda' : 'No hay alumnos registrados en esta sección'}>{query.search ? 'Prueba con otros criterios de búsqueda.' : 'Los alumnos con matrícula activa aparecerán aquí.'}</SectionEmpty> :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{data.content.map(toAdminStudent).map(student => <TarjetaEstudiante key={student.id} student={student} sectionId={section.id} />)}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
        <span>{data.totalElements} alumnos · Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} · Tamaño {data.size}</span>
        {data.totalPages > 1 && <div className="flex gap-2">
          <button aria-label="Página anterior" className={secondaryButtonClass} disabled={data.page <= 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1 }))}>Anterior</button>
          <button aria-label="Página siguiente" className={secondaryButtonClass} disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1 }))}>Siguiente</button>
        </div>}
      </div>
    </>}
  </>;
}
