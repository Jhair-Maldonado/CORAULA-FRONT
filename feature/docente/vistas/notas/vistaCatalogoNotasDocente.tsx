// feature/docente/vistas/notas/vistaCatalogoNotasDocente.tsx
'use client';

import React, { useState } from 'react';
import { BookOpen, Users, ClipboardCheck, Search } from 'lucide-react';
import { useDocenteSession } from '@/app/docente/components/DocenteSessionContext';
import { CardSalonNotas } from './component/cardSalonNotas';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';

/**
 * Catálogo de salones del docente (GET /teacher/courses vía la sesión docente).
 * Cada tarjeta abre la planilla única del salón conservando `?bimestre=<id>`.
 */
export default function VistaCatalogoNotasDocente({ bimestre }: { bimestre?: string }) {
  const { cursos, isLoading, coursesError, refreshCursos, setCursoActivo } = useDocenteSession();
  const [busqueda, setBusqueda] = useState('');

  const q = busqueda.toLowerCase().trim();
  const cursosFiltrados = cursos.filter(c => !q
    || c.name.toLowerCase().includes(q)
    || c.code.toLowerCase().includes(q)
    || c.area.toLowerCase().includes(q)
    || `${c.grade}`.includes(q)
    || c.sectionName.toLowerCase().includes(q));

  const totalAlumnos = cursos.reduce((acc, c) => acc + (c.studentCount || 0), 0);

  if (isLoading && cursos.length === 0) {
    return (
      <div className="space-y-6" role="status">
        <div className="h-16 bg-white rounded-xl border border-line animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <span className="sr-only">Cargando salones...</span>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-line shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <ClipboardCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
              Portal Docente · Evaluación y Rendimiento
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-ink">
              Registro de Calificaciones
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Selecciona un curso y sección para consultar o ingresar notas bimestrales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-canvas/50 border border-line text-xs font-semibold text-ink">
            <BookOpen size={15} className="text-accent" aria-hidden="true" />
            <span>{cursos.length} {cursos.length === 1 ? 'salón' : 'salones'}</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-canvas/50 border border-line text-xs font-semibold text-ink">
            <Users size={15} className="text-muted" aria-hidden="true" />
            <span>{totalAlumnos} alumnos</span>
          </div>
        </div>
      </div>

      {cursos.length > 0 && (
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="text"
            aria-label="Buscar salones"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre de curso, grado, sección o área..."
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-line bg-white text-ink placeholder:text-muted/70 focus:border-accent focus:outline-hidden transition-colors shadow-2xs"
          />
        </div>
      )}

      {cursosFiltrados.length === 0 ? (
        <div className="p-10 bg-white border border-dashed border-line rounded-xl text-center flex flex-col items-center gap-3">
          <BookOpen size={32} className="text-muted/70" aria-hidden="true" />
          <p className="text-sm font-bold text-ink">
            {cursos.length === 0 ? 'No tienes cursos ni secciones asignadas' : 'No se encontraron salones con ese criterio'}
          </p>
          <p className="text-xs text-muted max-w-sm">
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
              bimestre={bimestre}
              onSelect={c => setCursoActivo({ id: String(c.sectionCourseId), nombre: c.name, grado: `${c.grade}° ${c.sectionName}` })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
