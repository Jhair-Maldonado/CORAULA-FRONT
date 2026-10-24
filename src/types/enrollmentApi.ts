import type { EnrollmentStatus, StudentLevel } from './studentApi';

export interface WithdrawEnrollmentRequest {
  withdrawalDate: string;
  withdrawalReason: string;
}

export interface EnrollmentDetailResponse {
  enrollmentId: number;
  studentId: number;
  academicPeriodId: number;
  academicPeriodName: string;
  sectionId: number;
  level: StudentLevel;
  grade: number;
  sectionName: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  withdrawalDate: string | null;
  withdrawalReason: string | null;
}
