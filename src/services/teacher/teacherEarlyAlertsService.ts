import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { isIsoDate } from '@/lib/gradeWindowContract';
import type { EarlyWarning, EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';

// Backend #52: EarlyWarningsController.Teacher + EarlyWarningsExceptionHandler (develop).
// 401/403 never carry a code. A code counts only with its contract status (contractErrors.ts).
const contractStatuses = {
  ALERT_REQUEST_INVALID: [400],
  ALERT_CONTEXT_UNAVAILABLE: [404],
  ALERT_INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type TeacherEarlyAlertsErrorCode = keyof typeof contractStatuses;
export const TEACHER_EARLY_ALERTS_ERROR_CODES = Object.keys(contractStatuses) as TeacherEarlyAlertsErrorCode[];

export const EARLY_ALERTS_PAGE_SIZE = 20;
/** EarlyWarningsService.validatePage: size from 1 to 100, page from 0. */
export const EARLY_ALERTS_MAX_PAGE_SIZE = 100;
export const EARLY_ALERTS_EMPTY_MESSAGE = 'No hay alertas generadas para este curso en el bimestre';
export const EARLY_ALERTS_COURSE_UNAVAILABLE_MESSAGE = 'Curso no disponible para tu cuenta';

function invalid(): never { throw new Error('La respuesta de alertas tempranas no coincide con el contrato.'); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function id(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid(); return value; }
function count(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalid(); return value; }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return invalid(); return value; }
function timestamp(value: unknown): string { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return invalid(); return value; }
// V26: nota_pa DECIMAL(3,1) between 0 and 10.9.
function pa(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 11 || Math.abs(value * 10 - Math.round(value * 10)) > 1e-8) return invalid();
  return value;
}

function warning(value: unknown, expected: { sectionCourseId: number; bimesterId: number }): EarlyWarning {
  const w = object(value);
  const sectionCourseId = id(w.sectionCourseId), bimesterId = id(w.bimesterId);
  if (sectionCourseId !== expected.sectionCourseId || bimesterId !== expected.bimesterId) return invalid();
  if (w.studentCode !== null && (typeof w.studentCode !== 'string' || !w.studentCode.trim())) return invalid();
  if (!isIsoDate(w.evaluatedOn)) return invalid();
  return {
    alertId: id(w.alertId), enrollmentId: id(w.enrollmentId), sectionCourseId, bimesterId, studentId: id(w.studentId),
    studentCode: w.studentCode as string | null, fullName: text(w.fullName), courseName: text(w.courseName), sectionName: text(w.sectionName),
    paAtDetection: pa(w.paAtDetection), activityCount: id(w.activityCount), evaluatedOn: w.evaluatedOn, detectedAt: timestamp(w.detectedAt),
  };
}

export function parseEarlyWarningsPage(value: unknown, expected: { sectionCourseId: number; bimesterId: number; page: number; size: number }): EarlyWarningsPage {
  const p = object(value);
  if (!Array.isArray(p.content)) return invalid();
  const page = count(p.page), size = id(p.size), totalElements = count(p.totalElements), totalPages = count(p.totalPages);
  // The backend counts and lists in separate reads, so content is not matched against totalElements exactly.
  if (page !== expected.page || size !== expected.size || totalPages !== Math.ceil(totalElements / size) || p.content.length > size) return invalid();
  // UNIQUE (matricula_id, seccion_curso_id, bimestre_id): one alert per enrollment in this course and bimester.
  const content = p.content.map(item => warning(item, expected));
  if (new Set(content.map(w => w.alertId)).size !== content.length || new Set(content.map(w => w.enrollmentId)).size !== content.length) return invalid();
  return { content, page, size, totalElements, totalPages };
}

function requestId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El curso y el bimestre deben ser enteros positivos.');
  return value;
}

export const teacherEarlyAlertsService = {
  async list(sectionCourseId: number, bimesterId: number, page = 0, size = EARLY_ALERTS_PAGE_SIZE, signal?: AbortSignal): Promise<EarlyWarningsPage> {
    if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(size) || size < 1 || size > EARLY_ALERTS_MAX_PAGE_SIZE) throw new Error('La paginación solicitada no es válida.');
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
