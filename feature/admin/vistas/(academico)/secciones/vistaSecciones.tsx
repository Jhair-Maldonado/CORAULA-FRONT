'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FilterIcon, BookOpen01Icon, ArrowRight01Icon } from 'hugeicons-react';
import { sectionsService } from '@/services/admin/sectionsService';
import { sectionErrorMessage } from '@/services/admin/sectionErrors';
import type { SectionListParams, SectionResponse } from '@/types/sectionApi';
import { inputClass, labelClass, secondaryButtonClass, Failure, SectionBadge, SectionEmpty, SectionLoading, sectionName } from './sectionUi';

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
  return <div className="p-6 overflow-y-auto h-full bg-canvas text-ink font-sans">
    <div className="max-w-7xl mx-auto flex flex-col gap-5">
      <header><p className="text-accent text-[11px] font-bold uppercase tracking-widest">Académico</p><h1 className="text-2xl font-bold tracking-tight mt-0.5">Secciones</h1><p className="text-muted text-xs font-medium mt-1">Consulta las secciones y gestiona sus cursos y docentes asignados.</p></header>
      <div className="flex flex-col sm:flex-row sm:items-end flex-wrap gap-3 p-3 bg-white border border-line rounded-xl shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-ink sm:self-center sm:mr-2"><FilterIcon size={16} aria-hidden="true" className="text-accent" />Filtros de vista</div>
        <label className={labelClass}>Nivel
          <select className={inputClass} value={query.level ?? ''} onChange={event => setQuery(previous => ({ ...previous, level: event.target.value === '' ? undefined : event.target.value as SectionListParams['level'] }))}>
            <option value="">Todos</option><option value="PRIMARY">Primaria</option><option value="SECONDARY">Secundaria</option>
          </select>
        </label>
        <label className={labelClass}>Grado
          <input className={inputClass} type="number" min={1} step={1} placeholder="Todos" value={query.grade ?? ''} onChange={event => {
            const value = event.target.valueAsNumber;
            if (event.target.value === '' || (Number.isInteger(value) && value > 0)) setQuery(previous => ({ ...previous, grade: event.target.value === '' ? undefined : value }));
          }} />
        </label>
        <label className={labelClass}>Estado
          <select className={inputClass} value={query.active === undefined ? '' : String(query.active)} onChange={event => setQuery(previous => ({ ...previous, active: event.target.value === '' ? undefined : event.target.value === 'true' }))}>
            <option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option>
          </select>
        </label>
      </div>
      {loading ? <SectionLoading>Cargando secciones...</SectionLoading> : result?.error ? <Failure message={result.error} retry={() => setRevision(n => n + 1)} /> : result?.data && (
        result.data.length === 0 ? <SectionEmpty title="No se encontraron secciones">Ajusta los filtros para intentar nuevamente.</SectionEmpty> :
          <div className="overflow-x-auto bg-white border border-line rounded-xl shadow-sm"><table className="w-full text-left text-xs">
            <thead className="bg-neutral/60 text-[10px] font-bold text-muted uppercase tracking-wider"><tr>{['Nivel', 'Grado', 'Sección', 'Capacidad', 'Matrícula', 'Estado', 'Acción'].map(label => <th scope="col" className="py-3 px-4" key={label}>{label}</th>)}</tr></thead>
            <tbody>{result.data.map(section => <tr key={section.id} className="border-t border-line hover:bg-neutral/30 transition-colors">
              <td className="py-3 px-4">{section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}</td><td className="py-3 px-4 font-semibold">{section.grade}°</td><td className="py-3 px-4 font-bold break-words">{sectionName(section.name)}</td><td className="py-3 px-4">{section.maxCapacity}</td><td className="py-3 px-4"><SectionBadge positive={section.enrollmentOpen}>{section.enrollmentOpen ? 'Abierta' : 'Cerrada'}</SectionBadge></td><td className="py-3 px-4"><SectionBadge positive={section.active}>{section.active ? 'Activo' : 'Inactivo'}</SectionBadge></td>
              <td className="py-3 px-4"><Link className={`${secondaryButtonClass} inline-flex items-center gap-1.5 whitespace-nowrap hover:bg-accent hover:text-white hover:border-accent group/action`} href={`/administrador/secciones/${section.id}`} aria-label={`Ver cursos de ${sectionName(section.name)}, grado ${section.grade}`}><BookOpen01Icon size={15} aria-hidden="true" />Ver cursos<ArrowRight01Icon size={14} aria-hidden="true" className="group-hover/action:translate-x-0.5 transition-transform" /></Link></td>
            </tr>)}</tbody>
          </table></div>
      )}
    </div>
  </div>;
}
