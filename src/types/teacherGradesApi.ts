import type { Bimester } from './evaluationApi';

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
}

export interface CreateManualCriterionGradeRequest {
  enrollmentId: number;
  criterionId: number;
  grade: number;
}

export interface CriterionGradeResponse extends CreateManualCriterionGradeRequest {
  id: number;
  sectionCourseId: number;
  bimesterId: number;
  registeredByTeacherId: number;
  registeredAt: string;
  updatedAt: string | null;
}
