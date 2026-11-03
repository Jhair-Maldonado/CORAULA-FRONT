// Incidencias del estudiante para el apoderado (#117). La vista llega en el PR de incidencias (#59).
import httpClient from '@/services/httpClient';
import { parseGuardianIncidentsPage } from '@/lib/guardianContract';
import { attendanceRangeError, isGuardianStudentId } from '@/services/padres/guardianAttendanceService';
import { GuardianValidationError, guardianReadErrorMessage } from '@/services/padres/guardianErrors';
import type { GuardianIncidentsPage } from '@/types/guardianIncidentsApi';

export const GUARDIAN_INCIDENTS_PAGE_SIZE = 20;
export const GUARDIAN_INCIDENTS_MAX_PAGE_SIZE = 100;
export const GUARDIAN_INCIDENTS_DEFAULT_DAYS = 30;
const LIMA = 'America/Lima';

/** Día escolar actual en America/Lima (YYYY-MM-DD): el backend filtra occurredAt por ese día. */
export function limaDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: LIMA, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Últimos 30 días con ambos extremos, terminando hoy en Lima. */
export function incidentsDefaultRange(today = limaDay()): { from: string; to: string } {
  const [y, m, d] = today.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d - (GUARDIAN_INCIDENTS_DEFAULT_DAYS - 1)));
  return { from: start.toISOString().slice(0, 10), to: today };
}

/** occurredAt (ISO-8601 UTC) como fecha y hora de Lima: «06/10/2026 10:00». */
export function formatLimaDateTime(instant: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LIMA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}

export function isValidGuardianPage(page: number, size: number, max = GUARDIAN_INCIDENTS_MAX_PAGE_SIZE): boolean {
  return Number.isSafeInteger(page) && page >= 0 && Number.isSafeInteger(size) && size >= 1 && size <= max;
}

export const guardianIncidentsService = {
  /** GET /v1/guardian/students/{studentId}/incidents: ordenadas por occurredAt DESC; rango de hasta 92 días. */
  async list(studentId: string, from: string, to: string, page = 0, size = GUARDIAN_INCIDENTS_PAGE_SIZE, signal?: AbortSignal): Promise<GuardianIncidentsPage> {
    const rangeError = attendanceRangeError(from, to);
    if (rangeError) throw new GuardianValidationError(rangeError);
    if (!isGuardianStudentId(studentId)) throw new GuardianValidationError('Seleccione un estudiante vinculado.');
    if (!isValidGuardianPage(page, size)) throw new GuardianValidationError('La paginación solicitada no es válida.');
    const response = await httpClient.get<unknown>(`/v1/guardian/students/${studentId}/incidents`, { params: { from, to, page, size }, signal });
    return parseGuardianIncidentsPage(response.data, { page, size });
  },
};

export function guardianIncidentsErrorMessage(error: unknown): string {
  return error instanceof GuardianValidationError ? error.message : guardianReadErrorMessage(error, 'incidents');
}
