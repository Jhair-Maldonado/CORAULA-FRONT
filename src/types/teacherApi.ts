export interface TeacherResponse {
  id: number;
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string | null;
  fullName: string;
  phone: string | null;
  specialty: string | null;
  active: boolean;
}

export interface TeacherAssignmentResponse {
  id: number;
  teacherId: number;
  sectionCourseId: number;
  sectionId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  assignedAt: string;
  active: boolean;
}

export interface TeacherDetailResponse extends TeacherResponse {
  assignments: TeacherAssignmentResponse[];
}

export interface TeacherListParams {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
}

export interface PagedTeachersResponse {
  content: TeacherResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CreateTeacherRequest {
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string | null;
  phone: string | null;
  specialty: string | null;
}

export type UpdateTeacherRequest = {
  [K in keyof CreateTeacherRequest]?: CreateTeacherRequest[K] | null;
} & { active?: boolean | null };
