'use client';

// Incidencias del hijo activo o de todos los hijos para el apoderado (FRONT #59, BACK #117).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePadre } from '@/components/padres/PadreContext';
import { attendanceRangeError } from '@/services/padres/guardianAttendanceService';
import {
  GUARDIAN_INCIDENTS_PAGE_SIZE,
  filterIncidentsBySeverity,
  formatLimaDateTime,
  guardianIncidentsErrorMessage,
  guardianIncidentsService,
  incidentsDefaultRange,
  limaDay,
} from '@/services/padres/guardianIncidentsService';
import type {
  GuardianIncident,
  GuardianIncidentSeverityFilter,
  GuardianIncidentsPage,
} from '@/types/guardianIncidentsApi';
import { ModalDetalleIncidencia, SEVERITY_CONFIG } from './modalDetalleIncidencia';

export const INCIDENTS_EMPTY_MESSAGE = 'no tiene incidencias registradas en este periodo';

const pagerButton =
  'rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-neutral disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-colors';

/** Helper seguro para actualizar parámetros en la barra de URL sin recarga de página. */
function updateUrlQuery(params: Record<string, string | number | null | undefined>) {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    for (const [key, val] of Object.entries(params)) {
      if (val === null || val === undefined || val === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(val));
      }
    }
    window.history.replaceState(null, '', url.pathname + url.search);
  } catch {
    // Si la manipulación del historial falla en entornos restringidos, continúa silenciosamente
  }
}

/** Skeletons animados durante el estado de carga. */
export function IncidenciasSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando incidencias…">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-white p-4 animate-pulse">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="h-4 w-36 bg-slate-200 rounded"></div>
            <div className="h-5 w-24 bg-slate-200 rounded-full"></div>
          </div>
          <div className="mt-2 h-3 w-48 bg-slate-200 rounded"></div>
          <div className="mt-3 space-y-2">
            <div className="h-3.5 w-full bg-slate-200 rounded"></div>
            <div className="h-3.5 w-4/5 bg-slate-200 rounded"></div>
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando incidencias…</span>
    </div>
  );
}

interface ListaIncidenciasProps {
  data: GuardianIncidentsPage;
  severityFilter: GuardianIncidentSeverityFilter;
  isAllStudents: boolean;
  onPageChange: (page: number) => void;
  onSelectIncident: (incident: GuardianIncident) => void;
}

