/**
 * Trazabilidad: RF-21 (DOC-INCIDENCIAS-UI #53 / DOC-INCIDENCIAS #54)
 * Módulo: Docente — Registro y Listado de Incidencias Disciplinarias
 * Contrato: docs/teacher-incidents.md del backend — /api/v1/teacher/incidents (rol DOCENTE)
 */

export type GravedadIncidencia = 'LEVE' | 'MODERADA' | 'GRAVE';

export const GRAVEDADES_INCIDENCIA: readonly GravedadIncidencia[] = ['LEVE', 'MODERADA', 'GRAVE'];

export const INCIDENT_LOCATION_MAX = 120;
export const INCIDENT_TEXT_MAX = 1000;

/** POST /v1/teacher/incidents. El estudiante y la sección se derivan de la matrícula. */
export interface RegistrarIncidenciaRequest {
  sectionCourseId: number;
  enrollmentId: number;
  occurredAt: string; // ISO-8601 con offset obligatorio (ej. 2026-10-05T09:30:00-05:00)
  location: string; // Texto libre, 1..120 caracteres
  severity: GravedadIncidencia;
  description: string; // 1..1000 caracteres
  actionsTaken: string | null; // Opcional, hasta 1000 caracteres
}

/** IncidentView. Fechas en UTC ISO-8601 (`Z`). */
export interface IncidenciaResponse {
  id: number;
  sectionCourseId: number;
  sectionId: number;
  enrollmentId: number;
  studentId: number;
  studentName: string;
  studentCode: string | null;
  teacherId: number;
  teacherName: string;
  occurredAt: string;
  location: string;
  severity: GravedadIncidencia;
  description: string;
  actionsTaken: string | null;
  createdAt: string;
}

/** GET /v1/teacher/incidents. Fechas YYYY-MM-DD inclusivas en America/Lima; page base 0; size 1..100. */
export interface IncidenciasFilterQuery {
  severity?: GravedadIncidencia;
  sectionId?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export interface IncidenciasPage {
  content: IncidenciaResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
