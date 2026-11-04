// Códigos de error del portal del apoderado, resueltos con contractErrorCode: un code cuenta solo si llega con
// uno de sus estados del contrato. 401 y 403 nunca llevan code. Los mensajes nunca repiten el texto del servidor.
import { isAxiosError } from 'axios';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { GuardianContractError } from '@/lib/guardianContract';

// GuardianPortalExceptionHandler (GuardianStudentsController): alumnos, asistencia, incidencias y libreta.
export const GUARDIAN_PORTAL_CONTRACT_STATUSES = {
  VALIDATION_ERROR: [400],
  DATE_RANGE_INVALID: [400],
  DATE_RANGE_TOO_LONG: [400],
  STUDENT_NOT_FOUND: [404],
  REPORT_NOT_FOUND: [404],
  REPORT_NOT_PUBLISHED: [409],
} as const satisfies Record<string, readonly number[]>;
export type GuardianPortalErrorCode = keyof typeof GUARDIAN_PORTAL_CONTRACT_STATUSES;

// AttendanceJustificationExceptionHandler (#57), compartido por el apoderado y por gestión.
export const GUARDIAN_JUSTIFICATION_CONTRACT_STATUSES = {
  VALIDATION_ERROR: [400],
  STUDENT_NOT_FOUND: [404],
  ATTENDANCE_NOT_FOUND: [404],
  JUSTIFICATION_NOT_FOUND: [404],
  JUSTIFICATION_ALREADY_ACTIVE: [409],
  JUSTIFICATION_DEADLINE_EXPIRED: [409],
  ATTENDANCE_NOT_ELIGIBLE: [409],
  INVALID_JUSTIFICATION_TRANSITION: [409],
  FILE_EMPTY: [400],
  FILE_TOO_LARGE: [400],
  FILE_NAME_INVALID: [400],
  FILE_TYPE_NOT_ALLOWED: [400],
  FILE_NOT_FOUND: [404],
  FILE_STORAGE_UNAVAILABLE: [503],
} as const satisfies Record<string, readonly number[]>;
export type GuardianJustificationErrorCode = keyof typeof GUARDIAN_JUSTIFICATION_CONTRACT_STATUSES;

export function guardianPortalErrorCode(error: unknown): GuardianPortalErrorCode | null {
  return contractErrorCode(error, GUARDIAN_PORTAL_CONTRACT_STATUSES);
}
export function guardianJustificationErrorCode(error: unknown): GuardianJustificationErrorCode | null {
  return contractErrorCode(error, GUARDIAN_JUSTIFICATION_CONTRACT_STATUSES);
}

export const GUARDIAN_SESSION_EXPIRED = 'La sesión ha expirado. Vuelve a iniciar sesión.';
export const GUARDIAN_NOT_GUARDIAN = 'Tu cuenta no tiene un perfil de apoderado activo.';
export const GUARDIAN_STUDENT_UNLINKED = 'El estudiante ya no está vinculado a tu cuenta.';
export const GUARDIAN_NO_CONNECTION = 'No se pudo conectar con el servidor. Intenta nuevamente.';

export type GuardianReadSubject = 'students' | 'attendance' | 'incidents' | 'published' | 'report' | 'reportPdf';
const readGeneric: Record<GuardianReadSubject, string> = {
  students: 'No se pudieron cargar los estudiantes vinculados.',
  attendance: 'No se pudo cargar la asistencia. Intenta nuevamente.',
  incidents: 'No se pudieron cargar las incidencias. Intenta nuevamente.',
  published: 'No se pudieron cargar las libretas publicadas. Intenta nuevamente.',
  report: 'No se pudo cargar la libreta. Intenta nuevamente.',
  reportPdf: 'No se pudo descargar la libreta en PDF. Intenta nuevamente.',
};
const portalCodeMessages: Record<GuardianPortalErrorCode, string> = {
  VALIDATION_ERROR: 'La consulta no es válida. Revisa los filtros.',
  DATE_RANGE_INVALID: 'La fecha inicial no puede ser posterior a la final.',
  DATE_RANGE_TOO_LONG: 'El rango no puede superar 92 días.',
  STUDENT_NOT_FOUND: GUARDIAN_STUDENT_UNLINKED,
  REPORT_NOT_FOUND: 'La libreta no está disponible para este estudiante.',
  REPORT_NOT_PUBLISHED: 'La libreta todavía no está publicada.',
};

