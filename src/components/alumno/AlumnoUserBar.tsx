// src/components/alumno/AlumnoUserBar.tsx
'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { useAlumnoSession, DEFAULT_ALUMNO_SESSION } from './AlumnoSessionContext';

interface AlumnoUserBarProps {
  className?: string;
}

export const AlumnoUserBar: React.FC<AlumnoUserBarProps> = ({ className = '' }) => {
  const { session, logout } = useAlumnoSession();

  // Si aún no ha cargado la sesión, usar fallback con Ana Torres
  const alumno = session || DEFAULT_ALUMNO_SESSION;

  // Extraer iniciales (ej: "Ana Torres" -> "AT")
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (name.substring(0, 2) || 'AL').toUpperCase();
  };

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      {/* Alumno Info Pill */}
      <div className="flex items-center gap-2.5 bg-slate-50 border border-[#E5E7EB] rounded-full py-1 pl-1 pr-3.5 shadow-2xs">
        {/* Avatar / Iniciales */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFE4E6] text-[#BE123C] flex items-center justify-center text-xs font-extrabold tracking-tight shrink-0 shadow-2xs">
          {getInitials(alumno.nombre)}
        </div>

        {/* Nombres y Grado */}
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[12px] sm:text-[13px] font-bold text-[#111827] truncate max-w-[120px] sm:max-w-[160px]">
            {alumno.nombre}
          </span>
          <span className="text-[10px] text-[#6B7280] font-medium hidden sm:inline-block">
            {alumno.grado || '5to Secundaria B'}
          </span>
        </div>
      </div>

      {/* Botón Cerrar Sesión */}
      <button
        onClick={logout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#6B7280] hover:text-[#BE123C] hover:bg-[#FFE4E6]/50 border border-[#E5E7EB] hover:border-[#FECDD3] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#BE123C]/20"
        title="Cerrar sesión del alumno"
        aria-label="Cerrar sesión"
      >
        <LogOut className="w-3.5 h-3.5 text-[#BE123C] shrink-0" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </div>
  );
};
