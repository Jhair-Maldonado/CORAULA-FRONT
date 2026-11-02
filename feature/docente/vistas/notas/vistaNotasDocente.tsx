// feature/docente/vistas/notas/vistaNotasDocente.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ClipboardCheck,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';

export default function VistaNotasDocente() {
  const { cursos, setCursoActivo, isLoading, coursesError, refreshCursos } = useDocenteSession();

  return (
    <div className="flex flex-col gap-6">
      {/* Header institucional */}
      <header className="border-b border-[#E5E7EB] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#BE123C]">
            Portal Docente
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] mt-1">
            Registro y Resultados de Notas
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Selecciona un curso asignado para consultar sus calificaciones, resultados bimestrales y el progreso de los estudiantes.
          </p>
        </div>
        <div className="p-3 bg-[#FFE4E6] text-[#BE123C] rounded-xl border border-[#BE123C]/10 self-start sm:self-auto">
          <ClipboardCheck size={22} aria-hidden="true" />
        </div>
      </header>

      {/* Estados de carga, error o lista de cursos en cards */}
      {isLoading ? (
        <div role="status" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map(n => (
            <div key={n} className="h-44 rounded-xl border border-[#E5E7EB] bg-white animate-pulse" />
          ))}
        </div>
      ) : coursesError ? (
        <div role="alert" className="p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          <p>{coursesError}</p>
          <button
            type="button"
            onClick={refreshCursos}
            className="mt-3 min-h-10 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg font-bold text-xs text-[#111827] focus-visible:outline-2 focus-visible:outline-[#BE123C]"
          >
            Reintentar
          </button>
        </div>
      ) : cursos.length === 0 ? (
        <div className="p-10 border border-dashed border-[#E5E7EB] bg-white rounded-xl text-center flex flex-col items-center justify-center gap-2">
          <BookOpen size={32} aria-hidden="true" className="text-[#64748B]" />
          <h2 className="font-bold text-base text-[#111827]">No tienes cursos asignados</h2>
          <p className="text-xs text-[#64748B]">Las calificaciones estarán disponibles cuando tengas cursos asignados a tu cuenta docente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cursos.map(curso => (
            <article
              key={curso.sectionCourseId}
              className="bg-white rounded-xl border border-[#E5E7EB] border-l-4 border-l-[#BE123C] p-5 shadow-xs hover:shadow-md hover:border-[#BE123C]/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[10px] font-extrabold text-[#64748B] bg-[#F3F4F6] border border-[#E5E7EB] rounded-md px-2 py-0.5">
                    {curso.code}
                  </span>
                  <span className="text-[11px] font-bold text-[#BE123C] bg-[#FFE4E6] px-2 py-0.5 rounded-md">
                    {curso.level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}
                  </span>
                </div>

                <h2 className="font-bold text-lg text-[#111827] group-hover:text-[#BE123C] transition-colors leading-snug">
                  {curso.name}
                </h2>
                <p className="text-xs font-semibold text-[#64748B] mt-1">
                  {curso.grade}° grado · Sección {curso.sectionName}
                </p>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Área: {curso.area}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 text-[11px] font-medium text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <Users size={14} aria-hidden="true" />
                    {curso.studentCount} alumnos
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} aria-hidden="true" />
                    {curso.weeklyHours}h/sem
                  </span>
                </div>

                <Link
                  href={`/docente/notas/${curso.sectionCourseId}`}
                  onClick={() => setCursoActivo({ id: String(curso.sectionCourseId), nombre: curso.name, grado: `${curso.grade}° grado` })}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F3F4F6] text-[#111827] group-hover:bg-[#BE123C] group-hover:text-white text-xs font-bold transition-colors shadow-2xs focus-visible:outline-2 focus-visible:outline-[#BE123C]"
                >
                  <span>Ver Notas</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
