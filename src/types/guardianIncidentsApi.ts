// Contrato: docs/guardian-incidents.md (#117). GET /v1/guardian/students/{studentId}/incidents?from&to&page&size
export type GuardianIncidentSeverity = 'LEVE' | 'MODERADA' | 'GRAVE';

export interface GuardianIncident {
  id: number;
  /** ISO-8601 UTC. */
  occurredAt: string;
  severity: GuardianIncidentSeverity;
  /** Escrita por el docente y visible para el apoderado. */
  description: string;
  courseName: string;
}

export interface GuardianIncidentsPage {
  content: GuardianIncident[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
