'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildMonthCalendar, monthRange, todayStatus, type CalendarWeek, type TodayStatus } from '@/adapters/guardianAttendanceCalendarAdapter';
import { limaToday } from '@/lib/limaClock';
import { attendanceRangeError, getGuardianAttendance } from '@/services/padres/guardianAttendanceService';
import type { GuardianAttendanceRecord } from '@/types/guardianAttendanceApi';

export interface GuardianAttendanceMonthState {
  /** Semanas del mes; vacío mientras carga o si falló. */
  weeks: CalendarWeek[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export interface GuardianAttendanceTodayState {
  status: TodayStatus | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

type Outcome = { key: string; records: GuardianAttendanceRecord[] } | { key: string; error: string };

function failureMessage(cause: unknown): string {
  return cause instanceof Error && cause.message ? cause.message : 'No se pudo cargar la asistencia. Intenta nuevamente.';
}

/**
 * Consulta la asistencia de `[from, to]` con un `AbortController` por efecto: cambiar de estudiante, de rango o
 * recargar cancela la petición anterior y se ignoran las respuestas canceladas o tardías. El resultado se guarda
 * con la clave de su petición; solo vale el que coincide con la clave actual.
 */
function useAttendanceQuery(studentId: string | null, range: { from: string; to: string } | null) {
  const [reloads, setReloads] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const from = range?.from ?? '';
  const to = range?.to ?? '';
  const rangeError = range ? attendanceRangeError(from, to) : null;
  const key = `${studentId ?? ''}|${from}|${to}|${reloads}`;
  const active = !!studentId && !!range && !rangeError;

  useEffect(() => {
    if (!active || !studentId) return;
    const controller = new AbortController();
    getGuardianAttendance(studentId, from, to, controller.signal)
      .then(data => { if (!controller.signal.aborted) setOutcome({ key, records: data.records }); })
      .catch(cause => { if (!controller.signal.aborted) setOutcome({ key, error: failureMessage(cause) }); });
    return () => controller.abort();
  }, [active, studentId, from, to, key]);

  const reload = useCallback(() => setReloads(n => n + 1), []);
  const current = outcome?.key === key ? outcome : null;
  return {
    records: current && 'records' in current ? current.records : null,
    error: rangeError ?? (current && 'error' in current ? current.error : null),
    loading: active && !current,
    reload,
  };
}

/**
 * Calendario del mes (`month` de 1 a 12) del estudiante: `GET .../attendance?from=<día 1>&to=<último día u hoy>`.
 * Un mes futuro no consulta nada y devuelve todos los días como «futuro». `today` solo se inyecta en pruebas.
 */
export function useGuardianAttendanceMonth(
  studentId: string | null,
  year: number,
  month: number,
  today: string = limaToday(),
): GuardianAttendanceMonthState {
  const range = useMemo(() => monthRange(year, month, today), [year, month, today]);
  const query = useAttendanceQuery(studentId, range);
  const weeks = useMemo(() => {
    if (!range) return buildMonthCalendar([], year, month, today);
    return query.records ? buildMonthCalendar(query.records, year, month, today) : [];
  }, [range, query.records, year, month, today]);
  return { weeks, loading: query.loading, error: query.error, reload: query.reload };
}

/**
 * Tarjeta de hoy (D3): consulta propia con `from = to = hoy` (Lima), cancelable e independiente del mes que se
 * esté viendo. Aplica `todayStatus` a las sesiones de hoy.
 */
export function useGuardianAttendanceToday(studentId: string | null, today: string = limaToday()): GuardianAttendanceTodayState {
  const range = useMemo(() => ({ from: today, to: today }), [today]);
  const query = useAttendanceQuery(studentId, range);
  const status = useMemo(() => (query.records ? todayStatus(query.records, today) : null), [query.records, today]);
  return { status, loading: query.loading, error: query.error, reload: query.reload };
}
