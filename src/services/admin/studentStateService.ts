import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { studentErrorCodeMessage } from '@/services/admin/studentErrors';
import type { ChangeStudentStateRequest, StudentStateAction, StudentStateChangeResponse, StudentStateReasonCode, StudentStatus } from '@/types/studentApi';

// BACK #41 (docs/admin-student-state.md): allowed origin states and the resulting one; DEACTIVATED is terminal.
const transitions: Record<StudentStateAction, { path: string; from: readonly StudentStatus[]; to: StudentStatus }> = {
  SUSPEND: { path: 'suspend', from: ['ACTIVE'], to: 'SUSPENDED' },
  REACTIVATE: { path: 'reactivate', from: ['SUSPENDED'], to: 'ACTIVE' },
  DEACTIVATE: { path: 'deactivate', from: ['ACTIVE', 'SUSPENDED'], to: 'DEACTIVATED' },
};

export const studentStateActionOrder: readonly StudentStateAction[] = ['SUSPEND', 'REACTIVATE', 'DEACTIVATE'];

export const studentStateActionLabels: Record<StudentStateAction, { button: string; title: string; confirm: string }> = {
  SUSPEND: { button: 'Suspender alumno', title: 'Suspender alumno', confirm: 'Confirmar suspensión' },
  REACTIVATE: { button: 'Reactivar alumno', title: 'Reactivar alumno', confirm: 'Confirmar reactivación' },
  DEACTIVATE: { button: 'Dar de baja', title: 'Dar de baja al alumno', confirm: 'Confirmar baja permanente' },
};

// Reason catalog per action, in the backend order.
export const studentStateReasons: Record<StudentStateAction, Partial<Record<StudentStateReasonCode, string>>> = {
  SUSPEND: { ADMINISTRATIVE_REVIEW: 'Revisión administrativa', GUARDIAN_REQUEST: 'Solicitud del apoderado', OTHER: 'Otro' },
  REACTIVATE: { SUSPENSION_RESOLVED: 'Suspensión resuelta', ADMINISTRATIVE_CORRECTION: 'Corrección administrativa', OTHER: 'Otro' },
  DEACTIVATE: {
    VOLUNTARY_WITHDRAWAL: 'Retiro voluntario', TRANSFER: 'Traslado', DUPLICATE_RECORD: 'Registro duplicado',
    ERRONEOUS_RECORD: 'Registro erróneo', OTHER: 'Otro',
  },
};

export const maxStudentStateJustificationLength = 1000;

export function availableStudentStateActions(status: StudentStatus): StudentStateAction[] {
  return studentStateActionOrder.filter(action => transitions[action].from.includes(status));
}

const isReasonOf = (action: StudentStateAction, value: string): value is StudentStateReasonCode =>
  Object.prototype.hasOwnProperty.call(studentStateReasons[action], value);

export function studentStateValidation(action: StudentStateAction, reasonCode: string, justification: string, permanentConfirmed: boolean): string | null {
  if (!isReasonOf(action, reasonCode)) return 'Selecciona un motivo.';
  const text = justification.trim();
  if (!text) return 'La justificación es obligatoria.';
  if (text.length > maxStudentStateJustificationLength) return 'La justificación no puede superar los 1000 caracteres.';
  if (action === 'DEACTIVATE' && !permanentConfirmed) return 'Confirma que entiendes que la baja es permanente.';
  return null;
}

export function toChangeStudentState(action: StudentStateAction, reasonCode: string, justification: string): ChangeStudentStateRequest {
  if (!isReasonOf(action, reasonCode)) throw new Error('Motivo no válido para la acción.');
  return { reasonCode, justification: justification.trim() };
}

export const studentStateService = {
  async change(studentId: number, action: StudentStateAction, request: ChangeStudentStateRequest): Promise<StudentStateChangeResponse> {
    if (!Number.isSafeInteger(studentId) || studentId <= 0) throw new Error('No se pudo identificar al alumno.');
    const { path, from, to } = transitions[action];
    // Whitelist the wire fields; never send UI-only fields.
    const response = await httpClient.patch<StudentStateChangeResponse>('/v1/management/students/' + studentId + '/' + path,
      { reasonCode: request.reasonCode, justification: request.justification });
    const data = response.data;
    if (response.status !== 200 || !data || data.studentId !== studentId || data.studentStatus !== to || !from.includes(data.previousStatus)
      || data.reasonCode !== request.reasonCode || !(data.accountEnabled === null || typeof data.accountEnabled === 'boolean')) {
      throw new Error('La respuesta del cambio de estado no coincide con la solicitud.');
    }
    return data;
  },
};

// Without a response, a 5xx or an unexpected body, the state may or may not have changed: never retry automatically.
export function isUncertainStudentStateChange(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

// 404, 409 and uncertain outcomes close the dialog and reload the profile; 400/401/403 keep the dialog.
export function studentStateChangeReloads(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return isUncertainStudentStateChange(error) || status === 404 || status === 409;
}

export function studentStateErrorMessage(error: unknown): string {
  if (isUncertainStudentStateChange(error)) return 'No se pudo confirmar el cambio de estado. Se consultó el perfil sin repetir la solicitud; revisa el estado actual.';
  const byCode = studentErrorCodeMessage(error);
  if (byCode) return byCode;
  switch (isAxiosError(error) ? error.response?.status : undefined) {
    case 400: return 'Revisa el motivo y la justificación (obligatoria, hasta 1000 caracteres).';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede cambiar el estado de un alumno.';
    case 404: return 'El alumno ya no existe. Vuelve al listado.';
    case 409: return 'El estado del alumno cambió y esta acción ya no está permitida. Se actualizó el perfil.';
    default: return 'No se pudo cambiar el estado del alumno. Intenta nuevamente.';
  }
}

export function studentStateSuccessMessage(change: StudentStateChangeResponse): string {
  const done = change.studentStatus === 'SUSPENDED' ? 'Alumno suspendido.' : change.studentStatus === 'DEACTIVATED' ? 'Alumno dado de baja.' : 'Alumno reactivado.';
  if (change.accountEnabled === null) return done + ' No tiene una cuenta vinculada.';
  if (change.accountEnabled) return done + ' Su cuenta quedó habilitada.';
  return done + (change.studentStatus === 'ACTIVE' ? ' Su cuenta sigue deshabilitada porque ya lo estaba antes de la suspensión.' : ' Su cuenta quedó deshabilitada.');
}
