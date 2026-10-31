'use client';

import React from 'react';
import { Calendar01Icon } from 'hugeicons-react';
import { BimestreNumero } from '../types';

interface BimestreSelectorProps {
  bimestreSeleccionado: BimestreNumero;
  onSeleccionarBimestre: (b: BimestreNumero) => void;
  disabled?: boolean;
}

const BIMESTRES: { id: BimestreNumero; label: string; periodo: string }[] = [
  { id: 1, label: '1er Bimestre', periodo: 'Marzo - Mayo' },
  { id: 2, label: '2do Bimestre', periodo: 'Mayo - Julio' },
  { id: 3, label: '3er Bimestre', periodo: 'Agosto - Octubre' },
  { id: 4, label: '4to Bimestre', periodo: 'Octubre - Diciembre' },
];

export const BimestreSelector: React.FC<BimestreSelectorProps> = ({
  bimestreSeleccionado,
  onSeleccionarBimestre,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-2xl border border-line shadow-2xs mb-6">
      <div className="flex items-center gap-1.5 px-3 py-1 text-muted text-xs font-bold uppercase tracking-wider">
        <Calendar01Icon size={16} />
        <span>Periodo Bimestral:</span>
      </div>

      <div className="flex flex-wrap gap-1.5 flex-1 justify-start sm:justify-end">
        {BIMESTRES.map((b) => {
          const isActive = bimestreSeleccionado === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSeleccionarBimestre(b.id)}
              disabled={disabled}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? 'bg-accent text-white shadow-2xs'
                  : 'bg-neutral text-ink/70 hover:bg-slate-200/80 hover:text-ink'
              }`}
            >
              <span>{b.label}</span>
              <span className={`text-[9px] font-normal hidden md:inline ${isActive ? 'text-white/80' : 'text-muted'}`}>
                ({b.periodo})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
