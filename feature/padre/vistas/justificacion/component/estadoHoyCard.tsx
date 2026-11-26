'use client';

import React from 'react';
import { Alert01Icon, ArrowReloadHorizontalIcon, CheckmarkCircle01Icon, Clock01Icon } from 'hugeicons-react';
import type { TodayStatus } from '@/adapters/guardianAttendanceCalendarAdapter';

export interface EstadoHoyCardProps {
  status: TodayStatus | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  /** Abre el detalle del día de hoy en el calendario. */
  onJustificar: () => void;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Texto de la alerta: «Hoy registra 1 tardanza y 2 inasistencias». */
function alertText(status: TodayStatus): string {
  const parts: string[] = [];
  if (status.tardanzas > 0) parts.push(plural(status.tardanzas, 'tardanza', 'tardanzas'));
  if (status.inasistencias > 0) parts.push(plural(status.inasistencias, 'inasistencia', 'inasistencias'));
  return `Hoy registra ${parts.join(' y ')}`;
}

/** Estado de asistencia de hoy: en orden, con alertas o sin registros. */
export function EstadoHoyCard({ status, loading, error, onRetry, onJustificar }: EstadoHoyCardProps) {
  const box = 'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm';
  if (loading) return <div role="status" aria-label="Cargando asistencia de hoy" className="h-16 animate-pulse rounded-2xl border border-line bg-line" />;
  if (error) {
    return (
      <div role="alert" className={`${box} border-accent/30 bg-accent-soft text-accent`}>
        <p className="font-semibold">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:bg-accent/90">
          <ArrowReloadHorizontalIcon size={14} aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }
  if (!status || status.kind === 'sin_registro') {
    return (
      <div className={`${box} border-line bg-white text-muted`}>
        <p className="flex items-center gap-2 font-semibold"><Clock01Icon size={18} aria-hidden="true" /> Aún no hay asistencia registrada hoy</p>
      </div>
    );
  }
  if (status.kind === 'en_orden') {
    return (
      <div className={`${box} border-success-ink/30 bg-success text-success-ink`}>
        <p className="flex items-center gap-2 font-semibold"><CheckmarkCircle01Icon size={18} aria-hidden="true" /> ¡Todo en orden hoy!</p>
      </div>
    );
  }
  return (
    <div className={`${box} border-accent/30 bg-accent-soft text-accent`}>
      <p className="flex items-center gap-2 font-semibold"><Alert01Icon size={18} aria-hidden="true" /> {alertText(status)}</p>
      {status.sesionesJustificables > 0 && (
        <button type="button" onClick={onJustificar} className="rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-accent/90">
          Justificar ahora
        </button>
      )}
    </div>
  );
}
