'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_GRADOS } from '@/data/mockAlumnos';
import { ArrowRight01Icon, Search01Icon, UserGroupIcon, GridViewIcon, ArrowLeft01Icon, ArrowRight02Icon } from 'hugeicons-react';

type ViewMode = 'aulas' | 'alumnos';

export default function AlumnosOverviewPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('aulas');
  
  // Shared Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrado, setFilterGrado] = useState('Todos');
  const [filterSeccion, setFilterSeccion] = useState('Todas');
  const [soloVacantes, setSoloVacantes] = useState(false);

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

  // Filter logic for AULAS
  const filteredSections = useMemo(() => {
    return allSections.filter(seccion => {
      const matchesSearch = seccion.gradoNombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            seccion.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrado = filterGrado === 'Todos' || seccion.gradoNumero.toString() === filterGrado;
      const matchesSeccion = filterSeccion === 'Todas' || seccion.letra === filterSeccion;
      const matchesVacantes = soloVacantes ? seccion.vacantes > 0 : true;

      return matchesSearch && matchesGrado && matchesSeccion && matchesVacantes;
    });
  }, [allSections, searchTerm, filterGrado, filterSeccion, soloVacantes]);

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

  // Switch view handler
  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(1); // Reset pagination on switch
  };

  return (
    <div className="w-full h-full p-8 md:p-12 overflow-y-auto bg-canvas font-sans flex flex-col">
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Header */}
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-accent text-[11px] font-extrabold tracking-widest uppercase">
              Aulas y Estudiantes
            </span>
            <h1 className="text-ink text-2xl font-extrabold mt-1">
              Panel de alumnos
            </h1>
          </div>

          {/* View Toggles */}
          <div className="flex items-center bg-white border border-line rounded-lg p-1 shadow-sm">
            <button 
              onClick={() => toggleViewMode('aulas')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'aulas' ? 'bg-neutral text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              <GridViewIcon size={16} /> Aulas
            </button>
            <button 
              onClick={() => toggleViewMode('alumnos')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                viewMode === 'alumnos' ? 'bg-neutral text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              <UserGroupIcon size={16} /> Ver todo alumnado
            </button>
          </div>
        </header>

        {/* Compact Filters */}
        <div className="w-full bg-white border border-line rounded-lg flex flex-col lg:flex-row items-center p-2 gap-4 shadow-sm mb-8 text-xs font-medium text-ink shrink-0">
          
          <div className="flex items-center gap-2 flex-1 w-full lg:border-r border-line lg:pr-4">
            <Search01Icon size={16} className="text-muted ml-2" />
            <input 
              type="text" 
              placeholder={viewMode === 'aulas' ? "Buscar grado o sección..." : "Buscar por nombre, apellido o DNI..."}
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

            {viewMode === 'aulas' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={soloVacantes}
                  onChange={(e) => setSoloVacantes(e.target.checked)}
                  className="accent-accent"
                />
                <span className="text-muted">Con vacantes</span>
              </label>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW: AULAS */}
        {/* ============================================================== */}
        {viewMode === 'aulas' && (
          <>
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
                    {seccion.estudiantes.length} alumnos inscritos <span className="opacity-50">/ {seccion.capacidadMaxima} cap.</span>
                  </p>
                  
                  <div className="flex items-center text-accent text-[11px] font-bold gap-1 mt-auto pt-3 border-t border-line/50">
                    Ir al aula <ArrowRight01Icon size={14} />
                  </div>
                </Link>
              ))}
            </div>
            {filteredSections.length === 0 && (
              <div className="w-full flex-1 flex items-center justify-center text-muted text-sm py-16 bg-white border border-line border-dashed rounded-xl">
                No se encontraron secciones que coincidan con los filtros.
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* VIEW: ALUMNOS (Global List) */}
        {/* ============================================================== */}
        {viewMode === 'alumnos' && (
          <div className="flex flex-col flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedStudents.map(student => (
                <Link 
                  key={student.id} 
                  href={`/administrador/alumnos/${student.seccionId}/estudiante/${student.id}`}
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
        )}

      </div>
    </div>
  );
}
