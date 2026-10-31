'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar01Icon,
  BookOpen01Icon,
  AlertCircleIcon,
  CheckmarkBadge01Icon,
  Copy01Icon,
  CheckmarkCircle01Icon,
  IdCardIcon,
  SchoolIcon,
  Alert02Icon
} from 'hugeicons-react';
import { VinculoEstudiante } from '../types';

interface TarjetaHijoVinculadoProps {
  estudiante: VinculoEstudiante;
  isActive?: boolean;
  onSelect?: () => void;
  showActions?: boolean;
}

export const TarjetaHijoVinculado: React.FC<TarjetaHijoVinculadoProps> = ({
  estudiante,
  isActive = false,
  onSelect,
  showActions = true,
}) => {
  const [copiado, setCopiado] = useState(false);

  const handleCopiarCodigo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(estudiante.studentCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const iniciales = estudiante.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-2xs ${
        isActive
          ? 'border-accent/40 ring-2 ring-accent/10 shadow-sm'
          : 'border-line hover:border-slate-300'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Cabecera de la Tarjeta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line/60">
        <div className="flex items-center gap-3.5">
          {/* Avatar con Iniciales */}
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-base shadow-2xs shrink-0 ${
              isActive
                ? 'bg-rose-50 text-accent border border-rose-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {iniciales || 'ES'}
          </div>

          {/* Nombre y Código */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-ink tracking-tight truncate">
                {estudiante.fullName}
              </h2>
              {isActive && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                  <CheckmarkCircle01Icon size={12} />
                  <span>Seleccionado</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleCopiarCodigo}
                title="Copiar código de estudiante"
                className="inline-flex items-center gap-1 text-[11px] font-mono text-muted bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded-md border border-line transition-colors cursor-pointer"
              >
                <IdCardIcon size={12} className="text-slate-400" />
                <span>{estudiante.studentCode}</span>
                {copiado ? (
                  <CheckmarkCircle01Icon size={12} className="text-emerald-600" />
                ) : (
                  <Copy01Icon size={12} className="text-slate-400" />
                )}
              </button>

              <span className="text-[10px] text-muted font-bold">•</span>
              <span className="text-[11px] font-bold text-slate-700">
                ID #{estudiante.studentId}
              </span>
            </div>
          </div>
        </div>

        {/* Badge de Estado del Vínculo */}
        <div className="self-start sm:self-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckmarkBadge01Icon size={14} className="text-emerald-600" />
            <span>Vínculo Activo</span>
          </span>
        </div>
      </div>

      {/* Grilla de Datos Académicos Básicos (Sin datos complejos) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-line/60">
        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Grado
          </span>
          <p className="text-xs sm:text-sm font-black text-ink mt-0.5">
            {estudiante.grade}
          </p>
        </div>

        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Sección
          </span>
          <p className="text-xs sm:text-sm font-black text-ink mt-0.5">
            Sección &ldquo;{estudiante.sectionName}&rdquo;
          </p>
        </div>

        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Código Matrícula
          </span>
          <p className="text-xs sm:text-sm font-mono font-bold text-ink mt-0.5">
            {estudiante.studentCode}
          </p>
        </div>

        <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Periodo
          </span>
          <p className="text-xs sm:text-sm font-black text-emerald-900 mt-0.5 flex items-center gap-1">
            <SchoolIcon size={14} className="text-emerald-700" />
            <span>Escolar 2026</span>
          </p>
        </div>
      </div>

      {/* Accesos Rápidos Modulares */}
      {showActions && (
        <div className="pt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-muted mr-1">Consultar:</span>

          <Link
            href="/padre/asistencia"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs"
          >
            <Calendar01Icon size={14} className="text-slate-600" />
            <span>Asistencia</span>
          </Link>

          <Link
            href="/padre/libreta"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs"
          >
            <BookOpen01Icon size={14} className="text-slate-600" />
            <span>Libreta</span>
          </Link>

          <Link
            href="/padre/justificaciones"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs"
          >
            <AlertCircleIcon size={14} className="text-amber-700" />
            <span>Justificar Inasistencia</span>
          </Link>

          <Link
            href="/padre/incidencias"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-2xs"
          >
            <Alert02Icon size={14} className="text-slate-600" />
            <span>Incidencias</span>
          </Link>
        </div>
      )}
    </div>
  );
};
