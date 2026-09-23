'use client';

import React, { useState } from 'react';
import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { 
  Building03Icon, 
  UserGroupIcon, 
  Door01Icon,
  Tick02Icon,
  Cancel01Icon,
  Search01Icon,
  ArrowDown01Icon,
  CheckmarkCircle01Icon
} from 'hugeicons-react';

export default function VacantesPage() {
  const [gradosStatus, setGradosStatus] = useState<Record<string, boolean>>(
    MOCK_GRADOS.reduce((acc, g) => ({ ...acc, [g.id]: true }), {})
  );
  const [nivelFilter, setNivelFilter] = useState<string>('Todos');

  const toggleStatus = (gradoId: string) => {
    setGradosStatus(prev => ({
      ...prev,
      [gradoId]: !prev[gradoId]
    }));
  };

  const filteredGrados = MOCK_GRADOS.filter(g => 
    nivelFilter === 'Todos' || g.nivel === nivelFilter
  );

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
      
      {/* HEADER & FILTROS */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
            PLANIFICACIÓN Y ADMISIÓN
          </span>
          <h1 className="text-ink text-xl font-bold mt-0.5 tracking-tight">
            Control de Vacantes por Grado
          </h1>
          <p className="text-muted text-xs font-medium mt-0.5">
            Supervisa el nivel de ocupación, vacantes disponibles y habilita la apertura o cierre de inscripciones.
          </p>
        </div>

        {/* Filtro por Nivel */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value)}
              className="appearance-none bg-white border border-line rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-ink outline-none cursor-pointer hover:border-accent transition-colors shadow-xs"
            >
              <option value="Todos">Todos los Niveles</option>
              <option value="Primaria">Primaria</option>
              <option value="Secundaria">Secundaria</option>
            </select>
            <ArrowDown01Icon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* GRID DE TARJETAS MEJORADAS Y COMPACTAS */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
        {filteredGrados.map(grado => {
          
          const capacidadTotal = grado.secciones.reduce((sum, s) => sum + s.capacidadMaxima, 0);
          const inscritosTotal = grado.secciones.reduce((sum, s) => sum + s.estudiantes.length, 0);
          const vacantesDisponibles = capacidadTotal - inscritosTotal;
          const porcentajeOcupado = capacidadTotal > 0 ? (inscritosTotal / capacidadTotal) * 100 : 0;
          
          const isAberto = gradosStatus[grado.id];
          const isLleno = vacantesDisponibles === 0;

          return (
            <div 
              key={grado.id} 
              className="bg-white rounded-2xl border border-line p-4 flex flex-col justify-between shadow-xs relative overflow-hidden transition-all hover:shadow-md hover:border-accent/40 group"
            >
              <div>
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm shrink-0 border border-accent/20">
                      {grado.numero}°
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-ink leading-tight">{grado.nombre}</h2>
                      <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{grado.nivel}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    isAberto 
                      ? isLleno ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-neutral text-muted border-line'
                  }`}>
                    {isAberto ? (isLleno ? 'Lleno' : 'Abierto') : 'Cerrado'}
                  </span>
                </div>

                {/* Estadísticas de Ocupación */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral/40 border border-line/60 mb-3 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                      <UserGroupIcon size={12} className="text-muted" /> Inscritos
                    </span>
                    <span className="text-base font-bold text-ink mt-0.5">{inscritosTotal}</span>
                  </div>
                  <div className="flex flex-col border-l border-line/60 pl-2.5">
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                      <Door01Icon size={12} className="text-accent" /> Vacantes
                    </span>
                    <span className={`text-base font-bold mt-0.5 ${vacantesDisponibles > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {vacantesDisponibles}
                    </span>
                  </div>
                </div>

                {/* Barra de Progreso de Capacidad */}
                <div className="flex flex-col gap-1 mb-4 relative z-10">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-muted">Capacidad</span>
                    <span className="text-ink font-bold">{inscritosTotal} / {capacidadTotal} ({Math.round(porcentajeOcupado)}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        isLleno ? 'bg-rose-500' : porcentajeOcupado > 80 ? 'bg-amber-500' : 'bg-accent'
                      }`}
                      style={{ width: `${porcentajeOcupado}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Botón de Acción Habilitar/Cerrar */}
              <button 
                onClick={() => toggleStatus(grado.id)}
                className={`w-full py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all relative z-10 ${
                  isAberto 
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-accent text-white hover:bg-accent/90 shadow-xs'
                }`}
              >
                {isAberto ? (
                  <>
                    <Cancel01Icon size={14} /> Cerrar Matrícula
                  </>
                ) : (
                  <>
                    <Tick02Icon size={14} /> Habilitar Matrícula
                  </>
                )}
              </button>

              {/* Marca de agua estética de fondo */}
              <Building03Icon size={100} className="absolute -right-6 -bottom-6 text-neutral/40 z-0 pointer-events-none group-hover:scale-105 transition-transform" />
            </div>
          );
        })}
      </div>

    </div>
  );
}
