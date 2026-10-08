export interface SectionCourseResponse {
  id: number;
  sectionId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  active: boolean;
  teacherId: number | null;
  teacherName: string | null;
}

export interface AddSectionCourseRequest {
  courseId: number;
}
