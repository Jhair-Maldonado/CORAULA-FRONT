export type SchoolDay = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES';

export interface ScheduleResponse {
  id: number;
  sectionCourseId: number;
  sectionId: number;
  courseId: number;
  courseName: string;
  teacherId: number | null;
  teacherName: string | null;
  day: SchoolDay;
  startTime: string;
  endTime: string;
  classroom: string | null;
}

export interface CreateScheduleRequest {
  sectionCourseId: number;
  day: SchoolDay;
  startTime: string;
  endTime: string;
  classroom?: string | null;
}

export interface UpdateScheduleRequest {
  day?: SchoolDay | null;
  startTime?: string | null;
  endTime?: string | null;
  classroom?: string | null;
}
