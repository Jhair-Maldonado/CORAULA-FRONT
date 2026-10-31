'use client';

import React from 'react';
import {
  Calendar01Icon,
  Location01Icon,
  UserIcon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  AlertCircleIcon
} from 'hugeicons-react';
import { IncidenciaApoderado, GravedadIncidencia } from '../types';

interface IncidenciaCardProps {
  incidencia: IncidenciaApoderado;
}

const GRAVEDAD_CONFIG: Record<
  GravedadIncidencia,
  {
    label: string;
    badgeClass: string;
    icon: React.ReactNode;
    cardBorder: string;
  }
> = {
  LEVE: {
    label: 'Leve',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckmarkCircle01Icon size={14} className="text-emerald-600" />,
    cardBorder: 'border-l-4 border-l-emerald-500',
  },
  MODERADA: {
    label: 'Moderada',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <AlertCircleIcon size={14} className="text-amber-600" />,
    cardBorder: 'border-l-4 border-l-amber-500',
  },
  GRAVE: {
    label: 'Grave',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: <Alert02Icon size={14} className="text-rose-600" />,
    cardBorder: 'border-l-4 border-l-rose-500',
  },
};

function formatFecha(fechaIso: string): string {
  try {
    const date = new Date(fechaIso);
    if (isNaN(date.getTime())) return fechaIso;

    return new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return fechaIso;
  }
}

export const IncidenciaCard: React.FC<IncidenciaCardProps> = ({ incidencia }) => {
  const config = GRAVEDAD_CONFIG[incidencia.gravedad] || GRAVEDAD_CONFIG.LEVE;

  return (
    <article
      className={`bg-white rounded-2xl border border-line p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col gap-3.5 ${config.cardBorder}`}
    >
      {/* Encabezado: Título y Badge de Gravedad */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Registro Disciplinario #{incidencia.id}
          </span>
          <h3 className="text-sm sm:text-base font-bold text-ink leading-snug mt-0.5">
            {incidencia.titulo || 'Incidencia de Conducta'}
          </h3>
        </div>

        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide shadow-2xs ${config.badgeClass}`}
          >
            {config.icon}
            <span>{config.label}</span>
          </span>
        </div>
      </div>

      {/* Descripción Principal */}
      <p className="text-xs sm:text-sm text-ink/80 leading-relaxed font-normal bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
        {incidencia.descripcion}
      </p>

      {/* Acciones tomadas si existen */}
      {incidencia.accionesTomadas && (
        <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] uppercase tracking-wide">
            <CheckmarkCircle01Icon size={14} className="text-amber-700" />
            <span>Medida Correctiva / Acción Adoptada:</span>
          </div>
          <p className="text-xs text-amber-950/90 leading-relaxed pl-5">
            {incidencia.accionesTomadas}
          </p>
        </div>
      )}

      {/* Metadatos inferiores (Fecha, Lugar, Docente) */}
      <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted font-medium">
        <div className="flex items-center gap-1.5" title="Fecha y hora de ocurrencia">
          <Calendar01Icon size={14} className="text-slate-400" />
          <span>{formatFecha(incidencia.fecha)}</span>
        </div>

        {incidencia.lugar && (
          <div className="flex items-center gap-1.5" title="Lugar">
            <Location01Icon size={14} className="text-slate-400" />
            <span>{incidencia.lugar}</span>
          </div>
        )}

        {incidencia.docenteNombre && (
          <div className="flex items-center gap-1.5" title="Docente que registró">
            <UserIcon size={14} className="text-slate-400" />
            <span>Reportado por: {incidencia.docenteNombre}</span>
          </div>
        )}
      </div>
    </article>
  );
};
