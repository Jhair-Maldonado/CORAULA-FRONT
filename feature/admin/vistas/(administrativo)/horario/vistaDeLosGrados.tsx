'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search01Icon, Calendar01Icon, ArrowRight01Icon, UserGroupIcon, BookOpen01Icon } from 'hugeicons-react';
import { sectionsService } from '@/services/admin/sectionsService';
import { scheduleError, type ScheduleError } from '@/services/admin/schedulesService';
import type { SectionLevel, SectionResponse } from '@/types/sectionApi';
import ScheduleConflictError from './components/ScheduleConflictError';
import { buttonClass, inputClass } from './components/scheduleUi';

export default function VistaDeLosGrados() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<SectionLevel | ''>('');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: SectionResponse[]; error?: ScheduleError }>();
  const key = JSON.stringify([level, revision]);
  const loading = result?.key !== key;
  useEffect(() => {
    let current = true;
    sectionsService.list({ level: level || undefined }).then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: scheduleError(error) }); });
    return () => { current = false; };
  }, [level, key]);
  const filtered = result?.data?.filter(section => `${section.grade} ${section.name} ${section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))) ?? [];
  return <div className="w-full h-full p-6 overflow-y-auto bg-canvas text-ink"><div className="max-w-7xl mx-auto flex flex-col gap-5">
    <header><p className="text-accent text-[11px] font-bold uppercase tracking-widest">Planificación académica</p><h1 className="text-2xl font-bold tracking-tight mt-0.5">Horarios por Grado y Sección</h1><p className="text-muted text-xs font-medium mt-1">Selecciona una sección para consultar y gestionar sus bloques de horario.</p></header>
    <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-white border border-line rounded-xl p-3 shadow-sm">
      <div className="flex-1 min-w-0"><label htmlFor="schedule-search" className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Buscar por grado, sección o nivel</label><div className="relative"><Search01Icon size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" /><input id="schedule-search" placeholder="Buscar grado, sección o nivel..." className={`${inputClass} pl-9`} value={search} onChange={event => setSearch(event.target.value)} /></div></div>
      <div><label htmlFor="schedule-level" className="block text-xs font-bold mb-1">Nivel</label><select id="schedule-level" className={inputClass} value={level} onChange={event => setLevel(event.target.value as SectionLevel | '')}><option value="">Todos</option><option value="PRIMARY">Primaria</option><option value="SECONDARY">Secundaria</option></select></div>
    </div>
    {loading ? <p role="status" className="p-4 bg-white border border-line rounded-xl text-xs text-muted">Cargando secciones...</p> : result?.error ? <ScheduleConflictError error={result.error} retry={() => setRevision(n => n + 1)} /> : filtered.length === 0 ? <div className="p-8 bg-white border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2"><Calendar01Icon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold">No se encontraron secciones.</p><p className="text-xs text-muted">Revisa la búsqueda y los filtros seleccionados.</p></div> :
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{filtered.map(section => <article key={section.id} className="min-w-0 bg-white border border-line rounded-xl p-4 shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex flex-col gap-4 group">
        <div className="flex items-start gap-2.5"><div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">{section.grade}°</div><div className="min-w-0 flex-1"><h2 className="text-xs font-bold leading-snug break-words group-hover:text-accent transition-colors">{section.grade}° grado · {section.name}</h2><span className="inline-block mt-1 px-1.5 py-0.5 bg-neutral border border-line rounded text-[10px] font-semibold text-muted">{section.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}</span></div></div>
        <span className={`w-fit px-2 py-0.5 rounded-md border text-[10px] font-bold ${section.active ? 'bg-accent-soft text-accent border-accent/20' : 'bg-neutral text-muted border-line'}`}>{section.active ? 'Activo' : 'Inactivo'}</span>
        <dl className="text-[11px] space-y-2 border-t border-line pt-3">
          <div className="flex justify-between gap-2"><dt className="text-muted flex items-center gap-1.5"><UserGroupIcon size={14} aria-hidden="true" className="text-accent" />Capacidad</dt><dd className="font-bold">{section.maxCapacity}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-muted flex items-center gap-1.5"><BookOpen01Icon size={14} aria-hidden="true" className="text-accent" />Matrícula</dt><dd className="font-bold">{section.enrollmentOpen ? 'Abierta' : 'Cerrada'}</dd></div>
        </dl>
        <Link className={`${buttonClass} bg-neutral/80 text-ink hover:bg-accent hover:text-white hover:border-accent mt-auto flex items-center justify-center gap-1.5 group/action`} href={`/administrador/horario/gradoHorario/${section.id}`} aria-label={`Ver horario de ${section.name}, grado ${section.grade}`}><Calendar01Icon size={15} aria-hidden="true" />Ver Horario<ArrowRight01Icon size={14} aria-hidden="true" className="group-hover/action:translate-x-1 transition-transform" /></Link>
      </article>)}</div>}
  </div></div>;
}
