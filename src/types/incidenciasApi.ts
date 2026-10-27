/**
 * Trazabilidad: RF-21 (DOC-INCIDENCIAS-UI #53 / DOC-INCIDENCIAS #54)
 * Módulo: Docente — Registro y Listado de Incidencias Disciplinarias
 */

export type GravedadIncidencia = 'LEVE' | 'MODERADA' | 'GRAVE';

export type LugarIncidencia =
  | 'AULA'
  | 'PATIO'
  | 'CHAT'
  | 'LABORATORIO'
  | 'PASILLOS'
  | 'ENTRADA_SALIDA';

/**
 * Payload para el registro de incidencia disciplinaria
 * Endpoint previsto: POST /v1/teacher/incidents
 */
export interface RegistrarIncidenciaRequest {
  sectionCourseId: number;
  enrollmentId: number;
  studentId?: number;
  dateTime: string; // ISO-8601 con zona horaria de Lima (ej. 2026-10-26T10:15:00-05:00)
  lugar: string;
  gravedad: GravedadIncidencia;
  descripcion: string; // Obligatorio, longitud 1..1000 caracteres
  accionesTomadas?: string | null;
  evidenceMessageId?: string | null; // ID del mensaje si se origina en /docente/chat
}

/**
 * Respuesta del servidor tras registrar o consultar una incidencia
 */
export interface IncidenciaResponse {
  id: number;
  sectionCourseId: number;
  enrollmentId: number;
  studentName: string;
  studentCode?: string;
  teacherId: number;
  teacherName: string;
  dateTime: string;
  lugar: string;
  gravedad: GravedadIncidencia;
  descripcion: string;
  accionesTomadas?: string | null;
  evidenceMessageId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Filtros para el listado o historial por alumno/sección
 * Endpoint previsto: GET /v1/teacher/incidents?sectionCourseId=:id&enrollmentId=:id&gravedad=:gravedad
 */
export interface IncidenciasFilterQuery {
  sectionCourseId?: number;
  enrollmentId?: number;
  gravedad?: GravedadIncidencia;
  fechaInicio?: string;
  fechaFin?: string;
}
