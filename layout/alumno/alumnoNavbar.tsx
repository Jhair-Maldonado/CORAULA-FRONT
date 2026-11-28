// layout/alumno/alumnoNavbar.tsx
'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { KeyRound, LogOut } from 'lucide-react';
import { AuthContext } from '@/contexts/AuthContext';
import { useStudentProfile } from '@/components/alumno/StudentProfileContext';
import { CHANGE_PASSWORD_ROUTE } from '@/utils/authRoutes';

interface AlumnoNavbarProps {
  className?: string;
}

export const AlumnoNavbar: React.FC<AlumnoNavbarProps> = ({ className = '' }) => {
  const authContext = useContext(AuthContext);
  // Nombre, iniciales y sección vienen de GET /student/me; mientras carga o si falla muestran «Sin dato».
  const { view } = useStudentProfile();

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      {/* Alumno Info Pill */}
      <div className="flex items-center gap-2.5 bg-slate-50 border border-line rounded-full py-1 pl-1 pr-3.5 shadow-2xs">
        {/* Avatar / Iniciales */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center text-xs font-extrabold tracking-tight shrink-0 shadow-2xs">
          {view.initials}
        </div>

        {/* Nombres y Grado */}
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[12px] sm:text-[13px] font-bold text-ink truncate max-w-[120px] sm:max-w-[160px]">
            {view.fullName}
          </span>
          <span className="text-[10px] text-muted font-medium hidden sm:inline-block">
            {view.sectionLabel}
          </span>
        </div>
      </div>

      <Link
        href={CHANGE_PASSWORD_ROUTE}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-ink hover:bg-slate-50 border border-line transition-all focus:outline-none focus:ring-2 focus:ring-accent/20"
        title="Cambiar contraseña"
        aria-label="Cambiar contraseña"
      >
        <KeyRound className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Cambiar contraseña</span>
      </Link>

      {/* Botón Cerrar Sesión */}
      <button
        onClick={() => authContext?.logout()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-muted hover:text-accent hover:bg-accent-soft/50 border border-line hover:border-accent-soft transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20"
        title="Cerrar sesión del alumno"
        aria-label="Cerrar sesión"
      >
        <LogOut className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </button>
    </div>
  );
};
