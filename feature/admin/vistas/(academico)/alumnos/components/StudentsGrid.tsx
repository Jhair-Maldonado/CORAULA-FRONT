'use client';

import { useEffect, useState } from 'react';
import { studentsService, studentErrorMessage } from '@/services/admin/studentsService';
import { toAdminStudent } from '@/adapters/studentAdapter';
import type { SectionResponse } from '@/types/sectionApi';
import type { PagedStudentsResponse } from '@/types/studentApi';
import { Failure, SectionEmpty, SectionLoading, inputClass, primaryButtonClass, secondaryButtonClass, sectionName } from '../../secciones/sectionUi';
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
    <header><h1 className="text-2xl font-bold">Alumnos - {sectionName(section.name)}</h1><p className="text-sm text-muted">{section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'} · {section.grade}° grado · Matrículas activas</p></header>
    <form className="flex flex-wrap gap-3" onSubmit={event => {
      event.preventDefault();
      setQuery({ search: searchInput.trim(), page: 0 });
    }}>
      <input aria-label="Buscar alumnos" placeholder="Buscar por nombre, apellidos, DNI o código" className={inputClass + ' flex-1'} value={searchInput} onChange={event => setSearchInput(event.target.value)} />
      <button className={primaryButtonClass}>Buscar</button>
    </form>
    {loading && <SectionLoading>Cargando alumnos...</SectionLoading>}
    {error && <Failure message={error} retry={() => setRevision(n => n + 1)} />}
    {data && <>
      {data.content.length === 0 ? <SectionEmpty title={query.search ? 'No se encontraron alumnos con esta búsqueda' : 'No hay alumnos registrados en esta sección'}>{query.search ? 'Prueba con otros criterios de búsqueda.' : 'Los alumnos con matrícula activa aparecerán aquí.'}</SectionEmpty> :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{data.content.map(toAdminStudent).map(student => <TarjetaEstudiante key={student.id} student={student} />)}</div>}
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
