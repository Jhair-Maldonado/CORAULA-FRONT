import { isAxiosError } from 'axios';
import { APPROVAL_THRESHOLD, type EvaluationResultReason, type EvaluationResultRow, type EvaluationResultsResponse } from '../types/evaluationResultsApi';

// Boundary validation for the #45 results DTO. No default row or grade is synthesized:
// null stays pending, zero stays a grade, and any inconsistency rejects the whole response.
function invalid(): never { throw new Error('La respuesta de resultados no coincide con el contrato #45 documentado.'); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function id(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid();
  return value;
}
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return invalid(); return value; }
function scaled(value: unknown, decimals: number): number | null {
  if (value === null) return null;
  const factor = 10 ** decimals;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 20 || Math.abs(value * factor - Math.round(value * factor)) > 1e-8) return invalid();
  return value;
}
function approval(grade: number | null, approved: unknown): boolean | null {
  if (grade === null) return approved === null ? null : invalid();
  if (typeof approved !== 'boolean' || approved !== grade >= APPROVAL_THRESHOLD) return invalid();
  return approved;
}
const courseReasons = ['INSUFFICIENT_MANUAL_CRITERIA', 'INVALID_PA_CRITERION_COUNT', 'PA_UNAVAILABLE'];
function reason(value: unknown): EvaluationResultReason {
  if (typeof value !== 'string') return invalid();
  if (courseReasons.includes(value) || value === 'AREA_INCOMPLETE') return value as EvaluationResultReason;
  const missing = /^MISSING_MANUAL_GRADE:([1-9]\d*)$/.exec(value);
  if (missing && Number.isSafeInteger(Number(missing[1]))) return value as EvaluationResultReason;
  return invalid();
}

export function parseEvaluationResultsResponse(value: unknown, expected: { sectionCourseId: number; bimesterId: number }): EvaluationResultsResponse {
  const s = object(value);
  const sectionCourseId = id(s.sectionCourseId), bimesterId = id(s.bimesterId);
  const areaId = s.areaId === null ? null : id(s.areaId);
  if (sectionCourseId !== expected.sectionCourseId || bimesterId !== expected.bimesterId || !Array.isArray(s.students)) return invalid();
  const students = s.students.map((value): EvaluationResultRow => {
    const r = object(value);
    // Evidence is validated as present but not kept: the UI shows grades, not source detail.
    object(r.courseEvidence); object(r.areaEvidence);
    if (!Array.isArray(r.reasons)) return invalid();
    const reasons = r.reasons.map(reason);
    if (new Set(reasons).size !== reasons.length) return invalid();
    const pa = scaled(r.pa, 1), criteriaIndicator = scaled(r.criteriaIndicator, 2);
    const courseGrade = scaled(r.courseGrade, 0), areaGrade = scaled(r.areaGrade, 0);
    const courseBlocked = reasons.some(x => x !== 'AREA_INCOMPLETE');
    const missingManual = reasons.some(x => x.startsWith('MISSING_MANUAL_GRADE:'));
    // Invariants of the backend calculator: a course grade exists iff no course reason applies,
    // the area needs this course, PA is null iff m=0, and the indicator is null with missing MANUAL grades.
    if ((courseGrade === null) !== courseBlocked
      || (areaGrade === null) !== reasons.includes('AREA_INCOMPLETE')
      || (courseGrade === null && areaGrade !== null)
      || (areaId === null && areaGrade !== null)
      || (pa === null) !== reasons.includes('PA_UNAVAILABLE')
      || (missingManual && criteriaIndicator !== null)
      || (criteriaIndicator === null && !missingManual && !reasons.includes('INSUFFICIENT_MANUAL_CRITERIA'))) return invalid();
    return {
      enrollmentId: id(r.enrollmentId), studentId: id(r.studentId), fullName: text(r.fullName),
      pa, criteriaIndicator, courseGrade, courseApproved: approval(courseGrade, r.courseApproved),
      areaGrade, areaApproved: approval(areaGrade, r.areaApproved), reasons,
    };
  });
  if (new Set(students.map(x => x.enrollmentId)).size !== students.length) return invalid();
  return { sectionCourseId, bimesterId, areaId, students };
}

export function evaluationResultReasonLabel(reason: EvaluationResultReason, criterionName?: (criterionId: number) => string | undefined): string {
  if (reason.startsWith('MISSING_MANUAL_GRADE:')) {
    const criterionId = Number(reason.slice('MISSING_MANUAL_GRADE:'.length));
    const name = criterionName?.(criterionId);
    return name ? `Falta la nota MANUAL de «${name}»` : `Falta una nota MANUAL (criterio #${criterionId})`;
  }
  switch (reason) {
    case 'INSUFFICIENT_MANUAL_CRITERIA': return 'El curso tiene menos de 5 criterios MANUAL activos';
    case 'INVALID_PA_CRITERION_COUNT': return 'El curso no tiene exactamente un criterio de participación académica activo';
    case 'PA_UNAVAILABLE': return 'Sin actividades que cuenten para PA';
    case 'AREA_INCOMPLETE': return 'El área aún no tiene resultado: falta la nota de algún curso';
    default: return reason;
  }
}

// Server messages are not echoed: a 404 must not reveal whether a foreign context exists.
export function evaluationResultsErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudieron consultar los resultados del bimestre.';
  switch (error.response?.status) {
    case 400: return 'El curso o bimestre seleccionado no es válido.';
    case 401: return 'La sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para consultar los resultados de este curso.';
    case 404: return 'Los resultados no están disponibles para este curso y bimestre.';
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    default: return 'No se pudieron consultar los resultados del bimestre.';
  }
}
