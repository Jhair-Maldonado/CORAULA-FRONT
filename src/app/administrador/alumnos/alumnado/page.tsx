'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { Search01Icon, ArrowLeft01Icon, ArrowRight02Icon } from 'hugeicons-react';

export default function AlumnosOverviewPage() {
  // Shared Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrado, setFilterGrado] = useState('Todos');
  const [filterSeccion, setFilterSeccion] = useState('Todas');

  // Pagination for Alumnos
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Flatten all sections
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

  // Flatten all ALUMNOS
  const allStudents = useMemo(() => {
    return allSections.flatMap(seccion => 
      seccion.estudiantes.map(est => ({
        ...est,
        seccionId: seccion.id,
        seccionNombre: seccion.nombre,
        gradoNumero: seccion.gradoNumero,
        letra: seccion.letra,
        nivel: seccion.nivel
      }))
    );
  }, [allSections]);

  // Filter logic for ALUMNOS
  const filteredStudents = useMemo(() => {
    return allStudents.filter(student => {
      const matchesSearch = student.nombres.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            student.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            student.dni.includes(searchTerm);
      const matchesGrado = filterGrado === 'Todos' || student.gradoNumero.toString() === filterGrado;
      const matchesSeccion = filterSeccion === 'Todas' || student.letra === filterSeccion;
      
      return matchesSearch && matchesGrado && matchesSeccion;
    });
  }, [allStudents, searchTerm, filterGrado, filterSeccion]);

  // Pagination Math
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);

  const uniqueGrados = Array.from(new Set(allSections.map(s => s.gradoNumero))).sort();
  const uniqueLetras = Array.from(new Set(allSections.map(s => s.letra))).sort();

  return (
    <div className="w-full h-full p-8 md:p-12 overflow-y-auto bg-canvas font-sans flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
              Alumnado
            </span>
            <h1 className="text-ink text-2xl font-extrabold mt-1">
              Listado de Alumnos
            </h1>
          </div>
        </header>

        {/* Compact Filters */}
        <div className="w-full bg-white border border-line rounded-lg flex flex-col lg:flex-row items-center p-2 gap-4 shadow-sm mb-8 text-xs font-medium text-ink shrink-0">
          
          <div className="flex items-center gap-2 flex-1 w-full lg:border-r border-line lg:pr-4">
            <Search01Icon size={16} className="text-muted ml-2" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, apellido o DNI..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-transparent outline-none placeholder:text-muted"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4 px-2">
            <div className="flex items-center gap-2">
              <span className="text-muted">Grado:</span>
              <select 
                value={filterGrado}
                onChange={(e) => {
                  setFilterGrado(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-neutral border border-line rounded px-2 py-1 outline-none focus:border-accent cursor-pointer"
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
                onChange={(e) => {
                  setFilterSeccion(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-neutral border border-line rounded px-2 py-1 outline-none focus:border-accent cursor-pointer"
              >
                <option value="Todas">Todas</option>
                {uniqueLetras.map(letra => (
                  <option key={letra} value={letra}>{letra}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* VIEW: ALUMNOS (Global List) */}
        <div className="flex flex-col flex-1">
          <div className="flex flex-col flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedStudents.map(student => (
                <Link 
                  key={student.id} 
                  href={`/administrador/alumnos/alumnado/${student.seccionId}/estudiante/${student.id}`}
                  className="bg-white rounded-xl p-3 border border-line shadow-sm hover:shadow-md hover:border-accent/50 transition-all flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {student.nombres.charAt(0)}{student.apellidos.charAt(0)}
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="text-ink text-sm font-bold truncate group-hover:text-accent transition-colors">
                      {student.nombres} {student.apellidos}
                    </span>
                    <span className="text-muted text-[11px] font-medium truncate mt-0.5">
                      {student.gradoNumero}° {student.nivel} - Sec. {student.letra}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {filteredStudents.length === 0 ? (
              <div className="w-full flex-1 flex items-center justify-center text-muted text-sm py-16 bg-white border border-line border-dashed rounded-xl">
                No se encontraron alumnos con los filtros actuales.
              </div>
            ) : (
              /* Pagination Controls */
              <div className="mt-auto pt-8 flex items-center justify-between border-t border-line mt-8">
                <span className="text-xs text-muted font-medium">
                  Mostrando {paginatedStudents.length} de {filteredStudents.length} alumnos
                </span>
                
                <div className="flex items-center gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded bg-white border border-line text-ink hover:bg-neutral disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowLeft01Icon size={16} />
                  </button>
                  <span className="text-xs font-bold text-ink px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded bg-white border border-line text-ink hover:bg-neutral disabled:opacity-50 disabled:pointer-events-none transition-colors"
                  >
                    <ArrowRight02Icon size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
