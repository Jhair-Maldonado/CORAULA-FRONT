import type { Bimester, EvaluationCriterion } from './evaluationApi';

// PROVISIONAL: docs/manual-grades-n2-design.md is a proposal, not approved DTOs.
// Verify these exact shapes with backend before enabling any real write.
export const MANUAL_GRADES_CONTRACT_VERIFIED: boolean = false;

export interface ProvisionalGradeCell {
  criterionId: number;
  gradeId: number | null;
  grade: number | null;
  registeredAt: string | null;
  updatedAt: string | null;
}

export interface ProvisionalCriterionGradesSheetResponse {
  courseId: number;
  sectionCourseId: number;
  academicPeriodId: number;
  bimester: Bimester;
  criteria: Pick<EvaluationCriterion, 'id' | 'name' | 'order' | 'type' | 'active'>[];
  students: {
    enrollmentId: number;
    studentId: number;
    fullName: string;
    grades: ProvisionalGradeCell[];
  }[];
}

export interface CreateManualCriterionGradeRequest {
  enrollmentId: number;
  criterionId: number;
  grade: number;
}

export interface ProvisionalCriterionGradeResponse extends CreateManualCriterionGradeRequest {
  id: number;
  sectionCourseId: number;
  bimesterId: number;
  registeredByTeacherId: number;
  registeredAt: string;
  updatedAt: string | null;
}
