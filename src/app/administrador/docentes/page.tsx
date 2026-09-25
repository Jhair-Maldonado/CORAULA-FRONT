'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search01Icon, 
  ArrowDown01Icon,
  Add01Icon,
  UserIcon,
  ArrowRight01Icon,
  ViewIcon,
  ArrowLeft01Icon
} from 'hugeicons-react';
import { MOCK_DOCENTES } from '@/data/mockDocentes';
import { Docente } from '@/types';

export default function DocentesPage() {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [nivelFilter, setNivelFilter] = useState<string>('Todos');
  const [gradoFilter, setGradoFilter] = useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const filteredDocentes: Docente[] = MOCK_DOCENTES.filter((doc: Docente) => {
    const matchesSearch = doc.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.materiaPrincipal.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.contacto.includes(searchTerm);
    
    const matchesNivel = nivelFilter === 'Todos' || doc.nivel === nivelFilter;
    const matchesGrado = gradoFilter === 'Todos' || doc.gradoFiltro === gradoFilter;

    return matchesSearch && matchesNivel && matchesGrado;
  });

  // Paginación
  const totalPages = Math.ceil(filteredDocentes.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocentes = filteredDocentes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="w-full h-full p-6 overflow-y-auto bg-canvas font-sans flex flex-col gap-5">
      
      {/* HEADER & NUEVO DOCENTE ACTION */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-accent text-[10px] font-bold tracking-widest uppercase">
            EQUIPO ACADÉMICO
          </span>
          <h1 className="text-ink text-xl font-bold mt-0.5 tracking-tight">
            Panel de docentes
          </h1>
          <p className="text-muted text-xs font-medium mt-0.5">
            Gestión de docentes, asistencias, faltas y tardanzas
          </p>
        </div>

        <div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white shadow-sm hover:bg-accent/90 transition-colors text-xs font-bold">
            <Add01Icon size={16} />
            <span>Nuevo docente</span>
          </button>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA COMPACTA */}
      <div className="max-w-7xl mx-auto w-full bg-white border border-line rounded-xl p-2.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        
        {/* Input de Búsqueda */}
        <div className="flex items-center gap-2 text-muted w-full md:w-80 px-2">
          <Search01Icon size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, celular o materia..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-transparent outline-none text-xs text-ink placeholder:text-muted font-medium"
          />
        </div>

        {/* Desplegables de Filtro */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Filtro Nivel */}
          <div className="relative flex-1 md:flex-none">
            <select 
              value={nivelFilter}
              onChange={(e) => {
                setNivelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none w-full bg-neutral/50 border border-line rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-muted hover:text-ink cursor-pointer outline-none transition-colors"
            >
              <option value="Todos">Nivel · Todos</option>
              <option value="Primaria">Nivel · Primaria</option>
              <option value="Secundaria">Nivel · Secundaria</option>
            </select>
            <ArrowDown01Icon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          {/* Filtro Grado */}
          <div className="relative flex-1 md:flex-none">
            <select 
              value={gradoFilter}
              onChange={(e) => {
                setGradoFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none w-full bg-neutral/50 border border-line rounded-lg px-3 py-1.5 pr-7 text-[11px] font-semibold text-muted hover:text-ink cursor-pointer outline-none transition-colors"
            >
              <option value="Todos">Grado · Todos</option>
              <option value="1ro">Grado · 1ro</option>
              <option value="3ro">Grado · 3ro</option>
              <option value="5to">Grado · 5to</option>
            </select>
            <ArrowDown01Icon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>

      </div>

      {/* TABLA COMPACTA DE DOCENTES */}
      <div className="max-w-7xl mx-auto w-full bg-white rounded-xl border border-line shadow-sm overflow-hidden">
        {paginatedDocentes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral/50 border-b border-line text-[10px] font-bold text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-4">Docente</th>
                  <th className="py-2.5 px-4">Celular</th>
                  <th className="py-2.5 px-4">Especialidad / Nivel</th>
                  <th className="py-2.5 px-4">Días Asistencia</th>
                  <th className="py-2.5 px-4 text-center">% Asistencia</th>
                  <th className="py-2.5 px-4 text-center">Faltas</th>
                  <th className="py-2.5 px-4 text-center">Tardanzas</th>
                  <th className="py-2.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs font-medium text-ink">
                {paginatedDocentes.map((docente: Docente) => (
                  <tr key={docente.id} className="hover:bg-neutral/30 transition-colors">
                    
                    {/* DOCENTE INFO */}
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-[10px] shrink-0">
                          {docente.iniciales}
                        </div>
                        <span className="font-bold text-ink text-xs truncate max-w-[160px]">
                          {docente.nombreCompleto}
                        </span>
                      </div>
                    </td>

                    {/* CELULAR */}
                    <td className="py-2.5 px-4 text-muted text-[11px] font-semibold">
                      {docente.contacto}
                    </td>

                    {/* ESPECIALIDAD */}
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-ink text-xs">{docente.materiaPrincipal}</span>
                      <span className="text-[10px] text-muted ml-1.5">({docente.gradoFiltro} {docente.nivel})</span>
                    </td>

                    {/* DÍAS ASISTENCIA */}
                    <td className="py-2.5 px-4">
                      <span className="bg-success/10 text-success-ink px-2 py-0.5 rounded text-[10px] font-bold inline-block">
                        {docente.diasTexto}
                      </span>
                    </td>

                    {/* % ASISTENCIA */}
                    <td className="py-2.5 px-4 text-center font-bold text-accent text-xs">
                      {docente.asistenciasPorcentaje}%
                    </td>

                    {/* FALTAS (SOLO NÚMERO) */}
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                        docente.faltasDias > 2 
                          ? 'bg-rose-100 text-rose-700' 
                          : docente.faltasDias > 0 
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-neutral text-muted'
                      }`}>
                        {docente.faltasDias}
                      </span>
                    </td>

                    {/* TARDANZAS (SOLO NÚMERO) */}
                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] ${
                        docente.tardanzasRegistros > 2 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-neutral text-muted'
                      }`}>
                        {docente.tardanzasRegistros}
                      </span>
                    </td>

                    {/* ACCIÓN (SOLO ICONO) */}
                    <td className="py-2.5 px-4 text-center">
                      <Link 
                        href={`/administrador/docentes/${docente.id}`}
                        title="Ver Perfil"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral hover:bg-accent hover:text-white transition-all text-muted"
                      >
                        <ViewIcon size={16} />
                      </Link>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-muted gap-2">
            <UserIcon size={28} />
            <p className="text-xs font-semibold">No se encontraron docentes con los criterios seleccionados.</p>
          </div>
        )}

        {/* CONTROLES DE PAGINACIÓN */}
        {filteredDocentes.length > 0 && (
          <div className="px-4 py-3 bg-neutral/20 border-t border-line flex items-center justify-between text-xs font-semibold text-muted">
            <span>
              Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredDocentes.length)} de {filteredDocentes.length} docentes
            </span>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 rounded bg-white border border-line disabled:opacity-40 hover:bg-neutral transition-colors text-ink"
              >
                <ArrowLeft01Icon size={14} />
              </button>
              <span className="text-ink font-bold px-2">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 rounded bg-white border border-line disabled:opacity-40 hover:bg-neutral transition-colors text-ink"
              >
                <ArrowRight01Icon size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
