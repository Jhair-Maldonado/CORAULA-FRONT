export interface TeacherCourseSummaryResponse {
  sectionCourseId: number;
  assignmentId: number;
  courseId: number;
  code: string;
  name: string;
  level: 'PRIMARY' | 'SECONDARY';
  area: string;
  weeklyHours: number;
  sectionId: number;
  grade: number;
  sectionName: string;
  studentCount: number;
}

export interface TeacherCourseDetailResponse extends TeacherCourseSummaryResponse {
  description: string | null;
}

export interface TeacherCourseStudentResponse {
  studentId: number;
  studentCode: string | null;
  fullName: string;
  enrollmentId: number;
}
