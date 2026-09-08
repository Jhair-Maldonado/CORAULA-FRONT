'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOCK_GRADOS } from '@/data/mockAlumnos';

export const GradosSidebar = () => {
  const pathname = usePathname();
  // We can extract seccionId from pathname to keep the respective grade open
  const currentSeccionId = pathname.split('/')[3]; 
  
  // Find which grade contains this section to auto-expand it
  const initialExpandedGrado = MOCK_GRADOS.find(g => 
    g.secciones.some(s => s.id === currentSeccionId)
  )?.id || MOCK_GRADOS[0].id;

  const [expandedGrado, setExpandedGrado] = useState<string | null>(initialExpandedGrado);

  return (
    <div className="w-[200px] h-full bg-white border-r border-line p-4 flex flex-col gap-2 shrink-0 overflow-y-auto">
      <h2 className="text-ink text-xs font-bold mb-2 px-2">
        Grados & Secciones
      </h2>
      
      <div className="flex flex-col gap-2">
        {MOCK_GRADOS.map((grado) => {
          const isExpanded = expandedGrado === grado.id;
          
          return (
            <div key={grado.id} className="flex flex-col gap-1">
              <button
                onClick={() => setExpandedGrado(isExpanded ? null : grado.id)}
                className="w-full flex items-center bg-neutral rounded px-2 py-2 text-ink text-xs font-medium hover:bg-line transition-colors"
              >
                <span className="mr-1 text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                {grado.nombre}
              </button>
              
              {isExpanded && (
                <div className="flex flex-col gap-0.5 mt-1">
                  {grado.secciones.map(seccion => {
                    const isActive = pathname.includes(`/administrador/alumnos/${seccion.id}`);
                    return (
                      <Link
                        key={seccion.id}
                        href={`/administrador/alumnos/${seccion.id}`}
                        className={`w-full text-left px-3 py-1.5 rounded text-[11px] transition-colors ${
                          isActive 
                            ? 'bg-accent-soft text-accent font-semibold' 
                            : 'text-muted hover:bg-neutral hover:text-ink font-normal'
                        }`}
                      >
                        {seccion.nombre}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
