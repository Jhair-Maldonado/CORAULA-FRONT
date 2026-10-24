'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircleIcon, Cancel01Icon, Clock01Icon, Search01Icon } from 'hugeicons-react';
import { auditService, auditErrorMessage } from '@/services/management/auditService';
import type { AuditDetailResponse, AuditListParams, PagedAuditResponse } from '@/types/auditApi';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const button = `min-h-10 px-4 py-2 rounded-xl border border-line text-xs font-bold hover:bg-neutral disabled:opacity-40 disabled:cursor-not-allowed ${focus}`;
const input = `w-full min-h-10 rounded-xl border border-line bg-neutral/40 px-3 py-2 text-xs text-ink ${focus}`;
const emptyFilters = { entity: '', action: '', userId: '', from: '', to: '' };

function localDayISO(value: string, nextDay = false): string | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day + (nextDay ? 1 : 0)).toISOString();
}

function localDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'medium' });
}

function ErrorNotice({ message, retry }: { message: string; retry: () => void }) {
  return <div role="alert" className="p-4 border border-line rounded-xl bg-white text-ink text-xs">
    <p className="flex items-center gap-2"><AlertCircleIcon size={18} aria-hidden="true" className="text-accent shrink-0" />{message}</p>
    <button type="button" onClick={retry} className={`${button} mt-3`}>Reintentar</button>
  </div>;
}

function AuditDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ revision: number; data?: AuditDetailResponse; error?: string } | null>(null);
  const loading = result?.revision !== revision;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    auditService.detail(id, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ revision, data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ revision, error: auditErrorMessage(error, true) }); });
    return () => controller.abort();
  }, [id, revision]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" aria-busy={loading}
      className="w-full max-w-4xl min-w-0 max-h-[90vh] overflow-y-auto rounded-2xl border border-line border-t-4 border-t-accent bg-white p-5 sm:p-6 shadow-xl text-ink"
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (event.key === 'Tab') {
          const nodes = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
          if (!nodes?.length) { event.preventDefault(); return; }
          const first = nodes[0], last = nodes[nodes.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
        }
      }}>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3 mb-5">
        <h2 id="audit-detail-title" className="text-base font-bold">Detalle del evento de auditoría #{id}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar detalle de auditoría" className={`${button} shrink-0 px-3`}><Cancel01Icon size={18} aria-hidden="true" /></button>
      </div>
      {loading && <p role="status" className="text-sm text-muted">Cargando detalle...</p>}
      {error && <ErrorNotice message={error} retry={() => setRevision(n => n + 1)} />}
      {data && <>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {[
            ['ID auditoría', data.id], ['Fecha exacta', `${localDate(data.occurredAt)} (${data.occurredAt})`],
            ['Usuario', data.userId === null ? 'Sistema' : `Usuario #${data.userId}`], ['Entidad', data.entity],
            ['ID entidad', data.entityId ?? '—'], ['Acción', data.action], ['Motivo', data.reason ?? '—'],
            ['IP', data.sourceIp ?? '—'], ['User-Agent', data.userAgent ?? '—'],
          ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted font-medium mb-1">{label}</dt><dd className="text-ink font-semibold break-words">{value}</dd></div>)}
        </dl>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {([
            ['VALOR ANTERIOR', data.previousValue, 'Sin valor anterior'],
            ['VALOR NUEVO', data.newValue, 'Sin valor nuevo'],
          ] as const).map(([label, value, fallback]) => <section key={label} className="min-w-0">
            <h3 className="text-[10px] font-bold tracking-widest text-accent mb-2">{label}</h3>
            {value === null ? <p className="text-xs text-muted border border-line rounded-xl p-4">{fallback}</p>
              : <pre tabIndex={0} aria-label={label} className={`max-h-80 overflow-auto rounded-xl border border-line bg-canvas p-4 text-xs text-ink ${focus}`}>{JSON.stringify(value, null, 2)}</pre>}
          </section>)}
        </div>
      </>}
    </div>
  </div>;
}

export default function VistaAuditoria() {
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState<AuditListParams>({ page: 0, size: 20 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: PagedAuditResponse; error?: string } | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const key = JSON.stringify([query, revision]);
  const loading = result?.key !== key;
  const data = loading ? undefined : result?.data;
  const error = loading ? undefined : result?.error;

  useEffect(() => {
    const controller = new AbortController();
    auditService.list(query, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, error: auditErrorMessage(error) }); });
    return () => controller.abort();
  }, [query, revision, key]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery({ page: 0, size: 20, entity: filters.entity.trim() || undefined, action: filters.action.trim() || undefined,
      userId: filters.userId ? Number(filters.userId) : undefined, from: localDayISO(filters.from), to: localDayISO(filters.to, true) });
    setRevision(n => n + 1);
  }

  return <div className="w-full min-w-0 h-full overflow-y-auto bg-canvas p-4 sm:p-6 font-sans text-ink">
    <div className="max-w-7xl mx-auto w-full min-w-0 flex flex-col gap-6">
      <header>
        <span className="text-accent text-[10px] font-bold tracking-widest">SEGURIDAD Y TRAZABILIDAD</span>
        <h1 className="text-2xl font-bold tracking-tight mt-0.5">Auditoría del sistema</h1>
        <p className="text-muted text-xs font-medium mt-1">Consulta las operaciones registradas y revisa los cambios realizados en los módulos institucionales.</p>
      </header>
      <form onSubmit={applyFilters} className="bg-white border border-line rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {([
            ['entity', 'Entidad', 'text'], ['action', 'Acción', 'text'], ['userId', 'Usuario ID', 'number'],
            ['from', 'Fecha desde', 'date'], ['to', 'Fecha hasta', 'date'],
          ] as const).map(([name, label, type]) => <label key={name} className="text-xs font-bold text-muted flex flex-col gap-2">
            {label}<input type={type} value={filters[name]} min={name === 'userId' ? 0 : name === 'to' ? filters.from || undefined : undefined}
              max={name === 'userId' ? Number.MAX_SAFE_INTEGER : undefined} step={name === 'userId' ? 1 : undefined}
              aria-describedby={name === 'entity' ? 'audit-entity-help' : name === 'to' ? 'audit-date-help' : undefined}
              onChange={event => setFilters(previous => ({ ...previous, [name]: event.target.value }))} className={input} />
          </label>)}
        </div>
        <p id="audit-entity-help" className="text-[11px] text-muted mt-3">Entidad y acción admiten el valor exacto registrado. Ejemplos de entidad: COURSE, TEACHER, SCHEDULE, SECTION, ATTENDANCE_SESSION.</p>
        <p id="audit-date-help" className="text-[11px] text-muted mt-1">Las fechas incluyen el día completo según tu hora local.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="submit" className={`${button} bg-accent text-white hover:bg-accent/90 flex items-center gap-2`}><Search01Icon size={16} aria-hidden="true" />Filtrar</button>
          <button type="button" className={button} onClick={() => { setFilters(emptyFilters); setQuery({ page: 0, size: 20 }); setRevision(n => n + 1); }}>Limpiar</button>
        </div>
      </form>
      {loading && <p role="status" className="flex items-center gap-2 p-4 bg-white rounded-xl border border-line text-xs text-muted"><Clock01Icon size={18} aria-hidden="true" className="text-accent" />Cargando eventos de auditoría...</p>}
      {error && <ErrorNotice message={error} retry={() => setRevision(n => n + 1)} />}
      {data && <>
        {data.content.length === 0 ? <div role="status" className="p-8 text-center bg-white border border-dashed border-line rounded-xl"><p className="text-sm font-bold">No hay eventos para los filtros seleccionados.</p><p className="text-xs text-muted mt-2">Ajusta los filtros o límpialos para consultar nuevamente.</p></div>
          : <div className="min-w-0 overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-xs text-left">
              <caption className="sr-only">Eventos de auditoría del sistema</caption>
              <thead className="bg-neutral/40 text-muted"><tr>{['Fecha / Hora', 'Usuario', 'Entidad', 'ID entidad', 'Acción', 'Motivo', 'Detalle'].map(label => <th key={label} scope="col" className="px-4 py-3 font-bold">{label}</th>)}</tr></thead>
              <tbody>{data.content.map(event => <tr key={event.id} className="border-t border-line hover:bg-canvas/50">
                <td className="px-4 py-3 whitespace-nowrap"><time dateTime={event.occurredAt}>{localDate(event.occurredAt)}</time></td>
                <td className="px-4 py-3 whitespace-nowrap">{event.userId === null ? 'Sistema' : `Usuario #${event.userId}`}</td>
                <td className="px-4 py-3 break-words max-w-48 font-semibold">{event.entity}</td>
                <td className="px-4 py-3">{event.entityId ?? '—'}</td>
                <td className="px-4 py-3 break-words max-w-48"><span className="inline-block border border-line rounded-lg bg-neutral/40 px-2 py-1 font-semibold">{event.action}</span></td>
                <td className="px-4 py-3 break-words min-w-40 max-w-64 text-muted">{event.reason ?? '—'}</td>
                <td className="px-4 py-3"><button type="button" aria-label={`Ver detalle del evento ${event.id}`} onClick={() => setSelectedId(event.id)} className={`${button} text-accent whitespace-nowrap`}>Ver detalle</button></td>
              </tr>)}</tbody>
            </table>
          </div>}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>{data.totalElements} eventos · Página {data.totalPages ? data.page + 1 : 0} de {data.totalPages} · Tamaño {data.size}</span>
          <div className="flex gap-2">
            <button type="button" disabled={data.page <= 0 || data.totalPages === 0} onClick={() => setQuery(previous => ({ ...previous, page: data.page - 1, size: data.size }))} className={`${button} bg-white`}>Anterior</button>
            <button type="button" disabled={data.page + 1 >= data.totalPages} onClick={() => setQuery(previous => ({ ...previous, page: data.page + 1, size: data.size }))} className={`${button} bg-white`}>Siguiente</button>
          </div>
        </div>
      </>}
    </div>
    {selectedId !== null && <AuditDetail key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} />}
  </div>;
}
