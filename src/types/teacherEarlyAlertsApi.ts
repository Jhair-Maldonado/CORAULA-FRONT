// Backend #52 (docs/early-warnings.md): GET /teacher/courses/{sectionCourseId}/bimesters/{bimesterId}/early-alerts.
// Names and PA are the values recorded at detection; a later improvement does not remove the alert.
export interface EarlyWarning {
  alertId: number;
  enrollmentId: number;
  sectionCourseId: number;
  bimesterId: number;
  studentId: number;
  studentCode: string | null;
  fullName: string;
  courseName: string;
  sectionName: string;
  /** Accumulated PA at detection, one decimal, below 11.0. */
  paAtDetection: number;
  activityCount: number;
  /** YYYY-MM-DD in America/Lima. */
  evaluatedOn: string;
  detectedAt: string;
}

export interface EarlyWarningsPage {
  content: EarlyWarning[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
