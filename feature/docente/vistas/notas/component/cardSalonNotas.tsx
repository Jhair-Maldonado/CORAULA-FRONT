import React from 'react';
import Link from 'next/link';
import { BookOpen, Users, Clock, ChevronRight, Award } from 'lucide-react';
import type { TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';

export interface CardSalonNotasProps {
  curso: TeacherCourseSummaryResponse;
  onSelect?: (curso: TeacherCourseSummaryResponse) => void;
}

export function CardSalonNotas({ curso, onSelect }: CardSalonNotasProps) {
  const levelText = curso.level === 'PRIMARY' ? 'Primaria' : 'Secundaria';

  return (
    <article className="bg-white rounded-xl border border-[#E5E7EB] hover:border-[#BE123C] p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="p-3 bg-[#FFE4E6] text-[#BE123C] rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <BookOpen size={20} aria-hidden="true" />
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-[#111827] border border-[#E5E7EB]">
            {curso.code}
          </span>
        </div>

        <h3 className="font-bold text-base text-[#111827] group-hover:text-[#BE123C] transition-colors line-clamp-1">
          {curso.name}
        </h3>

        <p className="text-xs font-semibold text-[#64748B] mt-1">
          {curso.grade}° grado · Sección {curso.sectionName}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
            {levelText}
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 text-[#64748B] border border-slate-200 truncate max-w-[180px]">
            {curso.area}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-5 pt-3.5 border-t border-[#E5E7EB]">
        <div className="flex items-center gap-3 text-[11px] font-medium text-[#64748B]">
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
          href={`/docente/notas/salon/${curso.sectionCourseId}`}
          onClick={() => onSelect?.(curso)}
          className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-[#BE123C] text-white hover:bg-rose-800 text-xs font-bold transition-colors shadow-2xs cursor-pointer focus-visible:outline-2 focus-visible:outline-[#BE123C]"
        >
          <span>Planilla</span>
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
