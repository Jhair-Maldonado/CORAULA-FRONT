'use client';

// Incidencias del hijo activo para el apoderado (FRONT #59 y #163, BACK #117). Solo lectura.
import { useCallback, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { usePadre } from '@/components/padres/PadreContext';
import { useGuardianIncidents } from '@/hooks/useGuardianIncidents';
import type { IncidentView } from '@/adapters/guardianIncidentsAdapter';
import { IncidenciaCard } from './component/incidenciaCard';
import { IncidenciasFiltros } from './component/incidenciasFiltros';
import { IncidenciasKpiBanner } from './component/incidenciasKpiBanner';
import { ModalDetalleIncidencia } from './component/modalDetalleIncidencia';

export const INCIDENTS_EMPTY_MESSAGE = 'No hay incidencias registradas en este periodo';
export const INCIDENTS_TRUNCATED_MESSAGE = 'Conteo de las primeras 100 incidencias del rango. Acota las fechas para ver el resto.';

function IncidenciasSkeleton() {
  return (
    <div className="space-y-3" role="status">
      {[1, 2, 3].map(i => (
        <div key={i} className="animate-pulse rounded-xl border border-line bg-white p-4">
          <div className="h-4 w-36 rounded bg-line" />
          <div className="mt-3 space-y-2">
            <div className="h-3.5 w-full rounded bg-line" />
            <div className="h-3.5 w-4/5 rounded bg-line" />
          </div>
        </div>
      ))}
      <span className="sr-only">Cargando incidencias…</span>
    </div>
  );
}

export default function VistaIncidencias() {
  const { hijoActivo: hijo, isLoading: padreLoading, error: padreError, refreshPadreData } = usePadre();
  const incidents = useGuardianIncidents(hijo?.id ?? null);
  const [detail, setDetail] = useState<IncidentView | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);
  const { filters, view } = incidents;
  const childName = hijo?.nombres || hijo?.nombreCompleto || 'El estudiante';

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
          <IncidenciasFiltros
            range={{ from: filters.from, to: filters.to }}
            today={incidents.today}
            severity={filters.severity}
            loading={incidents.loading}
            rangeError={incidents.rangeError}
            onRangeChange={incidents.setRange}
            onSeverityChange={incidents.setSeverity}
            onReload={incidents.reload}
            onReset={incidents.resetFilters}
          />
          {incidents.rangeError ? <p role="alert" className="text-sm font-semibold text-accent">{incidents.rangeError}</p>
            : incidents.loading ? <IncidenciasSkeleton />
            : incidents.error ? (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent">
                <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{incidents.error}</p>
                  <button type="button" className="mt-2 text-xs font-bold underline focus-visible:outline-2 focus-visible:outline-accent" onClick={incidents.reload}>Reintentar</button>
                </div>
              </div>
            )
            : view ? (
              <>
                <IncidenciasKpiBanner kpis={view.kpis} />
                {view.truncated && <p role="status" className="mb-4 rounded-xl border border-warning-ink/30 bg-white p-3 text-xs font-semibold text-warning-ink">{INCIDENTS_TRUNCATED_MESSAGE}</p>}
                {view.kpis.total === 0 && view.items.length === 0
                  ? <p role="status" className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">{INCIDENTS_EMPTY_MESSAGE} para {childName}.</p>
                  : view.visible.length === 0
                    ? <p role="status" className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">No hay incidencias con esa gravedad en el rango. Usa «Limpiar filtros» para ver todas.</p>
                    : (
                      <>
                        <p className="mb-3 text-xs text-muted">Mostrando {view.visible.length} de {view.items.length} incidencias</p>
                        <ul className="space-y-3" aria-label="Incidencias">
                          {view.visible.map(item => <IncidenciaCard key={item.id} incident={item} onSelect={setDetail} />)}
                        </ul>
                      </>
                    )}
              </>
            ) : null}
          <ModalDetalleIncidencia incident={detail} onClose={closeDetail} />
        </>
      )}
    </div>
  );
}
