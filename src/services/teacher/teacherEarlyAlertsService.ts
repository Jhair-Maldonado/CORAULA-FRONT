import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { EARLY_ALERTS_PAGE_SIZE, isValidEarlyAlertsPage, parseEarlyWarningsPage } from '@/lib/earlyWarningsContract';
import type { EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';

// The page contract lives in @/lib/earlyWarningsContract (shared with management); re-exported for existing callers.
export { EARLY_ALERTS_MAX_PAGE_SIZE, EARLY_ALERTS_PAGE_SIZE, parseEarlyWarningsPage } from '@/lib/earlyWarningsContract';

// Backend #52: EarlyWarningsController.Teacher + EarlyWarningsExceptionHandler (develop).
// 401/403 never carry a code. A code counts only with its contract status (contractErrors.ts).
const contractStatuses = {
  ALERT_REQUEST_INVALID: [400],
  ALERT_CONTEXT_UNAVAILABLE: [404],
  ALERT_INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type TeacherEarlyAlertsErrorCode = keyof typeof contractStatuses;
export const TEACHER_EARLY_ALERTS_ERROR_CODES = Object.keys(contractStatuses) as TeacherEarlyAlertsErrorCode[];

export const EARLY_ALERTS_EMPTY_MESSAGE = 'No hay alertas generadas para este curso en el bimestre';
export const EARLY_ALERTS_COURSE_UNAVAILABLE_MESSAGE = 'Curso no disponible para tu cuenta';

function requestId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El curso y el bimestre deben ser enteros positivos.');
  return value;
}

export const teacherEarlyAlertsService = {
  async list(sectionCourseId: number, bimesterId: number, page = 0, size = EARLY_ALERTS_PAGE_SIZE, signal?: AbortSignal): Promise<EarlyWarningsPage> {
    if (!isValidEarlyAlertsPage(page, size)) throw new Error('La paginación solicitada no es válida.');
    const url = `/v1/teacher/courses/${requestId(sectionCourseId)}/bimesters/${requestId(bimesterId)}/early-alerts`;
    const response = await httpClient.get<unknown>(url, { params: { page, size }, signal });
    return parseEarlyWarningsPage(response.data, { sectionCourseId, bimesterId, page, size });
  },
};

export function teacherEarlyAlertsErrorCode(error: unknown): TeacherEarlyAlertsErrorCode | null {
  return contractErrorCode<TeacherEarlyAlertsErrorCode>(error, contractStatuses);
}

// Server messages are not echoed: a 404 must not reveal whether a foreign context exists.
export function teacherEarlyAlertsErrorMessage(error: unknown): string {
  switch (teacherEarlyAlertsErrorCode(error)) {
    case 'ALERT_REQUEST_INVALID': return 'El curso, el bimestre o la página solicitada no son válidos.';
    case 'ALERT_CONTEXT_UNAVAILABLE': return EARLY_ALERTS_COURSE_UNAVAILABLE_MESSAGE;
  }
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudieron consultar las alertas tempranas.';
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 400: return 'El curso, el bimestre o la página solicitada no son válidos.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para consultar las alertas de este curso.';
    case 404: return EARLY_ALERTS_COURSE_UNAVAILABLE_MESSAGE;
    default: return 'No se pudieron consultar las alertas tempranas. Intenta nuevamente.';
  }
}
