// Contrato: docs/guardian-students.md (backend). grade y sectionName son null sin matrícula ACTIVA.
export interface GuardianStudentResponse {
  studentId: number;
  studentCode: string | null;
  fullName: string;
  grade: number | null;
  sectionName: string | null;
}
