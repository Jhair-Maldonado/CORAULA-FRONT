'use client';

import React from 'react';
import { Alert01Icon, ArrowReloadHorizontalIcon, CheckmarkCircle01Icon, StarIcon } from 'hugeicons-react';
import type { ChildSummaryState } from '@/hooks/useGuardianChildrenSummary';

interface ResumenRendimientoHijoProps {
  estado: ChildSummaryState;
  onReintentar: () => void;
}

function cursos(n: number): string {
  return `${n} ${n === 1 ? 'curso' : 'cursos'}`;
}

/** Promedio, aprobados y cursos en riesgo del último bimestre publicado de un hijo. */
export function ResumenRendimientoHijo({ estado, onReintentar }: ResumenRendimientoHijoProps) {
  if (estado.status === 'loading') {
    return <div role="status" aria-label="Cargando rendimiento" className="h-12 animate-pulse rounded-xl bg-line" />;
  }
  if (estado.status === 'sin_libreta') {
    return <p className="text-xs font-semibold text-muted">Sin libreta publicada</p>;
  }
  if (estado.status === 'error') {
    return (
      <p role="alert" className="text-xs font-bold text-accent">
        {estado.message}
        <button type="button" onClick={onReintentar} className="ml-2 inline-flex items-center gap-1 underline">
          <ArrowReloadHorizontalIcon size={12} aria-hidden="true" /> Reintentar
        </button>
      </p>
    );
  }
  const { bimestreLabel, promedio, aprobados, enRiesgo } = estado.summary;
  return (
    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{bimestreLabel}</span>
      <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-white px-2.5 py-1.5 shadow-sm">
        <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">Promedio</span>
        <div className="flex items-center gap-1 text-accent">
          <StarIcon size={12} aria-hidden="true" className="fill-accent" />
          <span className="text-[14px] font-black">{promedio ?? 'Sin notas'}</span>
        </div>
      </div>
      <div className="flex flex-col items-start">
        <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">Aprobados</span>
        <div className="flex items-center gap-1 text-success-ink">
          <CheckmarkCircle01Icon size={12} aria-hidden="true" />
          <span className="text-[11px] font-black">{cursos(aprobados)}</span>
        </div>
      </div>
      <div className="flex flex-col items-start">
        <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">En riesgo</span>
        <div className={`flex items-center gap-1 ${enRiesgo > 0 ? 'text-accent' : 'text-muted'}`}>
          <Alert01Icon size={12} aria-hidden="true" />
          <span className="text-[11px] font-black">{cursos(enRiesgo)}</span>
        </div>
      </div>
    </div>
  );
}
