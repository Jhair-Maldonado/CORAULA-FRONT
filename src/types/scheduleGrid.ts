import type { ScheduleResponse, SchoolDay } from './scheduleApi';

/**
 * Modelo de la grilla semanal del horario de una sección. Lo produce `toScheduleGrid`
 * (src/adapters/scheduleGridAdapter.ts) a partir de GET /v1/management/sections/{id}/schedule.
 * No contiene clases CSS: la vista decide cómo pintar cada bloque.
 */

/** Minutos que representa cada fila de la grilla. */
export const GRID_UNIT_MINUTES = 5;
/** Cantidad de filas de 5 minutos que ocupa una hora. */
export const GRID_ROWS_PER_HOUR = 60 / GRID_UNIT_MINUTES;
/** Cantidad de variantes de color de bloque (courseId % 7). */
export const GRID_COLOR_COUNT = 7;

/** Bloque ya ubicado en la grilla. */
export interface GridBlock {
  id: number;
  courseId: number;
  courseName: string;
  teacherName: string | null;
  classroom: string | null;
  day: SchoolDay;
  /** Hora de inicio «HH:mm» (ya redondeada a 5 minutos). */
  startTime: string;
  /** Hora de fin «HH:mm» (ya redondeada a 5 minutos). */
  endTime: string;
  /** Minutos desde las 00:00, redondeados al múltiplo de 5 más cercano. */
  startMinute: number;
  endMinute: number;
  /** Fila inicial (base 1) = (startMinute - rango.start) / 5 + 1. */
  rowStart: number;
  /** Filas que ocupa; nunca menor que 1. */
  rowSpan: number;
  /** Carril (base 0) dentro del grupo de bloques que se solapan. */
  lane: number;
  /** Total de carriles del grupo; el ancho del bloque es 1/lanes. */
  lanes: number;
  /** courseId % 7: índice estable en la paleta. */
  colorIndex: number;
  /** true si dura menos de 60 minutos. */
  compact: boolean;
  /** Texto para lectores de pantalla. */
  ariaLabel: string;
  /** Bloque original, para abrir el detalle sin volver a buscarlo. */
  source: ScheduleResponse;
}

/** Columna de un día con sus bloques en orden cronológico. */
export interface GridDay {
  day: SchoolDay;
  /** «Lunes», «Miércoles»… */
  label: string;
  blocks: GridBlock[];
}

/** Etiqueta de una hora en punto del eje vertical. */
export interface GridHour {
  /** «07:00». */
  label: string;
  /** Fila (base 1) donde empieza la hora. */
  row: number;
}

/** Grilla completa: rango, eje de horas y columnas por día. */
export interface ScheduleGridModel {
  /** Inicio del rango en minutos desde las 00:00 (hora en punto). */
  start: number;
  /** Fin del rango en minutos desde las 00:00 (hora en punto). */
  end: number;
  /** Total de filas de 5 minutos del rango. */
  rows: number;
  hours: GridHour[];
  /** Un solo día si hay filtro; si no, de lunes a viernes. */
  days: GridDay[];
  /** true si hay al menos un bloque válido en los días mostrados. */
  hasBlocks: boolean;
  /** Cantidad de bloques descartados por día u hora inválidos. */
  discarded: number;
}
