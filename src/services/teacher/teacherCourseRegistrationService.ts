import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { evaluationResultReasonLabel } from '@/lib/evaluationResultsContract';
import { bimesterStatusLabels } from '@/types/evaluationApi';
import type { EvaluationResultReason, EvaluationResultsResponse } from '@/types/evaluationResultsApi';
import type { RegistrationPending, TeacherCourseRegistration } from '@/types/teacherCourseRegistrationApi';

// Backend #106: TeacherCourseRegistrationController + BimesterPublicationExceptionHandler (develop).
// 401/403 never carry a code. A code counts only with its contract status (contractErrors.ts).
const contractStatuses = {
  VALIDATION_ERROR: [400],
  RESOURCE_NOT_FOUND: [404],
  BIMESTER_STATE_CONFLICT: [409],
  RESULTS_PENDING: [409],
  INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type TeacherCourseRegistrationErrorCode = keyof typeof contractStatuses;
export const TEACHER_COURSE_REGISTRATION_ERROR_CODES = Object.keys(contractStatuses) as TeacherCourseRegistrationErrorCode[];

export const COURSE_UNAVAILABLE_MESSAGE = 'Curso no disponible para tu cuenta';
export const REGISTRATION_NOT_APPLICABLE_MESSAGE = 'Este curso no requiere registro (sin alumnos matriculados)';

const path = (sectionCourseId: number, bimesterId: number) =>
  `/v1/teacher/courses/${requestId(sectionCourseId)}/bimesters/${requestId(bimesterId)}/registration`;

function invalid(): never { throw new Error('La respuesta del registro del curso no coincide con el contrato.'); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function id(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid(); return value; }
function nullableId(value: unknown): number | null { return value === null || value === undefined ? null : id(value); }
function timestamp(value: unknown): string { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return invalid(); return value; }
function nullableTimestamp(value: unknown): string | null { return value === null || value === undefined ? null : timestamp(value); }
function requestId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El curso y el bimestre deben ser enteros positivos.');
  return value;
}

export function parseTeacherCourseRegistration(value: unknown, expected: { sectionCourseId: number; bimesterId: number }): TeacherCourseRegistration {
  const v = object(value);
  const sectionCourseId = id(v.sectionCourseId), bimesterId = id(v.bimesterId);
  if (sectionCourseId !== expected.sectionCourseId || bimesterId !== expected.bimesterId) return invalid();
  if (!Object.prototype.hasOwnProperty.call(bimesterStatusLabels, String(v.status))) return invalid();
  if (typeof v.applicable !== 'boolean' || typeof v.registered !== 'boolean') return invalid();
  if (typeof v.revision !== 'number' || !Number.isSafeInteger(v.revision) || v.revision < 0) return invalid();
  const registeredAt = nullableTimestamp(v.registeredAt), publishedAt = nullableTimestamp(v.publishedAt);
  // Backend invariants: a current registration needs a population and its timestamp; publication ⇔ revision ≥ 1.
  if (v.registered && (!v.applicable || registeredAt === null)) return invalid();
  if ((publishedAt === null) !== (v.revision === 0)) return invalid();
  return { sectionCourseId, bimesterId, status: v.status as TeacherCourseRegistration['status'], applicable: v.applicable,
    registered: v.registered, registeredAt, publishedAt, revision: v.revision };
}

export const teacherCourseRegistrationService = {
  async get(sectionCourseId: number, bimesterId: number, signal?: AbortSignal): Promise<TeacherCourseRegistration> {
    const response = await httpClient.get<unknown>(path(sectionCourseId, bimesterId), { signal });
    return parseTeacherCourseRegistration(response.data, { sectionCourseId, bimesterId });
  },
  /** No body. Idempotent while the registration stays current; the backend decides on pendings. */
  async register(sectionCourseId: number, bimesterId: number): Promise<TeacherCourseRegistration> {
    const response = await httpClient.post<unknown>(path(sectionCourseId, bimesterId));
    return parseTeacherCourseRegistration(response.data, { sectionCourseId, bimesterId });
  },
};

/** Pre-check from GET .../results: same rule as the backend, AREA_INCOMPLETE does not block this course. */
export function registrationPendingsFromResults(results: EvaluationResultsResponse): RegistrationPending[] {
  return results.students
    .map(row => ({ sectionCourseId: results.sectionCourseId, enrollmentId: row.enrollmentId, reasons: row.reasons.filter(r => r !== 'AREA_INCOMPLETE') as string[] }))
    .filter(p => p.reasons.length > 0);
}

export function teacherCourseRegistrationErrorCode(error: unknown): TeacherCourseRegistrationErrorCode | null {
  return contractErrorCode<TeacherCourseRegistrationErrorCode>(error, contractStatuses);
}

/** Authoritative pendings: details of a 409 RESULTS_PENDING. null when absent or malformed. */
export function registrationPendingsFromError(error: unknown): RegistrationPending[] | null {
  if (teacherCourseRegistrationErrorCode(error) !== 'RESULTS_PENDING' || !isAxiosError(error)) return null;
  const details = (error.response?.data as Record<string, unknown>).details;
  if (!Array.isArray(details)) return null;
  try {
    return details.map(item => {
      const p = object(item);
      if (!Array.isArray(p.reasons) || !p.reasons.length || p.reasons.some(r => typeof r !== 'string' || !r.trim())) return invalid();
      return { sectionCourseId: nullableId(p.sectionCourseId), enrollmentId: nullableId(p.enrollmentId), reasons: [...p.reasons] as string[] };
    });
  } catch {
    return null;
  }
}

export function registrationReasonLabel(reason: string): string {
  if (reason === 'INSUFFICIENT_MANUAL_CRITERIA' || reason === 'INVALID_PA_CRITERION_COUNT' || reason === 'PA_UNAVAILABLE'
    || /^MISSING_MANUAL_GRADE:[1-9]\d*$/.test(reason)) return evaluationResultReasonLabel(reason as EvaluationResultReason);
  return 'Pendiente no reconocido';
}

// Server messages are not echoed: a 404 must not reveal whether a foreign context exists.
export function registrationReadErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudo consultar el registro del curso.';
  if (teacherCourseRegistrationErrorCode(error) === 'RESOURCE_NOT_FOUND' || error.response?.status === 404) return COURSE_UNAVAILABLE_MESSAGE;
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 400: return 'El curso o bimestre seleccionado no es válido.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para consultar el registro de este curso.';
    default: return 'No se pudo consultar el registro del curso. Intenta nuevamente.';
  }
}

export function registrationActionErrorMessage(error: unknown): string {
  switch (teacherCourseRegistrationErrorCode(error)) {
    case 'RESULTS_PENDING': return 'El curso tiene resultados pendientes. Complétalos antes de registrarlo.';
    case 'BIMESTER_STATE_CONFLICT': return 'El bimestre ya no está Abierto o su estado cambió. Se actualizó el estado del registro.';
    case 'RESOURCE_NOT_FOUND': return COURSE_UNAVAILABLE_MESSAGE;
  }
  if (!isAxiosError(error)) return 'No se pudo confirmar el registro. Se actualizó el estado del curso.';
  switch (error.response?.status) {
    case 400: return 'El curso o bimestre seleccionado no es válido.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para registrar este curso.';
    case 404: return COURSE_UNAVAILABLE_MESSAGE;
    default: return 'No se pudo confirmar el registro. Se actualizó el estado del curso.';
  }
}
