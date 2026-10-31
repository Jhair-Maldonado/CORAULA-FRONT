/**
 * Tipos e interfaces para el Módulo de Incidencias del Apoderado
 * Trazabilidad: RF-26 (APOD-INCIDENCIAS-UI / BACK #33 / BACK #54)
 * Rol: APODERADO
 * Restricciones: CAB Regla 12 (Apoderado principal con vínculo activo en periodo vigente)
 */

export type GravedadIncidencia = 'LEVE' | 'MODERADA' | 'GRAVE';

export interface IncidenciaApoderado {
  id: number;
  estudianteId: number;
  estudianteNombre?: string;
  fecha: string; // Formato ISO-8601 (ej: 2026-10-28T10:30:00-05:00 o UTC)
  gravedad: GravedadIncidencia;
  titulo: string; // Tipo o clasificación de la incidencia
  descripcion: string;
  lugar?: string;
  docenteNombre?: string;
  accionesTomadas?: string | null;
  notificado?: boolean;
}

export interface IncidenciasApoderadoResponse {
  content: IncidenciaApoderado[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface FiltroIncidenciasApoderado {
  gravedad?: GravedadIncidencia | 'TODAS';
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  size?: number;
}

export interface IncidenciasKpis {
  total: number;
  leves: number;
  moderadas: number;
  graves: number;
}
