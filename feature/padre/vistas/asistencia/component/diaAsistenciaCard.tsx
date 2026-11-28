import React from 'react';
import Link from 'next/link';
import { AlertCircle, BookOpen, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import type { GuardianAttendanceRecord, GuardianAttendanceStatus, JustificationStatus } from '@/types/guardianAttendanceApi';

const STATUS_CONFIG: Record<GuardianAttendanceStatus, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  PRESENTE: { label: 'Presente', badgeClass: 'bg-success text-success-ink border-success-ink/30', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
  TARDANZA: { label: 'Tardanza', badgeClass: 'bg-white text-warning-ink border-warning-ink/30', icon: <Clock size={12} aria-hidden="true" /> },
  INASISTENCIA: { label: 'Inasistencia', badgeClass: 'bg-accent-soft text-accent border-accent/30', icon: <AlertCircle size={12} aria-hidden="true" /> },
};

const JUSTIFICATION_CONFIG: Record<JustificationStatus, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  PENDIENTE: { label: 'Justificación pendiente', badgeClass: 'bg-white text-warning-ink border-warning-ink/30', icon: <Clock size={11} aria-hidden="true" /> },
  OBSERVADA: { label: 'Justificación observada', badgeClass: 'bg-white text-warning-ink border-warning-ink/30', icon: <AlertCircle size={11} aria-hidden="true" /> },
  APROBADA: { label: 'Justificación aprobada', badgeClass: 'bg-success text-success-ink border-success-ink/30', icon: <CheckCircle2 size={11} aria-hidden="true" /> },
  RECHAZADA: { label: 'Justificación rechazada', badgeClass: 'bg-accent-soft text-accent border-accent/30', icon: <AlertCircle size={11} aria-hidden="true" /> },
};

const DATE_FORMAT = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** `YYYY-MM-DD` (día escolar, sin zona) en español de Perú: «martes, 6 de octubre de 2026». */
export function formatAttendanceDate(isoDay: string): string {
  const [year, month, day] = isoDay.split('-').map(Number);
  return DATE_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

/** Tras un rechazo cabe otra solicitud dentro del plazo; con una aprobada o en trámite no. */
function canJustify(record: GuardianAttendanceRecord): boolean {
  return (record.status === 'INASISTENCIA' || record.status === 'TARDANZA') && !record.justified
    && (!record.justification || record.justification.status === 'RECHAZADA');
}

interface DiaAsistenciaCardProps {
  studentId: number;
  date: string;
  records: GuardianAttendanceRecord[];
}

/** Sesiones de un día con su estado, la justificación existente y los enlaces «Justificar» / «Ver justificación». */
export function DiaAsistenciaCard({ studentId, date, records }: DiaAsistenciaCardProps) {
  const absences = records.filter(r => r.status === 'INASISTENCIA').length;
  const lates = records.filter(r => r.status === 'TARDANZA').length;
  return (
    <section className={`rounded-2xl border bg-white p-4 shadow-2xs sm:p-5 ${absences > 0 ? 'border-accent/30' : lates > 0 ? 'border-warning-ink/30' : 'border-line'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral text-muted"><CalendarDays size={16} aria-hidden="true" /></span>
          <div>
            <h2 className="text-xs font-black capitalize leading-tight text-ink sm:text-sm">{formatAttendanceDate(date)}</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{records.length} {records.length === 1 ? 'sesión registrada' : 'sesiones registradas'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          {lates > 0 && <span className="rounded-full border border-warning-ink/30 bg-white px-2 py-0.5 text-warning-ink">{lates} {lates === 1 ? 'tardanza' : 'tardanzas'}</span>}
          {absences > 0 && <span className="rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-accent">{absences} {absences === 1 ? 'falta' : 'faltas'}</span>}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {records.map((record, index) => {
          const status = STATUS_CONFIG[record.status];
          const justification = record.justification ? JUSTIFICATION_CONFIG[record.justification.status] : null;
          return (
            <li key={`${record.date}-${record.startTime}-${record.courseName}-${index}`} className="flex flex-col justify-between gap-2 rounded-xl px-2 py-2.5 transition-colors hover:bg-canvas/50 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-2.5">
                <BookOpen size={16} className="shrink-0 text-muted/70" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink">{record.courseName} · {record.startTime}–{record.endTime}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {justification && (
                  <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${justification.badgeClass}`}>{justification.icon}<span>{justification.label}</span></span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${status.badgeClass}`}>{status.icon}<span>{status.label}</span></span>
                {canJustify(record) && (
                  <Link
                    href={`/padre/justificacion?studentId=${studentId}&attendanceId=${record.attendanceId}&date=${encodeURIComponent(record.date)}&course=${encodeURIComponent(record.courseName)}&status=${encodeURIComponent(record.status)}`}
                    prefetch={false}
                    className="inline-flex items-center rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-accent/90"
                  >
                    Justificar
                  </Link>
                )}
                {record.justification && (
                  <Link
                    href={`/padre/justificacion?studentId=${studentId}&justificationId=${record.justification.id}`}
                    prefetch={false}
                    className="inline-flex items-center text-xs font-medium text-accent underline hover:text-accent/80"
                  >
                    Ver justificación
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
