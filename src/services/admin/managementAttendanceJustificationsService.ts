import httpClient from '@/services/httpClient';
import {
  parseAttendanceJustification,
  parseAttendanceJustificationsPage,
  parseJustificationAttachmentUrl,
} from '@/lib/guardianContract';
import { isValidGuardianPage } from '@/services/padres/guardianIncidentsService';
import {
  GuardianValidationError,
  guardianJustificationErrorMessage,
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
    return parseAttendanceJustificationsPage(response.data, { page, size });
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
    return parseAttendanceJustification(response.data, { id });
  },

  async attachmentUrl(id: number): Promise<JustificationAttachmentUrl> {
    const response = await httpClient.post<unknown>(
      `/v1/management/attendance-justifications/${positiveId(id)}/attachment/download-url`
    );
    return parseJustificationAttachmentUrl(response.data);
  },
};

export { guardianJustificationErrorMessage };

