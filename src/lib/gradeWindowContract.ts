import type { GradeWindow } from '../types/gradeWindowApi';

// BACKEND #39 (docs/grade-window.md). Dates are YYYY-MM-DD calendar days in America/Lima: they are
// compared as text and shifted as UTC days, never through the browser's time zone.
export const gradeWindowGraceDays = 7;

function invalid(): never { throw new Error('La respuesta del plazo de registro no coincide con el contrato.'); }

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function addDays(date: string, days: number): string {
  if (!isIsoDate(date)) throw new Error('Fecha inválida.');
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function formatIsoDate(date: string): string { return date.split('-').reverse().join('/'); }

// Shared by the bimester panel (#119) and the grade sheets (FRONT #51), which carry the same object.
export function parseGradeWindow(value: unknown, bimesterId: number): GradeWindow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const w = value as Record<string, unknown>;
  if (typeof w.bimesterId !== 'number' || !Number.isSafeInteger(w.bimesterId) || w.bimesterId <= 0 || w.bimesterId !== bimesterId) return invalid();
  if (!isIsoDate(w.registrationDate) || typeof w.registrationDateConfigured !== 'boolean' || !isIsoDate(w.deadline) || typeof w.expired !== 'boolean') return invalid();
  if ((w.extendedDeadline !== null && !isIsoDate(w.extendedDeadline)) || w.timeZone !== 'America/Lima') return invalid();
  // The deadline is the later of D+7 and the extension: an earlier extension never shortens it.
  const grace = addDays(w.registrationDate, gradeWindowGraceDays);
  const extended = w.extendedDeadline as string | null;
  if (w.deadline !== (extended !== null && extended > grace ? extended : grace)) return invalid();
  return {
    bimesterId, registrationDate: w.registrationDate, registrationDateConfigured: w.registrationDateConfigured,
    extendedDeadline: extended, deadline: w.deadline, expired: w.expired, timeZone: 'America/Lima',
  };
}
