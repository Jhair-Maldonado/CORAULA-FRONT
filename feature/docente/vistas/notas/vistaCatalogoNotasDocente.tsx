'use client';

import React, { useState } from 'react';
import { BookOpen, Users, ClipboardCheck, Search } from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import { CardSalonNotas } from './component/cardSalonNotas';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export default function VistaCatalogoNotasDocente() {
  const { cursos, isLoading, coursesError, refreshCursos, setCursoActivo } = useDocenteSession();
  const [busqueda, setBusqueda] = useState('');

  const cursosFiltrados = cursos.filter(c => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.area.toLowerCase().includes(q) ||
      `${c.grade}`.includes(q) ||
      c.sectionName.toLowerCase().includes(q)
    );
  });

  const totalAlumnos = cursos.reduce((acc, c) => acc + (c.studentCount || 0), 0);

  if (isLoading && cursos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-white rounded-xl border border-[#E5E7EB] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (coursesError && cursos.length === 0) {
    return (
      <ErrorState
        title="No pudimos cargar tus cursos asignados"
        message={coursesError}
        onRetry={refreshCursos}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FFE4E6] text-[#BE123C] flex items-center justify-center shrink-0">
            <ClipboardCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#BE123C] block">
              Portal Docente · Evaluación y Rendimiento
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827]">
              Registro de Calificaciones
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Selecciona un curso y sección para consultar o ingresar notas bimestrales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-50 border border-[#E5E7EB] text-xs font-semibold text-[#111827]">
            <BookOpen size={15} className="text-[#BE123C]" />
            <span>{cursos.length} {cursos.length === 1 ? 'salón' : 'salones'}</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-50 border border-[#E5E7EB] text-xs font-semibold text-[#111827]">
            <Users size={15} className="text-[#64748B]" />
            <span>{totalAlumnos} alumnos</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro / Búsqueda */}
      {cursos.length > 0 && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de curso, grado, sección o área..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-[#E5E7EB] bg-white text-[#111827] placeholder:text-[#94A3B8] focus:border-[#BE123C] focus:outline-hidden transition-colors shadow-2xs"
          />
        </div>
      )}

      {/* Grid de Salones */}
      {cursosFiltrados.length === 0 ? (
        <div className="p-10 bg-white border border-dashed border-[#E5E7EB] rounded-xl text-center flex flex-col items-center gap-3">
          <BookOpen size={32} className="text-[#94A3B8]" />
          <p className="text-sm font-bold text-[#111827]">
            {cursos.length === 0 ? 'No tienes cursos ni secciones asignadas' : 'No se encontraron salones con ese criterio'}
          </p>
          <p className="text-xs text-[#64748B] max-w-sm">
            {cursos.length === 0
              ? 'Cuando la coordinación académica te asigne carga horaria, tus salones aparecerán aquí.'
              : 'Verifica los términos de búsqueda o borra el filtro para ver todos tus salones.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cursosFiltrados.map(curso => (
            <CardSalonNotas
              key={curso.sectionCourseId}
              curso={curso}
              onSelect={c => {
                setCursoActivo({
                  id: String(c.sectionCourseId),
                  nombre: c.name,
                  grado: `${c.grade}° ${c.sectionName}`
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
