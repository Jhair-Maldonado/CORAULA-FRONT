// src/app/(padres)/padre/layout.tsx
import React from 'react';
import { PadreProvider } from '@/components/padres/PadreContext';
import { PadreSidebar } from '@/components/padres/PadreSidebar';
import { PadreHeader } from '@/components/padres/PadreHeader';

export const metadata = {
  title: 'Portal de Padres y Apoderados | CORAULA',
  description: 'Seguimiento académico, asistencia, calificaciones y comunicados escolares en tiempo real.',
};

export default function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PadreProvider>
      <div className="flex h-screen w-full bg-[#F3F4F6] font-sans overflow-hidden">
        {/* Barra Lateral de Navegación */}
        <PadreSidebar />

        {/* Contenedor Principal con Scroll */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar relative">
          {/* Cabecera Superior con Selector de Hijo y Notificaciones */}
          <PadreHeader />

          {/* Área de Contenido */}
          <main className="p-4 sm:p-8 flex-1 max-w-7xl w-full mx-auto pb-16">
            {children}
          </main>
        </div>
      </div>
    </PadreProvider>
  );
}
