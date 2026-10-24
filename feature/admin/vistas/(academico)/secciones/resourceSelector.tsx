'use client';

import { useEffect, useState } from 'react';
import { Search01Icon, CheckmarkCircle01Icon } from 'hugeicons-react';
import { coursesService } from '@/services/admin/coursesService';
import { teachersService } from '@/services/admin/teachersService';
import { sectionErrorMessage } from '@/services/admin/sectionErrors';
import type { SectionLevel } from '@/types/sectionApi';
import { secondaryButtonClass, inputClass, Failure, SectionLoading, SectionEmpty } from './sectionUi';

type Option = { id: number; name: string; description: string | null };
type Page = { content: Option[]; page: number; totalPages: number };

export default function ResourceSelector({ kind, level, busy, selected, onSelect }: {
  kind: 'course' | 'teacher'; level: SectionLevel; busy: boolean; selected: number | null; onSelect: (id: number | null) => void;
}) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState({ search: '', page: 0 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: Page; error?: string }>();
  const key = JSON.stringify([kind, level, query, revision]);
  const loading = result?.key !== key;
  const label = kind === 'course' ? 'curso' : 'docente';
  useEffect(() => {
    let current = true;
    const params = { active: true, search: query.search || undefined, page: query.page, size: 20 };
    const request: Promise<Page> = kind === 'course'
      ? coursesService.list({ ...params, level }).then(page => ({ ...page, content: page.content.map(course => ({ id: course.id, name: `${course.code} • ${course.name}`, description: course.area })) }))
      : teachersService.list(params).then(page => ({ ...page, content: page.content.map(teacher => ({ id: teacher.id, name: teacher.fullName, description: teacher.specialty })) }));
    request.then(data => { if (current) setResult({ key, data }); })
      .catch(error => { if (current) setResult({ key, error: sectionErrorMessage(error) }); });
    return () => { current = false; };
  }, [kind, level, query, key]);
  return <fieldset disabled={busy} className="flex flex-col gap-3 min-w-0">
    <legend className="text-xs font-bold mb-3 text-ink">Seleccionar {label} activo</legend>
    <label className="text-[10px] uppercase tracking-wider text-muted font-bold" htmlFor="resource-search">Buscar {label}</label>
    <div className="flex flex-wrap sm:flex-nowrap gap-2"><div className="relative flex-1 min-w-0"><Search01Icon size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" /><input id="resource-search" className={`${inputClass} w-full pl-9`} value={input} onChange={event => { setInput(event.target.value); onSelect(null); }}
      onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); onSelect(null); setQuery({ search: input.trim(), page: 0 }); }
      }} /></div>
      <button type="button" className={secondaryButtonClass} onClick={() => { onSelect(null); setQuery({ search: input.trim(), page: 0 }); }}>Buscar</button></div>
    {kind === 'teacher' && <p className="text-xs text-muted">La especialidad es informativa y no determina la elegibilidad para este curso.</p>}
    {loading ? <SectionLoading>Cargando opciones...</SectionLoading> : result?.error ? <Failure message={result.error} retry={() => setRevision(n => n + 1)} /> : result?.data && <>
      {result.data.content.length === 0 ? <SectionEmpty title="No se encontraron opciones activas">Ajusta la búsqueda para intentar nuevamente.</SectionEmpty> : <div className="flex flex-col gap-2">
        {result.data.content.map(option => <label key={option.id} className={`flex items-start gap-3 border rounded-xl p-3 text-xs cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ${selected === option.id ? 'bg-accent-soft/40 border-accent shadow-sm' : 'bg-white border-line hover:bg-neutral/50 hover:border-accent/40'}`}>
          <input type="radio" name="resource" value={option.id} checked={selected === option.id} onChange={() => onSelect(option.id)} className="mt-0.5 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-accent" />
          <span className="min-w-0 flex-1"><span className="font-bold text-ink break-words">{option.name}</span>{option.description && <span className="block text-[11px] text-muted mt-1 break-words">{option.description}</span>}</span>
          {selected === option.id && <span className="flex items-center gap-1 text-accent text-[10px] font-bold shrink-0"><CheckmarkCircle01Icon size={15} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Seleccionado</span></span>}
        </label>)}
      </div>}
      {result.data.totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <button type="button" className={secondaryButtonClass} disabled={result.data.page === 0} onClick={() => { onSelect(null); setQuery(previous => ({ ...previous, page: previous.page - 1 })); }}>Anterior</button>
        <span className="text-xs">Página {result.data.page + 1} de {result.data.totalPages}</span>
        <button type="button" className={secondaryButtonClass} disabled={result.data.page + 1 >= result.data.totalPages} onClick={() => { onSelect(null); setQuery(previous => ({ ...previous, page: previous.page + 1 })); }}>Siguiente</button>
      </div>}
    </>}
  </fieldset>;
}
