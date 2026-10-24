export interface TeacherMeResponse {
  id: number;
  personId: number;
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string | null;
  fullName: string;
  phone: string | null;
  specialty: string | null;
  active: boolean;
}
