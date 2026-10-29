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

// Persisted login account linked to the teacher; `active` is the user state, independent of the teacher's.
export interface TeacherAccountStatusResponse {
  userId: number;
  email: string;
  active: boolean;
}

export interface TeacherDetailResponse extends TeacherResponse {
  assignments: TeacherAssignmentResponse[];
  account: TeacherAccountStatusResponse | null;
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

export interface CreateTeacherAccountRequest {
  email: string;
}

export interface TeacherAccountResponse {
  userId: number;
  teacherId: number;
  email: string;
  role: 'DOCENTE';
  created: boolean;
}
