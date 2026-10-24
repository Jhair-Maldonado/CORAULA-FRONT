// src/app/docente/components/DocenteNavbar.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Menu } from 'lucide-react';
import { useDocenteSession } from './DocenteSessionContext';

interface DocenteNavbarProps {
  onMobileToggle?: () => void;
}

export const DocenteNavbar: React.FC<DocenteNavbarProps> = ({ onMobileToggle }) => {
  const pathname = usePathname();
  const { cursoActivo } = useDocenteSession();

  const getPageInfo = () => {
    if (pathname === '/docente') {
      return { title: 'Mis Cursos Asignados', subtitle: 'Panel principal de docencia' };
    }
    if (pathname.startsWith('/docente/cursos/')) {
      return {
        title: cursoActivo?.id === pathname.split('/')[3] ? `${cursoActivo.nombre} - ${cursoActivo.grado}` : 'Detalle del Curso',
        subtitle: 'Información académica y estudiantes'
      };
    }
    if (pathname.startsWith('/docente/asistencia')) {
      return { title: 'Control de Asistencia', subtitle: 'Registro diario y seguimiento mensual' };
    }
    if (pathname.startsWith('/docente/notas')) {
      return { title: 'Calificaciones y Notas', subtitle: 'Criterios de evaluación y notas finales' };
    }
    if (pathname.startsWith('/docente/chat')) {
      return { title: 'Mensajería y Chat', subtitle: 'Comunicación directa con alumnos y apoderados' };
    }
    return { title: 'Portal del Docente', subtitle: 'Gestión académica CORAULA' };
  };

  const info = getPageInfo();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 h-16 flex items-center justify-between shrink-0 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileToggle}
          className="md:hidden p-2 text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#111827] leading-tight">
            {info.title}
          </h1>
          <p className="text-[11px] text-[#64748B] hidden sm:block">
            {info.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center text-[12px] font-medium text-[#64748B] bg-[#F3F4F6] px-3 py-1.5 rounded-lg border border-[#E5E7EB]">
          <span>📅 Lunes, 23 de agosto de 2026</span>
        </div>

        <button
          type="button"
          className="relative p-2 text-[#64748B] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors cursor-pointer"
          title="Notificaciones"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#BE123C] rounded-full ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
};
