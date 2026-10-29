import type { Bimester } from '@/types/evaluationApi';

export const ACADEMIC_ACTIVITY_TYPES = ['TAREA', 'PRACTICA', 'EXAMEN', 'PROYECTO'] as const;
export type AcademicActivityType = typeof ACADEMIC_ACTIVITY_TYPES[number];
export const ACADEMIC_ACTIVITY_STATUSES = ['PLANIFICADA', 'PUBLICADA', 'ANULADA'] as const;
export type AcademicActivityStatus = typeof ACADEMIC_ACTIVITY_STATUSES[number];
export const academicActivityStatusLabels: Record<AcademicActivityStatus, string> = { PLANIFICADA: 'Planificada', PUBLICADA: 'Publicada', ANULADA: 'Anulada' };
export type ActivityContext = { sectionCourseId: number; bimesterId: number };
export type CreateAcademicActivityRequest = {
  title: string;
  description: string | null;
  type: AcademicActivityType;
  cuentaParaPa: boolean;
};
export type UpdateAcademicActivityRequest = Partial<CreateAcademicActivityRequest>;
export type AcademicActivity = CreateAcademicActivityRequest & ActivityContext & {
  id: number;
  createdByTeacherId: number;
  status: AcademicActivityStatus;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  annulledAt: string | null;
  annulledByUserId: number | null;
  annulmentReason: string | null;
};

// BACK #50 (docs/teacher-activity-grades.md): grade is null when absent, distinct from 0.
export type ActivityGrade = {
  id: number;
  activityId: number;
  enrollmentId: number;
  grade: number;
  registeredByTeacherId: number;
  registeredAt: string;
  updatedAt: string | null;
  version: number;
};
export type ActivityGradesSheetRow = {
  enrollmentId: number;
  studentId: number;
  fullName: string;
  eligibleForPa: boolean;
  grade: ActivityGrade | null;
  pa: number | null;
  assignedActivities: number;
  gradedActivities: number;
};
export type ActivityGradesSheet = { activity: AcademicActivity; bimester: Bimester; students: ActivityGradesSheetRow[] };
// expectedVersion null requires no existing grade; reason is mandatory for corrections.
export type SaveActivityGradeEntry = { enrollmentId: number; grade: number; expectedVersion: number | null; reason?: string };
