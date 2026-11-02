'use client';

import { Award, FileText, Clock, Edit3, ChevronRight } from 'lucide-react';
import { academicActivityStatusLabels } from '@/types/teacherActivitiesApi';
import type { AcademicActivity } from '@/types/teacherActivitiesApi';

const button =
  'min-h-9 px-3 py-1.5 rounded-lg border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 transition-colors cursor-pointer';

interface TarjetaActividadProps {
  activity: AcademicActivity;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  disabled: boolean;
  displayStartDate: string;
  displayEndDate: string;
}

export default function TarjetaActividad({
  activity,
  isSelected,
  onSelect,
  onEdit,
  disabled,
  displayStartDate,
  displayEndDate
}: TarjetaActividadProps) {
  const isExam = activity.type === 'EXAMEN';
  const isSingleDay = !displayEndDate || displayStartDate === displayEndDate;

  return (
    <li
      className={`p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isSelected
          ? 'bg-accent/5'
          : isExam
            ? 'bg-rose-50/20 hover:bg-rose-50/35'
            : 'hover:bg-neutral/20'
      }`}
    >
      <div className="min-w-0 flex-1">
        {/* Título de la actividad con icono descriptivo */}
        <div className="flex items-center gap-2">
          {isExam ? (
            <span className="text-rose-600 shrink-0" title="Examen programado">
              <Award size={18} aria-hidden="true" />
            </span>
          ) : (
            <span className="text-accent shrink-0">
              <FileText size={17} aria-hidden="true" />
            </span>
          )}
          <h5
            className={`font-bold text-sm break-words cursor-pointer hover:underline ${
              isExam ? 'text-rose-950 font-extrabold' : 'text-ink'
            }`}
            onClick={onSelect}
          >
            {activity.title}
          </h5>
        </div>

        {/* Descripción breve (si existe) */}
        {activity.description && (
          <p className="text-xs text-muted mt-1 line-clamp-1 break-words">
            {activity.description}
          </p>
        )}

        {/* Fechas de inicio y fin (simplificado si es el mismo día) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted mt-2 font-medium">
          <Clock size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
          {isSingleDay ? (
            <span>
              Fecha: <strong className="text-ink font-semibold">{displayStartDate}</strong>
            </span>
          ) : (
            <>
              <span>
                Inicio: <strong className="text-ink font-semibold">{displayStartDate}</strong>
              </span>
              <span className="text-muted/40 mx-1" aria-hidden="true">&bull;</span>
              <span>
                Fin: <strong className="text-ink font-semibold">{displayEndDate}</strong>
              </span>
            </>
          )}
        </div>

        {/* Badges de tipo, PA y estado con punto indicador limpio */}
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {isExam ? (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider bg-rose-100 text-rose-800 border border-rose-300 uppercase shadow-2xs">
              Examen
            </span>
          ) : activity.type === 'TAREA' ? (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
              Tarea
            </span>
          ) : activity.type === 'PRACTICA' ? (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
              Práctica
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase">
              {activity.type}
            </span>
          )}

          {activity.cuentaParaPa && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Cuenta para PA
            </span>
          )}

          <span
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1.5 ${
              activity.status === 'PUBLICADA'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : activity.status === 'ANULADA'
                  ? 'bg-neutral text-muted border-line line-through'
                  : 'bg-neutral/40 text-ink border-line'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                activity.status === 'PUBLICADA'
                  ? 'bg-emerald-600'
                  : activity.status === 'ANULADA'
                    ? 'bg-muted'
                    : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">Estado: </span>
            <span>{academicActivityStatusLabels[activity.status]}</span>
          </span>
        </div>
      </div>

      {/* Botones de acción limpios con jerarquía visual mejorada */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {activity.status === 'PLANIFICADA' && (
          <button
            type="button"
            disabled={disabled}
            className={`${button} bg-white hover:bg-neutral flex items-center gap-1.5`}
            onClick={onEdit}
            aria-label={`Editar #${activity.id}`}
          >
            <Edit3 size={14} />
            <span>Editar</span>
            <span className="sr-only"> #{activity.id}</span>
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          className={`${button} ${
            isSelected
              ? 'bg-accent text-white border-accent'
              : 'bg-white hover:bg-accent/10 text-accent border-accent/40 font-bold hover:border-accent'
          } flex items-center gap-1.5 shadow-2xs`}
          onClick={onSelect}
          title="Ingresar a la actividad"
          aria-label={`Ver detalle #${activity.id}`}
        >
          <span>Ver detalle</span>
          <span className="sr-only"> #{activity.id}</span>
          <ChevronRight
            size={15}
            className={`transition-transform ${isSelected ? 'rotate-90' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </li>
  );
}
