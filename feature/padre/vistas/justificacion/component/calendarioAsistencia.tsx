'use client';

import React, { useEffect, useRef } from 'react';
import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowReloadHorizontalIcon,
  ArrowRight01Icon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  PlusSignIcon,
} from 'hugeicons-react';
import type { CalendarCell, CalendarDayKind, CalendarSession, CalendarWeek } from '@/adapters/guardianAttendanceCalendarAdapter';

export interface CalendarioAsistenciaProps {
  weeks: CalendarWeek[];
  /** Mes en texto es-PE, p. ej. «noviembre de 2026». */
  mesLabel: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPrevMes: () => void;
  onNextMes: () => void;
  /** Retroceder no tiene tope; avanzar solo llega al mes actual. */
  canNext: boolean;
  /** Día abierto en el detalle (`YYYY-MM-DD`) o null. */
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onJustificar: (session: CalendarSession, cell: CalendarCell) => void;
  onVerJustificacion: (justificationId: number) => void;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const CELL_CLASS: Record<CalendarDayKind, string> = {
  fin_semana: 'bg-neutral/50 border-line/60 text-muted',
  futuro: 'bg-white border-line/50 text-muted',
  sin_registro: 'bg-white border-line text-ink',
  presente: 'bg-success/40 border-success-ink/20 text-ink',
  tardanza: 'bg-white border-warning-ink/30 text-warning-ink',
  falta: 'bg-accent-soft/40 border-accent/20 text-accent',
};

const SESSION_BADGE: Record<CalendarSession['status'], string> = {
  PRESENTE: 'bg-success text-success-ink border-success-ink/30',
  TARDANZA: 'bg-white text-warning-ink border-warning-ink/30',
  INASISTENCIA: 'bg-accent-soft text-accent border-accent/30',
};

function KindIcon({ kind }: { kind: CalendarDayKind }) {
  if (kind === 'presente') return <CheckmarkCircle01Icon size={14} aria-hidden="true" className="text-success-ink" />;
  if (kind === 'tardanza') return <Clock01Icon size={14} aria-hidden="true" className="text-warning-ink" />;
  if (kind === 'falta') return <Cancel01Icon size={14} aria-hidden="true" className="text-accent" />;
  return null;
}

function CeldaDia({ cell, selected, onSelect }: { cell: CalendarCell; selected: boolean; onSelect: () => void }) {
  const base = `relative flex min-h-[52px] flex-col items-center rounded-xl border p-1 sm:min-h-[80px] sm:p-2 ${CELL_CLASS[cell.kind]}`;
  const content = (
    <>
      <span className="text-[12px] font-bold" aria-hidden="true">{cell.day}</span>
      {cell.sessions.length > 0 && (
        <span className="mt-1 flex flex-col items-center gap-0.5" aria-hidden="true">
          <KindIcon kind={cell.kind} />
          <span className="text-[10px] font-bold">{cell.sessions.length}</span>
        </span>
      )}
      {cell.tienePendiente && (
        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-accent text-[9px] font-black text-white">!</span>
      )}
    </>
  );
  if (cell.sessions.length === 0) {
    return (
      <div className={base}>
        <span className="sr-only">{cell.label}</span>
        {content}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={cell.label}
      aria-pressed={selected}
      className={`${base} transition hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? 'ring-2 ring-accent' : ''}`}
    >
      {content}
    </button>
  );
}

function DetalleDia({ cell, onClose, onJustificar, onVerJustificacion }: {
  cell: CalendarCell;
  onClose: () => void;
  onJustificar: CalendarioAsistenciaProps['onJustificar'];
  onVerJustificacion: CalendarioAsistenciaProps['onVerJustificacion'];
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.focus(); }, [cell.date]);
  return (
    <section ref={ref} tabIndex={-1} aria-label={`Detalle de ${cell.fechaLarga}`} className="mt-4 rounded-xl border border-line bg-white p-4 outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-bold capitalize text-ink">{cell.fechaLarga}</h4>
        <button type="button" onClick={onClose} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:border-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          Cerrar
        </button>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {cell.sessions.map(session => (
          <li key={session.attendanceId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{session.courseName}</p>
              <p className="text-muted">{session.horario}</p>
              {session.justificacionLabel && <p className="mt-0.5 text-[11px] font-medium text-ink">{session.justificacionLabel}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${SESSION_BADGE[session.status]}`}>{session.estadoLabel}</span>
              {session.puedeJustificar && (
                <button type="button" onClick={() => onJustificar(session, cell)} className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-accent/90">
                  <PlusSignIcon size={12} aria-hidden="true" /> Justificar ahora
                </button>
              )}
              {session.justificationId !== null && (
                <button type="button" onClick={() => onVerJustificacion(session.justificationId as number)} className="rounded-lg border border-line px-3 py-1.5 text-[11px] font-semibold text-accent underline transition hover:border-muted">
                  Ver justificación
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Calendario mensual de asistencia: recibe semanas y acciones por props y no conoce servicios. */
export function CalendarioAsistencia({
  weeks, mesLabel, loading, error, onRetry, onPrevMes, onNextMes, canNext, selectedDate, onSelectDate, onJustificar, onVerJustificacion,
}: CalendarioAsistenciaProps) {
  const cells = weeks.flat();
  const selected = selectedDate ? cells.find((c): c is CalendarCell => c !== null && c.date === selectedDate) ?? null : null;
  const sinRegistros = !loading && !error && weeks.length > 0 && cells.every(c => c === null || c.sessions.length === 0);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-neutral/30 p-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onPrevMes} aria-label="Mes anterior" className="rounded-md p-1 text-muted transition-colors hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <ArrowLeft01Icon size={16} aria-hidden="true" />
          </button>
          <h3 aria-live="polite" className="flex min-w-[140px] items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider text-ink">
            <Calendar01Icon size={14} aria-hidden="true" className="text-accent" />
            {mesLabel}
          </h3>
          <button type="button" onClick={onNextMes} disabled={!canNext} aria-label="Mes siguiente" className="rounded-md p-1 text-muted transition-colors hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-30">
            <ArrowRight01Icon size={16} aria-hidden="true" />
          </button>
        </div>
        <ul className="flex flex-wrap items-center gap-3 text-[11px] font-bold" aria-label="Leyenda">
          <li className="flex items-center gap-1 text-success-ink"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-success-ink" /> Asistió</li>
          <li className="flex items-center gap-1 text-warning-ink"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-warning-ink" /> Tardanza</li>
          <li className="flex items-center gap-1 text-accent"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" /> Falta</li>
        </ul>
      </div>

      <div className="p-3 sm:p-4">
        {error ? (
          <div role="alert" className="rounded-xl border border-accent/30 bg-accent-soft p-6 text-center text-sm text-accent">
            <Alert02Icon size={24} aria-hidden="true" className="mx-auto mb-2" />
            <p className="font-semibold">{error}</p>
            <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent/90">
              <ArrowReloadHorizontalIcon size={14} aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : loading ? (
          <div role="status" aria-label="Cargando asistencia del mes" className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: 35 }, (_, i) => <div key={i} className="min-h-[52px] animate-pulse rounded-xl bg-line sm:min-h-[80px]" />)}
          </div>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2" aria-hidden="true">
              {DIAS_SEMANA.map(d => <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-muted">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {cells.map((cell, index) => cell === null
                ? <div key={`hueco-${index}`} aria-hidden="true" className="rounded-xl bg-neutral/40" />
                : <CeldaDia key={cell.date} cell={cell} selected={cell.date === selectedDate} onSelect={() => onSelectDate(cell.date === selectedDate ? null : cell.date)} />)}
            </div>
            {sinRegistros && <p className="mt-3 text-center text-xs text-muted">No hay asistencia registrada en este mes.</p>}
            {selected && selected.sessions.length > 0 && (
              <DetalleDia cell={selected} onClose={() => onSelectDate(null)} onJustificar={onJustificar} onVerJustificacion={onVerJustificacion} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
