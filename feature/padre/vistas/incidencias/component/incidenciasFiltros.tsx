import React from 'react';
import { INCIDENT_SEVERITY_FILTERS, severityFilterLabel, type GuardianIncidentSeverityFilter } from '@/adapters/guardianIncidentsAdapter';

interface IncidenciasFiltrosProps {
  range: { from: string; to: string };
  today: string;
  severity: GuardianIncidentSeverityFilter;
  loading: boolean;
  rangeError: string | null;
  onRangeChange: (range: { from: string; to: string }) => void;
  onSeverityChange: (severity: GuardianIncidentSeverityFilter) => void;
  onReload: () => void;
  onReset: () => void;
}

/** Rango de fechas, botones de gravedad, «Actualizar» y «Limpiar filtros». El estado vive en la URL (hook). */
export function IncidenciasFiltros({ range, today, severity, loading, rangeError, onRangeChange, onSeverityChange, onReload, onReset }: IncidenciasFiltrosProps) {
  return (
    <div className="my-5 space-y-3 rounded-xl border border-line bg-white p-4 shadow-2xs">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-semibold text-muted">
          Desde
          <input aria-label="Desde" type="date" value={range.from} max={range.to || today} onChange={e => onRangeChange({ ...range, from: e.target.value })} className="mt-1 block rounded-lg border border-line p-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-accent" />
        </label>
        <label className="text-xs font-semibold text-muted">
          Hasta
          <input aria-label="Hasta" type="date" value={range.to} min={range.from} max={today} onChange={e => onRangeChange({ ...range, to: e.target.value })} className="mt-1 block rounded-lg border border-line p-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-accent" />
        </label>
        <button type="button" onClick={onReload} disabled={loading || !!rangeError} className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent">Actualizar</button>
        <button type="button" onClick={onReset} className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-neutral hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">Limpiar filtros</button>
      </div>
      <div role="group" aria-label="Filtrar por gravedad" className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">Gravedad</span>
        {INCIDENT_SEVERITY_FILTERS.map(option => (
          <button
            key={option}
            type="button"
            aria-pressed={severity === option}
            onClick={() => onSeverityChange(option)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${severity === option ? 'border-accent bg-accent text-white' : 'border-line bg-white text-ink hover:bg-neutral'}`}
          >
            {severityFilterLabel(option)}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">Rango de consulta de hasta 92 días hasta hoy en Lima.</p>
    </div>
  );
}
