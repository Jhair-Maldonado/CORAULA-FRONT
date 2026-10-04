// src/components/padres/PadreWorkspace.tsx
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { usePadre } from './PadreContext';
import { SelectorHijosWelcome } from './SelectorHijosWelcome';
import { PadreSidebar } from './PadreSidebar';

export const PadreWorkspace: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedHijoId, hijos, isLoading } = usePadre();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#F3F4F6] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }



  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] font-sans overflow-hidden">
      {/* Barra Lateral de Navegación (Siempre visible) */}
      <PadreSidebar />

      {/* Contenedor Principal con Scroll */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-[#F8FAFC]">
        <main className="p-4 sm:p-6 flex-1 w-full mx-auto pb-16 max-w-[1600px]">
          {children}
        </main>
      </div>
    </div>
  );
};
