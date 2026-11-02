import httpClient from '@/services/httpClient';
import { parseGuardianAttendance } from '@/lib/guardianContract';
import { guardianReadErrorMessage } from '@/services/padres/guardianErrors';
import type { GuardianAttendanceResponse } from '@/types/guardianAttendanceApi';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const GUARDIAN_MAX_RANGE_DAYS = 92;

function dayNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return timestamp / MS_PER_DAY;
}

/** Rango de asistencia e incidencias: fechas válidas, from ≤ to y como máximo 92 días con ambos extremos. */
export function attendanceRangeError(from: string, to: string): string | null {
  const start = dayNumber(from);
  const end = dayNumber(to);
  if (start === null || end === null || start > end) return 'Seleccione un rango de fechas válido.';
  if (end - start + 1 > GUARDIAN_MAX_RANGE_DAYS) return `El rango no puede superar ${GUARDIAN_MAX_RANGE_DAYS} días.`;
  return null;
}

/** Id del estudiante en la ruta: entero positivo (studentId del contrato como texto). */
export function isGuardianStudentId(studentId: string): boolean {
  return /^[1-9]\d{0,15}$/.test(studentId) && Number.isSafeInteger(Number(studentId));
}

export function guardianAttendanceErrorMessage(error: unknown): string {
  return guardianReadErrorMessage(error, 'attendance');
}

export async function getGuardianAttendance(
  studentId: string,
  from: string,
  to: string,
): Promise<GuardianAttendanceResponse> {
  const rangeError = attendanceRangeError(from, to);
  if (rangeError) throw new Error(rangeError);
  if (!isGuardianStudentId(studentId)) throw new Error('Seleccione un estudiante vinculado.');
  try {
    const response = await httpClient.get<unknown>(
      `/v1/guardian/students/${studentId}/attendance`,
      { params: { from, to } },
    );
    return parseGuardianAttendance(response.data, { studentId: Number(studentId), from, to });
  } catch (error) {
    throw new Error(guardianAttendanceErrorMessage(error));
  }
}
