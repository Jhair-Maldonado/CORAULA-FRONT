import type { GuardianRelationship, StudentDetailResponse, StudentSummaryResponse } from './studentApi';

export interface AdminStudent extends StudentSummaryResponse {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombreCompleto: string;
  nivelLabel: string | null;
  estadoLabel: string;
  matriculaLabel: string | null;
  tieneMatriculaActiva: boolean;
}

export interface AdminStudentDetail extends AdminStudent {
  personId: number;
  phone: string | null;
  enrollmentDate: string | null;
  guardians: StudentDetailResponse['guardians'];
}

export interface StudentEditValues {
  studentCode: string;
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  phone: string;
  reason: string;
}

export interface StudentCreateValues {
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string;
  birthDate: string;
  phone: string;
}

export interface GuardianCreateValues {
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string;
  phone: string;
  relationship: GuardianRelationship | '';
  primary: boolean;
  authorizedPickup: boolean;
}
