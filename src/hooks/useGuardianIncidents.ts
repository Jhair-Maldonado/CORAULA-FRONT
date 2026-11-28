'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adaptGuardianIncidents, parseSeverityFilter, type IncidentsView } from '@/adapters/guardianIncidentsAdapter';
import { attendanceRangeError } from '@/services/padres/guardianAttendanceService';
import {
  GUARDIAN_INCIDENTS_MAX_PAGE_SIZE, guardianIncidentsErrorMessage, guardianIncidentsService, incidentsDefaultRange, limaDay,
} from '@/services/padres/guardianIncidentsService';
import type { GuardianIncidentSeverityFilter, GuardianIncidentsPage } from '@/types/guardianIncidentsApi';

const PATH = '/padre/incidencias';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

type Load = { key: string; data?: GuardianIncidentsPage; error?: string };

export interface GuardianIncidentFilters { from: string; to: string; severity: GuardianIncidentSeverityFilter }

/**
 * Incidencias del hijo activo con rango y gravedad en la URL (`?desde=&hasta=&gravedad=`), de modo que
 * recargar o compartir el enlace conserva los filtros. Debe montarse bajo `Suspense` (useSearchParams).
 *
 * Una sola petición por (hijo, rango) con `size = 100`: los KPI y el filtro de gravedad se calculan en cliente
 * sobre esa página, por lo que cambiar de gravedad no vuelve a consultar. Cambiar de hijo, de rango o recargar
 * cancela la petición anterior (AbortController). Sin hijo o con rango inválido no se hace ninguna petición.
 *
 * @param studentId hijo activo (id de `usePadre`), o null si no hay.
 */
export function useGuardianIncidents(studentId: string | null) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [today] = useState(limaDay);
  const defaults = useMemo(() => incidentsDefaultRange(today), [today]);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Load>();

  const desde = searchParams?.get('desde') ?? '', hasta = searchParams?.get('hasta') ?? '', gravedad = searchParams?.get('gravedad');
  const filters: GuardianIncidentFilters = {
    from: DAY.test(desde) ? desde : defaults.from,
    to: DAY.test(hasta) ? hasta : defaults.to,
    severity: parseSeverityFilter(gravedad),
  };
  const rangeError = filters.to > today ? 'La fecha final no puede ser posterior a hoy.' : attendanceRangeError(filters.from, filters.to);
  const key = studentId && !rangeError ? JSON.stringify([studentId, filters.from, filters.to, revision]) : null;

  useEffect(() => {
    if (!key || !studentId) return;
    const abort = new AbortController();
    guardianIncidentsService.list(studentId, filters.from, filters.to, 0, GUARDIAN_INCIDENTS_MAX_PAGE_SIZE, abort.signal)
      .then(data => { if (!abort.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!abort.signal.aborted) setResult({ key, error: guardianIncidentsErrorMessage(error) }); });
    return () => abort.abort();
  }, [key, studentId, filters.from, filters.to]);

  /** Escribe solo lo que difiere del valor por defecto. */
  const setFilters = (next: GuardianIncidentFilters) => {
    const query = new URLSearchParams();
    if (next.from !== defaults.from) query.set('desde', next.from);
    if (next.to !== defaults.to) query.set('hasta', next.to);
    if (next.severity !== 'TODAS') query.set('gravedad', next.severity);
    const qs = query.toString();
    router.replace(qs ? `${PATH}?${qs}` : PATH, { scroll: false });
  };

  const loading = !!key && result?.key !== key;
  const current = loading ? undefined : result?.key === key ? result : undefined;
  const view: IncidentsView | null = current?.data ? adaptGuardianIncidents(current.data, filters.severity) : null;

  return {
    today, filters, rangeError, loading, error: current?.error ?? null, view,
    setRange: (range: { from: string; to: string }) => { if (range.from && range.to) setFilters({ ...filters, ...range }); },
    setSeverity: (severity: GuardianIncidentSeverityFilter) => setFilters({ ...filters, severity }),
    resetFilters: () => setFilters({ from: defaults.from, to: defaults.to, severity: 'TODAS' }),
    reload: () => setRevision(n => n + 1),
  };
}
