import type { Bimester } from './evaluationApi';
import type { GradeWindow } from './gradeWindowApi';

// Shapes match the backend response records in docs/manual-grades-n2.md.
// HTTP consumer verified by backend PR #25 at f44a096 (isolated PostgreSQL CI).
// Browser session/UI E2E remains a separate verification.
export const MANUAL_GRADES_CONTRACT_VERIFIED: boolean = true;

export interface CriterionGradeCell {
  criterionId: number;
  gradeId: number | null;
  grade: number | null;
  registeredAt: string | null;
  updatedAt: string | null;
}

export interface CriterionGradesSheetResponse {
  courseId: number;
  sectionCourseId: number;
  academicPeriodId: number;
  bimester: Bimester;
  criteria: {
    id: number;
    courseId: number;
    academicPeriodId: number;
    name: string;
    description: string | null;
    order: number;
    type: 'MANUAL' | 'PARTICIPACION_ACADEMICA';
    active: boolean;
  }[];
  students: {
    enrollmentId: number;
    studentId: number;
    fullName: string;
    grades: CriterionGradeCell[];
  }[];
  /** BACKEND #39: MANUAL registration window of the bimester; null only when the response omits it. */
  gradeWindow?: GradeWindow | null;
}

export interface CreateManualCriterionGradeRequest {
  enrollmentId: number;
  criterionId: number;
  grade: number;
}

// BACKEND #39 (docs/grade-window.md): PATCH /teacher/courses/{sc}/bimesters/{b}/criterion-grades/{gradeId}.
// Structured body only; the legacy `reason` field is never sent.
export const GRADE_CORRECTION_REASONS = ['TYPING_ERROR', 'WRONG_STUDENT', 'WRONG_CRITERION', 'REVIEW_REQUESTED', 'LATE_EVALUATION', 'OTHER'] as const;
export type GradeCorrectionReason = typeof GRADE_CORRECTION_REASONS[number];
/** Labels of the backend enum GradeCorrectionReason. */
export const gradeCorrectionReasonLabels: Record<GradeCorrectionReason, string> = {
  TYPING_ERROR: 'Error de digitación',
  WRONG_STUDENT: 'Nota registrada a otro estudiante',
  WRONG_CRITERION: 'La nota no corresponde al criterio',
  REVIEW_REQUESTED: 'Revisión solicitada',
  LATE_EVALUATION: 'Evaluación rendida posteriormente',
  OTHER: 'Otro',
};
/** CorrectionJustification.MIN_LENGTH / MAX_LENGTH, measured after trim. */
export const CORRECTION_JUSTIFICATION_MIN_LENGTH = 20;
export const CORRECTION_JUSTIFICATION_MAX_LENGTH = 1000;

export interface TeacherCorrectCriterionGradeRequest {
  grade: number;
  reasonCode: GradeCorrectionReason;
  justification: string;
  /** The grade read from the sheet: the backend rejects the change if it no longer matches. */
  expectedGrade: number;
}

export interface CriterionGradeResponse extends CreateManualCriterionGradeRequest {
  id: number;
  sectionCourseId: number;
  bimesterId: number;
  registeredByTeacherId: number;
  registeredAt: string;
  updatedAt: string | null;
}
