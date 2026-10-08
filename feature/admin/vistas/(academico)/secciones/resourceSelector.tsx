'use client';

import { useEffect, useState } from 'react';
import { coursesService } from '@/services/admin/coursesService';
import { teachersService } from '@/services/admin/teachersService';
import { sectionErrorMessage } from '@/services/admin/sectionErrors';
import type { SectionLevel } from '@/types/sectionApi';
import { buttonClass, inputClass, Failure } from './sectionUi';

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
  return <fieldset disabled={busy} className="flex flex-col gap-3">
    <legend className="text-xs font-bold mb-2">Seleccionar {label} activo</legend>
    <label className="text-xs font-bold" htmlFor="resource-search">Buscar {label}</label>
    <div className="flex gap-2"><input id="resource-search" className={`${inputClass} min-w-0 flex-1`} value={input} onChange={event => { setInput(event.target.value); onSelect(null); }}
      onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); onSelect(null); setQuery({ search: input.trim(), page: 0 }); }
      }} />
      <button type="button" className={buttonClass} onClick={() => { onSelect(null); setQuery({ search: input.trim(), page: 0 }); }}>Buscar</button></div>
    {kind === 'teacher' && <p className="text-xs text-muted">La especialidad es informativa y no determina la elegibilidad para este curso.</p>}
    {loading ? <p role="status" className="text-sm">Cargando opciones...</p> : result?.error ? <Failure message={result.error} retry={() => setRevision(n => n + 1)} /> : result?.data && <>
      {result.data.content.length === 0 ? <p className="text-sm text-muted">No se encontraron opciones activas.</p> : <div className="flex flex-col gap-2">
        {result.data.content.map(option => <label key={option.id} className="flex items-start gap-2 border border-line rounded-lg p-3 text-sm cursor-pointer">
          <input type="radio" name="resource" value={option.id} checked={selected === option.id} onChange={() => onSelect(option.id)} />
          <span><span className="font-bold">{option.name}</span>{option.description && <span className="block text-xs text-muted">{option.description}</span>}</span>
        </label>)}
      </div>}
      {result.data.totalPages > 1 && <div className="flex items-center justify-between gap-2">
        <button type="button" className={buttonClass} disabled={result.data.page === 0} onClick={() => { onSelect(null); setQuery(previous => ({ ...previous, page: previous.page - 1 })); }}>Anterior</button>
        <span className="text-xs">Página {result.data.page + 1} de {result.data.totalPages}</span>
        <button type="button" className={buttonClass} disabled={result.data.page + 1 >= result.data.totalPages} onClick={() => { onSelect(null); setQuery(previous => ({ ...previous, page: previous.page + 1 })); }}>Siguiente</button>
      </div>}
    </>}
  </fieldset>;
}
