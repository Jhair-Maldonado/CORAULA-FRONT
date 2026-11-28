import React from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import type { GuardianAttendanceResponse } from '@/types/guardianAttendanceApi';

/** Porcentaje entero de `part` sobre `total`; 0 si no hay sesiones (nunca divide por cero). */
export function attendancePercent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Cuatro tarjetas con el resumen del rango (`summary` del backend): sesiones registradas, asistencias, tardanzas e inasistencias. */
export function ResumenAsistencia({ summary }: { summary: GuardianAttendanceResponse['summary'] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total de sesiones</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{summary.total}</span>
            <span className="text-[10px] font-semibold text-muted">registradas</span>
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral text-muted"><CalendarDays size={20} aria-hidden="true" /></span>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-success-ink">Asistencias</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{summary.present}</span>
            {summary.total > 0 && <span className="rounded-md bg-success px-1.5 py-0.5 text-[10px] font-bold text-success-ink">{attendancePercent(summary.present, summary.total)}%</span>}
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-success-ink/30 bg-success text-success-ink"><CheckCircle2 size={20} aria-hidden="true" /></span>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-warning-ink">Tardanzas</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{summary.late}</span>
            <span className="text-[10px] font-semibold text-muted">ingresos tarde</span>
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-warning-ink/30 bg-white text-warning-ink"><Clock size={20} aria-hidden="true" /></span>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-2xs">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Inasistencias</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ink">{summary.absent}</span>
            <span className="text-[10px] font-semibold text-muted">faltas</span>
          </div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft text-accent"><AlertCircle size={20} aria-hidden="true" /></span>
      </div>
    </div>
  );
}
