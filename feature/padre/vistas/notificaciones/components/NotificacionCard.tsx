'use client';

import React, { useState } from 'react';
import {
  Alert02Icon,
  AlertCircleIcon,
  InformationCircleIcon,
  CheckmarkCircle01Icon,
  Notification01Icon,
  Calendar01Icon
} from 'hugeicons-react';
import { NotificacionApoderado, PrioridadNotificacion } from '../types';

interface NotificacionCardProps {
  notificacion: NotificacionApoderado;
  onMarcarLeida: (id: string | number) => Promise<boolean>;
}

const PRIORIDAD_CONFIG: Record<
  PrioridadNotificacion,
  {
    label: string;
    badgeClass: string;
    borderAccent: string;
    icon: React.ReactNode;
  }
> = {
  emergencia: {
    label: 'Emergencia',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    borderAccent: 'border-l-4 border-l-red-600',
    icon: <Alert02Icon size={14} className="text-red-600" />,
  },
  alta: {
    label: 'Alta Prioridad',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    borderAccent: 'border-l-4 border-l-amber-500',
    icon: <AlertCircleIcon size={14} className="text-amber-600" />,
  },
  media: {
    label: 'Informativo',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    borderAccent: 'border-l-4 border-l-sky-500',
    icon: <InformationCircleIcon size={14} className="text-sky-600" />,
  },
  baja: {
    label: 'Baja Prioridad',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderAccent: 'border-l-4 border-l-slate-400',
    icon: <Notification01Icon size={14} className="text-slate-500" />,
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

export const NotificacionCard: React.FC<NotificacionCardProps> = ({
  notificacion,
  onMarcarLeida,
}) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const config = PRIORIDAD_CONFIG[notificacion.prioridad] || PRIORIDAD_CONFIG.media;

  const handleMarcarLeida = async () => {
    if (notificacion.leido || isUpdating) return;
    setIsUpdating(true);
    try {
      await onMarcarLeida(notificacion.id);
    } finally {
      setIsUpdating(false);
    }
  };

  const isNoLeida = !notificacion.leido;

  return (
    <article
      className={`rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col gap-3 ${
        isNoLeida
          ? `bg-white border-line shadow-xs hover:shadow-md ${config.borderAccent}`
          : 'bg-slate-50/60 border-slate-200/80 opacity-80 hover:opacity-100'
      }`}
    >
      {/* Cabecera: Badges y Estado de Lectura */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Badge de Prioridad */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-wide shadow-2xs ${config.badgeClass}`}
          >
            {config.icon}
            <span>{config.label}</span>
          </span>

          {/* Indicador de Nueva / No leída */}
          {isNoLeida ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              Nueva
            </span>
          ) : (
            <span className="text-[10px] font-semibold text-muted flex items-center gap-1">
              <CheckmarkCircle01Icon size={12} className="text-emerald-600" /> Leída
            </span>
          )}
        </div>

        {/* Fecha de Emisión */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
          <Calendar01Icon size={13} className="text-slate-400" />
          <span>{formatFecha(notificacion.fecha_creacion)}</span>
        </div>
      </div>

      {/* Contenido: Título y Mensaje */}
      <div>
        <h3
          className={`text-sm sm:text-base leading-snug ${
            isNoLeida ? 'font-black text-ink' : 'font-bold text-ink/75'
          }`}
        >
          {notificacion.titulo}
        </h3>
        <p className="text-xs sm:text-sm text-ink/80 leading-relaxed font-normal mt-1.5">
          {notificacion.mensaje}
        </p>
      </div>

      {/* Barra de Acciones Inferior */}
      {isNoLeida && (
        <div className="pt-2 border-t border-line/60 flex items-center justify-end">
          <button
            type="button"
            onClick={handleMarcarLeida}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-accent bg-accent-soft hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Marcar notificación como leída"
          >
            <CheckmarkCircle01Icon size={14} className={isUpdating ? 'animate-spin' : ''} />
            <span>{isUpdating ? 'Actualizando...' : 'Marcar como leída'}</span>
          </button>
        </div>
      )}
    </article>
  );
};
