'use client';

import React from 'react';
import Link from 'next/link';
import { Search01Icon, ArrowDown01Icon } from 'hugeicons-react';
import { Seccion } from '@/types/alumnos';

interface StudentsGridProps {
  seccion: Seccion;
}

export const StudentsGrid = ({ seccion }: StudentsGridProps) => {
  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
      {/* Header */}
      <div>
        <Link 
          href="/administrador/alumnos"
          className="text-muted text-[13px] font-medium hover:text-accent transition-colors flex items-center gap-2 mb-2 w-fit"
        >
          &larr; Regresar al panel general
        </Link>
        <h1 className="text-ink text-xl font-bold font-sans">
          Alumnos - {seccion.nombre}
        </h1>
        <p className="text-muted text-[13px] mt-1">
          Gestiona la información de todos los alumnos
        </p>
      </div>

      <hr className="border-line" />

      {/* Filters / Search */}
      <div className="w-full max-w-4xl h-[60px] bg-white border border-line rounded-xl flex items-center px-4 justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3 text-muted flex-1">
          <Search01Icon size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre de usuario" 
            className="w-full bg-transparent outline-none text-xs text-ink placeholder:text-muted font-medium"
          />
        </div>
        <button className="text-muted hover:text-ink transition-colors">
          <ArrowDown01Icon size={18} />
        </button>
      </div>

      {/* Grid */}
      {seccion.estudiantes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl pb-10">
          {seccion.estudiantes.map(student => (
            <Link 
              key={student.id} 
              href={`/administrador/alumnos/${seccion.id}/estudiante/${student.id}`}
              className="bg-white rounded-xl p-4 border border-line shadow-sm hover:shadow-md hover:border-accent/50 transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                {student.nombres.charAt(0)}{student.apellidos.charAt(0)}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="text-ink text-[13px] font-bold truncate group-hover:text-accent transition-colors">
                  {student.nombres} {student.apellidos}
                </span>
                <span className="text-muted text-[11px] font-medium truncate mt-0.5">
                  Tel: {student.telefono}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted text-sm pb-20">
          No hay alumnos registrados en esta sección.
        </div>
      )}
    </div>
  );
};
