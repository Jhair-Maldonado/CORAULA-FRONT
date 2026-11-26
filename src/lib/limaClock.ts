/**
 * Reloj de America/Lima (UTC-5, sin horario de verano). El servidor y el navegador pueden estar en otra zona:
 * la fecha «de hoy» de una clase siempre se calcula en Lima.
 */

const LIMA_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

function limaParts(now: Date): Record<'year' | 'month' | 'day' | 'hour' | 'minute', string> {
  const parts: Record<string, string> = {};
  for (const part of LIMA_PARTS.formatToParts(now)) parts[part.type] = part.value;
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute };
}

/** Fecha de Lima del instante dado, en formato `YYYY-MM-DD`. */
export function limaToday(now: Date = new Date()): string {
  const { year, month, day } = limaParts(now);
  return `${year}-${month}-${day}`;
}

/** Minutos transcurridos desde la medianoche de Lima en el instante dado (0 a 1439). */
export function limaMinutes(now: Date = new Date()): number {
  const { hour, minute } = limaParts(now);
  return Number(hour) * 60 + Number(minute);
}

/** `YYYY-MM-DD` que existe en el calendario (ida y vuelta UTC): `2026-02-31` no existe. */
export function isRealDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

/** Texto largo en es-PE de un día `YYYY-MM-DD`, p. ej. «miércoles, 25 de noviembre». */
export function formatLimaDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** Fecha larga en es-PE de un día `YYYY-MM-DD`, p. ej. «25 de noviembre de 2026». Vacío si no es una fecha válida. */
export function formatDayLong(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
