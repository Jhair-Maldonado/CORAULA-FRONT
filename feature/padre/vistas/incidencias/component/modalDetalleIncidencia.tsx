'use client';

import React, { useEffect, useRef } from 'react';
import { BookOpen, CalendarDays, X } from 'lucide-react';
import type { IncidentView } from '@/adapters/guardianIncidentsAdapter';

interface ModalDetalleIncidenciaProps {
  incident: IncidentView | null;
  onClose: () => void;
}

/** Detalle de una incidencia: gravedad, fecha y hora de Lima, curso y descripción completa. Cierra con «Cerrar», la «X», el fondo o Escape. */
export function ModalDetalleIncidencia({ incident, onClose }: ModalDetalleIncidenciaProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!incident) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [incident, onClose]);

  if (!incident) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-incidencia-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line bg-canvas/50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="detalle-incidencia-title" className="text-base font-black text-ink">Detalle de incidencia</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${incident.badgeClassName}`}>Gravedad: {incident.severityLabel}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="rounded-lg p-1 text-muted transition-colors hover:bg-neutral hover:text-ink focus-visible:outline-2 focus-visible:outline-accent">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-xl border border-line bg-canvas/50 p-3">
              <CalendarDays size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-muted">Fecha y hora (Lima)</p>
                <time dateTime={incident.occurredAt} className="font-bold text-ink">{incident.dateLabel}</time>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-line bg-canvas/50 p-3">
              <BookOpen size={18} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-muted">Curso</p>
                <p className="font-bold text-ink">{incident.courseName}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-muted">Descripción</p>
            <div className="whitespace-pre-line break-words rounded-xl border border-line bg-white p-4 text-sm leading-relaxed text-ink">{incident.description}</div>
          </div>
        </div>

        <div className="flex justify-end border-t border-line bg-canvas/50 px-6 py-3">
          <button type="button" onClick={onClose} ref={closeRef} className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-neutral focus-visible:outline-2 focus-visible:outline-accent">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
