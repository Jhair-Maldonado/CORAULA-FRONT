// Bandeja de justificaciones de gestión (#57): lectura para ADMINISTRADOR y DIRECTIVO; decisión solo DIRECTIVO.
import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import {
  GuardianContractError,
  parseAttendanceJustification,
  parseAttendanceJustificationsPage,
  parseJustificationAttachmentUrl,
} from '@/lib/guardianContract';
import { isValidGuardianPage } from '@/services/padres/guardianIncidentsService';
import {
  GUARDIAN_NO_CONNECTION,
  GUARDIAN_SESSION_EXPIRED,
  GuardianValidationError,
  guardianJustificationErrorCode,
  type GuardianJustificationErrorCode,
} from '@/services/padres/guardianErrors';
import type {
  AttendanceJustification,
  AttendanceJustificationsPage,
  JustificationAttachmentUrl,
  JustificationDecisionRequest,
  JustificationStatus,
} from '@/types/guardianJustificationsApi';
import { JUSTIFICATION_PAGE_SIZE, JUSTIFICATION_TEXT_MAX_LENGTH } from '@/services/padres/guardianJustificationsService';

function positiveId(value: number, message = 'Selecciona una solicitud.'): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new GuardianValidationError(message);
  return value;
}

export function justificationDecisionError(decision: string, comment: string): string | null {
  if (!['APROBADA', 'RECHAZADA', 'OBSERVADA'].includes(decision)) {
    return 'Selecciona una decisión válida (Aprobar, Observar o Rechazar).';
  }
  const trimmed = comment.trim();
  if (!trimmed) {
    return 'El comentario de revisión es obligatorio.';
  }
  if (trimmed.length > JUSTIFICATION_TEXT_MAX_LENGTH) {
    return `El comentario no puede superar los ${JUSTIFICATION_TEXT_MAX_LENGTH} caracteres.`;
  }
  return null;
}

/** Nombre y código si el backend los envía; si no, «Estudiante #id». */
export function etiquetaEstudiante(
  j: Pick<AttendanceJustification, 'studentId' | 'studentName' | 'studentCode'>
): { nombre: string; codigo: string | null } {
  const nombre = j.studentName?.trim();
  return { nombre: nombre || `Estudiante #${j.studentId}`, codigo: j.studentCode?.trim() || null };
}

export type ManagementJustificationAction = 'list' | 'detail' | 'decide' | 'download';

export const MANAGEMENT_JUSTIFICATION_FORBIDDEN = {
  read: 'Tu cuenta no tiene permiso para consultar las justificaciones.',
  decide: 'Solo un directivo puede resolver justificaciones.',
} as const;

const managementGeneric: Record<ManagementJustificationAction, string> = {
  list: 'No se pudieron cargar las justificaciones. Intenta nuevamente.',
  detail: 'No se pudo cargar la justificación. Intenta nuevamente.',
  decide: 'No se pudo registrar la decisión. Intenta nuevamente.',
  download: 'No se pudo preparar la descarga del adjunto. Intenta nuevamente.',
};

const managementCodeMessages: Partial<Record<GuardianJustificationErrorCode, string>> = {
  VALIDATION_ERROR: 'Revisa la decisión: el comentario es obligatorio (hasta 2000 caracteres).',
  JUSTIFICATION_NOT_FOUND: 'La solicitud ya no está disponible.',
  INVALID_JUSTIFICATION_TRANSITION: 'La solicitud ya fue resuelta o cambió de estado. Actualiza la información.',
  ATTENDANCE_NOT_ELIGIBLE: 'La asistencia de esta sesión ya no admite justificación.',
  FILE_NOT_FOUND: 'El archivo adjunto ya no está disponible.',
  FILE_STORAGE_UNAVAILABLE: 'El almacenamiento de archivos no está disponible. Intenta más tarde.',
};

/** Mensajes propios de gestión: nunca repiten el texto del servidor ni los avisos del apoderado. */
export function managementJustificationErrorMessage(error: unknown, action: ManagementJustificationAction): string {
  if (error instanceof GuardianValidationError) return error.message;
  if (error instanceof GuardianContractError || !isAxiosError(error)) return managementGeneric[action];
  const status = error.response?.status;
  if (status === undefined) return GUARDIAN_NO_CONNECTION;
  if (status === 401) return GUARDIAN_SESSION_EXPIRED;
  if (status === 403) return action === 'decide' ? MANAGEMENT_JUSTIFICATION_FORBIDDEN.decide : MANAGEMENT_JUSTIFICATION_FORBIDDEN.read;
  const code = guardianJustificationErrorCode(error);
  const message = code ? managementCodeMessages[code] : undefined;
  if (message) return message;
  if (status === 404) return managementCodeMessages.JUSTIFICATION_NOT_FOUND!;
  return managementGeneric[action];
}

export const managementAttendanceJustificationsService = {
  async list(
    options: { status?: JustificationStatus | null; page?: number; size?: number } = {},
    signal?: AbortSignal
  ): Promise<AttendanceJustificationsPage> {
    const page = options.page ?? 0;
    const size = options.size ?? JUSTIFICATION_PAGE_SIZE;
    if (!isValidGuardianPage(page, size)) throw new GuardianValidationError('La paginación solicitada no es válida.');
    const params = options.status ? { status: options.status, page, size } : { page, size };
    const response = await httpClient.get<unknown>('/v1/management/attendance-justifications', { params, signal });
    const result = parseAttendanceJustificationsPage(response.data, { page, size });
    if (options.status && result.content.some(j => j.status !== options.status)) throw new GuardianContractError('justificaciones');
    return result;
  },

  async detail(id: number, signal?: AbortSignal): Promise<AttendanceJustification> {
    const response = await httpClient.get<unknown>(
      `/v1/management/attendance-justifications/${positiveId(id)}`,
      { signal }
    );
    return parseAttendanceJustification(response.data, { id });
  },

  async decide(id: number, request: JustificationDecisionRequest): Promise<AttendanceJustification> {
    const error = justificationDecisionError(request.decision, request.comment);
    if (error) throw new GuardianValidationError(error);
    const response = await httpClient.post<unknown>(
      `/v1/management/attendance-justifications/${positiveId(id)}/decision`,
      {
        decision: request.decision,
        comment: request.comment.trim(),
      }
    );
    const decided = parseAttendanceJustification(response.data, { id });
    if (decided.status !== request.decision) throw new GuardianContractError('justificación');
    return decided;
  },

  async attachmentUrl(id: number): Promise<JustificationAttachmentUrl> {
    const response = await httpClient.post<unknown>(
      `/v1/management/attendance-justifications/${positiveId(id)}/attachment/download-url`
    );
    return parseJustificationAttachmentUrl(response.data);
  },
};
