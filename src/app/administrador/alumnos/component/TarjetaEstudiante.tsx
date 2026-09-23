'use client';

import React from 'react';
import Link from 'next/link';
import { UserCircleIcon, SmartPhone01Icon, BookOpen01Icon, ArrowRight01Icon } from 'hugeicons-react';

export interface EstudianteTarjetaProps {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono: string;
  seccionId: string;
  gradoNumero?: number;
  nivel?: string;
  letra?: string;
  fotoUrl?: string;
  estado?: 'Activo' | 'Inactivo' | 'Suspendido';
}

export const TarjetaEstudiante = ({
  id,
  nombres,
  apellidos,
  dni,
  telefono,
  seccionId,
  gradoNumero,
  nivel,
  letra,
  fotoUrl,
  estado = 'Activo'
}: EstudianteTarjetaProps) => {
  const iniciales = `${nombres.charAt(0)}${apellidos.charAt(0)}`;

  return (
    <Link 
      href={`/administrador/alumnos/${seccionId}/estudiante/${id}`}
      className="bg-white rounded-xl p-3.5 border border-line shadow-xs hover:shadow-md hover:border-accent/40 transition-all flex items-center justify-between gap-3 group cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Avatar / Foto */}
        <div className="w-10 h-10 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0 border border-accent/20 overflow-hidden group-hover:scale-105 transition-transform">
          {fotoUrl ? (
            <img src={fotoUrl} alt={`${nombres} ${apellidos}`} className="w-full h-full object-cover" />
          ) : (
            <span>{iniciales}</span>
          )}
        </div>

        {/* Información Principal */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-ink text-xs font-bold truncate group-hover:text-accent transition-colors">
              {nombres} {apellidos}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] font-bold text-muted">
            <span className="flex items-center gap-1">
              <UserCircleIcon size={12} className="text-muted shrink-0" /> DNI: {dni}
            </span>
            {gradoNumero && (
              <>
                <span>•</span>
                <span className="text-accent flex items-center gap-0.5">
                  <BookOpen01Icon size={11} /> {gradoNumero}° {nivel} {letra ? `(${letra})` : ''}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Flecha de Navegación en Hover */}
      <div className="w-7 h-7 rounded-lg bg-neutral group-hover:bg-accent group-hover:text-white text-muted flex items-center justify-center shrink-0 transition-colors">
        <ArrowRight01Icon size={14} />
      </div>
    </Link>
  );
};
