export interface VacancyGradeResponse {
  academicPeriodId: number;
  level: 'PRIMARY' | 'SECONDARY';
  grade: number;
  totalCapacity: number;
  activeEnrollmentCount: number;
  availableVacancies: number;
  sections: VacancySectionResponse[];
}

export interface VacancySectionResponse {
  sectionId: number;
  sectionName: string;
  maxCapacity: number;
  activeEnrollmentCount: number;
  availableVacancies: number;
  enrollmentOpen: boolean;
  active: boolean;
}

export interface UpdateVacancySectionRequest {
  enrollmentOpen: boolean;
}

export interface UpdateVacancySectionResponse {
  sectionId: number;
  enrollmentOpen: boolean;
}
