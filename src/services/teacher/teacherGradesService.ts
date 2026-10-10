import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { MANUAL_GRADES_CONTRACT_VERIFIED } from '@/types/teacherGradesApi';
import type { CreateManualCriterionGradeRequest } from '@/types/teacherGradesApi';
import { manualGradesErrorMessage, parseProvisionalBimesters, parseProvisionalRegisteredGrade, parseProvisionalSheet } from '@/lib/manualGradesContract';
import { gradeInputError } from '@/lib/manualGrades';

const path = (sectionCourseId: number) => `/v1/teacher/courses/${sectionCourseId}/bimesters`;

// Pending verification: read consumers target the user-specified N2 routes, but
// their DTO boundary follows the backend proposal. POST remains blocked here too.
export const teacherGradesService = {
  async getBimesters(sectionCourseId: number, signal?: AbortSignal) {
    return parseProvisionalBimesters((await httpClient.get<unknown>(path(sectionCourseId), { signal })).data);
  },
  async getSheet(context: { sectionCourseId: number; courseId: number; bimesterId: number; academicPeriodId: number }, signal?: AbortSignal) {
    return parseProvisionalSheet((await httpClient.get<unknown>(`${path(context.sectionCourseId)}/${context.bimesterId}/criterion-grades`, { signal })).data, context);
  },
  async registerGrade(sectionCourseId: number, bimesterId: number, request: CreateManualCriterionGradeRequest) {
    if (!MANUAL_GRADES_CONTRACT_VERIFIED) throw new Error('El registro real está bloqueado hasta verificar el contrato N2 con backend.');
    const error = gradeInputError(String(request.grade));
    if (error) throw new Error(error);
    // Exactly the proposal's request keys; never send student/teacher IDs or context in body.
    const { enrollmentId, criterionId, grade } = request;
    const saved = parseProvisionalRegisteredGrade((await httpClient.post<unknown>(`${path(sectionCourseId)}/${bimesterId}/criterion-grades`, { enrollmentId, criterionId, grade })).data);
    if (saved.sectionCourseId !== sectionCourseId || saved.bimesterId !== bimesterId || saved.enrollmentId !== enrollmentId || saved.criterionId !== criterionId || saved.grade !== grade) throw new Error('El registro respondió con un contexto distinto. Consulta nuevamente la planilla.');
    return saved;
  },
};

export function teacherGradesErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const body: unknown = error.response?.data;
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' ? body.message : undefined;
    return manualGradesErrorMessage(error.response?.status, message);
  }
  return error instanceof Error ? error.message : 'No se pudo cargar la planilla.';
}
