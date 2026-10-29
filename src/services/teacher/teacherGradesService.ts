import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { MANUAL_GRADES_CONTRACT_VERIFIED } from '@/types/teacherGradesApi';
import type { CreateManualCriterionGradeRequest } from '@/types/teacherGradesApi';
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
};

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
