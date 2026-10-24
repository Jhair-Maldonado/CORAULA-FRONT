import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { CreateEnrollmentRequest, EnrollmentDetailResponse, WithdrawEnrollmentRequest } from '@/types/enrollmentApi';
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import type { SectionResponse } from '@/types/sectionApi';
import type { StudentStatus } from '@/types/studentApi';

export const enrollmentCreateReason = 'Matrícula individual';

export function isIsoDate(value: string): boolean {
  const date = new Date(value + 'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

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

// The backend does not check period activity, period dates or the student's status: the consumer does.
// availableVacancies is null when the vacancies GET could not be read; the backend 409 still guards capacity.
export function enrollmentCreateValidation(input: {
  studentStatus: StudentStatus; hasActiveEnrollment: boolean; period: AcademicPeriod | undefined;
  section: SectionResponse | undefined; availableVacancies: number | null; enrollmentDate: string;
}): string | null {
  const { period, section } = input;
  if (input.studentStatus !== 'ACTIVE' || input.hasActiveEnrollment) return 'Solo se puede matricular a un alumno activo sin matrícula activa.';
  if (!period || !period.active) return 'Selecciona un periodo académico activo.';
  if (!section || section.academicPeriodId !== period.id || !section.active || !section.enrollmentOpen) return 'Selecciona una sección activa con matrícula abierta en el periodo.';
  if (input.availableVacancies !== null && input.availableVacancies <= 0) return 'La sección seleccionada no tiene vacantes.';
  if (!isIsoDate(input.enrollmentDate)) return 'Ingresa una fecha de matrícula válida.';
  if (input.enrollmentDate < period.startDate || input.enrollmentDate > period.endDate) return 'La fecha de matrícula debe estar dentro del periodo seleccionado.';
  return null;
}

export const enrollmentsService = {
  async create(studentId: number, request: CreateEnrollmentRequest): Promise<EnrollmentDetailResponse> {
    if (![studentId, request.academicPeriodId, request.sectionId].every(id => Number.isSafeInteger(id) && id > 0)) throw new Error('No se pudo identificar al alumno, el periodo o la sección.');
    // Whitelist the wire fields; never send UI-only fields.
    const response = await httpClient.post<EnrollmentDetailResponse>('/v1/management/students/' + studentId + '/enrollments', {
      academicPeriodId: request.academicPeriodId, sectionId: request.sectionId,
      enrollmentDate: request.enrollmentDate, reason: request.reason,
    });
    const data = response.data;
    if (response.status !== 201 || !data || data.studentId !== studentId || data.academicPeriodId !== request.academicPeriodId ||
      data.sectionId !== request.sectionId || data.status !== 'ACTIVE' || !Number.isSafeInteger(data.enrollmentId)) {
      throw new Error('La respuesta de la matrícula no coincide con la solicitud.');
    }
    return data;
  },
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

// The backend 409 causes only differ by message text, which is never shown nor interpreted.
export function enrollmentCreateErrorMessage(error: unknown): string {
  switch (enrollmentErrorStatus(error)) {
    case 400: return 'Revisa el periodo, la sección y la fecha de matrícula.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede matricular alumnos.';
    case 404: return 'El alumno, el periodo o la sección ya no están disponibles. Actualiza los datos.';
    case 409: return 'No se pudo matricular: la sección está inactiva o con la matrícula cerrada, no tiene vacantes, el alumno ya tiene una matrícula activa en el periodo o la sección pertenece a otro periodo.';
    default: return 'No se pudo confirmar la matrícula. Revisa el perfil del alumno antes de intentarlo de nuevo.';
  }
}
