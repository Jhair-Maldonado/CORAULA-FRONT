/**
 * Calendario mensual de asistencia del apoderado (FRONT #160). Funciones puras: arman las semanas, el rango de
 * consulta de un mes y el estado de hoy a partir de `GET /v1/guardian/students/{id}/attendance`, que devuelve una
 * fila por sesión. El backend no manda hora de llegada ni el vencimiento del plazo: el plazo se calcula con
 * `isWithinJustificationDeadline` y nada se inventa.
 */
import { isWithinJustificationDeadline } from '@/lib/justificationDeadline';
import { formatLimaDay } from '@/lib/limaClock';
import type { GuardianAttendanceRecord, GuardianAttendanceStatus } from '@/types/guardianAttendanceApi';

export type CalendarDayKind = 'fin_semana' | 'futuro' | 'sin_registro' | 'presente' | 'tardanza' | 'falta';

export interface CalendarSession {
  attendanceId: number;
  courseName: string;
  /** «08:00–09:30». */
  horario: string;
  /** Estado de la sesión: «Presente», «Tardanza» o «Inasistencia». */
  estadoLabel: string;
  /** Estado de la justificación en texto; null si no hay nada que decir. */
  justificacionLabel: string | null;
  /** Id de la solicitud más reciente; null si no hay. */
  justificationId: number | null;
  puedeJustificar: boolean;
  /** Estado crudo de la sesión, para quien actúe sobre ella (modal de justificación). */
  status: GuardianAttendanceStatus;
}

export interface CalendarCell {
  /** Día del mes (1 a 31). */
  day: number;
  /** `YYYY-MM-DD`; sirve para enlazar el detalle, no se muestra. */
  date: string;
  kind: CalendarDayKind;
  /** Etiqueta accesible en es-PE: «miércoles, 25 de noviembre: Falta, 2 sesiones. Se puede justificar». */
  label: string;
  /** «miércoles, 25 de noviembre». */
  fechaLarga: string;
  sessions: CalendarSession[];
  /** Alguna sesión del día se puede justificar. */
  tienePendiente: boolean;
}

/** Semana de lunes a domingo; `null` es un hueco fuera del mes. */
export type CalendarWeek = Array<CalendarCell | null>;

export type TodayStatusKind = 'sin_registro' | 'en_orden' | 'alerta';

export interface TodayStatus {
  kind: TodayStatusKind;
  tardanzas: number;
  inasistencias: number;
  sesionesJustificables: number;
}

const STATUS_LABEL: Record<GuardianAttendanceStatus, string> = {
  PRESENTE: 'Presente',
  TARDANZA: 'Tardanza',
  INASISTENCIA: 'Inasistencia',
};

const JUSTIFICATION_LABEL = {
  PENDIENTE: 'Justificación pendiente',
  OBSERVADA: 'Justificación observada',
  APROBADA: 'Justificación aprobada',
  RECHAZADA: 'Justificación rechazada',
} as const;

const KIND_LABEL: Record<'presente' | 'tardanza' | 'falta', string> = { presente: 'Presente', tardanza: 'Tardanza', falta: 'Falta' };

const pad = (value: number): string => String(value).padStart(2, '0');
const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();
const dayOf = (year: number, month: number, day: number): string => `${year}-${pad(month)}-${pad(day)}`;

/**
 * Una sesión se puede justificar solo si es INASISTENCIA o TARDANZA, no está justificada, no tiene solicitud o la
 * última fue RECHAZADA (se vuelve a presentar dentro del plazo original) y `today` no pasa del plazo.
 */
export function canJustifyRecord(record: GuardianAttendanceRecord, today: string): boolean {
  if (record.status !== 'INASISTENCIA' && record.status !== 'TARDANZA') return false;
  if (record.justified) return false;
  if (record.justification && record.justification.status !== 'RECHAZADA') return false;
  return isWithinJustificationDeadline(record.date, today);
}

function justificationLabel(record: GuardianAttendanceRecord, today: string): string | null {
  if (record.status === 'PRESENTE') return null;
  if (record.justified) return JUSTIFICATION_LABEL.APROBADA;
  const base = record.justification ? JUSTIFICATION_LABEL[record.justification.status] : null;
  const rejectedOrNone = !record.justification || record.justification.status === 'RECHAZADA';
  if (rejectedOrNone && !isWithinJustificationDeadline(record.date, today)) {
    return base ? `${base} · plazo vencido` : 'Plazo para justificar vencido';
  }
  return base;
}

