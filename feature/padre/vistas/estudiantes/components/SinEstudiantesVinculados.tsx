'use client';

import React from 'react';
import { UserGroupIcon, HelpCircleIcon, ReloadIcon, Mail01Icon } from 'hugeicons-react';

interface SinEstudiantesVinculadosProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const SinEstudiantesVinculados: React.FC<SinEstudiantesVinculadosProps> = ({
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-dashed border-[#D1D5DB] my-4 shadow-2xs">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-4 shadow-2xs">
        <UserGroupIcon size={32} />
      </div>

      <span className="text-[11px] font-black uppercase tracking-wider text-muted mb-1">
        Estado de Vinculación Escolar
      </span>

      <h3 className="text-base sm:text-lg font-black text-ink mb-2">
        No se encontraron estudiantes vinculados
      </h3>

      <p className="text-xs sm:text-sm text-muted max-w-md mb-6 leading-relaxed">
        Su cuenta de apoderado no registra estudiantes matriculados o con vínculo activo para el periodo escolar vigente (2026).
        Si considera que se trata de un error o acaba de completar el proceso de matrícula, comuníquese con la Secretaría Escolar.
      </p>

      {/* Tarjeta de Orientación */}
      <div className="w-full max-w-md bg-slate-50 border border-line rounded-xl p-3.5 mb-6 text-left flex items-start gap-3">
        <HelpCircleIcon size={18} className="text-slate-500 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 leading-relaxed">
          <p className="font-bold text-ink">¿Cómo regularizar la vinculación?</p>
          <p className="text-muted mt-0.5">
            Presente su documento de identidad y la ficha única de matrícula (FUM) en Secretaría para asociar a su estudiante a este portal.
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-accent hover:bg-rose-800 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <ReloadIcon size={16} className={isRetrying ? 'animate-spin' : ''} />
          <span>Volver a verificar vínculo</span>
        </button>
      )}
    </div>
  );
};
