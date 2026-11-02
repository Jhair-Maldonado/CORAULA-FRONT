import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { GuardianAttendanceResponse } from '@/types/guardianAttendanceApi';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dayNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return timestamp / MS_PER_DAY;
}

export function attendanceRangeError(from: string, to: string): string | null {
  const start = dayNumber(from);
  const end = dayNumber(to);
  if (start === null || end === null || start > end) return 'Seleccione un rango de fechas válido.';
  if (end - start + 1 > 92) return 'El rango no puede superar 92 días.';
  return null;
}

export function guardianAttendanceErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'La sesión ha expirado. Vuelve a iniciar sesión.';
    if (status === 403) return 'Tu cuenta no tiene un perfil de apoderado activo.';
    if (status === 404) return 'El estudiante ya no está vinculado a tu cuenta.';
    if (status === 400) return 'El rango de fechas no es válido.';
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  }
  return 'No se pudo cargar la asistencia. Intenta nuevamente.';
}

export async function getGuardianAttendance(
  studentId: string,
  from: string,
  to: string,
): Promise<GuardianAttendanceResponse> {
  const rangeError = attendanceRangeError(from, to);
  if (rangeError) throw new Error(rangeError);
  if (!/^[1-9]\d*$/.test(studentId)) throw new Error('Seleccione un estudiante vinculado.');
  try {
    const response = await httpClient.get<GuardianAttendanceResponse>(
      `/v1/guardian/students/${studentId}/attendance`,
      { params: { from, to } },
    );
    return response.data;
  } catch (error) {
    throw new Error(guardianAttendanceErrorMessage(error));
  }
}
