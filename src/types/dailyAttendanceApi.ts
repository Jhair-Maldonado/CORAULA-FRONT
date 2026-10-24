export type DailyAttendanceStatus = 'NO_SESSIONS' | 'NO_ENROLLMENTS' | 'PENDING' | 'PARTIAL' | 'COMPLETE';

// GET /v1/management/attendance/daily (BACK #44). Every figure is shown as received; nothing is recalculated.
export interface DailyAttendanceIndicator {
  date: string;
  academicPeriodId: number;
  sectionId: number | null;
  status: DailyAttendanceStatus;
  scheduledSections: number;
  sectionsWithoutSessions: number;
  sectionsWithConflictingFirstSession: number;
  expectedStudents: number;
  present: number;
  late: number;
  absent: number;
  unrecorded: number;
  // null for NO_SESSIONS, NO_ENROLLMENTS and PENDING; provisional for PARTIAL.
  attendancePercentage: number | null;
}

export interface DailyAttendanceParams {
  academicPeriodId: number;
  date?: string;
  sectionId?: number;
}
