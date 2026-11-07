'use client';

import React, { useEffect, useRef } from 'react';
import {
  Cancel01Icon,
  Calendar01Icon,
  UserIcon,
  BookOpen01Icon,
} from 'hugeicons-react';
import { formatLimaDateTime } from '@/services/padres/guardianIncidentsService';
import type { GuardianIncident, GuardianIncidentSeverity } from '@/types/guardianIncidentsApi';

export const SEVERITY_CONFIG: Record<
  GuardianIncidentSeverity,
  { label: string; className: string }
> = {
  LEVE: {
    label: 'Leve',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  },
  MODERADA: {
    label: 'Moderada',
    className: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  GRAVE: {
    label: 'Grave',
    className: 'border-rose-300 bg-rose-50 text-rose-800',
  },
};

interface ModalDetalleIncidenciaProps {
  incident: GuardianIncident | null;
  onClose: () => void;
}

export function ModalDetalleIncidencia({ incident, onClose }: ModalDetalleIncidenciaProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!incident || typeof document === 'undefined') return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [incident, onClose]);

  if (!incident) return null;

  const severity = SEVERITY_CONFIG[incident.severity] ?? {
    label: incident.severity,
    className: 'border-line bg-neutral text-ink',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detalle-incidencia-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-2xl border border-line bg-white shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 id="detalle-incidencia-title" className="text-base font-black text-ink">
              Detalle de Incidencia
            </h2>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${severity.className}`}
            >
              Gravedad: {severity.label}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="rounded-lg p-1 text-muted hover:bg-neutral hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Cancel01Icon size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 text-sm">
          {/* Estudiante si está disponible */}
          {incident.studentName && (
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 border border-line">
              <UserIcon size={18} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-muted">Estudiante</p>
                <p className="font-bold text-ink">{incident.studentName}</p>
              </div>
            </div>
          )}

          {/* Fecha / Hora y Curso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 border border-line">
              <Calendar01Icon size={18} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-muted">Fecha y hora (Lima)</p>
                <time dateTime={incident.occurredAt} className="font-bold text-ink">
                  {formatLimaDateTime(incident.occurredAt)}
                </time>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 border border-line">
              <BookOpen01Icon size={18} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-muted">Curso</p>
                <p className="font-bold text-ink">{incident.courseName}</p>
              </div>
            </div>
          </div>

          {/* Docente (solo si el backend lo devuelve) */}
          {incident.teacherName && (
            <div className="rounded-xl bg-slate-50 p-3 border border-line">
              <p className="text-xs font-semibold text-muted">Registrado por</p>
              <p className="font-bold text-ink">{incident.teacherName}</p>
            </div>
          )}

          {/* Descripción completa */}
          <div>
            <p className="text-xs font-semibold text-muted mb-1">Descripción</p>
            <div className="rounded-xl border border-line bg-white p-4 text-sm text-ink whitespace-pre-line break-words leading-relaxed">
              {incident.description}
            </div>
          </div>
        </div>

        {/* Pie de modal */}
        <div className="flex justify-end border-t border-line px-6 py-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-neutral transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
