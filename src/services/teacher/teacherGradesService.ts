import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { CORRECTION_JUSTIFICATION_MAX_LENGTH, CORRECTION_JUSTIFICATION_MIN_LENGTH, GRADE_CORRECTION_REASONS, MANUAL_GRADES_CONTRACT_VERIFIED } from '@/types/teacherGradesApi';
import type { CreateManualCriterionGradeRequest, TeacherCorrectCriterionGradeRequest } from '@/types/teacherGradesApi';
import { manualGradesErrorMessage, parseBimestersResponse, parseCriterionGradeResponse, parseCriterionGradesSheetResponse } from '@/lib/manualGradesContract';
import { gradeInputError } from '@/lib/manualGrades';
import { parseEvaluationResultsResponse } from '@/lib/evaluationResultsContract';
import { contractErrorCode } from '@/services/admin/contractErrors';

const path = (sectionCourseId: number) => `/v1/teacher/courses/${sectionCourseId}/bimesters`;

// Routes and DTOs follow the backend N2 controller and docs/manual-grades-n2.md.
// POST remains blocked pending isolated integration and authorization checks.
export const teacherGradesService = {
  async getBimesters(sectionCourseId: number, signal?: AbortSignal) {
    return parseBimestersResponse((await httpClient.get<unknown>(path(sectionCourseId), { signal })).data);
  },
  async getSheet(context: { sectionCourseId: number; courseId: number; bimesterId: number; academicPeriodId: number }, signal?: AbortSignal) {
    return parseCriterionGradesSheetResponse((await httpClient.get<unknown>(`${path(context.sectionCourseId)}/${context.bimesterId}/criterion-grades`, { signal })).data, context);
  },
  // #45: read-only results calculated from sources; not a published revision.
  async getResults(sectionCourseId: number, bimesterId: number, signal?: AbortSignal) {
    return parseEvaluationResultsResponse((await httpClient.get<unknown>(`${path(sectionCourseId)}/${bimesterId}/results`, { signal })).data, { sectionCourseId, bimesterId });
  },
  async registerGrade(sectionCourseId: number, bimesterId: number, request: CreateManualCriterionGradeRequest) {
    if (!MANUAL_GRADES_CONTRACT_VERIFIED) throw new Error('El registro real está bloqueado hasta verificar el contrato N2 con backend.');
    const error = gradeInputError(String(request.grade));
    if (error) throw new Error(error);
    // The backend request rejects unknown keys. Send exactly the documented DTO.
    const { enrollmentId, criterionId, grade } = request;
    const saved = parseCriterionGradeResponse((await httpClient.post<unknown>(`${path(sectionCourseId)}/${bimesterId}/criterion-grades`, { enrollmentId, criterionId, grade })).data);
    if (saved.sectionCourseId !== sectionCourseId || saved.bimesterId !== bimesterId || saved.enrollmentId !== enrollmentId || saved.criterionId !== criterionId || saved.grade !== grade) throw new Error('El registro respondió con un contexto distinto. Consulta nuevamente la planilla.');
    return saved;
  },
  // BACKEND #39: teacher edit of an existing MANUAL grade, with reason and justification.
  async correctGrade(sectionCourseId: number, bimesterId: number, gradeId: number, request: TeacherCorrectCriterionGradeRequest) {
    for (const value of [sectionCourseId, bimesterId, gradeId]) if (!Number.isSafeInteger(value) || value <= 0) throw new Error('La nota seleccionada no es válida.');
    const invalid = gradeCorrectionError(request);
    if (invalid) throw new Error(invalid);
    // The backend request rejects unknown keys: send exactly the structured DTO.
    const body = { grade: request.grade, reasonCode: request.reasonCode, justification: request.justification.trim(), expectedGrade: request.expectedGrade };
    const saved = parseCriterionGradeResponse((await httpClient.patch<unknown>(`${path(sectionCourseId)}/${bimesterId}/criterion-grades/${gradeId}`, body)).data);
    if (saved.id !== gradeId || saved.sectionCourseId !== sectionCourseId || saved.bimesterId !== bimesterId || saved.grade !== request.grade) throw new Error('La corrección respondió con un contexto distinto. Consulta nuevamente la planilla.');
    return saved;
  },
};

