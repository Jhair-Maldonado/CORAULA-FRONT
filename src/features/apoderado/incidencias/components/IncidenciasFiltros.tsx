'use client';

import React from 'react';
import { FilterIcon } from 'hugeicons-react';
import { GravedadIncidencia } from '../types';

interface IncidenciasFiltrosProps {
  filtroActivo: GravedadIncidencia | 'TODAS';
  onCambiarFiltro: (filtro: GravedadIncidencia | 'TODAS') => void;
  disabled?: boolean;
}

const OPCIONES_FILTRO: { id: GravedadIncidencia | 'TODAS'; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'LEVE', label: 'Leves' },
  { id: 'MODERADA', label: 'Moderadas' },
  { id: 'GRAVE', label: 'Graves' },
];

export const IncidenciasFiltros: React.FC<IncidenciasFiltrosProps> = ({
  filtroActivo,
  onCambiarFiltro,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-line shadow-2xs mb-5">
      <div className="flex items-center gap-2 text-muted px-2">
        <FilterIcon size={16} />
        <span className="text-xs font-bold uppercase tracking-wider">Filtrar por Gravedad:</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {OPCIONES_FILTRO.map((opcion) => {
          const isActive = filtroActivo === opcion.id;
          return (
            <button
              key={opcion.id}
              onClick={() => onCambiarFiltro(opcion.id)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-accent text-white shadow-2xs'
                  : 'bg-neutral text-ink/70 hover:bg-slate-200/80 hover:text-ink'
              }`}
            >
              {opcion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
