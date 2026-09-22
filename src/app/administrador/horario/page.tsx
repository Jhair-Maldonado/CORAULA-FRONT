'use client';

import React, { useState } from 'react';
import { 
  Calendar01Icon, 
  Search01Icon, 
  ArrowDown01Icon,
  Add01Icon
} from 'hugeicons-react';
import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { CardGrados } from '@/app/administrador/components/CardGrados';

export default function HorariosPage() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [nivelFilter, setNivelFilter] = useState<string>('Todos');

  // Aplanar todos los grados y sus secciones para mostrar cards de cada grado y sección
  const allGrados = MOCK_GRADOS.flatMap(grado => {
    return grado.secciones.map(seccion => ({
      gradoId: grado.id,
      nombreGrado: grado.nombre,
      nivel: grado.nivel,
      numeroGrado: grado.numero,
      seccionId: seccion.id,
      letraSeccion: seccion.letra,
      nombreCompletoSeccion: `${grado.nombre} - Sección ${seccion.letra}`,
      cantAlumnos: seccion.estudiantes.length,
      capacidad: seccion.capacidadMaxima,
      // Horarios simulados para la card
      tutor: 'Prof. María Fernanda Soto',
      totalHorasSemana: 30,
      estadoHorario: 'Asignado Completo'
    }));
  });

  const filteredGrados = allGrados.filter(item => {
    const matchesSearch = item.nombreCompletoSeccion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.nivel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNivel = nivelFilter === 'Todos' || item.nivel === nivelFilter;
    return matchesSearch && matchesNivel;
  });

  return (
    <div className="w-full h-full p-6 md:p-8 overflow-y-auto bg-canvas font-sans flex flex-col gap-5">
      
      {/* HEADER & NUEVO HORARIO ACTION */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-accent text-[10px] font-extrabold tracking-widest uppercase">
            PLANIFICACIÓN ACADÉMICA
          </span>
          <h1 className="text-ink text-xl font-extrabold mt-0.5 tracking-tight">
            Horarios por Grado y Sección
          </h1>
          <p className="text-muted text-xs font-medium mt-0.5">
            Gestiona la distribución horaria semanal para cada uno de los grados del plantel
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white shadow-sm hover:bg-accent/90 transition-colors text-xs font-bold w-fit">
          <Add01Icon size={16} />
          <span>Crear Horario</span>
        </button>
      </div>

      {/* BÚSQUEDA Y FILTROS COMPACTOS */}
      <div className="max-w-7xl mx-auto w-full bg-white border border-line rounded-xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        
        {/* Input de Búsqueda */}
        <div className="flex items-center gap-2 text-muted w-full md:w-80 px-2">
          <Search01Icon size={16} />
          <input 
            type="text" 
            placeholder="Buscar por grado o sección..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-xs text-ink placeholder:text-muted font-medium"
          />
        </div>

        {/* Desplegable Nivel */}
        <div className="relative w-full md:w-auto">
          <select 
            value={nivelFilter}
            onChange={(e) => setNivelFilter(e.target.value)}
            className="appearance-none w-full md:w-48 bg-neutral/50 border border-line rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-muted hover:text-ink cursor-pointer outline-none transition-colors"
          >
            <option value="Todos">Nivel · Todos</option>
            <option value="Primaria">Nivel · Primaria</option>
            <option value="Secundaria">Nivel · Secundaria</option>
          </select>
          <ArrowDown01Icon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

      </div>

      {/* GRID DE COMPONENTES CARDGRADOS (4 COLUMNAS EN PANTALLAS GRANDES) */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
        {filteredGrados.length > 0 ? (
          filteredGrados.map((item) => (
            <CardGrados 
              key={item.seccionId}
              gradoId={item.gradoId}
              nombreGrado={item.nombreGrado}
              seccionId={item.seccionId}
              nombreCompletoSeccion={item.nombreCompletoSeccion}
              nivel={item.nivel}
              numeroGrado={item.numeroGrado}
              letraSeccion={item.letraSeccion}
              cantAlumnos={item.cantAlumnos}
              capacidad={item.capacidad}
              tutor={item.tutor}
              totalHorasSemana={item.totalHorasSemana}
              estadoHorario={item.estadoHorario}
            />
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted gap-2 bg-white rounded-xl border border-line">
            <Calendar01Icon size={32} />
            <p className="text-xs font-semibold">No se encontraron grados o secciones registradas.</p>
          </div>
        )}
      </div>

    </div>
  );
}
