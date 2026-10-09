export type TeacherAttendanceStatus = 'PRESENTE' | 'TARDANZA' | 'INASISTENCIA';

export interface TeacherAttendanceResponse {
  sectionCourseId: number;
  courseName: string;
  grade: number;
  sectionName: string;
  date: string;
  sessions: TeacherAttendanceSessionResponse[];
}

export interface TeacherAttendanceSessionResponse {
  scheduleId: number;
  startTime: string;
  endTime: string;
  classroom: string | null;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absenceCount: number;
  pendingCount: number;
  students: TeacherAttendanceStudentResponse[];
}

export interface TeacherAttendanceStudentResponse {
  enrollmentId: number;
  studentId: number;
  studentCode: string | null;
  fullName: string;
  attendanceId: number | null;
  status: TeacherAttendanceStatus | null;
}

export interface SaveTeacherAttendanceRequest {
  records: { enrollmentId: number; status: TeacherAttendanceStatus }[];
}
