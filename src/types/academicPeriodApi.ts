export interface AcademicPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
  current: boolean;
}

export interface CreateAcademicPeriodRequest {
  name: string;
  startDate: string;
  endDate: string;
}

// PATCH rejects {} and explicit nulls: send only the changed fields.
export type UpdateAcademicPeriodRequest = Partial<CreateAcademicPeriodRequest>;

// BACK #88 (docs/academic-period-activation.md): POST /{id}/deactivate | /{id}/reactivate, ADMINISTRADOR only.
export type AcademicPeriodActivationAction = 'deactivate' | 'reactivate';

export interface AcademicPeriodActivationRequest {
  reason: string;
}

export type AcademicPeriodDependencyType = 'ACTIVE_ENROLLMENTS' | 'ACTIVE_SECTIONS' | 'ACTIVE_SECTION_COURSES' | 'OPEN_BIMESTERS' | 'REVIEW_BIMESTERS';

// One entry of the ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES details: count is the total, ids holds up to 20.
export interface AcademicPeriodDependency {
  type: AcademicPeriodDependencyType;
  count: number;
  ids: number[];
  truncated: boolean;
}
