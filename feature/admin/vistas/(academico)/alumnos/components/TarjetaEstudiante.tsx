'use client';

import Link from 'next/link';
import { UserCircleIcon, BookOpen01Icon, ArrowRight01Icon } from 'hugeicons-react';
import { studentStatusTone } from '@/adapters/studentAdapter';
import { studentStatusToneClass } from '@/adapters/studentUi';
import type { AdminStudent } from '@/types/adminStudent';
import { sectionName } from '../../secciones/sectionUi';

/**
 * Tarjeta de alumno. Con `sectionId` enlaza a `grado/{sectionId}/estudiante/{id}` (se conserva el panel de la sección);
 * sin él, a `estudiante/{id}`.
 */
export const TarjetaEstudiante = ({ student, sectionId }: { student: AdminStudent; sectionId?: number | string }) => {
  const href = sectionId === undefined
    ? `/administrador/alumnos/estudiante/${student.id}`
    : `/administrador/alumnos/grado/${sectionId}/estudiante/${student.id}`;
  const matricula = [
    student.grade !== null ? `${student.grade}° grado` : null, student.nivelLabel,
    student.sectionName ? sectionName(student.sectionName) : null,
  ].filter(Boolean).join(' · ');
  return (
    <Link
      href={href}
      className="bg-white rounded-xl p-3.5 border border-line shadow-xs hover:shadow-md hover:border-accent/40 transition-all flex items-center justify-between gap-3 group min-w-0 cursor-pointer relative overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div aria-hidden="true" className="w-10 h-10 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0 border border-accent/20 group-hover:scale-105 transition-transform">
          {student.nombres.charAt(0)}{student.apellidoPaterno.charAt(0)}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 title={student.nombreCompleto} className="text-ink text-xs font-bold truncate group-hover:text-accent transition-colors">{student.nombreCompleto}</h2>
            <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full shrink-0 ${studentStatusToneClass[studentStatusTone(student.studentStatus)]}`}>{student.estadoLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] font-bold text-muted">
            {student.dni !== null && <span className="flex items-center gap-1"><UserCircleIcon size={12} aria-hidden="true" className="text-muted shrink-0" />DNI: {student.dni}</span>}
            {student.dni !== null && <span aria-hidden="true">•</span>}
            {student.tieneMatriculaActiva
              ? <span className="text-accent flex items-center gap-0.5 min-w-0"><BookOpen01Icon size={11} aria-hidden="true" className="shrink-0" />{matricula}</span>
              : <span>Sin matrícula activa</span>}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="w-7 h-7 rounded-lg bg-neutral group-hover:bg-accent group-hover:text-white text-muted flex items-center justify-center shrink-0 transition-colors"><ArrowRight01Icon size={14} /></div>
    </Link>
  );
};
