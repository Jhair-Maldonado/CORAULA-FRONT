'use client';

// Incidencias del hijo activo para el apoderado (FRONT #59, BACK #117). Solo lectura.
import { useEffect, useState } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { attendanceRangeError } from '@/services/padres/guardianAttendanceService';
import {
  GUARDIAN_INCIDENTS_PAGE_SIZE, formatLimaDateTime, guardianIncidentsErrorMessage, guardianIncidentsService, incidentsDefaultRange, limaDay,
} from '@/services/padres/guardianIncidentsService';
import type { GuardianIncidentSeverity, GuardianIncidentsPage } from '@/types/guardianIncidentsApi';

export const INCIDENTS_EMPTY_MESSAGE = 'No hay incidencias registradas en este periodo';

const SEVERITY: Record<GuardianIncidentSeverity, { label: string; className: string }> = {
  LEVE: { label: 'Leve', className: 'bg-sky-50 text-sky-800 border-sky-200' },
  MODERADA: { label: 'Moderada', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  GRAVE: { label: 'Grave', className: 'bg-rose-50 text-rose-800 border-rose-200' },
};

const pagerButton = 'rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-neutral disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function ListaIncidencias({ data, onPageChange }: { data: GuardianIncidentsPage; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(data.totalPages, 1);
  return (
    <>
      <ul className="space-y-3" aria-label="Incidencias">
        {data.content.map(incident => {
          const severity = SEVERITY[incident.severity];
          return (
            <li key={incident.id} className="rounded-xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time dateTime={incident.occurredAt} className="text-sm font-bold text-ink">{formatLimaDateTime(incident.occurredAt)}</time>
                <span className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${severity.className}`}>Gravedad: {severity.label}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-muted">Curso: {incident.courseName}</p>
              <p className="mt-2 whitespace-pre-line break-words text-sm text-ink">{incident.description}</p>
            </li>
          );
        })}
      </ul>
      {data.totalPages > 1 && (
        <nav aria-label="Paginación de incidencias" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <span>Página {data.page + 1} de {totalPages} · {data.totalElements} incidencias</span>
          <div className="flex gap-2">
            <button type="button" className={pagerButton} disabled={data.page <= 0} onClick={() => onPageChange(data.page - 1)}>Anterior</button>
            <button type="button" className={pagerButton} disabled={data.page + 1 >= data.totalPages} onClick={() => onPageChange(data.page + 1)}>Siguiente</button>
          </div>
        </nav>
      )}
    </>
  );
}

type Load = { key: string; data?: GuardianIncidentsPage; error?: string };

export default function VistaIncidencias() {
  const { hijoActivo: hijo, isLoading: padreLoading, error: padreError, refreshPadreData } = usePadre();
  const [today] = useState(limaDay);
  const [range, setRange] = useState(() => incidentsDefaultRange(today));
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Load>();
  const studentId = hijo?.id ?? null;
  const rangeError = range.to > today ? 'La fecha final no puede ser posterior a hoy.' : attendanceRangeError(range.from, range.to);
  const key = studentId && !rangeError ? JSON.stringify([studentId, range.from, range.to, page, revision]) : null;

  useEffect(() => {
    if (!key || !studentId) return;
    const abort = new AbortController();
    guardianIncidentsService.list(studentId, range.from, range.to, page, GUARDIAN_INCIDENTS_PAGE_SIZE, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!abort.signal.aborted) setResult({ key, error: guardianIncidentsErrorMessage(error) }); });
    return () => abort.abort();
  }, [key, studentId, range.from, range.to, page]);

  // Otro hijo o un rango nuevo vuelven a la primera página.
  const [lastScope, setLastScope] = useState(studentId);
  if (lastScope !== studentId) { setLastScope(studentId); setPage(0); }
  const changeRange = (next: { from: string; to: string }) => { setRange(next); setPage(0); };

  const loading = !!key && result?.key !== key;
  const current = loading ? undefined : result;

  return (
    <div className="mx-auto max-w-5xl py-4">
      <h1 className="text-xl font-black text-ink">Incidencias del estudiante</h1>
      <p className="mt-1 text-sm text-muted">Incidencias registradas por los docentes. Las fechas y horas están en hora de Lima.</p>

      {padreLoading ? <p role="status" className="mt-6 text-sm text-muted">Cargando estudiantes…</p> : padreError ? (
        <div className="mt-6 text-sm text-accent" role="alert">
          {padreError} <button type="button" className="underline" onClick={() => { void refreshPadreData(); }}>Reintentar</button>
        </div>
      ) : !hijo ? (
        <p className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-muted">No tiene estudiantes vinculados.</p>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold text-ink">{hijo.nombreCompleto}</p>
          <div className="my-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
            <label className="text-xs font-semibold text-muted">
              Desde
              <input aria-label="Desde" type="date" value={range.from} max={range.to || today} onChange={e => changeRange({ ...range, from: e.target.value })} className="mt-1 block rounded-lg border border-line p-2 text-ink" />
            </label>
            <label className="text-xs font-semibold text-muted">
              Hasta
              <input aria-label="Hasta" type="date" value={range.to} min={range.from} max={today} onChange={e => changeRange({ ...range, to: e.target.value })} className="mt-1 block rounded-lg border border-line p-2 text-ink" />
            </label>
            <button type="button" onClick={() => setRevision(n => n + 1)} disabled={loading || !!rangeError} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Actualizar</button>
            <p className="w-full text-[11px] text-muted">Rango de hasta 92 días.</p>
          </div>
          {rangeError ? <p role="alert" className="text-sm text-accent">{rangeError}</p>
            : loading ? <p role="status" className="text-sm text-muted">Cargando incidencias…</p>
            : current?.error ? (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p>{current.error}</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={() => setRevision(n => n + 1)}>Reintentar</button>
              </div>
            )
            : current?.data && current.data.totalElements === 0 && current.data.content.length === 0
              ? <p role="status" className="rounded-xl border border-line bg-white p-6 text-sm text-muted">{INCIDENTS_EMPTY_MESSAGE}</p>
            : current?.data ? <ListaIncidencias data={current.data} onPageChange={setPage} /> : null}
        </>
      )}
    </div>
  );
}
