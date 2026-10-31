/**
 * Tipos e interfaces para el Módulo de Justificaciones de Inasistencias
 * Trazabilidad: RF-28 (APOD-JUSTIFICACIONES-UI | Sprint 8)
 * Base de Datos / Backend: Supabase (PostgreSQL + Supabase Storage)
 */

export type EstadoJustificacion = 'PENDIENTE' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

export type MotivoJustificacion =
  | 'Salud / Médico'
  | 'Familiar'
  | 'Viaje'
  | 'Fuerza Mayor'
  | 'Otro';

export const MOTIVOS_JUSTIFICACION: readonly MotivoJustificacion[] = [
  'Salud / Médico',
  'Familiar',
  'Viaje',
  'Fuerza Mayor',
  'Otro',
];

export interface JustificacionRegistro {
  id: string | number;
  estudiante_id: string | number;
  apoderado_id: string | number;
  fecha_inasistencia: string; // YYYY-MM-DD
  motivo: MotivoJustificacion | string;
  descripcion: string;
  adjunto_url?: string | null;
  adjunto_nombre?: string | null;
  estado: EstadoJustificacion;
  observacion_secretaria?: string | null;
  fecha_creacion: string; // ISO-8601
  fecha_resolucion?: string | null;
}

export interface NuevaJustificacionInput {
  estudiante_id: string | number;
  apoderado_id: string | number;
  fecha_inasistencia: string;
  motivo: MotivoJustificacion | string;
  descripcion: string;
  archivo?: File | null;
}

export interface JustificacionesStats {
  total: number;
  pendientes: number;
  aprobadas: number;
  observadas: number;
  rechazadas: number;
}
