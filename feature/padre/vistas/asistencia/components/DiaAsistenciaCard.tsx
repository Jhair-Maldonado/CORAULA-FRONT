'use client';

import React from 'react';
import {
  Calendar01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  AlertCircleIcon,
  BookOpen01Icon
} from 'hugeicons-react';
import {
  AttendanceDayGroup,
  EstadoSesionAsistencia,
  EstadoJustificacionAsistencia
} from '../types';

interface DiaAsistenciaCardProps {
  dia: AttendanceDayGroup;
}

const ESTADO_SESION_CONFIG: Record<
  EstadoSesionAsistencia,
  {
    label: string;
    badgeClass: string;
    icon: React.ReactNode;
  }
> = {
  PRESENTE: {
    label: 'Presente',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckmarkCircle01Icon size={12} className="text-emerald-600" />,
  },
  TARDANZA: {
    label: 'Tardanza',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <Clock01Icon size={12} className="text-amber-600" />,
  },
  INASISTENCIA: {
    label: 'Inasistencia',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: <Alert02Icon size={12} className="text-red-600" />,
  },
  FALTA_JUSTIFICADA: {
    label: 'Falta Justificada',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: <CheckmarkCircle01Icon size={12} className="text-sky-600" />,
  },
  FALTA_INJUSTIFICADA: {
    label: 'Falta Injustificada',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    icon: <Alert02Icon size={12} className="text-red-600" />,
  },
};

const JUSTIFICACION_CONFIG: Record<
  EstadoJustificacionAsistencia,
  {
    label: string;
    badgeClass: string;
    icon: React.ReactNode;
  }
> = {
  PENDIENTE: {
    label: 'Justificación en trámite',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: <Clock01Icon size={11} className="text-amber-700" />,
  },
  APROBADA: {
    label: 'Justificación Aprobada',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    icon: <CheckmarkCircle01Icon size={11} className="text-emerald-700" />,
  },
  RECHAZADA: {
    label: 'Justificación Rechazada',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
    icon: <AlertCircleIcon size={11} className="text-rose-700" />,
  },
};

export const DiaAsistenciaCard: React.FC<DiaAsistenciaCardProps> = ({ dia }) => {
  const tieneFalta = dia.totales.inasistencias > 0;
  const tieneTardanza = dia.totales.tardanzas > 0;

  return (
    <div
      className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all duration-200 ${
        tieneFalta
          ? 'border-rose-200'
          : tieneTardanza
          ? 'border-amber-200'
          : 'border-line hover:border-slate-300'
      }`}
    >
      {/* Cabecera del Día */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
            <Calendar01Icon size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-ink leading-tight">
              {dia.diaSemana}, {dia.fechaFormateada}
            </h3>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
              {dia.totales.total} {dia.totales.total === 1 ? 'sesión auditada' : 'sesiones auditadas'}
            </span>
          </div>
        </div>

        {/* Resumen de Badges del Día */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          {dia.totales.presentes > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {dia.totales.presentes} {dia.totales.presentes === 1 ? 'asistencia' : 'asistencias'}
            </span>
          )}
          {dia.totales.tardanzas > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {dia.totales.tardanzas} {dia.totales.tardanzas === 1 ? 'tardanza' : 'tardanzas'}
            </span>
          )}
          {dia.totales.inasistencias > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {dia.totales.inasistencias} {dia.totales.inasistencias === 1 ? 'falta' : 'faltas'}
            </span>
          )}
        </div>
      </div>

      {/* Lista de Sesiones / Cursos del Día */}
      <div className="mt-3 divide-y divide-slate-100">
        {dia.sesiones.map((sesion) => {
          const configEstado = ESTADO_SESION_CONFIG[sesion.estado] || ESTADO_SESION_CONFIG.PRESENTE;
          const configJust = sesion.justification
            ? JUSTIFICACION_CONFIG[sesion.justification.status]
            : null;

          return (
            <div
              key={sesion.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
            >
              {/* Información del Curso y Horario */}
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen01Icon size={16} className="text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate">{sesion.curso}</p>
                  <p className="text-[10px] text-muted font-medium flex items-center gap-1">
                    <Clock01Icon size={12} />
                    <span>{sesion.horaInicio} - {sesion.horaFin}</span>
                  </p>
                </div>
              </div>

              {/* Badges de Estado y Justificación */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {/* Badge de Justificación si existe */}
                {configJust && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${configJust.badgeClass}`}
                    title={sesion.justification?.motivo || 'Justificación registrada'}
                  >
                    {configJust.icon}
                    <span>{configJust.label}</span>
                  </span>
                )}

                {/* Badge de Asistencia */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${configEstado.badgeClass}`}
                >
                  {configEstado.icon}
                  <span>{configEstado.label}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
