'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { ArrowRight01Icon, Search01Icon } from 'hugeicons-react';

export default function AlumnosOverviewPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrado, setFilterGrado] = useState('Todos');
  const [filterSeccion, setFilterSeccion] = useState('Todas');
  const [soloVacantes, setSoloVacantes] = useState(false);

  // Flatten all sections into a single array with grade info included
  const allSections = useMemo(() => {
    return MOCK_GRADOS.flatMap(grado => 
      grado.secciones.map(seccion => ({
        ...seccion,
        gradoNombre: grado.nombre,
        gradoNumero: grado.numero,
        nivel: grado.nivel,
        vacantes: seccion.capacidadMaxima - seccion.estudiantes.length
      }))
    );
  }, []);

  // Filter logic
  const filteredSections = allSections.filter(seccion => {
    const matchesSearch = seccion.gradoNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          seccion.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrado = filterGrado === 'Todos' || seccion.gradoNumero.toString() === filterGrado;
    const matchesSeccion = filterSeccion === 'Todas' || seccion.letra === filterSeccion;
    const matchesVacantes = soloVacantes ? seccion.vacantes > 0 : true;

    return matchesSearch && matchesGrado && matchesSeccion && matchesVacantes;
  });

  // Extract unique grades and section letters for the dropdowns
  const uniqueGrados = Array.from(new Set(allSections.map(s => s.gradoNumero))).sort();
  const uniqueLetras = Array.from(new Set(allSections.map(s => s.letra))).sort();

  return (
    <div className="w-full h-full p-8 md:p-12 overflow-y-auto bg-canvas font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
            Aulas y Estudiantes
          </span>
          <h1 className="text-ink text-2xl font-extrabold mt-1">
            Panel de alumnos
          </h1>
        </header>

        {/* Compact Filters */}
        <div className="w-full bg-white border border-line rounded-lg flex flex-col md:flex-row items-center p-2 gap-4 shadow-sm mb-8 text-xs font-medium text-ink">
          
          <div className="flex items-center gap-2 flex-1 w-full md:border-r border-line md:pr-4">
            <Search01Icon size={16} className="text-muted ml-2" />
            <input 
              type="text" 
              placeholder="Buscar grado o sección..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none placeholder:text-muted"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4 px-2">
            <div className="flex items-center gap-2">
              <span className="text-muted">Grado:</span>
              <select 
                value={filterGrado}
                onChange={(e) => setFilterGrado(e.target.value)}
                className="bg-neutral border border-line rounded px-2 py-1 outline-none focus:border-accent"
              >
                <option value="Todos">Todos</option>
                {uniqueGrados.map(num => (
                  <option key={num} value={num.toString()}>{num}° Grado</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted">Sección:</span>
              <select 
                value={filterSeccion}
                onChange={(e) => setFilterSeccion(e.target.value)}
                className="bg-neutral border border-line rounded px-2 py-1 outline-none focus:border-accent"
              >
                <option value="Todas">Todas</option>
                {uniqueLetras.map(letra => (
                  <option key={letra} value={letra}>{letra}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={soloVacantes}
                onChange={(e) => setSoloVacantes(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-muted">Con vacantes</span>
            </label>
          </div>
        </div>

        {/* Flat Grid of all Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSections.map(seccion => (
            <Link 
              key={seccion.id}
              href={`/administrador/alumnos/${seccion.id}`}
              className="bg-white rounded-xl p-5 border border-line shadow-sm hover:shadow-md hover:border-accent/30 transition-all group flex flex-col h-[140px]"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-ink text-sm font-extrabold group-hover:text-accent transition-colors">
                    {seccion.nombre}
                  </h3>
                  <span className="text-muted text-[10px] font-bold uppercase tracking-wider">
                    {seccion.nivel}
                  </span>
                </div>
                {/* Vacancy Badge */}
                <div className={`px-2 py-1 rounded text-[10px] font-bold flex flex-col items-center leading-none ${
                  seccion.vacantes > 0 ? 'bg-success/10 text-success-ink' : 'bg-rose-100 text-rose-700'
                }`}>
                  <span className="text-xs">{seccion.vacantes}</span>
                  <span className="text-[8px] uppercase">Vacantes</span>
                </div>
              </div>
              
              <p className="text-muted text-[12px] font-medium mt-auto mb-3">
                {seccion.estudiantes.length} <span className="opacity-50">/ {seccion.capacidadMaxima} alumnos.</span>
              </p>
              
              <div className="flex items-center text-accent text-[11px] font-bold gap-1 mt-auto pt-3 border-t border-line/50">
                Ver alumnado <ArrowRight01Icon size={14} />
              </div>
            </Link>
          ))}
        </div>
        
        {filteredSections.length === 0 && (
          <div className="w-full text-center text-muted text-sm py-16 bg-white border border-line border-dashed rounded-xl">
            No se encontraron secciones que coincidan con los filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
}
