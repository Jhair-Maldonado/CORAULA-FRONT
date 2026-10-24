import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { EnrollmentDetailResponse, WithdrawEnrollmentRequest } from '@/types/enrollmentApi';

export const withdrawalReasons = ['Traslado a otra institución', 'Decisión del apoderado', 'Cambio de residencia', 'Otro'] as const;
// motivo_retiro is TEXT in V7 and EnrollmentEntity: no declared character limit.
// Bound this consumer by the fixed options, labels and 300-character justification.
export const maxWithdrawalReasonLength = Math.max(...withdrawalReasons.map(reason => reason.length)) + 'Motivo:  | Justificación: '.length + 300;

export function localToday(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function withdrawalValidation(date: string, enrollmentDate: string | null, reason: string, justification: string): string | null {
  const parsed = new Date(date + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return 'Ingresa una fecha de retiro válida.';
  if (!enrollmentDate) return 'No se pudo verificar la fecha de matrícula. Actualiza el perfil.';
  if (date < enrollmentDate || date > localToday()) return 'La fecha de retiro debe estar entre la fecha de matrícula y hoy.';
  if (!withdrawalReasons.some(option => option === reason.trim())) return 'Selecciona un motivo del retiro.';
  const explanation = justification.trim();
  if (explanation.replace(/\s/g, '').length < 10) return 'La justificación debe tener al menos 10 caracteres sin contar espacios.';
  if (explanation.length > 300) return 'La justificación no puede superar los 300 caracteres.';
  if (formatWithdrawalReason(reason, explanation).length > maxWithdrawalReasonLength) return 'El texto del retiro supera la longitud permitida.';
  return null;
}

export function formatWithdrawalReason(reason: string, justification: string): string {
  return 'Motivo: ' + reason.trim() + ' | Justificación: ' + justification.trim();
}

export const enrollmentsService = {
  async withdraw(studentId: number, enrollmentId: number, request: WithdrawEnrollmentRequest): Promise<EnrollmentDetailResponse> {
    if (![studentId, enrollmentId].every(id => Number.isSafeInteger(id) && id > 0)) throw new Error('No se pudo identificar la matrícula.');
    // Whitelist the existing wire fields; never send UI-only fields.
    const response = await httpClient.patch<EnrollmentDetailResponse>(
      '/v1/management/students/' + studentId + '/enrollments/' + enrollmentId + '/withdraw',
      { withdrawalDate: request.withdrawalDate, withdrawalReason: request.withdrawalReason },
    );
    const data = response.data;
    if (response.status !== 200 || !data || data.studentId !== studentId || data.enrollmentId !== enrollmentId ||
      data.status !== 'WITHDRAWN' || data.withdrawalDate !== request.withdrawalDate || data.withdrawalReason !== request.withdrawalReason) {
      throw new Error('La respuesta del retiro no coincide con la matrícula. Actualiza el perfil antes de continuar.');
    }
    return data;
  },
};

export function enrollmentErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function enrollmentErrorMessage(error: unknown): string {
  switch (enrollmentErrorStatus(error)) {
    case 400: return 'No se pudo retirar la matrícula. Revisa la fecha y los datos ingresados.';
    case 401: return 'Tu sesión no permite completar el retiro. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para retirar matrículas.';
    case 404: return 'El estudiante o la matrícula ya no están disponibles.';
    case 409: return 'La matrícula no pertenece al estudiante o ya no está activa. Se consultará su estado actual.';
    default: return 'No se pudo confirmar el resultado del retiro. Se consultará el perfil sin repetir la solicitud.';
  }
}
