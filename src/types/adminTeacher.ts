import type { TeacherAccountStatusResponse, TeacherAssignmentResponse, TeacherResponse } from './teacherApi';

export interface AdminTeacher extends Omit<TeacherResponse, 'id'> {
  id: string;
  nombreCompleto: string;
  iniciales: string;
  estadoLabel: string;
}

export interface AdminTeacherDetail extends AdminTeacher {
  assignments: TeacherAssignmentResponse[];
  account: TeacherAccountStatusResponse | null;
}

export interface TeacherFormValues {
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string;
  phone: string;
  specialty: string;
}
