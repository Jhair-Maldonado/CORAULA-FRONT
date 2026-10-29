import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import type { DailyAttendanceIndicator, DailyAttendanceParams, DailyAttendanceStatus } from '@/types/dailyAttendanceApi';

const endpoint = '/v1/management/attendance/daily';
const unexpectedResponse = 'Respuesta de asistencia diaria inesperada.';
const statuses: readonly DailyAttendanceStatus[] = ['NO_SESSIONS', 'NO_ENROLLMENTS', 'PENDING', 'PARTIAL', 'COMPLETE'];
const withoutPercentage: readonly DailyAttendanceStatus[] = ['NO_SESSIONS', 'NO_ENROLLMENTS', 'PENDING'];
const counts = ['scheduledSections', 'sectionsWithoutSessions', 'sectionsWithConflictingFirstSession', 'expectedStudents', 'present', 'late', 'absent', 'unrecorded'] as const;

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const isId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

// Validates shape and the documented contract (status ↔ percentage, invariant of counts); it never derives figures.
export function parseDailyAttendance(value: unknown): DailyAttendanceIndicator {
  const row = value as Partial<Record<keyof DailyAttendanceIndicator, unknown>> | null;
  if (!row || typeof row !== 'object' || !isIsoDate(row.date) || !isId(row.academicPeriodId)
    || (row.sectionId !== null && !isId(row.sectionId)) || !statuses.includes(row.status as DailyAttendanceStatus)
    || counts.some(key => !isCount(row[key]))) {
    throw new Error(unexpectedResponse);
  }
  const indicator = row as DailyAttendanceIndicator;
  const percentage = row.attendancePercentage;
  const percentageOk = withoutPercentage.includes(indicator.status)
    ? percentage === null
    : typeof percentage === 'number' && Number.isFinite(percentage) && percentage >= 0 && percentage <= 100;
  if (!percentageOk || indicator.expectedStudents !== indicator.present + indicator.late + indicator.absent + indicator.unrecorded) {
    throw new Error(unexpectedResponse);
  }
  return {
    date: indicator.date, academicPeriodId: indicator.academicPeriodId, sectionId: indicator.sectionId, status: indicator.status,
    scheduledSections: indicator.scheduledSections, sectionsWithoutSessions: indicator.sectionsWithoutSessions,
    sectionsWithConflictingFirstSession: indicator.sectionsWithConflictingFirstSession, expectedStudents: indicator.expectedStudents,
    present: indicator.present, late: indicator.late, absent: indicator.absent, unrecorded: indicator.unrecorded,
    attendancePercentage: indicator.attendancePercentage,
  };
}

export const dailyAttendanceService = {
  async get({ academicPeriodId, date, sectionId }: DailyAttendanceParams): Promise<DailyAttendanceIndicator> {
    if (!isId(academicPeriodId)) throw new Error('El ID del periodo académico debe ser un entero positivo.');
    if (sectionId !== undefined && !isId(sectionId)) throw new Error('El ID de la sección debe ser un entero positivo.');
    if (date !== undefined && !isIsoDate(date)) throw new Error('La fecha debe tener el formato AAAA-MM-DD.');
    const params: Record<string, string | number> = { academicPeriodId };
    if (date !== undefined) params.date = date;
    if (sectionId !== undefined) params.sectionId = sectionId;
    const indicator = parseDailyAttendance((await httpClient.get<unknown>(endpoint, { params })).data);
    if (indicator.academicPeriodId !== academicPeriodId || (date !== undefined && indicator.date !== date)
      || indicator.sectionId !== (sectionId ?? null)) {
      throw new Error('La respuesta no corresponde a los filtros solicitados.');
    }
    return indicator;
  },
};

// Backend texts are never shown.
export function dailyAttendanceErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return error instanceof Error && error.message === unexpectedResponse ? unexpectedResponse : 'No se pudo obtener el indicador. Intenta nuevamente.';
  }
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  switch (error.response.status) {
    case 400: return 'Revisa los filtros: la fecha debe estar dentro del periodo y la sección debe pertenecer a él.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para consultar la asistencia institucional.';
    case 404: return 'El periodo o la sección seleccionados ya no existen. Actualiza la información.';
    default: return 'El servidor no pudo obtener el indicador. Intenta nuevamente.';
  }
}

// "Today" as the backend sees it (America/Lima), regardless of the browser's time zone.
export function limaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Current period first; otherwise the active period that starts last.
export function defaultAcademicPeriod(periods: AcademicPeriod[]): AcademicPeriod | undefined {
  return periods.find(period => period.current)
    ?? periods.filter(period => period.active).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}

// The backend rejects dates outside the period, so the default is clamped to its nearest bound.
export function defaultAttendanceDate(period: AcademicPeriod, today: string): string {
  if (today < period.startDate) return period.startDate;
  if (today > period.endDate) return period.endDate;
  return today;
}

// Formatting only: the value is the backend's, with its two decimals.
export function formatAttendancePercentage(value: number): string {
  return `${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} %`;
}
