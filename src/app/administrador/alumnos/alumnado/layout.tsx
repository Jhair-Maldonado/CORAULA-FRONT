import React from 'react';
import { GradosSidebar } from '../../components/GradosSidebar';

export default function AlumnadoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full bg-canvas">
      {/* Sidebar interior (Grados) */}
      <GradosSidebar />

      {/* Contenido dinámico (lista global de alumnos, aulas o detalles de alumno) */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
