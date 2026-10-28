import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { parseCriterionGradesSheetResponse, parseCriterionGradeResponse } from '@/lib/manualGradesContract';
import { gradeInputError } from '@/lib/manualGrades';
import { parseEvaluationResultsResponse } from '@/lib/evaluationResultsContract';

export type AdminGradeContext = { sectionCourseId: number; courseId: number; academicPeriodId: number; bimesterId: number };
export type GradeCorrection = { grade: number; reason: string; expectedGrade: number };
export type GradeHistory = { id: number; criterionGradeId: number; previousValue: number; newValue: number; reason: string; changedByUserId: number; occurredAt: string };
function id(value: number) { if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Identificador inválido.'); return value; }
export function correctionError(grade: string, reason: string, expectedGrade: number): string | null {
  return gradeInputError(grade) ?? (!reason.trim() ? 'Indica el motivo de la corrección.' : Number(grade) === expectedGrade ? 'La nueva nota debe ser distinta de la actual.' : null);
}
export const adminGradesService = {
  async getSheet(context: AdminGradeContext, signal?: AbortSignal) {
    const response = await httpClient.get<unknown>(`/v1/management/section-courses/${id(context.sectionCourseId)}/bimesters/${id(context.bimesterId)}/criterion-grades`, { signal });
    if (response.status !== 200) throw new Error('Planilla no confirmada.');
    return parseCriterionGradesSheetResponse(response.data, context);
  },
  async getResults(sectionCourseId: number, bimesterId: number, signal?: AbortSignal) {
    const response = await httpClient.get<unknown>(`/v1/management/section-courses/${id(sectionCourseId)}/bimesters/${id(bimesterId)}/results`, { signal });
    if (response.status !== 200) throw new Error('Resultados no confirmados.');
    return parseEvaluationResultsResponse(response.data, { sectionCourseId, bimesterId });
  },
  async correctGrade(gradeId: number, input: GradeCorrection) {
    const error = correctionError(String(input.grade), input.reason, input.expectedGrade) ?? gradeInputError(String(input.expectedGrade));
    if (error) throw new Error(error);
    const response = await httpClient.patch<unknown>(`/v1/management/criterion-grades/${id(gradeId)}`, { grade: input.grade, reason: input.reason.trim(), expectedGrade: input.expectedGrade });
    if (response.status !== 200) throw new Error('Corrección no confirmada.');
    const saved = parseCriterionGradeResponse(response.data);
    if (saved.id !== gradeId || saved.grade !== input.grade) throw new Error('Respuesta de corrección inconsistente.');
    return saved;
  },
  async getHistory(gradeId: number, signal?: AbortSignal): Promise<GradeHistory[]> {
    const response = await httpClient.get<unknown>(`/v1/management/criterion-grades/${id(gradeId)}/history`, { signal });
    if (response.status !== 200 || !Array.isArray(response.data)) throw new Error('Historial no confirmado.');
    const rows = response.data.map((value: unknown): GradeHistory => {
      if (!value || typeof value !== 'object') throw new Error('Historial inválido.');
      const h = value as GradeHistory;
      id(h.id); id(h.changedByUserId);
      if (h.criterionGradeId !== gradeId || typeof h.previousValue !== 'number' || typeof h.newValue !== 'number' || gradeInputError(String(h.previousValue)) || gradeInputError(String(h.newValue)) || typeof h.reason !== 'string' || !h.reason.trim() || typeof h.occurredAt !== 'string' || !Number.isFinite(Date.parse(h.occurredAt))) throw new Error('Historial inválido.');
      return { id: h.id, criterionGradeId: h.criterionGradeId, previousValue: h.previousValue, newValue: h.newValue, reason: h.reason, changedByUserId: h.changedByUserId, occurredAt: h.occurredAt };
    });
    if (new Set(rows.map(h => h.id)).size !== rows.length) throw new Error('Historial duplicado.');
    return rows;
  },
};
export function adminGradesErrorMessage(error: unknown): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  switch (status) {
    case 400: return 'Revisa la nota (0–20, hasta dos decimales), el motivo y el contexto.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para esta operación.';
    case 404: return 'La planilla, nota o contexto ya no está disponible.';
    case 409: return 'Conflicto: la nota o el contexto cambiaron. Se consultará nuevamente la planilla; no se sobrescribirá el cambio.';
    default: return 'La operación no pudo confirmarse. Actualiza la planilla antes de otra corrección.';
  }
}