/** Client checks mirroring TeacherCorrectManualCriterionGradeRequest and CorrectionJustification. */
export function gradeCorrectionError(request: { grade: number; reasonCode: string; justification: string; expectedGrade: number }): string | null {
  const gradeError = gradeInputError(String(request.grade));
  if (gradeError) return gradeError;
  if (request.grade === request.expectedGrade) return 'La nueva nota debe ser distinta de la nota actual.';
  if (!(GRADE_CORRECTION_REASONS as readonly string[]).includes(request.reasonCode)) return 'Selecciona un motivo.';
  const length = request.justification.trim().length;
  if (length < CORRECTION_JUSTIFICATION_MIN_LENGTH) return `La justificación debe tener al menos ${CORRECTION_JUSTIFICATION_MIN_LENGTH} caracteres.`;
  if (length > CORRECTION_JUSTIFICATION_MAX_LENGTH) return `La justificación admite hasta ${CORRECTION_JUSTIFICATION_MAX_LENGTH} caracteres.`;
  return null;
}

// Codes of PATCH .../criterion-grades/{gradeId} (BimesterPublicationExceptionHandler). 401/403 carry no code.
const correctionStatuses = {
  VALIDATION_ERROR: [400],
  REASON_REQUIRED: [400],
  RESOURCE_NOT_FOUND: [404],
  BIMESTER_STATE_CONFLICT: [409],
  GRADE_WINDOW_EXPIRED: [409],
  GRADE_CHANGED_CONCURRENTLY: [409],
  INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;
export type TeacherGradeCorrectionErrorCode = keyof typeof correctionStatuses;
export const TEACHER_GRADE_CORRECTION_ERROR_CODES = Object.keys(correctionStatuses) as TeacherGradeCorrectionErrorCode[];
export const GRADE_CHANGED_CONCURRENTLY_MESSAGE = 'La nota cambió mientras la editabas. Se recargó la planilla; revisa el valor actual antes de corregir.';

export function teacherGradeCorrectionErrorCode(error: unknown): TeacherGradeCorrectionErrorCode | null {
  return contractErrorCode<TeacherGradeCorrectionErrorCode>(error, correctionStatuses);
}

/** Failures after which the sheet no longer matches what the teacher saw: reload it. */
export function correctionRequiresReload(error: unknown): boolean {
  const code = teacherGradeCorrectionErrorCode(error);
  return code === 'GRADE_CHANGED_CONCURRENTLY' || code === 'GRADE_WINDOW_EXPIRED' || code === 'BIMESTER_STATE_CONFLICT' || code === 'RESOURCE_NOT_FOUND'
    || (isAxiosError(error) && error.response?.status === 404);
}

// Server messages are never echoed.
export function teacherGradeCorrectionErrorMessage(error: unknown): string {
  switch (teacherGradeCorrectionErrorCode(error)) {
    case 'GRADE_WINDOW_EXPIRED': return GRADE_WINDOW_EXPIRED_MESSAGE;
    case 'GRADE_CHANGED_CONCURRENTLY': return GRADE_CHANGED_CONCURRENTLY_MESSAGE;
    case 'BIMESTER_STATE_CONFLICT': return 'El bimestre ya no está Abierto o la corrección no es válida en este contexto. Se recargó la planilla.';
    case 'REASON_REQUIRED': return `Selecciona un motivo y escribe una justificación de ${CORRECTION_JUSTIFICATION_MIN_LENGTH} a ${CORRECTION_JUSTIFICATION_MAX_LENGTH} caracteres.`;
    case 'RESOURCE_NOT_FOUND': return 'La nota ya no está disponible para tu cuenta. Se recargó la planilla.';
  }
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudo corregir la nota.';
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Consulta la planilla antes de volver a intentarlo.';
    case 400: return `Revisa la nota (0 a 20, máximo dos decimales), el motivo y la justificación (${CORRECTION_JUSTIFICATION_MIN_LENGTH} a ${CORRECTION_JUSTIFICATION_MAX_LENGTH} caracteres).`;
    case 401: return 'La sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para corregir notas de este curso.';
    case 404: return 'La nota ya no está disponible para tu cuenta. Se recargó la planilla.';
    default: return 'No se pudo corregir la nota. Consulta la planilla antes de volver a intentarlo.';
  }
}

// BACKEND #39 (docs/grade-window.md): registering or editing MANUAL grades after the deadline.
// The full read-only mode of the sheet belongs to FRONT #51.
export const GRADE_WINDOW_EXPIRED_MESSAGE = 'El plazo para registrar o editar notas de este bimestre venció. Pide al Director que lo amplíe.';

export function teacherGradesErrorMessage(error: unknown): string {
  if (contractErrorCode(error, { GRADE_WINDOW_EXPIRED: [409] }) === 'GRADE_WINDOW_EXPIRED') return GRADE_WINDOW_EXPIRED_MESSAGE;
  if (isAxiosError(error)) {
    const body: unknown = error.response?.data;
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : undefined;
    return manualGradesErrorMessage(error.response?.status, message);
  }
  return error instanceof Error ? error.message : 'No se pudo cargar la planilla.';
}
