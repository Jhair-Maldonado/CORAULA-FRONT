/**
 * Tipos e interfaces para el Módulo de Estudiantes Vinculados al Apoderado
 * Trazabilidad: RF-26 (APOD-HIJO-FRONT | BACK #33 | BACK #96 | Sprint 7)
 * Contrato Oficial: docs/guardian-students.md
 * Endpoint: GET /api/v1/guardian/students
 */

export interface VinculoEstudiante {
  studentId: string | number;
  studentCode: string;
  fullName: string;
  grade: string;
  sectionName: string;
}

export interface ApodEstudiantesError {
  status?: number;
  code?: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NO_ACTIVE_LINK' | string;
  message: string;
}

export interface UseApodEstudiantesResult {
  estudiantes: VinculoEstudiante[];
  selectedStudent: VinculoEstudiante | null;
  selectedStudentId: string | number | null;
  setSelectedStudentId: (id: string | number) => void;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  isEmpty: boolean;
  refetch: () => Promise<void>;
}
