'use client';

import React from 'react';
import {
  Task01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Alert02Icon
} from 'hugeicons-react';
import { IncidenciasKpis } from '../types';

interface IncidenciasKpiBannerProps {
  kpis: IncidenciasKpis;
}

export const IncidenciasKpiBanner: React.FC<IncidenciasKpiBannerProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Registradas</p>
          <p className="text-2xl font-black text-ink mt-0.5">{kpis.total}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
          <Task01Icon size={20} />
        </div>
      </div>

      {/* Leves */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Faltas Leves</p>
          <p className="text-2xl font-black text-emerald-950 mt-0.5">{kpis.leves}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <CheckmarkCircle01Icon size={20} />
        </div>
      </div>

      {/* Moderadas */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Faltas Moderadas</p>
          <p className="text-2xl font-black text-amber-950 mt-0.5">{kpis.moderadas}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
          <AlertCircleIcon size={20} />
        </div>
      </div>

      {/* Graves */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Faltas Graves</p>
          <p className="text-2xl font-black text-rose-950 mt-0.5">{kpis.graves}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
          <Alert02Icon size={20} />
        </div>
      </div>
    </div>
  );
};