export function ListaIncidencias({
  data,
  severityFilter,
  isAllStudents,
  onPageChange,
  onSelectIncident,
}: ListaIncidenciasProps) {
  const filteredContent = useMemo(
    () => filterIncidentsBySeverity(data.content, severityFilter),
    [data.content, severityFilter]
  );

  const totalPages = Math.max(data.totalPages, 1);

  return (
    <>
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span>
          Mostrando {filteredContent.length} de {data.totalElements} incidencias
        </span>
      </div>

      <ul className="space-y-3" aria-label="Incidencias">
        {filteredContent.map((incident) => {
          const severity = SEVERITY_CONFIG[incident.severity] ?? {
            label: incident.severity,
            className: 'border-line bg-neutral text-ink',
          };

          return (
            <li
              key={incident.id}
              className="rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time dateTime={incident.occurredAt} className="text-sm font-bold text-ink">
                  {formatLimaDateTime(incident.occurredAt)}
                </time>
                <span
                  className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${severity.className}`}
                >
                  Gravedad: {severity.label}
                </span>
              </div>

              {/* Muestra el nombre del hijo cuando se consulta "Todos mis hijos" */}
              {isAllStudents && incident.studentName && (
                <p className="mt-1 text-xs font-bold text-accent">
                  Estudiante: {incident.studentName}
                </p>
              )}

              <p className="mt-1 text-xs font-semibold text-muted">Curso: {incident.courseName}</p>

              <p className="mt-2 whitespace-pre-line break-words text-sm text-ink leading-relaxed">
                {incident.description}
              </p>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => onSelectIncident(incident)}
                  className="rounded-lg border border-line bg-slate-50 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-neutral transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Ver detalle
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {data.totalPages > 1 && (
        <nav
          aria-label="Paginación de incidencias"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted border-t border-line pt-4"
        >
          <span>
            Página {data.page + 1} de {totalPages} · {data.totalElements} incidencias
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className={pagerButton}
              disabled={data.page <= 0}
              onClick={() => onPageChange(data.page - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className={pagerButton}
              disabled={data.page + 1 >= data.totalPages}
              onClick={() => onPageChange(data.page + 1)}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </>
  );
}

type Load = { key: string; data?: GuardianIncidentsPage; error?: string };

export default function VistaIncidencias() {
  const {
    hijos,
    hijoActivo,
    setSelectedHijoId,
    isLoading: padreLoading,
    error: padreError,
    refreshPadreData,
  } = usePadre();

  const [today] = useState(limaDay);
  const defaultRange = useMemo(() => incidentsDefaultRange(today), [today]);

  // Inicialización de filtros considerando parámetros en la URL si existen
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('hijo');
      if (q === 'all') return 'ALL';
      if (q) return q;
    }
    return hijoActivo?.id ?? '';
  });

  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const from = params.get('desde');
      const to = params.get('hasta');
      if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return { from, to };
      }
    }
    return defaultRange;
  });

  const [severityFilter, setSeverityFilter] = useState<GuardianIncidentSeverityFilter>(() => {
    if (typeof window !== 'undefined') {
      const g = new URLSearchParams(window.location.search).get('gravedad');
      if (g === 'LEVE' || g === 'MODERADA' || g === 'GRAVE') return g;
    }
    return 'TODAS';
  });

  const [page, setPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const p = Number(new URLSearchParams(window.location.search).get('pagina'));
      if (Number.isSafeInteger(p) && p > 0) return p - 1;
    }
    return 0;
  });

  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Load>();
  const [selectedIncidentForModal, setSelectedIncidentForModal] = useState<GuardianIncident | null>(null);

  // Sincronización inmediata en render si el contexto global del Navbar cambia de hijo
  const [prevHijoActivoId, setPrevHijoActivoId] = useState(hijoActivo?.id);
  if (hijoActivo?.id && hijoActivo.id !== prevHijoActivoId) {
    setPrevHijoActivoId(hijoActivo.id);
    if (selectedStudentFilter !== 'ALL') {
      setSelectedStudentFilter(hijoActivo.id);
      setPage(0);
    }
  }

  // Reseteo inmediato de página si cambia el rango de fechas
  const [lastRangeKey, setLastRangeKey] = useState(`${range.from}|${range.to}`);
  const currentRangeKey = `${range.from}|${range.to}`;
  if (lastRangeKey !== currentRangeKey) {
    setLastRangeKey(currentRangeKey);
    setPage(0);
  }

  // Seguridad: si el filtro de estudiante no es ALL y no existe en los hijos vinculados, usar hijoActivo
  const validStudentId =
    selectedStudentFilter === 'ALL'
      ? 'ALL'
      : hijos.some((h) => h.id === selectedStudentFilter)
        ? selectedStudentFilter
        : (hijoActivo?.id ?? (hijos[0]?.id || null));

  const activeStudentId = validStudentId;
  const rangeError =
    range.to > today
      ? 'La fecha final no puede ser posterior a hoy.'
      : attendanceRangeError(range.from, range.to);

  // Actualización de query params en la URL al cambiar cualquier filtro
  const syncUrl = useCallback(
    (hijoId: string, fromDate: string, toDate: string, sev: GuardianIncidentSeverityFilter, p: number) => {
      updateUrlQuery({
        hijo: hijoId === 'ALL' ? 'all' : hijoId,
        desde: fromDate,
        hasta: toDate,
        gravedad: sev !== 'TODAS' ? sev : null,
        pagina: p > 0 ? p + 1 : null,
      });
    },
    []
  );

  const changeStudentFilter = (nextId: string) => {
    setSelectedStudentFilter(nextId);
    if (nextId !== 'ALL') {
      setSelectedHijoId(nextId);
    }
    setPage(0);
    syncUrl(nextId, range.from, range.to, severityFilter, 0);
  };

  const changeRange = (next: { from: string; to: string }) => {
    setRange(next);
    setPage(0);
    syncUrl(selectedStudentFilter, next.from, next.to, severityFilter, 0);
  };

  const changeSeverity = (sev: GuardianIncidentSeverityFilter) => {
    setSeverityFilter(sev);
    syncUrl(selectedStudentFilter, range.from, range.to, sev, page);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    syncUrl(selectedStudentFilter, range.from, range.to, severityFilter, nextPage);
  };

  const handleResetFilters = () => {
    const defaultStudent = hijoActivo?.id ?? (hijos[0]?.id || '');
    setSelectedStudentFilter(defaultStudent);
    if (defaultStudent && defaultStudent !== 'ALL') {
      setSelectedHijoId(defaultStudent);
    }
    setRange(defaultRange);
    setSeverityFilter('TODAS');
    setPage(0);
    syncUrl(defaultStudent, defaultRange.from, defaultRange.to, 'TODAS', 0);
  };

  // Clave de caché para la petición
  const key =
    activeStudentId && !rangeError
      ? JSON.stringify([activeStudentId, range.from, range.to, page, revision])
      : null;

  useEffect(() => {
    if (!key || !activeStudentId) return;
    const abort = new AbortController();

    const fetchPromise =
      activeStudentId === 'ALL'
        ? guardianIncidentsService.listForAllStudents(
            hijos,
            range.from,
            range.to,
            page,
            GUARDIAN_INCIDENTS_PAGE_SIZE,
            abort.signal
          )
        : guardianIncidentsService.list(
            activeStudentId,
            range.from,
            range.to,
            page,
            GUARDIAN_INCIDENTS_PAGE_SIZE,
            abort.signal,
            hijos.find((h) => h.id === activeStudentId)?.nombreCompleto
          );

    fetchPromise
      .then((data) => {
        if (!abort.signal.aborted) setResult({ key, data });
      })
      .catch((error) => {
        if (!abort.signal.aborted) {
          setResult({ key, error: guardianIncidentsErrorMessage(error) });
        }
      });

    return () => abort.abort();
  }, [key, activeStudentId, range.from, range.to, page, hijos]);

  const loading = !!key && result?.key !== key;
  const current = loading ? undefined : result;

  // Cálculo del mensaje de estado vacío contextual que nombra al hijo ("Ana no tiene incidencias...")
  const currentStudent = hijos.find((h) => h.id === activeStudentId) || hijoActivo;
  const currentStudentName =
    activeStudentId === 'ALL'
      ? 'Tus hijos'
      : currentStudent?.nombres || currentStudent?.nombreCompleto || 'El estudiante';

  const emptyMessage = useMemo(() => {
    const sevLabel =
      severityFilter !== 'TODAS'
        ? ` de gravedad ${SEVERITY_CONFIG[severityFilter]?.label ?? severityFilter}`
        : '';
    if (activeStudentId === 'ALL') {
      return `Tus hijos no tienen incidencias${sevLabel} registradas en este periodo.`;
    }
    return `${currentStudentName} no tiene incidencias${sevLabel} registradas en este periodo.`;
  }, [severityFilter, currentStudentName, activeStudentId]);

  const displayedContent = useMemo(() => {
    if (!current?.data) return [];
    return filterIncidentsBySeverity(current.data.content, severityFilter);
  }, [current, severityFilter]);

  return (
    <div className="mx-auto max-w-5xl py-4">
      {/* Encabezado */}
      <h1 className="text-xl font-black text-ink">Incidencias del estudiante</h1>
      <p className="mt-1 text-sm text-muted">
        Incidencias registradas por los docentes. Las fechas y horas están en hora de Lima.
      </p>

      {/* Estados del Padre Context */}
      {padreLoading ? (
        <div role="status" className="mt-6">
          <p className="text-sm text-muted">Cargando estudiantes…</p>
        </div>
      ) : padreError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">
          <p>{padreError}</p>
          <button
            type="button"
            className="mt-2 font-bold underline"
            onClick={() => {
              void refreshPadreData();
            }}
          >
            Reintentar
          </button>
        </div>
      ) : hijos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-muted">
          No tiene estudiantes vinculados.
        </p>
      ) : (
        <>
          {/* Panel de Filtros Responsivo */}
          <div className="my-5 rounded-xl border border-line bg-white p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              {/* Selector de Hijo: Si tiene 1 solo hijo muestra el nombre; si tiene más muestra selector con Todos mis hijos */}
              {hijos.length > 1 ? (
                <label className="text-xs font-semibold text-muted flex-1 min-w-[180px]">
                  Estudiante
                  <select
                    aria-label="Seleccionar estudiante"
                    value={activeStudentId || ''}
                    onChange={(e) => changeStudentFilter(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-line p-2 text-xs font-semibold text-ink bg-white focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <option value="ALL">Todos mis hijos ({hijos.length})</option>
                    {hijos.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nombres} {h.apellidos}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex-1 min-w-[180px]">
                  <span className="text-xs font-semibold text-muted block">Estudiante</span>
                  <p className="mt-1 text-xs font-bold text-ink p-2 rounded-lg bg-slate-50 border border-line truncate">
                    {hijos[0]?.nombreCompleto || hijoActivo?.nombreCompleto || 'Estudiante'}
                  </p>
                </div>
              )}

              {/* Rango: Desde */}
              <label className="text-xs font-semibold text-muted">
                Desde
                <input
                  aria-label="Desde"
                  type="date"
                  value={range.from}
                  max={range.to || today}
                  onChange={(e) => changeRange({ ...range, from: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-line p-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-accent"
                />
              </label>

              {/* Rango: Hasta */}
              <label className="text-xs font-semibold text-muted">
                Hasta
                <input
                  aria-label="Hasta"
                  type="date"
                  value={range.to}
                  min={range.from}
                  max={today}
                  onChange={(e) => changeRange({ ...range, to: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-line p-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-accent"
                />
              </label>

              {/* Filtro por Nivel de Gravedad */}
              <label className="text-xs font-semibold text-muted min-w-[140px]">
                Nivel
                <select
                  aria-label="Filtrar por gravedad"
                  value={severityFilter}
                  onChange={(e) => changeSeverity(e.target.value as GuardianIncidentSeverityFilter)}
                  className="mt-1 block w-full rounded-lg border border-line p-2 text-xs font-semibold text-ink bg-white focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <option value="TODAS">Todos los niveles</option>
                  <option value="LEVE">Leve</option>
                  <option value="MODERADA">Moderada</option>
                  <option value="GRAVE">Grave</option>
                </select>
              </label>

              {/* Botones de Acción */}
              <div className="flex items-center gap-2 pt-1 md:pt-0">
                <button
                  type="button"
                  onClick={() => setRevision((n) => n + 1)}
                  disabled={loading || !!rangeError}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-muted hover:text-ink hover:bg-neutral transition-colors focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted">Rango de consulta de hasta 92 días hasta hoy en Lima.</p>
          </div>

          {/* Error de validación local de rango */}
          {rangeError && (
            <p role="alert" className="mb-4 text-sm font-semibold text-accent">
              {rangeError}
            </p>
          )}

          {/* Estado de Carga con Skeletons */}
          {loading && <IncidenciasSkeleton />}

          {/* Estado de Error del Servicio con Reintento */}
          {!loading && current?.error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
            >
              <p className="font-semibold">{current.error}</p>
              <button
                type="button"
                className="mt-2 text-xs font-bold underline focus-visible:outline-2 focus-visible:outline-accent"
                onClick={() => setRevision((n) => n + 1)}
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Estado Vacío Contextual */}
          {!loading && !current?.error && current?.data && (displayedContent.length === 0 || current.data.totalElements === 0) && (
            <p
              role="status"
              className="rounded-xl border border-line bg-white p-6 text-sm text-muted text-center"
            >
              {emptyMessage}
            </p>
          )}

          {/* Lista de Resultados */}
          {!loading && !current?.error && current?.data && displayedContent.length > 0 && (
            <ListaIncidencias
              data={current.data}
              severityFilter={severityFilter}
              isAllStudents={activeStudentId === 'ALL'}
              onPageChange={handlePageChange}
              onSelectIncident={setSelectedIncidentForModal}
            />
          )}

          {/* Modal de Detalle */}
          <ModalDetalleIncidencia
            incident={selectedIncidentForModal}
            onClose={() => setSelectedIncidentForModal(null)}
          />
        </>
      )}
    </div>
  );
}
