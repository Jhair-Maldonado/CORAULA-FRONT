'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { ArrowDown01Icon, ArrowRight01Icon, Folder01Icon, FolderOpenIcon, BookOpen01Icon } from 'hugeicons-react';

export const GradosSidebar = () => {
  const pathname = usePathname();
  
  // Extraer el id de sección de la ruta (ej: /administrador/alumnos/alumnado/1a)
  const segments = pathname.split('/');
  const alumnadoIndex = segments.indexOf('alumnado');
  const currentSeccionId = alumnadoIndex !== -1 && segments.length > alumnadoIndex + 1 
    ? segments[alumnadoIndex + 1] 
    : null;
  
  // Buscar qué grado contiene esta sección activa
  const activeGradoObj = MOCK_GRADOS.find(g => 
    g.secciones.some(s => s.id === currentSeccionId)
  );

  const initialExpandedGrado = activeGradoObj?.id || MOCK_GRADOS[0].id;

  const [expandedGrado, setExpandedGrado] = useState<string | null>(initialExpandedGrado);

  return (
    <div className="w-[240px] h-full bg-white border-r border-line py-6 flex flex-col gap-4 shrink-0 overflow-y-auto">
      <div className="px-5 mb-2">
        <h2 className="text-ink text-sm font-extrabold flex items-center gap-2">
          <BookOpen01Icon size={18} className="text-accent" />
          Niveles y Grados
        </h2>
        <p className="text-muted text-[11px] font-medium mt-1 mb-3">Explora las secciones del plantel</p>
        
        <Link
          href="/administrador/alumnos/alumnado"
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-all border ${
            pathname === '/administrador/alumnos/alumnado'
              ? 'bg-accent text-white border-accent shadow-sm'
              : 'bg-neutral text-ink border-line hover:bg-neutral/80'
          }`}
        >
          Ver todo alumnado
        </Link>
      </div>
      
      <div className="flex flex-col gap-3 px-3">
        {MOCK_GRADOS.map((grado) => {
          const isExpanded = expandedGrado === grado.id;
          const hasActiveSection = grado.secciones.some(s => s.id === currentSeccionId);
          // Calculate total students in this grade for a badge
          const totalStudents = grado.secciones.reduce((acc, curr) => acc + curr.estudiantes.length, 0);
          
          return (
            <div key={grado.id} className="flex flex-col gap-1">
              <button
                onClick={() => setExpandedGrado(isExpanded ? null : grado.id)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 transition-all ${
                  hasActiveSection 
                    ? 'bg-accent/10 text-accent font-bold border border-accent/20' 
                    : isExpanded ? 'bg-neutral text-ink' : 'text-muted hover:bg-neutral hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {hasActiveSection || isExpanded ? <FolderOpenIcon size={18} className="text-accent" /> : <Folder01Icon size={18} />}
                  <span className={`text-[13px] ${hasActiveSection || isExpanded ? 'font-bold' : 'font-semibold'}`}>
                    {grado.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {totalStudents > 0 && !isExpanded && (
                    <span className="text-[9px] font-bold bg-white px-1.5 py-0.5 rounded shadow-sm text-ink border border-line">
                      {totalStudents}
                    </span>
                  )}
                  {isExpanded ? <ArrowDown01Icon size={16} /> : <ArrowRight01Icon size={16} />}
                </div>
              </button>
              
              <div 
                className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? 'max-h-[500px] mt-1' : 'max-h-0'
                }`}
              >
                {grado.secciones.map(seccion => {
                  const isActive = currentSeccionId === seccion.id;
                  return (
                    <Link
                      key={seccion.id}
                      href={`/administrador/alumnos/alumnado/${seccion.id}`}
                      className={`w-full flex items-center justify-between px-4 py-2 ml-2 rounded-lg text-[12px] transition-all relative ${
                        isActive 
                          ? 'bg-accent-soft text-accent font-bold' 
                          : 'text-muted hover:bg-neutral hover:text-ink font-medium'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent rounded-r-full" />
                      )}
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isActive ? 'bg-accent text-white' : 'bg-white border border-line text-ink'
                        }`}>
                          {seccion.letra}
                        </div>
                        Sección {seccion.letra}
                      </div>
                      <span className={`text-[10px] font-bold ${isActive ? 'text-accent' : 'text-muted/60'}`}>
                        {seccion.estudiantes.length} / {seccion.capacidadMaxima}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