function toSession(record: GuardianAttendanceRecord, today: string): CalendarSession {
  return {
    attendanceId: record.attendanceId,
    courseName: record.courseName,
    horario: `${record.startTime.slice(0, 5)}–${record.endTime.slice(0, 5)}`,
    estadoLabel: STATUS_LABEL[record.status],
    justificacionLabel: justificationLabel(record, today),
    justificationId: record.justification?.id ?? null,
    puedeJustificar: canJustifyRecord(record, today),
    status: record.status,
  };
}

/** El peor estado del día (D2): falta, luego tardanza, luego presente. */
function worstKind(records: GuardianAttendanceRecord[]): 'presente' | 'tardanza' | 'falta' {
  if (records.some(r => r.status === 'INASISTENCIA')) return 'falta';
  if (records.some(r => r.status === 'TARDANZA')) return 'tardanza';
  return 'presente';
}

function buildCell(day: number, date: string, weekday: number, records: GuardianAttendanceRecord[], today: string): CalendarCell {
  const fechaLarga = formatLimaDay(date);
  const sessions = records
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.courseName.localeCompare(b.courseName, 'es'))
    .map(record => toSession(record, today));
  const tienePendiente = sessions.some(s => s.puedeJustificar);
  if (records.length > 0) {
    const kind = worstKind(records);
    const count = records.length === 1 ? '1 sesión' : `${records.length} sesiones`;
    const label = `${fechaLarga}: ${KIND_LABEL[kind]}, ${count}${tienePendiente ? '. Se puede justificar' : ''}`;
    return { day, date, kind, label, fechaLarga, sessions, tienePendiente };
  }
  const kind: CalendarDayKind = weekday >= 5 ? 'fin_semana' : date > today ? 'futuro' : 'sin_registro';
  const text = kind === 'fin_semana' ? 'fin de semana' : kind === 'futuro' ? 'aún no ocurre' : 'sin registro de asistencia';
  return { day, date, kind, label: `${fechaLarga}: ${text}`, fechaLarga, sessions, tienePendiente: false };
}

/**
 * Semanas del mes (`month` de 1 a 12) de lunes a domingo, con huecos `null` al inicio y al final. Un día con
 * registros toma el estado de su peor sesión aunque caiga en fin de semana; sin registros es fin de semana,
 * futuro (después de `today`) o sin registro.
 */
export function buildMonthCalendar(records: GuardianAttendanceRecord[], year: number, month: number, today: string): CalendarWeek[] {
  const byDay = new Map<string, GuardianAttendanceRecord[]>();
  for (const record of records) {
    const list = byDay.get(record.date) ?? [];
    list.push(record);
    byDay.set(record.date, list);
  }
  const cells: CalendarWeek = Array.from({ length: (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7 }, () => null);
  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const date = dayOf(year, month, day);
    const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
    cells.push(buildCell(day, date, weekday, byDay.get(date) ?? [], today));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Rango a consultar de un mes: del día 1 al último día, sin pasar de `today` (no hay asistencia futura).
 * `null` si el mes es posterior al de `today`.
 */
export function monthRange(year: number, month: number, today: string): { from: string; to: string } | null {
  const from = dayOf(year, month, 1);
  if (from > today) return null;
  const last = dayOf(year, month, daysInMonth(year, month));
  return { from, to: last < today ? last : today };
}

/** Mes anterior (`delta` -1) o siguiente (`delta` 1), con cambio de año. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** «noviembre de 2026». */
export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1, 12)).toLocaleDateString('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Estado de hoy (D3): sin registros; «en orden» solo si hay al menos uno y todos son PRESENTE; o «alerta» si
 * alguna sesión es tardanza o inasistencia.
 */
export function todayStatus(records: GuardianAttendanceRecord[], today: string): TodayStatus {
  const ofToday = records.filter(r => r.date === today);
  const tardanzas = ofToday.filter(r => r.status === 'TARDANZA').length;
  const inasistencias = ofToday.filter(r => r.status === 'INASISTENCIA').length;
  const sesionesJustificables = ofToday.filter(r => canJustifyRecord(r, today)).length;
  const kind: TodayStatusKind = ofToday.length === 0 ? 'sin_registro' : tardanzas + inasistencias === 0 ? 'en_orden' : 'alerta';
  return { kind, tardanzas, inasistencias, sesionesJustificables };
}
