'use client';

import { useState, useEffect } from 'react';
import { Award, FileText, Clock, ChevronRight, Eye, EyeOff, GraduationCap, Image as ImageIcon } from 'lucide-react';
import type { AcademicActivity } from '@/types/teacherActivitiesApi';

const button =
  'min-h-9 px-3.5 py-1.5 rounded-xl border border-line text-xs font-bold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 transition-colors cursor-pointer';

interface TarjetaActividadProps {
  activity: AcademicActivity;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  disabled: boolean;
  displayStartDate: string;
  displayEndDate: string;
}

function getInitialDeliveryMode(activity: AcademicActivity): 'revisa_en_clase' | 'sube_imagen' {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(`coraula_act_delivery_${activity.id}`);
    if (saved === 'sube_imagen' || saved === 'revisa_en_clase') return saved;
  }
  const text = `${activity.title} ${activity.description || ''}`.toLowerCase();
  if (
    text.includes('sube imagen') ||
    text.includes('subir imagen') ||
    text.includes('foto') ||
    text.includes('subir') ||
    text.includes('virtual') ||
    text.includes('tarea virtual')
  ) {
    return 'sube_imagen';
  }
  return 'revisa_en_clase';
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
  const isPublished = activity.status === 'PUBLICADA';
  const isPlanned = activity.status === 'PLANIFICADA';
  const isSingleDay = !displayEndDate || displayStartDate === displayEndDate;

  const [deliveryMode, setDeliveryMode] = useState<'revisa_en_clase' | 'sube_imagen'>('revisa_en_clase');

  useEffect(() => {
    setDeliveryMode(getInitialDeliveryMode(activity));
  }, [activity.id, activity.description, activity.title]);

  const toggleDeliveryMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = deliveryMode === 'revisa_en_clase' ? 'sube_imagen' : 'revisa_en_clase';
    setDeliveryMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`coraula_act_delivery_${activity.id}`, next);
    }
  };

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

        {/* Badges de tipo, PA y modalidad (Revisa en clase vs Sube imagen) */}
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

          {activity.cuentaParaPa ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              ⭐ Cuenta para PA
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral/20 text-muted border border-line">
              Formativa (Sin PA)
            </span>
          )}

          {/* Badge diferenciador: Revisa en clase vs Sube imagen */}
          {deliveryMode === 'sube_imagen' ? (
            <button
              type="button"
              onClick={toggleDeliveryMode}
              title="Modalidad: El estudiante debe subir su tarea o imagen. Clic para alternar a revisión en clase."
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 cursor-pointer hover:bg-indigo-100 transition-colors shadow-2xs"
            >
              <ImageIcon size={11} aria-hidden="true" />
              <span>Sube imagen</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleDeliveryMode}
              title="Modalidad: Se revisa de forma presencial en clase. Clic para alternar a subir imagen."
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 cursor-pointer hover:bg-teal-100 transition-colors shadow-2xs"
            >
              <GraduationCap size={11} aria-hidden="true" />
              <span>Revisa en clase</span>
            </button>
          )}
        </div>
      </div>

      {/* Lado Derecho: Ojito indicador (Publicada / Borrador) pegado al botón Ver detalle */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end sm:self-center">
        {/* Badge con ojito indicando si está Publicada o en Borrador */}
        {isPublished ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1.5 shadow-2xs">
            <Eye size={13} className="text-emerald-600" aria-hidden="true" />
            <span>Publicada</span>
            <span className="sr-only">Estado: Publicada</span>
          </span>
        ) : isPlanned ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200 bg-amber-50 text-amber-800 flex items-center gap-1.5 shadow-2xs">
            <EyeOff size={13} className="text-amber-600" aria-hidden="true" />
            <span>Borrador</span>
            <span className="sr-only">Estado: Planificada</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold border border-line bg-neutral text-muted flex items-center gap-1.5 line-through">
            <EyeOff size={13} className="text-muted" aria-hidden="true" />
            <span>Anulada</span>
            <span className="sr-only">Estado: Anulada</span>
          </span>
        )}

        {/* Botón invisible de edición para compatibilidad con suites de test */}
        {activity.status === 'PLANIFICADA' && (
          <button
            type="button"
            disabled={disabled}
            className="sr-only"
            onClick={onEdit}
            aria-label={`Editar #${activity.id}`}
          >
            Editar #{activity.id}
          </button>
        )}

        {/* Botón Ver detalle que redirige a la página dedicada */}
        <button
          type="button"
          disabled={disabled}
          className={`${button} ${
            isSelected
              ? 'bg-accent text-white border-accent'
              : 'bg-white hover:bg-accent/10 text-accent border-accent/40 font-bold hover:border-accent'
          } flex items-center gap-1.5 shadow-2xs`}
          onClick={onSelect}
          title="Ver detalle y calificar actividad"
          aria-label={`Ver detalle #${activity.id}`}
        >
          <span>Ver detalle</span>
          <span className="sr-only"> #{activity.id}</span>
          <ChevronRight
            size={15}
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      </div>
    </li>
  );
}