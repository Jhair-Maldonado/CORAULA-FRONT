'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar01Icon, 
  Search01Icon, 
  Clock01Icon, 
  UserGroupIcon, 
  BookOpen01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  Add01Icon
} from 'hugeicons-react';
import { MOCK_GRADOS } from '@/data/mockAlumnos';

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
    <div className="w-full h-full p-8 md:p-10 overflow-y-auto bg-canvas font-sans flex flex-col gap-6">
      
      {/* HEADER & NUEVO HORARIO ACTION */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
            PLANIFICACIÓN ACADÉMICA
          </span>
          <h1 className="text-ink text-2xl font-extrabold mt-1 tracking-tight">
            Horarios por Grado y Sección
          </h1>
          <p className="text-muted text-xs font-medium mt-1">
            Gestiona la distribución horaria semanal para cada uno de los grados del plantel
          </p>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white shadow-sm hover:bg-accent/90 transition-colors text-xs font-bold w-fit">
          <Add01Icon size={16} />
          <span>Crear Horario</span>
        </button>
      </div>

      {/* BÚSQUEDA Y FILTROS */}
      <div className="max-w-7xl mx-auto w-full bg-white border border-line rounded-xl p-3 md:p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        
        {/* Input de Búsqueda */}
        <div className="flex items-center gap-3 text-muted w-full md:w-96 px-2">
          <Search01Icon size={18} />
          <input 
            type="text" 
            placeholder="Buscar por grado o sección (ej. 1° Grado A)..." 
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
            className="appearance-none w-full md:w-56 bg-neutral/50 border border-line rounded-lg px-4 py-2 pr-8 text-xs font-semibold text-muted hover:text-ink cursor-pointer outline-none transition-colors"
          >
            <option value="Todos">Nivel · Todos</option>
            <option value="Primaria">Nivel · Primaria</option>
            <option value="Secundaria">Nivel · Secundaria</option>
          </select>
          <ArrowDown01Icon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

      </div>

      {/* GRID DE CARDS DE GRADOS */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
        {filteredGrados.length > 0 ? (
          filteredGrados.map((item) => (
            <div 
              key={item.seccionId}
              className="bg-white rounded-2xl border border-line p-6 shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center font-black text-base group-hover:scale-105 transition-transform">
                      {item.numeroGrado}°{item.letraSeccion}
                    </div>
                    <div>
                      <h3 className="text-ink font-extrabold text-base leading-tight group-hover:text-accent transition-colors">
                        {item.nombreCompletoSeccion}
                      </h3>
                      <span className="text-[10px] font-bold text-muted uppercase bg-neutral px-2 py-0.5 rounded border border-line mt-1 inline-block">
                        Nivel {item.nivel}
                      </span>
                    </div>
                  </div>

                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-1 rounded-md border border-emerald-200">
                    {item.estadoHorario}
                  </span>
                </div>

                <hr className="border-line my-4" />

                {/* Info Horario y Alumnos */}
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between text-muted font-medium">
                    <span className="flex items-center gap-1.5">
                      <UserGroupIcon size={16} className="text-accent" /> Alumnos Matriculados:
                    </span>
                    <span className="font-extrabold text-ink">{item.cantAlumnos} / {item.capacidad}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted font-medium">
                    <span className="flex items-center gap-1.5">
                      <Clock01Icon size={16} className="text-accent" /> Horas Académicas/Semana:
                    </span>
                    <span className="font-extrabold text-ink">{item.totalHorasSemana} hrs</span>
                  </div>

                  <div className="flex items-center justify-between text-muted font-medium">
                    <span className="flex items-center gap-1.5">
                      <BookOpen01Icon size={16} className="text-accent" /> Tutor Asignado:
                    </span>
                    <span className="font-bold text-ink truncate max-w-[150px]">{item.tutor}</span>
                  </div>
                </div>
              </div>

              {/* Botón Ver Horario */}
              <Link 
                href={`/administrador/horario/${item.seccionId}`}
                className="w-full mt-6 py-2.5 px-4 rounded-xl bg-neutral hover:bg-accent hover:text-white transition-all text-xs font-bold text-ink flex items-center justify-center gap-2 group/btn"
              >
                <Calendar01Icon size={16} />
                <span>Ver Horario Completo</span>
                <ArrowRight01Icon size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>

            </div>
          ))
        ) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-muted gap-2 bg-white rounded-2xl border border-line">
            <Calendar01Icon size={36} />
            <p className="text-xs font-semibold">No se encontraron grados o secciones registradas.</p>
          </div>
        )}
      </div>

    </div>
  );
}
