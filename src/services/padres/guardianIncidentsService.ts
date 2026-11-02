// Incidencias del estudiante para el apoderado (#117). La vista llega en el PR de incidencias (#59).
import httpClient from '@/services/httpClient';
import { parseGuardianIncidentsPage } from '@/lib/guardianContract';
import { attendanceRangeError, isGuardianStudentId } from '@/services/padres/guardianAttendanceService';
import { GuardianValidationError, guardianReadErrorMessage } from '@/services/padres/guardianErrors';
import type { GuardianIncidentsPage } from '@/types/guardianIncidentsApi';

export const GUARDIAN_INCIDENTS_PAGE_SIZE = 20;
export const GUARDIAN_INCIDENTS_MAX_PAGE_SIZE = 100;

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
