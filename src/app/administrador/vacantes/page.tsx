'use client';

import React, { useState } from 'react';
import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { 
  Building03Icon, 
  UserGroupIcon, 
  Door01Icon,
  Tick02Icon,
  Cancel01Icon
} from 'hugeicons-react';

export default function VacantesPage() {
  // Estado local para simular la apertura/cierre de matrícula por grado
  const [gradosStatus, setGradosStatus] = useState<Record<string, boolean>>(
    MOCK_GRADOS.reduce((acc, g) => ({ ...acc, [g.id]: true }), {})
  );

  const toggleStatus = (gradoId: string) => {
    setGradosStatus(prev => ({
      ...prev,
      [gradoId]: !prev[gradoId]
    }));
  };

  return (
    <div className="w-full h-full p-8 md:p-12 overflow-y-auto bg-canvas font-sans flex flex-col gap-8">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
            Gestión de Matrícula
          </span>
          <h1 className="text-ink text-2xl font-extrabold mt-1 tracking-tight">
            Control de Vacantes
          </h1>
        </div>
      </div>

      {/* GRID DE GRADOS */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {MOCK_GRADOS.map(grado => {
          
          // Cálculos agregados para el grado
          const capacidadTotal = grado.secciones.reduce((sum, s) => sum + s.capacidadMaxima, 0);
          const inscritosTotal = grado.secciones.reduce((sum, s) => sum + s.estudiantes.length, 0);
          const vacantesDisponibles = capacidadTotal - inscritosTotal;
          const porcentajeOcupado = capacidadTotal > 0 ? (inscritosTotal / capacidadTotal) * 100 : 0;
          
          const isAberto = gradosStatus[grado.id];
          const isLleno = vacantesDisponibles === 0;

          return (
            <div key={grado.id} className="bg-white rounded-xl border border-line p-4 flex flex-col shadow-sm relative overflow-hidden group">
              
              {/* Header de Tarjeta */}
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-black text-sm">
                    {grado.numero}°
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-ink leading-tight">{grado.nombre}</h2>
                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest">{grado.nivel}</p>
                  </div>
                </div>
                
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                  isAberto 
                    ? isLleno ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-success/10 text-success-ink border-success/20'
                    : 'bg-neutral text-muted border-line'
                }`}>
                  {isAberto ? (isLleno ? 'Lleno' : 'Abierto') : 'Cerrado'}
                </span>
              </div>

              {/* Estadísticas Centrales */}
              <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                    <UserGroupIcon size={10} /> Inscritos
                  </span>
                  <span className="text-lg font-black text-ink">{inscritosTotal}</span>
                </div>
                <div className="flex flex-col border-l border-line pl-3">
                  <span className="text-[9px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Door01Icon size={10} /> Vacantes
                  </span>
                  <span className={`text-lg font-black ${vacantesDisponibles > 0 ? 'text-success-ink' : 'text-rose-500'}`}>
                    {vacantesDisponibles}
                  </span>
                </div>
              </div>

              {/* Barra de Progreso */}
              <div className="flex flex-col gap-1.5 mb-5 relative z-10">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-ink">Ocupación</span>
                  <span className="text-muted">{Math.round(porcentajeOcupado)}%</span>
                </div>
                <div className="w-full h-2 bg-neutral rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      isLleno ? 'bg-rose-500' : 'bg-accent'
                    }`}
                    style={{ width: `${porcentajeOcupado}%` }}
                  />
                </div>
                <p className="text-[9px] text-muted text-right mt-0.5">Capacidad máx: {capacidadTotal}</p>
              </div>

              {/* Action Button */}
              <button 
                onClick={() => toggleStatus(grado.id)}
                className={`w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors relative z-10 ${
                  isAberto 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'
                    : 'bg-accent text-white hover:bg-rose-800 shadow-md shadow-accent/20'
                }`}
              >
                {isAberto ? (
                  <>
                    <Cancel01Icon size={18} /> Cerrar Matrícula
                  </>
                ) : (
                  <>
                    <Tick02Icon size={18} /> Habilitar Matrícula
                  </>
                )}
              </button>

              {/* Decorative Icon */}
              <Building03Icon size={120} className="absolute -right-8 -bottom-8 text-neutral/50 z-0 transition-transform group-hover:-rotate-12 duration-500" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
