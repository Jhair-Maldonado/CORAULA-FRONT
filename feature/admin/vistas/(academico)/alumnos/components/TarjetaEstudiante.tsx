'use client';

import Link from 'next/link';
import { UserCircleIcon, ArrowRight01Icon } from 'hugeicons-react';
import type { AdminStudent } from '@/types/adminStudent';

export const TarjetaEstudiante = ({ student }: { student: AdminStudent }) => {
  return (
    <Link
      href={`/administrador/alumnos/estudiante/${student.id}`}
      className="bg-white rounded-xl p-4 border border-line shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex items-center justify-between gap-3 group min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0 border border-accent/20 group-hover:scale-105 transition-transform">
          {student.nombres.charAt(0)}{student.apellidoPaterno.charAt(0)}
        </div>
        <div className="flex flex-col min-w-0 gap-1">
          <h2 className="text-ink text-xs font-bold group-hover:text-accent transition-colors break-words">{student.nombreCompleto}</h2>
          {student.studentCode !== null && <p className="text-[10px] text-muted break-words">Código: {student.studentCode}</p>}
          {student.dni !== null && <p className="text-[10px] text-muted break-words flex items-center gap-1"><UserCircleIcon size={12} aria-hidden="true" className="shrink-0" />DNI: {student.dni}</p>}
          <span className="text-[10px] font-bold text-ink bg-neutral border border-line px-2 py-0.5 rounded-full w-fit">{student.estadoLabel}</span>
          <p className="text-[10px] text-muted break-words">
            {student.tieneMatriculaActiva
              ? [student.nivelLabel, student.grade !== null ? `${student.grade}° grado` : null, student.sectionName].filter(Boolean).join(' • ')
              : 'Sin matrícula activa'}
          </p>
        </div>
      </div>
      <span className="w-9 h-9 rounded-lg bg-neutral text-muted group-hover:bg-accent group-hover:text-white flex items-center justify-center shrink-0 transition-colors"><ArrowRight01Icon size={16} aria-hidden="true" /></span>
    </Link>
  );
};
