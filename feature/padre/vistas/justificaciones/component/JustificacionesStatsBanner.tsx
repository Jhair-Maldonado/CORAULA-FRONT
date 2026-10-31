'use client';

import React from 'react';
import {
  DocumentValidationIcon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon
} from 'hugeicons-react';
import { JustificacionesStats } from '../types';

interface JustificacionesStatsBannerProps {
  stats: JustificacionesStats;
}

export const JustificacionesStatsBanner: React.FC<JustificacionesStatsBannerProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Enviadas */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Enviadas</p>
          <p className="text-2xl font-black text-ink mt-0.5">{stats.total}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
          <DocumentValidationIcon size={20} />
        </div>
      </div>

      {/* Pendientes */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-black text-amber-950 mt-0.5">{stats.pendientes}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
          <Clock01Icon size={20} />
        </div>
      </div>

      {/* Aprobadas */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Aprobadas</p>
          <p className="text-2xl font-black text-emerald-950 mt-0.5">{stats.aprobadas}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <CheckmarkCircle01Icon size={20} />
        </div>
      </div>

      {/* Observadas / Rechazadas */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Observadas / Rechazadas</p>
          <p className="text-2xl font-black text-rose-950 mt-0.5">
            {stats.observadas + stats.rechazadas}
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
          <Alert02Icon size={20} />
        </div>
      </div>
    </div>
  );
};
