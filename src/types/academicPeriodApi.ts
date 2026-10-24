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
