// Shapes match the backend #45 read contract in docs/evaluation-results.md
// (GET .../bimesters/{bimesterId}/results, teacher and management routes).
// Results are calculated from sources on every read; they are not a published revision (#51).

export const APPROVAL_THRESHOLD = 11;

export type EvaluationResultReason =
  | 'INSUFFICIENT_MANUAL_CRITERIA'
  | 'INVALID_PA_CRITERION_COUNT'
  | `MISSING_MANUAL_GRADE:${number}`
  | 'PA_UNAVAILABLE'
  | 'AREA_INCOMPLETE';

export interface EvaluationResultRow {
  enrollmentId: number;
  studentId: number;
  fullName: string;
  /** H_1(S_actividades/m); null when there are no eligible activities (m=0). */
  pa: number | null;
  /** Informative H_2 average of MANUAL criteria; never a substitute for completeness. */
  criteriaIndicator: number | null;
  /** Final integer course grade; null when no publishable result exists. */
  courseGrade: number | null;
  courseApproved: boolean | null;
  areaGrade: number | null;
  areaApproved: boolean | null;
  reasons: EvaluationResultReason[];
}

export interface EvaluationResultsResponse {
  sectionCourseId: number;
  bimesterId: number;
  areaId: number | null;
  students: EvaluationResultRow[];
}
