/**
 * Plazo para justificar una inasistencia o tardanza (docs/guardian-attendance-justifications.md, #57):
 * vence al terminar el segundo día hábil posterior a la sesión, en America/Lima. Día hábil es de lunes a
 * viernes; los feriados cuentan como días hábiles (no se descuentan). Tras una solicitud RECHAZADA se puede volver a presentar, pero solo
 * dentro de este mismo plazo (el original).
 * El backend no expone el vencimiento: aquí se calcula igual que lo valida el servidor, solo para decidir si
 * se ofrece «Justificar ahora». La última palabra la tiene el backend (409 JUSTIFICATION_DEADLINE_EXPIRED).
 */
import { isRealDay, limaToday } from '@/lib/limaClock';

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function isWeekday(day: string): boolean {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

/** Último día (`YYYY-MM-DD`) en que se puede justificar la sesión de `day`: dos días hábiles después. */
export function justificationDeadline(day: string): string {
  if (!isRealDay(day)) throw new RangeError(`Fecha de sesión no válida: ${day}`);
  let current = day;
  for (let business = 0; business < 2;) {
    current = addDays(current, 1);
    if (isWeekday(current)) business++;
  }
  return current;
}

/** `true` si `today` (por defecto, hoy en Lima) no pasa del vencimiento de la sesión de `day`; fechas inválidas, `false`. */
export function isWithinJustificationDeadline(day: string, today: string = limaToday()): boolean {
  return isRealDay(day) && today <= justificationDeadline(day);
}
