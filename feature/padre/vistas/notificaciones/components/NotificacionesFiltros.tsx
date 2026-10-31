'use client';

import React from 'react';
import { FilterIcon, CheckmarkBadge01Icon } from 'hugeicons-react';
import {
  FiltroEstadoNotificacion,
  FiltroPrioridadNotificacion,
  PrioridadNotificacion
} from '../types';

interface NotificacionesFiltrosProps {
  filtroEstado: FiltroEstadoNotificacion;
  onCambiarEstado: (estado: FiltroEstadoNotificacion) => void;
  filtroPrioridad: FiltroPrioridadNotificacion;
  onCambiarPrioridad: (prioridad: FiltroPrioridadNotificacion) => void;
  unreadCount: number;
  onMarcarTodasLeidas: () => Promise<boolean>;
  disabled?: boolean;
}

const ESTADOS: { id: FiltroEstadoNotificacion; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'no_leidas', label: 'No leídas' },
  { id: 'leidas', label: 'Leídas' },
];

const PRIORIDADES: { id: FiltroPrioridadNotificacion; label: string }[] = [
  { id: 'todas', label: 'Cualquier Prioridad' },
  { id: 'emergencia', label: '🚨 Emergencia' },
  { id: 'alta', label: '⚠️ Alta' },
  { id: 'media', label: 'ℹ️ Media' },
  { id: 'baja', label: '📌 Baja' },
];

export const NotificacionesFiltros: React.FC<NotificacionesFiltrosProps> = ({
  filtroEstado,
  onCambiarEstado,
  filtroPrioridad,
  onCambiarPrioridad,
  unreadCount,
  onMarcarTodasLeidas,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-line shadow-2xs mb-5">
      {/* Filtros de Estado */}
      <div className="flex flex-wrap items-center gap-1.5">
        {ESTADOS.map((estado) => {
          const isActive = filtroEstado === estado.id;
          return (
            <button
              key={estado.id}
              type="button"
              onClick={() => onCambiarEstado(estado.id)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-accent text-white shadow-2xs'
                  : 'bg-neutral text-ink/70 hover:bg-slate-200/80 hover:text-ink'
              }`}
            >
              <span>{estado.label}</span>
              {estado.id === 'no_leidas' && unreadCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white text-accent' : 'bg-accent text-white'
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filtro por Prioridad y Acción Masiva */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-neutral px-2.5 py-1 rounded-xl border border-slate-200 text-xs">
          <FilterIcon size={14} className="text-muted" />
          <select
            value={filtroPrioridad}
            onChange={(e) => onCambiarPrioridad(e.target.value as FiltroPrioridadNotificacion)}
            disabled={disabled}
            className="bg-transparent text-ink font-semibold text-xs outline-none cursor-pointer"
          >
            {PRIORIDADES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarcarTodasLeidas}
            disabled={disabled}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-accent bg-accent-soft hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Marcar todas las notificaciones como leídas"
          >
            <CheckmarkBadge01Icon size={14} />
            <span className="hidden sm:inline">Marcar todas leídas</span>
          </button>
        )}
      </div>
    </div>
  );
};
