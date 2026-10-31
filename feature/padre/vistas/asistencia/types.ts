/**
 * Tipos e interfaces para el Módulo de Asistencia del Apoderado
 * Trazabilidad: RF-26 (APOD-ASISTENCIA-UI | BACK #55 | PR #112 | Sprint 7)
 * Contrato: docs/guardian-attendance.md
 * Endpoint: GET /api/v1/guardian/students/{studentId}/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

export type EstadoSesionAsistencia =
  | 'PRESENTE'
  | 'TARDANZA'
  | 'INASISTENCIA'
  | 'FALTA_JUSTIFICADA'
  | 'FALTA_INJUSTIFICADA';

export type EstadoJustificacionAsistencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface JustificacionSesion {
  id?: string | number;
  status: EstadoJustificacionAsistencia;
  motivo?: string;
  observacion?: string;
}

export interface AttendanceSummary {
  total: number;
  presentes: number;
  tardanzas: number;
  inasistencias: number;
}

export interface AttendanceRecord {
  id: string | number;
  fecha: string; // YYYY-MM-DD
  curso: string;
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  estado: EstadoSesionAsistencia;
  justification: JustificacionSesion | null;
}

export interface AttendanceResponse {
  summary: AttendanceSummary;
  records: AttendanceRecord[];
}

export interface AttendanceDayGroup {
  fecha: string; // YYYY-MM-DD
  diaSemana: string; // "Lunes", "Martes", etc.
  fechaFormateada: string; // "15 de Mayo, 2026"
  sesiones: AttendanceRecord[];
  totales: {
    total: number;
    presentes: number;
    tardanzas: number;
    inasistencias: number;
  };
}

export interface AttendanceQueryParams {
  studentId: string | number;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface AttendanceErrorResponse {
  code?: 'VALIDATION_ERROR' | 'DATE_RANGE_INVALID' | 'DATE_RANGE_TOO_LONG' | 'STUDENT_NOT_FOUND' | string;
  message?: string;
  detalle?: string;
}
