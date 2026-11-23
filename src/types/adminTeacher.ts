import type { TeacherAccountResponse, TeacherAccountStatusResponse, TeacherAssignmentResponse, TeacherResponse } from './teacherApi';
import type { AccountStateAction as StaffAccountStateAction, ChangeAccountStateRequest as StaffChangeAccountStateRequest } from './staffAccountApi';

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

// Alias para la vista: el perfil no importa de archivos *Api.ts (R2).
export type TeacherAccountCreated = TeacherAccountResponse;
export type TeacherAccountStateAction = StaffAccountStateAction;
export type TeacherAccountStateRequest = StaffChangeAccountStateRequest;

/** Grado y sección ya legibles de una sección; nunca contiene identificadores. */
export interface SectionLabel {
  nivelGrado: string;
  seccion: string;
}

/** Fila de asignación lista para mostrar: sin IDs ni fechas ISO. */
export interface TeacherAssignmentRow {
  id: number;
  curso: string;
  nivelGrado: string | null;
  seccion: string;
  asignadoEl: string;
  /** Solo para el atributo dateTime de <time>; nunca se muestra. */
  asignadoElIso: string | null;
  activa: boolean;
  estadoLabel: 'Activa' | 'Inactiva';
}
