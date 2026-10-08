'use client';

import Link from 'next/link';
import { UserCircleIcon, ArrowRight01Icon } from 'hugeicons-react';
import type { AdminStudent } from '@/types/adminStudent';

export const TarjetaEstudiante = ({ student }: { student: AdminStudent }) => {
  return (
    <Link
      href={`/administrador/alumnos/estudiante/${student.id}`}
      className="bg-white rounded-xl p-4 border border-line shadow-xs hover:shadow-md hover:border-accent/40 transition-all flex items-center justify-between gap-3 group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-accent/10 text-accent font-bold text-xs flex items-center justify-center shrink-0 border border-accent/20">
          {student.nombres.charAt(0)}{student.apellidoPaterno.charAt(0)}
        </div>
        <div className="flex flex-col min-w-0 gap-1">
          <h2 className="text-ink text-xs font-bold group-hover:text-accent">{student.nombreCompleto}</h2>
          {student.studentCode !== null && <p className="text-[10px] text-muted">Código: {student.studentCode}</p>}
          {student.dni !== null && <p className="text-[10px] text-muted flex items-center gap-1"><UserCircleIcon size={12} />DNI: {student.dni}</p>}
          <span className="text-[10px] font-bold text-accent">{student.estadoLabel}</span>
          <p className="text-[10px] text-muted">
            {student.tieneMatriculaActiva
              ? [student.nivelLabel, student.grade !== null ? `${student.grade}° grado` : null, student.sectionName].filter(Boolean).join(' • ')
              : 'Sin matrícula activa'}
          </p>
        </div>
      </div>
      <ArrowRight01Icon size={16} className="text-accent shrink-0" />
    </Link>
  );
};
