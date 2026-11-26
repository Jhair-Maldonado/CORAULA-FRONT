'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search01Icon, Calendar01Icon, ArrowRight01Icon, ArrowDown01Icon, UserGroupIcon, BookOpen01Icon, AlertCircleIcon } from 'hugeicons-react';
import { useGradeTree } from '@/hooks/useGradeTree';
import type { LevelNode, SectionNode } from '@/types/gradeTree';
import ScheduleConflictError from './components/ScheduleConflictError';
import { inputClass } from './components/scheduleUi';

type LevelFilter = 'Todos' | 'Primaria' | 'Secundaria';
type Card = { section: SectionNode; badge: string; title: string; level: LevelNode['etiqueta'] };

/** Aplana nivel → grado → sección en tarjetas, ya con los textos que se muestran. */
function toCards(tree: LevelNode[]): Card[] {
  return tree.flatMap(level => level.grados.flatMap(grade => grade.secciones.map(section => ({
    section, level: level.etiqueta, badge: `${grade.grado}°${section.letra}`, title: `${grade.nombre} · ${section.nombre}`,
  }))));
}

/**
 * Lista de secciones con enlace a su horario. Datos: GET /v1/management/vacancies (vía `useGradeTree`);
 * la búsqueda y el filtro de nivel se aplican en el cliente.
 */
export default function VistaDeLosGrados() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LevelFilter>('Todos');
  const { status, tree, error, retry } = useGradeTree();
  const term = search.trim().toLocaleLowerCase('es');
  const cards = toCards(tree).filter(card => (level === 'Todos' || card.level === level)
    && `${card.title} ${card.badge} ${card.level}`.toLocaleLowerCase('es').includes(term));
  return <div className="w-full h-full p-6 overflow-y-auto bg-canvas text-ink font-sans"><div className="max-w-7xl mx-auto flex flex-col gap-5">
    <header><p className="text-accent text-[10px] font-bold uppercase tracking-widest">Planificación académica</p><h1 className="text-2xl font-bold tracking-tight mt-0.5">Horarios por Grado y Sección</h1><p className="text-muted text-xs font-medium mt-1">Selecciona una sección para consultar y gestionar sus bloques de horario.</p></header>
    <div className="flex flex-col sm:flex-row sm:items-end gap-3 bg-white border border-line rounded-xl p-3 shadow-sm">
      <div className="flex-1 min-w-0"><label htmlFor="schedule-search" className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Buscar por grado, sección o nivel</label><div className="relative"><Search01Icon size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" /><input id="schedule-search" placeholder="Buscar grado, sección o nivel..." className={`${inputClass} pl-9`} value={search} onChange={event => setSearch(event.target.value)} /></div></div>
      <div><label htmlFor="schedule-level" className="block text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Nivel</label><div className="relative sm:w-48"><select id="schedule-level" className={`${inputClass} appearance-none pr-7 font-semibold hover:text-ink`} value={level} onChange={event => setLevel(event.target.value as LevelFilter)}><option value="Todos">Todos</option><option value="Primaria">Primaria</option><option value="Secundaria">Secundaria</option></select><ArrowDown01Icon size={14} aria-hidden="true" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" /></div></div>
    </div>
    {status === 'loading' && <p role="status" className="p-4 bg-white border border-line rounded-xl text-xs text-muted">Cargando secciones...</p>}
    {status === 'error' && <ScheduleConflictError error={{ message: error ?? 'No se pudieron cargar los grados. Intenta nuevamente.', details: [] }} retry={retry} />}
    {status === 'forbidden' && <p role="alert" className="p-4 bg-accent-soft border border-accent/20 text-accent rounded-xl text-xs font-medium flex items-start gap-2"><AlertCircleIcon size={18} aria-hidden="true" className="shrink-0" />{error}</p>}
    {status === 'no-period' && <div role="status" className="p-8 bg-white border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2"><Calendar01Icon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold">{error}</p><p className="text-xs text-muted">Registra o activa un periodo académico para ver los horarios.</p></div>}
    {status === 'ready' && (cards.length === 0
      ? <div className="p-8 bg-white border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-2"><Calendar01Icon size={28} aria-hidden="true" className="text-muted" /><p className="text-sm font-bold">No se encontraron secciones.</p><p className="text-xs text-muted">Revisa la búsqueda y los filtros seleccionados.</p></div>
      : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">{cards.map(({ section, badge, title, level: etiqueta }) => <article key={section.id} className="min-w-0 bg-white rounded-xl border border-line p-4 shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex flex-col justify-between group">
        <div>
          <div className="flex items-center gap-2.5"><div aria-hidden="true" className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform shrink-0">{badge}</div><h2 className="text-ink font-bold text-xs leading-snug group-hover:text-accent transition-colors break-words min-w-0">{title}</h2></div>
          <hr className="border-line/70 my-2.5" />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-muted text-[10px]"><span className="flex items-center gap-1.5"><BookOpen01Icon size={13} aria-hidden="true" className="text-accent shrink-0" />Nivel:</span><span className="font-bold text-ink">{etiqueta}{section.activa ? '' : ' · Inactiva'}</span></div>
            <div className="flex items-center justify-between text-muted text-[10px]"><span className="flex items-center gap-1.5"><UserGroupIcon size={13} aria-hidden="true" className="text-accent shrink-0" />Matriculados:</span><span aria-hidden="true" className="font-bold text-ink">{section.ocupacion}</span><span className="sr-only">{section.ocupacionAria}</span></div>
          </div>
        </div>
        <Link href={`/administrador/horario/gradoHorario/${section.id}`} aria-label={`Ver horario de ${title}`} className="w-full mt-4 py-2 px-3 min-h-10 rounded-lg bg-neutral/80 hover:bg-accent hover:text-white transition-all text-xs font-bold text-ink flex items-center justify-center gap-1.5 group/btn border border-line/50 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"><Calendar01Icon size={14} aria-hidden="true" /><span>Ver Horario</span><ArrowRight01Icon size={13} aria-hidden="true" className="group-hover/btn:translate-x-1 transition-transform" /></Link>
      </article>)}</div>)}
  </div></div>;
}
