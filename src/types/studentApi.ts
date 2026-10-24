export type StudentLevel = 'PRIMARY' | 'SECONDARY';
export type StudentStatus = 'ACTIVE' | 'WITHDRAWN' | 'GRADUATED';
export type EnrollmentStatus = 'ACTIVE' | 'WITHDRAWN' | 'COMPLETED';
export type GuardianRelationship = 'FATHER' | 'MOTHER' | 'TUTOR' | 'GUARDIAN' | 'OTHER';

export interface StudentSummaryResponse {
  studentId: number;
  studentCode: string | null;
  dni: string | null;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string | null;
  birthDate: string | null;
  studentStatus: StudentStatus;
  enrollmentId: number | null;
  enrollmentStatus: EnrollmentStatus | null;
  academicPeriodId: number | null;
  academicPeriodName: string | null;
  sectionId: number | null;
  level: StudentLevel | null;
  grade: number | null;
  sectionName: string | null;
}

export interface GuardianSummaryResponse {
  guardianId: number;
  personId: number;
  dni: string | null;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string | null;
  phone: string | null;
  relationship: GuardianRelationship;
  primary: boolean;
  authorizedPickup: boolean;
  active: boolean;
}

export interface StudentDetailResponse extends StudentSummaryResponse {
  personId: number;
  phone: string | null;
  enrollmentDate: string | null;
  guardians: GuardianSummaryResponse[];
}

export interface StudentListParams {
  search?: string;
  level?: StudentLevel;
  grade?: number;
  sectionId?: number;
  status?: StudentStatus;
  page?: number;
  size?: number;
}

export interface PagedStudentsResponse {
  content: StudentSummaryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UpdateStudentRequest {
  studentCode?: string | null;
  dni?: string | null;
  firstNames?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  reason?: string | null;
}
