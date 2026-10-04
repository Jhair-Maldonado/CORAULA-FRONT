// src/app/alumno/layout.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AlumnoSidebar } from '@/components/alumno/AlumnoSidebar';
import { AlumnoUserBar } from '@/components/alumno/AlumnoUserBar';
import { AlumnoSessionProvider } from '@/components/alumno/AlumnoSessionContext';

function AlumnoLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/alumno/login';

  // Si estamos en la página de login (/alumno/login), no mostrar sidebar ni topbar del dashboard
  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] text-[#111827] antialiased flex flex-col justify-center">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111827] flex flex-col antialiased">
      {/* Sidebar (Desktop 220px fixed + Mobile Drawer) */}
      <AlumnoSidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-[220px] flex flex-col min-w-0">
        {/* Top Header Bar with Indicador de Sesión */}
        <header className="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider hidden md:inline-block">
              Colegio San Marcos · Periodo 2026
            </span>
          </div>

          {/* Reusable Indicador de Sesión (Avatar + Nombre + Botón Cerrar sesión) */}
          <AlumnoUserBar />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-9 max-w-6xl w-full mx-auto flex flex-col">
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
