/**
 * Tipos e interfaces para el Módulo de Notificaciones del Apoderado
 * Trazabilidad: RF-22, RF-27 (APOD-NOTIFICACIONES-UI | Sprint 8)
 * Base de Datos / Backend: Supabase (PostgreSQL)
 */

export type PrioridadNotificacion = 'emergencia' | 'alta' | 'media' | 'baja';

export interface NotificacionApoderado {
  id: string | number;
  apoderado_id: string | number;
  estudiante_id?: string | number | null;
  titulo: string;
  mensaje: string;
  prioridad: PrioridadNotificacion;
  leido: boolean;
  fecha_creacion: string; // ISO-8601 UTC o con offset
  fecha_lectura?: string | null;
}

export type FiltroEstadoNotificacion = 'todas' | 'no_leidas' | 'leidas';

export type FiltroPrioridadNotificacion = PrioridadNotificacion | 'todas';

export interface NotificacionesStats {
  total: number;
  unreadCount: number;
  emergencias: number;
  altas: number;
}
