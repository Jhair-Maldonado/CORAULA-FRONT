'use client';

import React from 'react';
import Link from 'next/link';
import { 
  UserGroupIcon, 
  Tick02Icon, 
  ArrowRight01Icon 
} from 'hugeicons-react';

interface KpiAlumnoProps {
  totalMatriculados: number;
  asistenciaHoy: number;
  vacantesDisponibles: number;
}

export const KpiAlumno: React.FC<KpiAlumnoProps> = ({
  totalMatriculados,
  asistenciaHoy,
  vacantesDisponibles
}) => {
  return (
    <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* KPI: Total Matriculados */}
      <div className="bg-white rounded-xl border border-line p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
            Total Matriculados
          </p>
          <p className="text-2xl font-black text-ink">{totalMatriculados}</p>
        </div>
        <div className="w-10 h-10 bg-neutral rounded-full flex items-center justify-center text-accent relative z-10">
          <UserGroupIcon size={20} />
        </div>
        <UserGroupIcon 
          size={90} 
          className="absolute -right-5 -bottom-5 text-neutral/40 transition-transform group-hover:scale-110 pointer-events-none" 
        />
      </div>

      {/* KPI: Ingresados Hoy */}
      <div className="bg-white rounded-xl border border-line p-4 flex items-center justify-between shadow-sm relative overflow-hidden group border-l-4 border-l-success">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
            Ingresados Hoy (QR)
          </p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-black text-ink">{asistenciaHoy}</p>
            <p className="text-xs font-bold text-muted mb-0.5">/ {totalMatriculados}</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center text-success-ink relative z-10">
          <Tick02Icon size={20} />
        </div>
      </div>

      {/* KPI: Vacantes Disponibles */}
      <Link 
        href="/administrador/alumnos/vacantes" 
        className="bg-white rounded-xl border border-line p-4 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-accent/50 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">
            Cantidad de Vacantes
          </p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-black text-emerald-600">{vacantesDisponibles}</p>
            <span className="text-[10px] font-bold text-accent flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Gestionar <ArrowRight01Icon size={12} />
            </span>
          </div>
        </div>
        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 relative z-10">
          <UserGroupIcon size={20} />
        </div>
      </Link>
    </div>
  );
};
