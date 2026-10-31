'use client';

import React from 'react';
import {
  Calendar01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Alert02Icon,
  DocumentValidationIcon,
  LinkSquare02Icon
} from 'hugeicons-react';
import { JustificacionRegistro, EstadoJustificacion } from '../types';

interface JustificacionHistorialCardProps {
  justificacion: JustificacionRegistro;
}

const ESTADO_CONFIG: Record<
  EstadoJustificacion,
  {
    label: string;
    badgeClass: string;
    borderAccent: string;
    icon: React.ReactNode;
  }
> = {
  PENDIENTE: {
    label: 'Pendiente de Revisión',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    borderAccent: 'border-l-4 border-l-amber-500',
    icon: <Clock01Icon size={14} className="text-amber-600" />,
  },
  APROBADO: {
    label: 'Justificación Aprobada',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderAccent: 'border-l-4 border-l-emerald-500',
    icon: <CheckmarkCircle01Icon size={14} className="text-emerald-600" />,
  },
  OBSERVADO: {
    label: 'Observada por Secretaría',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    borderAccent: 'border-l-4 border-l-orange-500',
    icon: <AlertCircleIcon size={14} className="text-orange-600" />,
  },
  RECHAZADO: {
    label: 'Justificación Rechazada',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    borderAccent: 'border-l-4 border-l-rose-500',
    icon: <Alert02Icon size={14} className="text-rose-600" />,
  },
};

function formatFechaLarga(fechaStr: string): string {
  try {
    const [year, month, day] = fechaStr.split('-');
    if (!year || !month || !day) return fechaStr;

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return fechaStr;
  }
}

function formatFechaRegistro(fechaIso: string): string {
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

export const JustificacionHistorialCard: React.FC<JustificacionHistorialCardProps> = ({
  justificacion,
}) => {
  const config = ESTADO_CONFIG[justificacion.estado] || ESTADO_CONFIG.PENDIENTE;

  return (
    <article
      className={`bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col gap-3.5 ${config.borderAccent}`}
    >
      {/* Cabecera: Fecha de Inasistencia y Badge de Estado */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-black text-ink">
            <Calendar01Icon size={15} className="text-accent" />
            <span>Inasistencia del {formatFechaLarga(justificacion.fecha_inasistencia)}</span>
          </div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mt-0.5">
            Motivo: {justificacion.motivo}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide shadow-2xs self-start sm:self-auto ${config.badgeClass}`}
        >
          {config.icon}
          <span>{config.label}</span>
        </span>
      </div>

      {/* Explicación del Apoderado */}
      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-xs sm:text-sm text-ink/80 leading-relaxed">
        {justificacion.descripcion}
      </div>

      {/* Observación de Secretaría / Dirección si existe */}
      {justificacion.observacion_secretaria && (
        <div
          className={`p-3 rounded-xl border text-xs leading-relaxed flex flex-col gap-1 ${
            justificacion.estado === 'OBSERVADO'
              ? 'bg-orange-50/70 border-orange-200 text-orange-950'
              : 'bg-rose-50/70 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide text-[10px]">
            <AlertCircleIcon size={14} />
            <span>Respuesta de Secretaría Escolar:</span>
          </div>
          <p className="pl-5 font-medium">{justificacion.observacion_secretaria}</p>
        </div>
      )}

      {/* Pie de Tarjeta: Adjunto y Fecha de Registro */}
      <div className="pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <div className="flex items-center gap-1.5">
          <Clock01Icon size={14} className="text-slate-400" />
          <span>Solicitud registrada: {formatFechaRegistro(justificacion.fecha_creacion)}</span>
        </div>

        {justificacion.adjunto_url && (
          <a
            href={justificacion.adjunto_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-ink font-bold transition-colors cursor-pointer"
            title="Ver comprobante adjunto"
          >
            <DocumentValidationIcon size={14} className="text-slate-600" />
            <span className="truncate max-w-[150px]">
              {justificacion.adjunto_nombre || 'Ver comprobante'}
            </span>
            <LinkSquare02Icon size={12} className="text-slate-400" />
          </a>
        )}
      </div>
    </article>
  );
};
