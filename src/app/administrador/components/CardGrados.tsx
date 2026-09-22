'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Calendar01Icon, 
  Clock01Icon, 
  UserGroupIcon, 
  BookOpen01Icon,
  ArrowRight01Icon
} from 'hugeicons-react';
import { HorarioGradoSeccion as CardGradosProps } from '@/types/horario';

export const CardGrados: React.FC<CardGradosProps> = ({
  seccionId,
  nombreCompletoSeccion,
  nivel,
  numeroGrado,
  letraSeccion,
  cantAlumnos,
  capacidad,
  tutor,
  totalHorasSemana,
  estadoHorario
}) => {
  return (
    <div className="bg-white rounded-xl border border-line p-4 shadow-sm hover:shadow-md hover:border-accent/40 transition-all flex flex-col justify-between group">
      <div>
        {/* Header de la Card */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-extrabold text-xs group-hover:scale-105 transition-transform shrink-0">
              {numeroGrado}°{letraSeccion}
            </div>
            <div>
              <h3 className="text-ink font-bold text-xs leading-snug group-hover:text-accent transition-colors truncate max-w-[150px]">
                {nombreCompletoSeccion}
              </h3>
              <span className="text-[9px] font-semibold text-muted bg-neutral px-1.5 py-0.2 rounded border border-line mt-0.5 inline-block">
                Nivel {nivel}
              </span>
            </div>
          </div>

          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded border border-emerald-200 shrink-0">
            {estadoHorario}
          </span>
        </div>

        <hr className="border-line/70 my-2.5" />

        {/* Datos Compactos de la Card */}
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center justify-between text-muted">
            <span className="flex items-center gap-1.5 text-[10px]">
              <UserGroupIcon size={13} className="text-accent shrink-0" /> Matriculados:
            </span>
            <span className="font-extrabold text-ink">{cantAlumnos} / {capacidad}</span>
          </div>

          <div className="flex items-center justify-between text-muted">
            <span className="flex items-center gap-1.5 text-[10px]">
              <Clock01Icon size={13} className="text-accent shrink-0" /> Horas/Semana:
            </span>
            <span className="font-extrabold text-ink">{totalHorasSemana} hrs</span>
          </div>

          <div className="flex items-center justify-between text-muted">
            <span className="flex items-center gap-1.5 text-[10px]">
              <BookOpen01Icon size={13} className="text-accent shrink-0" /> Tutor:
            </span>
            <span className="font-bold text-ink truncate max-w-[130px]">{tutor}</span>
          </div>
        </div>
      </div>

      {/* Botón Acción Ver Horario */}
      <Link 
        href={`/administrador/horario/${seccionId}`}
        className="w-full mt-4 py-2 px-3 rounded-lg bg-neutral/80 hover:bg-accent hover:text-white transition-all text-xs font-bold text-ink flex items-center justify-center gap-1.5 group/btn border border-line/50 hover:border-accent"
      >
        <Calendar01Icon size={14} />
        <span>Ver Horario</span>
        <ArrowRight01Icon size={13} className="group-hover/btn:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
};
