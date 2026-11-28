import type { StudentLevel } from './studentApi';

/**
 * Respuesta de `GET /api/v1/student/me` (StudentProfileView del backend): perfil del estudiante de la sesión.
 * La identidad sale del JWT, nunca de un id enviado por el cliente.
 */
export interface StudentMeResponse {
  studentId: number;
  studentCode: string;
  fullName: string;
  academicPeriodId: number;
  academicPeriodName: string;
  sectionId: number;
  sectionName: string;
  level: StudentLevel;
  grade: number;
}
