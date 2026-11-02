// Shapes match the backend #102 contract in docs/management-activity-reading.md
// (GET /management/section-courses/{sc}/bimesters/{b}/activities and .../{activityId}/grades)
// and the #50 Director routes in docs/teacher-activity-grades.md
// (PATCH /management/activity-grades/{gradeId} and GET .../{gradeId}/history).
// Management rows carry no PA: it is read from the #45 results.
import type { Bimester } from './evaluationApi';
import type { AcademicActivity } from './teacherActivitiesApi';

export interface ManagementActivityGradesRow {
  enrollmentId: number;
  studentId: number;
  studentCode: string | null;
  fullName: string;
  /** null when there is no grade: such a row is not correctable. An explicit 0 keeps its identity. */
  gradeId: number | null;
  grade: number | null;
  version: number | null;
  /** Original registering teacher, kept after corrections; the name is the person's current one. */
  registeredByTeacherId: number | null;
  registeredByTeacherName: string | null;
  registeredAt: string | null;
  updatedAt: string | null;
}

export interface ManagementActivityGradesSheet {
  activity: AcademicActivity;
  bimester: Bimester;
  /** Active enrollments of the section and period, ordered by fullName and enrollmentId. */
  students: ManagementActivityGradesRow[];
}

// PATCH body: enrollmentId must match the grade; expectedVersion is the row's version.
export interface CorrectActivityGradeRequest {
  enrollmentId: number;
  grade: number;
  expectedVersion: number;
  reason: string;
}

export interface ActivityGradeHistoryEntry {
  id: number;
  gradeId: number;
  /** null for the initial registration (version 0 → 1). */
  previousGrade: number | null;
  newGrade: number;
  actorId: number;
  /** null for the initial registration; mandatory for corrections. */
  reason: string | null;
  changedAt: string;
  previousVersion: number;
  newVersion: number;
}
