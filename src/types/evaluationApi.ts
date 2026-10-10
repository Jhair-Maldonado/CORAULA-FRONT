export interface EvaluationCriterion {
  id: number;
  courseId: number;
  academicPeriodId: number;
  name: string;
  description: string | null;
  order: number;
  type: 'MANUAL' | 'PARTICIPACION_ACADEMICA';
  active: boolean;
}
export interface EvaluationConfiguration {
  courseId: number;
  academicPeriodId: number;
  criteria: EvaluationCriterion[];
  activeManualCriteriaCount: number;
  hasActiveParticipationCriterion: boolean;
}
export type CreateEvaluationCriterionInput = Pick<EvaluationCriterion, 'academicPeriodId' | 'name' | 'description' | 'order' | 'type'>;
// Type, course and academic period are immutable on PATCH.
export type UpdateEvaluationCriterionInput = Partial<Pick<EvaluationCriterion, 'name' | 'description' | 'order' | 'active'>>;
export interface Bimester {
  id: number;
  academicPeriodId: number;
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  status: 'PLANIFICADO' | 'ABIERTO' | 'EN_REVISION' | 'CERRADO';
}
export type BimesterInput = Pick<Bimester, 'number' | 'name' | 'startDate' | 'endDate'>;
export interface EvaluationStudentRow {
  enrollmentId: number;
  studentId: number;
  fullName: string;
  grades: Record<number, number | null>;
  gradeIds?: Record<number, number | null>;
  pa: number | null;
}

// Frontend preparation contract, not a backend response or persistence endpoint.
export interface TeacherEvaluationData {
  sectionCourseId: number;
  bimesterId: number;
  configuration: EvaluationConfiguration;
  records: EvaluationStudentRow[];
}

export interface TeacherEvaluationSelection {
  sectionCourseId: number;
  courseId: number;
  sectionId: number;
  bimesterId: number | null;
  academicPeriodId: number | null;
}
