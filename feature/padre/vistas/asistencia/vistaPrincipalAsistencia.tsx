'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePadre } from '@/components/padres/PadreContext';
import { attendanceRangeError, getGuardianAttendance } from '@/services/padres/guardianAttendanceService';
import type { GuardianAttendanceRecord, GuardianAttendanceResponse } from '@/types/guardianAttendanceApi';

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initialRange(): { from: string; to: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return { from: localDate(start), to: localDate(today) };
}

const STATUS_LABEL: Record<GuardianAttendanceRecord['status'], string> = {
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  INASISTENCIA: 'Inasistencia',
};

export function GuardianAttendanceReport({ data }: { data: GuardianAttendanceResponse }) {
  const days = useMemo(() => {
    const grouped = new Map<string, GuardianAttendanceRecord[]>();
    for (const record of data.records) {
      const entries = grouped.get(record.date) ?? [];
      entries.push(record);
      grouped.set(record.date, entries);
    }
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [data.records]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
        {([
          ['Sesiones', data.summary.total],
          ['Presentes', data.summary.present],
          ['Tardanzas', data.summary.late],
          ['Inasistencias', data.summary.absent],
        ] as const).map(([label, count]) => (
          <div key={label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs font-semibold text-muted">{label}</p>
            <p className="text-2xl font-black text-ink">{count}</p>
          </div>
        ))}
      </div>
      {days.length === 0 ? (
        <p className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
          No hay sesiones con asistencia registrada en este rango.
        </p>
      ) : (
        <div className="space-y-4">
          {days.map(([date, records]) => (
            <section key={date} className="rounded-xl border border-line bg-white p-4">
              <h2 className="mb-3 text-sm font-bold text-ink">{date}</h2>
              <ul className="divide-y divide-line">
                {records.map((record, index) => {
                  const canJustify = (record.status === 'INASISTENCIA' || record.status === 'TARDANZA') && !record.justified
                    && (!record.justification || record.justification.status === 'RECHAZADA'); // tras un rechazo cabe otra solicitud dentro del plazo
                  return (
                    <li key={`${record.date}-${record.startTime}-${record.courseName}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-ink">{record.courseName} · {record.startTime}–{record.endTime}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-ink">
                      {STATUS_LABEL[record.status] ?? record.status}
                      {record.justification ? ` · Justificación ${record.justification.status.toLowerCase()}` : ''}
                        </span>
                        {canJustify && (
                          <Link
                            href={`/padre/justificacion?studentId=${data.studentId}&attendanceId=${record.attendanceId}&date=${encodeURIComponent(record.date)}&course=${encodeURIComponent(record.courseName)}&status=${encodeURIComponent(record.status)}`}
                            prefetch={false}
                            className="inline-flex items-center rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-accent/90"
                          >
                            Justificar
                          </Link>
                        )}
                        {record.justification && (
                          <Link
                            href={`/padre/justificacion?studentId=${data.studentId}&justificationId=${record.justification.id}`}
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
          ))}
        </div>
      )}
    </>
  );
}

export default function VistaPrincipalAsistencia() {
  const { hijoActivo: hijo, isLoading: isPadreLoading, error: padreError, refreshPadreData } = usePadre();
  const studentId = hijo?.id;
  const [range, setRange] = useState(initialRange);
  const [result, setResult] = useState<{ key: string; data: GuardianAttendanceResponse } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const rangeError = attendanceRangeError(range.from, range.to);
  const requestKey = `${studentId ?? ''}|${range.from}|${range.to}|${refreshCount}`;
  const loading = !!studentId && !rangeError && result?.key !== requestKey && failure?.key !== requestKey;

  useEffect(() => {
    if (!studentId || rangeError) return;
    let active = true;
    getGuardianAttendance(studentId, range.from, range.to)
      .then(data => {
        if (active) {
          setResult({ key: requestKey, data });
          setFailure(null);
        }
      })
      .catch(cause => {
        if (active) {
          setFailure({ key: requestKey, message: cause instanceof Error ? cause.message : 'No se pudo cargar la asistencia.' });
        }
      });
    return () => { active = false; };
  }, [studentId, range.from, range.to, rangeError, refreshCount, requestKey]);

  const changeRange = (next: { from: string; to: string }) => {
    setRange(next);
  };

  return (
    <div className="mx-auto max-w-5xl py-4">
      <h1 className="text-xl font-black text-ink">Asistencia del estudiante</h1>
      <p className="mt-1 text-sm text-muted">Se muestran únicamente las sesiones registradas por el docente.</p>

      {isPadreLoading ? <p className="mt-6 text-sm text-muted">Cargando estudiantes…</p> : padreError ? (
        <div className="mt-6 text-sm text-accent" role="alert">
          {padreError} <button type="button" className="underline" onClick={refreshPadreData}>Reintentar</button>
        </div>
      ) : !hijo ? (
        <p className="mt-6 rounded-xl border border-line bg-white p-6 text-sm text-muted">No tiene estudiantes vinculados.</p>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold text-ink">{hijo.nombreCompleto}</p>
          <div className="my-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
            <label className="text-xs font-semibold text-muted">
              Desde
              <input aria-label="Desde" type="date" value={range.from} onChange={event => changeRange({ ...range, from: event.target.value })} className="mt-1 block rounded-lg border border-line p-2 text-ink" />
            </label>
            <label className="text-xs font-semibold text-muted">
              Hasta
              <input aria-label="Hasta" type="date" value={range.to} onChange={event => changeRange({ ...range, to: event.target.value })} className="mt-1 block rounded-lg border border-line p-2 text-ink" />
            </label>
            <button type="button" onClick={() => setRefreshCount(count => count + 1)} disabled={loading || !!rangeError} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Actualizar</button>
          </div>
          {rangeError ? <p role="alert" className="text-sm text-accent">{rangeError}</p> : loading ? (
            <p className="text-sm text-muted">Cargando asistencia…</p>
          ) : failure?.key === requestKey ? <p role="alert" className="text-sm text-accent">{failure.message}</p> : result?.key === requestKey ? (
            <GuardianAttendanceReport data={result.data} />
          ) : null}
        </>
      )}
    </div>
  );
}
