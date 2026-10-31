'use client';

import React from 'react';
import {
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Alert02Icon
} from 'hugeicons-react';
import { AttendanceSummary } from '../types';

interface ResumenAsistenciaProps {
  summary: AttendanceSummary;
}

export const ResumenAsistencia: React.FC<ResumenAsistenciaProps> = ({ summary }) => {
  const porcentajeAsistencia = summary.total > 0
    ? Math.round(((summary.presentes + summary.tardanzas) / summary.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Sesiones */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Total de Sesiones</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-ink">{summary.total}</span>
            <span className="text-[10px] font-semibold text-muted">auditadas</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
          <Calendar01Icon size={20} />
        </div>
      </div>

      {/* 2. Presentes */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Asistencias</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-emerald-950">{summary.presentes}</span>
            {summary.total > 0 && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                {Math.round((summary.presentes / summary.total) * 100)}%
              </span>
            )}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
          <CheckmarkCircle01Icon size={20} />
        </div>
      </div>

      {/* 3. Tardanzas */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Tardanzas</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-amber-950">{summary.tardanzas}</span>
            <span className="text-[10px] font-semibold text-muted">ingresos tarde</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
          <Clock01Icon size={20} />
        </div>
      </div>

      {/* 4. Inasistencias */}
      <div className="bg-white rounded-2xl border border-line p-4 flex items-center justify-between shadow-2xs">
        <div>
          <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Inasistencias</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-rose-950">{summary.inasistencias}</span>
            <span className="text-[10px] font-semibold text-muted">faltas</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
          <Alert02Icon size={20} />
        </div>
      </div>
    </div>
  );
};
