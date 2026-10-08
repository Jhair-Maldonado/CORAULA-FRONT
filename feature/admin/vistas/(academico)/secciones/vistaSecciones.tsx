'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionErrorMessage } from '@/services/admin/sectionErrors';
import type { SectionListParams, SectionResponse } from '@/types/sectionApi';
import { buttonClass, inputClass, Failure, sectionName } from './sectionUi';

export default function VistaSecciones() {
  const [query, setQuery] = useState<SectionListParams>({});
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: SectionResponse[]; error?: string }>();
  const key = JSON.stringify([query, revision]);
  const loading = result?.key !== key;
  useEffect(() => {
    let current = true;
    sectionsService.list(query).then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: sectionErrorMessage(error) }); });
    return () => { current = false; };
  }, [query, key]);
  return <div className="p-6 overflow-y-auto h-full bg-canvas text-ink">
    <div className="max-w-7xl mx-auto flex flex-col gap-5">
      <header><p className="text-accent text-xs font-bold uppercase">Académico</p><h1 className="text-2xl font-bold">Secciones</h1><p className="text-muted text-sm">Consulta las secciones y gestiona sus cursos y docentes asignados.</p></header>
      <div className="flex flex-wrap gap-4 p-4 bg-white border border-line rounded-xl">
        <label className="flex flex-col gap-1 text-xs font-bold">Nivel
          <select className={inputClass} value={query.level ?? ''} onChange={event => setQuery(previous => ({ ...previous, level: event.target.value === '' ? undefined : event.target.value as SectionListParams['level'] }))}>
            <option value="">Todos</option><option value="PRIMARY">Primaria</option><option value="SECONDARY">Secundaria</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">Grado
          <input className={inputClass} type="number" min={1} step={1} placeholder="Todos" value={query.grade ?? ''} onChange={event => {
            const value = event.target.valueAsNumber;
            if (event.target.value === '' || (Number.isInteger(value) && value > 0)) setQuery(previous => ({ ...previous, grade: event.target.value === '' ? undefined : value }));
          }} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">Estado
          <select className={inputClass} value={query.active === undefined ? '' : String(query.active)} onChange={event => setQuery(previous => ({ ...previous, active: event.target.value === '' ? undefined : event.target.value === 'true' }))}>
            <option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
          </select>
        </label>
      </div>
      {loading ? <p role="status">Cargando secciones...</p> : result?.error ? <Failure message={result.error} retry={() => setRevision(n => n + 1)} /> : result?.data && (
        result.data.length === 0 ? <p className="p-8 bg-white rounded-xl text-muted">No se encontraron secciones con los filtros seleccionados.</p> :
          <div className="overflow-x-auto bg-white border border-line rounded-xl"><table className="w-full text-left text-sm">
            <thead className="bg-neutral text-xs"><tr>{['Nivel', 'Grado', 'Sección', 'Capacidad', 'Matrícula', 'Estado', 'Acción'].map(label => <th scope="col" className="p-3" key={label}>{label}</th>)}</tr></thead>
            <tbody>{result.data.map(section => <tr key={section.id} className="border-t border-line">
              <td className="p-3">{section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}</td><td className="p-3">{section.grade}</td><td className="p-3 font-bold">{sectionName(section.name)}</td><td className="p-3">{section.maxCapacity}</td><td className="p-3">{section.enrollmentOpen ? 'Abierta' : 'Cerrada'}</td><td className="p-3">{section.active ? 'Activo' : 'Inactivo'}</td>
              <td className="p-3"><Link className={buttonClass} href={`/administrador/secciones/${section.id}`} aria-label={`Ver cursos de ${sectionName(section.name)}, grado ${section.grade}`}>Ver cursos</Link></td>
            </tr>)}</tbody>
          </table></div>
      )}
    </div>
  </div>;
}
