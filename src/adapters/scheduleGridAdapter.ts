import type { ScheduleResponse, SchoolDay } from '@/types/scheduleApi';
import {
  GRID_COLOR_COUNT, GRID_UNIT_MINUTES,
  type GridBlock, type GridDay, type GridHour, type ScheduleGridModel,
} from '@/types/scheduleGrid';

/** Días escolares en orden de columna; coincide con `SchoolDay` (no hay sábado). */
const DAYS: readonly SchoolDay[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const DAY_LABEL: Record<SchoolDay, string> = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes',
};
/** Rango mínimo de la grilla: de 07:00 a 15:00. */
const MIN_RANGE_START = 7 * 60;
const MIN_RANGE_END = 15 * 60;
const HOUR = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** Minutos desde las 00:00 de «HH:mm» (o «HH:mm:ss»), o null si el texto no es una hora válida. */
function toMinutes(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = HOUR.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** «HH:mm» a partir de minutos desde las 00:00. */
function format(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Último minuto que puede usar un fin: 23:55, para que el eje nunca muestre «24:00». */
const MAX_END = 24 * 60 - GRID_UNIT_MINUTES;

/** Redondea al múltiplo de 5 minutos más cercano. */
function snap(minutes: number): number {
  return Math.round(minutes / GRID_UNIT_MINUTES) * GRID_UNIT_MINUTES;
}

/** Texto para lectores de pantalla: «Matemática, lunes de 08:00 a 09:30, docente X, aula Y». */
function ariaLabelOf(block: ScheduleResponse, start: string, end: string): string {
  const day = DAY_LABEL[block.day].toLocaleLowerCase('es-PE');
  const teacher = block.teacherName?.trim() ? `docente ${block.teacherName.trim()}` : 'sin docente asignado';
  const room = block.classroom?.trim() ? `aula ${block.classroom.trim()}` : 'sin aula';
  return `${block.courseName}, ${day} de ${start} a ${end}, ${teacher}, ${room}`;
}

interface Placed { block: ScheduleResponse; startMinute: number; endMinute: number }

/**
 * Asigna carril a los bloques de un mismo día, ya ordenados por inicio.
 * Un grupo es el conjunto de bloques que se solapan de forma transitiva; dentro del grupo cada bloque
 * toma el primer carril libre. Que un bloque termine justo cuando otro empieza no cuenta como solape.
 */
function assignLanes(placed: Placed[]): { item: Placed; lane: number; lanes: number }[] {
  const result: { item: Placed; lane: number; lanes: number }[] = [];
  let group: { item: Placed; lane: number }[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const close = () => {
    for (const member of group) result.push({ ...member, lanes: laneEnds.length });
    group = [];
    laneEnds = [];
  };
  for (const item of placed) {
    if (group.length > 0 && item.startMinute >= groupEnd) close();
    let lane = laneEnds.findIndex(end => end <= item.startMinute);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(item.endMinute); } else laneEnds[lane] = item.endMinute;
    groupEnd = group.length === 0 ? item.endMinute : Math.max(groupEnd, item.endMinute);
    group.push({ item, lane });
  }
  close();
  return result;
}

/**
 * Convierte los bloques de GET /v1/management/sections/{id}/schedule en el modelo de la grilla semanal.
 *
 * - Descarta los bloques con un día fuera de `SchoolDay` o con horas inválidas o con inicio >= fin
 *   (se cuentan en `discarded`); nunca lanza.
 * - Cada fila vale 5 minutos; los minutos que no son múltiplo de 5 se redondean al más cercano (máximo 23:55).
 * - NOTA: el rango sale de todos los bloques válidos, no solo del día filtrado, para que la grilla
 *   no cambie de alto al cambiar el filtro. Mínimo 07:00 a 15:00; se amplía a la hora en punto
 *   anterior al primer inicio y a la siguiente al último fin.
 * - Orden por día, inicio e id. `colorIndex` = courseId % 7, estable aunque cambie el orden de entrada.
 * @param blocks bloques tal como los devuelve el backend
 * @param day si se indica, solo se muestra la columna de ese día
 */
export function toScheduleGrid(blocks: readonly ScheduleResponse[], day?: SchoolDay | ''): ScheduleGridModel {
  const valid: Placed[] = [];
  let discarded = 0;
  for (const block of blocks) {
    const rawStart = toMinutes(block.startTime);
    const rawEnd = toMinutes(block.endTime);
    if (!DAYS.includes(block.day) || rawStart === null || rawEnd === null || rawStart >= rawEnd) { discarded += 1; continue; }
    // El inicio deja lugar para una fila antes de 23:55; un bloque tan corto que el redondeo lo vuelve
    // de duración cero sigue ocupando una fila.
    const startMinute = Math.min(snap(rawStart), MAX_END - GRID_UNIT_MINUTES);
    const endMinute = Math.min(Math.max(snap(rawEnd), startMinute + GRID_UNIT_MINUTES), MAX_END);
    valid.push({ block, startMinute, endMinute });
  }
  const first = valid.length ? Math.min(...valid.map(item => item.startMinute)) : MIN_RANGE_START;
  const last = valid.length ? Math.max(...valid.map(item => item.endMinute)) : MIN_RANGE_END;
  const rangeStart = Math.min(MIN_RANGE_START, Math.floor(first / 60) * 60);
  const rangeEnd = Math.max(MIN_RANGE_END, Math.ceil(last / 60) * 60);
  const rows = (rangeEnd - rangeStart) / GRID_UNIT_MINUTES;
  const hours: GridHour[] = [];
  for (let minute = rangeStart; minute < rangeEnd; minute += 60) {
    hours.push({ label: format(minute), row: (minute - rangeStart) / GRID_UNIT_MINUTES + 1 });
  }
  const shown = day ? DAYS.filter(item => item === day) : DAYS;
  const columns: GridDay[] = shown.map(current => {
    const ordered = valid
      .filter(item => item.block.day === current)
      .sort((a, b) => a.startMinute - b.startMinute || a.block.id - b.block.id);
    const gridBlocks: GridBlock[] = assignLanes(ordered).map(({ item, lane, lanes }) => {
      const start = format(item.startMinute);
      const end = format(item.endMinute);
      return {
        id: item.block.id, courseId: item.block.courseId, courseName: item.block.courseName,
        teacherName: item.block.teacherName, classroom: item.block.classroom, day: item.block.day,
        startTime: start, endTime: end, startMinute: item.startMinute, endMinute: item.endMinute,
        rowStart: (item.startMinute - rangeStart) / GRID_UNIT_MINUTES + 1,
        rowSpan: (item.endMinute - item.startMinute) / GRID_UNIT_MINUTES,
        lane, lanes,
        colorIndex: ((item.block.courseId % GRID_COLOR_COUNT) + GRID_COLOR_COUNT) % GRID_COLOR_COUNT,
        compact: item.endMinute - item.startMinute < 60,
        ariaLabel: ariaLabelOf(item.block, start, end),
        source: item.block,
      };
    });
    return { day: current, label: DAY_LABEL[current], blocks: gridBlocks };
  });
  return { start: rangeStart, end: rangeEnd, rows, hours, days: columns, hasBlocks: columns.some(column => column.blocks.length > 0), discarded };
}
