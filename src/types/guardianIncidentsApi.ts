// Contrato: docs/guardian-incidents.md (#117). GET /v1/guardian/students/{studentId}/incidents?from&to&page&size
export type GuardianIncidentSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';
export type GuardianIncidentSeverityFilter = 'TODAS' | GuardianIncidentSeverity;

/** DTO devuelto directamente por el backend. */
export interface GuardianIncidentBackendDto {
  id: number;
  /** ISO-8601 UTC. */
  occurredAt: string;
  severity: GuardianIncidentSeverity;
  /** Escrita por el docente y visible para el apoderado. */
  description: string;
  courseName: string;
  /** Docente que reportó la incidencia, si el backend lo expone. */
  teacherName?: string | null;
  /** Estudiante asociado en consultas agregadas, si el backend lo expone. */
  studentName?: string | null;
}

export interface GuardianIncidentsBackendPageDto {
  content: GuardianIncidentBackendDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Modelo enriquecido para la vista del apoderado. */
export interface GuardianIncident {
  id: number;
  /** ISO-8601 UTC. */
  occurredAt: string;
  severity: GuardianIncidentSeverity;
  /** Escrita por el docente y visible para el apoderado. */
  description: string;
  courseName: string;
  /** Nombre del docente si está disponible. */
  teacherName?: string | null;
  /** ID o nombre del estudiante, útil al consultar todos los hijos. */
  studentId?: string | number;
  studentName?: string | null;
}

export interface GuardianIncidentsPage {
  content: GuardianIncident[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