// Lecturas del portal: alumnos, asistencia, incidencias y libreta.
export function guardianReadErrorMessage(error: unknown, subject: GuardianReadSubject): string {
  if (error instanceof GuardianContractError || !isAxiosError(error)) return readGeneric[subject];
  const status = error.response?.status;
  if (status === undefined) return GUARDIAN_NO_CONNECTION;
  if (status === 401) return GUARDIAN_SESSION_EXPIRED;
  if (status === 403) return GUARDIAN_NOT_GUARDIAN;
  const code = guardianPortalErrorCode(error);
  if (code) return portalCodeMessages[code];
  if (status === 404) return subject === 'report' || subject === 'reportPdf' ? portalCodeMessages.REPORT_NOT_FOUND : GUARDIAN_STUDENT_UNLINKED;
  if (status === 400) return subject === 'attendance' || subject === 'incidents' ? 'El rango de fechas no es válido.' : portalCodeMessages.VALIDATION_ERROR;
  return readGeneric[subject];
}

export type GuardianJustificationAction = 'list' | 'detail' | 'submit' | 'respond' | 'download';
const justificationGeneric: Record<GuardianJustificationAction, string> = {
  list: 'No se pudieron cargar las justificaciones. Intenta nuevamente.',
  detail: 'No se pudo cargar la justificación. Intenta nuevamente.',
  submit: 'No se pudo enviar la justificación. Intenta nuevamente.',
  respond: 'No se pudo enviar la respuesta. Intenta nuevamente.',
  download: 'No se pudo preparar la descarga del adjunto. Intenta nuevamente.',
};
const justificationCodeMessages: Record<GuardianJustificationErrorCode, string> = {
  VALIDATION_ERROR: 'Revisa los datos: el motivo es obligatorio (hasta 2000 caracteres).',
  STUDENT_NOT_FOUND: GUARDIAN_STUDENT_UNLINKED,
  ATTENDANCE_NOT_FOUND: 'La sesión de asistencia ya no está disponible.',
  JUSTIFICATION_NOT_FOUND: 'La solicitud ya no está disponible.',
  JUSTIFICATION_ALREADY_ACTIVE: 'Ya existe una solicitud vigente para esta sesión.',
  JUSTIFICATION_DEADLINE_EXPIRED: 'Venció el plazo para justificar esta sesión (dos días hábiles después de la clase).',
  ATTENDANCE_NOT_ELIGIBLE: 'Esta sesión ya no admite justificación.',
  INVALID_JUSTIFICATION_TRANSITION: 'La solicitud cambió de estado. Actualiza la información.',
  FILE_EMPTY: 'El archivo adjunto está vacío.',
  FILE_TOO_LARGE: 'El archivo adjunto supera los 15 MB.',
  FILE_NAME_INVALID: 'El nombre del archivo adjunto no es válido.',
  FILE_TYPE_NOT_ALLOWED: 'Solo se admiten archivos PDF, JPEG o PNG.',
  FILE_NOT_FOUND: 'El archivo adjunto ya no está disponible.',
  FILE_STORAGE_UNAVAILABLE: 'El almacenamiento de archivos no está disponible. Intenta más tarde.',
};

/** Sin respuesta, con 5xx o con una respuesta fuera de contrato, un envío pudo haberse registrado: no se reintenta solo. */
export function isUnconfirmedJustificationWrite(error: unknown): boolean {
  if (error instanceof GuardianContractError) return true;
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || (status >= 500 && guardianJustificationErrorCode(error) !== 'FILE_STORAGE_UNAVAILABLE');
}

export function guardianJustificationErrorMessage(error: unknown, action: GuardianJustificationAction): string {
  if ((action === 'submit' || action === 'respond') && isUnconfirmedJustificationWrite(error)) {
    return 'No se pudo confirmar el envío. Revisa el estado de la solicitud antes de intentarlo de nuevo.';
  }
  if (!isAxiosError(error)) return error instanceof GuardianValidationError ? error.message : justificationGeneric[action];
  const status = error.response?.status;
  if (status === undefined) return GUARDIAN_NO_CONNECTION;
  if (status === 401) return GUARDIAN_SESSION_EXPIRED;
  if (status === 403) return GUARDIAN_NOT_GUARDIAN;
  const code = guardianJustificationErrorCode(error);
  if (code === 'VALIDATION_ERROR' && action === 'respond') return 'Revisa los datos: la respuesta es obligatoria (hasta 2000 caracteres).';
  if (code) return justificationCodeMessages[code];
  if (status === 404) return justificationCodeMessages.JUSTIFICATION_NOT_FOUND;
  return justificationGeneric[action];
}

/** Validación local previa a la petición: su mensaje es propio y se puede mostrar. */
export class GuardianValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuardianValidationError';
  }
}
