// src/app/alumno/layout.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AlumnoSidebar } from '../../../layout/alumno/alumnoSidebar'; 
import { AlumnoNavbar } from '../../../layout/alumno/alumnoNavbar'; 
import { AlumnoSessionProvider } from '@/components/alumno/AlumnoSessionContext';
import { Menu } from 'lucide-react';

function AlumnoLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/alumno/login';

  const getPageTitle = (path: string) => {
    if (path === '/alumno') return 'Panel General';
    if (path.includes('/asistencia')) return 'Asistencia';
    if (path.includes('/calificaciones')) return 'Calificaciones';
    if (path.includes('/horario')) return 'Horario';
    if (path.includes('/materiales')) return 'Materiales';
    if (path.includes('/mensajes')) return 'Mensajería';
    return 'Portal de Alumnos';
  };

  // Si estamos en la página de login (/alumno/login), no mostrar sidebar ni topbar del dashboard
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] text-[#111827] antialiased flex flex-col justify-center">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] font-sans overflow-hidden text-[#111827]">
      {/* Sidebar (Siempre visible en desktop) */}
      <AlumnoSidebar />

      {/* Contenedor Principal con Scroll */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-[#F8FAFC]">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-line shadow-sm flex justify-center shrink-0">
          <div className="w-full max-w-[1600px] px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Lado Izquierdo: Título y Mobile Menu Button */}
            <div className="flex items-center gap-3">
              <button className="md:hidden text-muted hover:text-ink">
                <Menu size={20} />
              </button>
              <h1 className="text-sm font-black text-ink uppercase tracking-wider hidden sm:block">
                {getPageTitle(pathname)}
              </h1>
            </div>

            {/* Reusable Indicador de Sesión */}
            <div className="flex items-center gap-4">
              <AlumnoNavbar />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 w-full mx-auto pb-16 max-w-[1200px] flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AlumnoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AlumnoSessionProvider>
      <AlumnoLayoutContent>{children}</AlumnoLayoutContent>
    </AlumnoSessionProvider>
  );
}
