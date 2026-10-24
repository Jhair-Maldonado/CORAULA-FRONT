export type SectionLevel = 'PRIMARY' | 'SECONDARY';

export interface SectionResponse {
  id: number;
  academicPeriodId: number;
  level: SectionLevel;
  grade: number;
  name: string;
  maxCapacity: number;
  enrollmentOpen: boolean;
  active: boolean;
}

export interface SectionListParams {
  academicPeriodId?: number;
  level?: SectionLevel;
  grade?: number;
  active?: boolean;
}

export interface CreateSectionRequest {
  academicPeriodId: number;
  level: SectionLevel;
  grade: number;
  name: string;
  maxCapacity: number;
  enrollmentOpen: boolean;
}

// PATCH rejects {} and explicit nulls: send only the changed fields.
export type UpdateSectionRequest = Partial<CreateSectionRequest>;

// State changes travel alone; confirmActiveEnrollments is only accepted with active=false.
export type SectionStatusRequest = { active: false; confirmActiveEnrollments?: boolean } | { active: true };
