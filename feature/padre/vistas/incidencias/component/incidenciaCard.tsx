import React from 'react';
import type { IncidentView } from '@/adapters/guardianIncidentsAdapter';

/** Tarjeta de una incidencia: curso, gravedad, descripción y fecha; «Ver detalle» abre el modal. */
export function IncidenciaCard({ incident, onSelect }: { incident: IncidentView; onSelect: (incident: IncidentView) => void }) {
  return (
    <li className={`rounded-xl border border-l-4 border-line ${incident.borderClassName} bg-white p-4 transition-shadow hover:shadow-xs`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">{incident.courseName}</h3>
        <span className={`rounded-full border px-3 py-0.5 text-[11px] font-bold ${incident.badgeClassName}`}>Gravedad: {incident.severityLabel}</span>
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm leading-relaxed text-ink">{incident.description}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <time dateTime={incident.occurredAt} className="text-xs font-semibold text-muted">{incident.dateLabel}</time>
        <button type="button" onClick={() => onSelect(incident)} aria-label={`Ver detalle de ${incident.courseName}, ${incident.dateLabel}`} className="rounded-lg border border-line bg-canvas/50 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral focus-visible:outline-2 focus-visible:outline-accent">Ver detalle</button>
      </div>
    </li>
  );
}
