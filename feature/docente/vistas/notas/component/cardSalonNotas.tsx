import React from 'react';
import Link from 'next/link';
import { BookOpen, Users, Clock, ChevronRight } from 'lucide-react';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';
import { studentLevelLabels } from '@/adapters/studentAdapter';

export interface CardSalonNotasProps {
  curso: TeacherCourseSummaryResponse;
  /** Bimestre a conservar en el enlace a la planilla (`?bimestre=<id>`). */
  bimestre?: string;
  onSelect?: (curso: TeacherCourseSummaryResponse) => void;
}

/** Tarjeta de un salón del catálogo de notas; enlaza a la planilla única del salón. */
export function CardSalonNotas({ curso, bimestre, onSelect }: CardSalonNotasProps) {
  const href = `/docente/notas/salon/${curso.sectionCourseId}${bimestre ? `?bimestre=${encodeURIComponent(bimestre)}` : ''}`;

  return (
    <article className="bg-white rounded-xl border border-line hover:border-accent p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="p-3 bg-accent-soft text-accent rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen size={20} aria-hidden="true" />
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral text-ink border border-line">
            {curso.code}
          </span>
        </div>

        <h3 className="font-bold text-base text-ink group-hover:text-accent transition-colors line-clamp-1">
          {curso.name}
        </h3>

        <p className="text-xs font-semibold text-muted mt-1">
          {curso.grade}° grado · Sección {curso.sectionName}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent-soft text-accent border border-accent/30">
            {studentLevelLabels[curso.level]}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-canvas/50 text-muted border border-line truncate max-w-[180px]">
            {curso.area}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-5 pt-3.5 border-t border-line">
        <div className="flex items-center gap-3 text-[11px] font-medium text-muted">
          <span className="flex items-center gap-1" title="Alumnos matriculados">
            <Users size={14} aria-hidden="true" />
            {curso.studentCount}
          </span>
          <span className="flex items-center gap-1" title="Horas semanales">
            <Clock size={14} aria-hidden="true" />
            {curso.weeklyHours}h
          </span>
        </div>

        <Link
          href={href}
          onClick={() => onSelect?.(curso)}
          className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-accent text-white hover:opacity-90 text-xs font-bold transition-colors shadow-2xs cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span>Planilla</span>
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
