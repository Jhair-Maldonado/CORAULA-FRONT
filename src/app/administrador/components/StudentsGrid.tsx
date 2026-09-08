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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl pb-10">
          {seccion.estudiantes.map(student => (
            <div 
              key={student.id} 
              className="w-full bg-white border border-line rounded-lg p-5 flex flex-col items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Avatar */}
              <div className="w-[60px] h-[60px] rounded-full bg-accent flex items-center justify-center text-white text-lg font-bold">
                {student.nombres.charAt(0)}{student.apellidos.charAt(0)}
              </div>
              
              {/* Info */}
              <div className="text-center flex flex-col gap-0.5 w-full">
                <span className="text-ink text-xs font-semibold truncate">{student.nombres}</span>
                <span className="text-muted text-[11px] truncate">{student.apellidos}</span>
                <span className="text-muted text-[10px] mt-1">{student.telefono}</span>
              </div>

              {/* Action */}
              <Link 
                href={`/administrador/alumnos/${seccion.id}/estudiante/${student.id}`}
                className="mt-2 w-full h-[32px] flex items-center justify-center bg-accent hover:bg-rose-800 text-white text-xs font-medium rounded-md transition-colors"
              >
                Ver información
              </Link>
            </div>
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
