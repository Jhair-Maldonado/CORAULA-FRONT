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
