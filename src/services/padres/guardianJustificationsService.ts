// Justificaciones de asistencia del apoderado (#57). La vista llega en el PR de justificación; el servicio de
// gestión (bandeja y decisión) llega con la bandeja de Secretaría.
import httpClient from '@/services/httpClient';
import {
  GuardianContractError, parseAttendanceJustification, parseAttendanceJustificationsPage, parseJustificationAttachmentUrl,
} from '@/lib/guardianContract';
import { isGuardianStudentId } from '@/services/padres/guardianAttendanceService';
import { isValidGuardianPage } from '@/services/padres/guardianIncidentsService';
import { GuardianValidationError, guardianJustificationErrorMessage, type GuardianJustificationAction } from '@/services/padres/guardianErrors';
import type { AttendanceJustification, AttendanceJustificationsPage, JustificationAttachmentUrl, JustificationStatus } from '@/types/guardianJustificationsApi';

export const JUSTIFICATION_TEXT_MAX_LENGTH = 2000;
export const JUSTIFICATION_FILE_MAX_BYTES = 15 * 1024 * 1024;
export const JUSTIFICATION_PAGE_SIZE = 20;
export const JUSTIFICATION_FILE_TYPES = [
  { mimeType: 'application/pdf', extensions: ['pdf'] },
  { mimeType: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
  { mimeType: 'image/png', extensions: ['png'] },
] as const;
export const JUSTIFICATION_ACCEPT = JUSTIFICATION_FILE_TYPES.map(t => t.mimeType).join(',');

function studentPath(studentId: string): string {
  if (!isGuardianStudentId(studentId)) throw new GuardianValidationError('Seleccione un estudiante vinculado.');
  return `/v1/guardian/students/${studentId}`;
}
function positiveId(value: number, message: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new GuardianValidationError(message);
  return value;
}

export function justificationTextError(value: string, label: 'motivo' | 'respuesta'): string | null {
  const text = value.trim();
  if (!text) return `Indica ${label === 'motivo' ? 'el motivo' : 'la respuesta'}.`;
  return text.length > JUSTIFICATION_TEXT_MAX_LENGTH ? `${label === 'motivo' ? 'El motivo' : 'La respuesta'} no puede superar los ${JUSTIFICATION_TEXT_MAX_LENGTH} caracteres.` : null;
}

export function justificationFileError(file: File | null | undefined): string | null {
  if (!file) return null;
  if (file.size === 0) return 'El archivo adjunto está vacío.';
  if (file.size > JUSTIFICATION_FILE_MAX_BYTES) return 'El archivo adjunto supera los 15 MB.';
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  const type = JUSTIFICATION_FILE_TYPES.find(t => t.mimeType === file.type);
  if (!type || !(type.extensions as readonly string[]).includes(extension)) return 'Solo se admiten archivos PDF, JPEG o PNG.';
  return null;
}

function multipart(field: 'reason' | 'response', value: string, file?: File | null): FormData {
  const textError = justificationTextError(value, field === 'reason' ? 'motivo' : 'respuesta');
  if (textError) throw new GuardianValidationError(textError);
  const fileError = justificationFileError(file);
  if (fileError) throw new GuardianValidationError(fileError);
  const form = new FormData();
  form.append(field, value.trim());
  if (file) form.append('file', file, file.name);
  return form;
}

const multipartConfig = { headers: { 'Content-Type': undefined } };

export const guardianJustificationsService = {
  /** Una INASISTENCIA o TARDANZA dentro del plazo (dos días hábiles posteriores, America/Lima). Responde 201. */
  async submit(studentId: string, attendanceId: number, reason: string, file?: File | null): Promise<AttendanceJustification> {
    const path = `${studentPath(studentId)}/attendance/${positiveId(attendanceId, 'Selecciona una sesión de asistencia.')}/justifications`;
    const response = await httpClient.post<unknown>(path, multipart('reason', reason, file), multipartConfig);
    if (response.status !== 201) throw new GuardianContractError('justificación');
    const created = parseAttendanceJustification(response.data, { studentId: Number(studentId) });
    if (created.attendanceId !== attendanceId || created.status !== 'PENDIENTE') throw new GuardianContractError('justificación');
    return created;
  },
  async list(studentId: string, options: { status?: JustificationStatus | null; page?: number; size?: number } = {}, signal?: AbortSignal): Promise<AttendanceJustificationsPage> {
    const page = options.page ?? 0, size = options.size ?? JUSTIFICATION_PAGE_SIZE;
    if (!isValidGuardianPage(page, size)) throw new GuardianValidationError('La paginación solicitada no es válida.');
    const params = options.status ? { status: options.status, page, size } : { page, size };
    const response = await httpClient.get<unknown>(`${studentPath(studentId)}/justifications`, { params, signal });
    const result = parseAttendanceJustificationsPage(response.data, { page, size, studentId: Number(studentId) });
    if (options.status && result.content.some(j => j.status !== options.status)) throw new GuardianContractError('justificaciones');
    return result;
  },
  async detail(studentId: string, id: number, signal?: AbortSignal): Promise<AttendanceJustification> {
    const response = await httpClient.get<unknown>(`${studentPath(studentId)}/justifications/${positiveId(id, 'Selecciona una solicitud.')}`, { signal });
    return parseAttendanceJustification(response.data, { studentId: Number(studentId), id });
  },
  /** Respuesta a una solicitud OBSERVADA: vuelve a PENDIENTE. */
  async respond(studentId: string, id: number, responseText: string, file?: File | null): Promise<AttendanceJustification> {
    const path = `${studentPath(studentId)}/justifications/${positiveId(id, 'Selecciona una solicitud.')}/response`;
    const response = await httpClient.post<unknown>(path, multipart('response', responseText, file), multipartConfig);
    if (response.status !== 200) throw new GuardianContractError('justificación');
    const updated = parseAttendanceJustification(response.data, { studentId: Number(studentId), id });
    if (updated.status !== 'PENDIENTE') throw new GuardianContractError('justificación');
    return updated;
  },
  /** URL firmada por 5 minutos. No se guarda ni se muestra. */
  async attachmentUrl(studentId: string, id: number): Promise<JustificationAttachmentUrl> {
    const response = await httpClient.post<unknown>(`${studentPath(studentId)}/justifications/${positiveId(id, 'Selecciona una solicitud.')}/attachment/download-url`);
    if (response.status !== 200) throw new GuardianContractError('descarga del adjunto');
    return parseJustificationAttachmentUrl(response.data);
  },
};

export function guardianJustificationsErrorMessage(error: unknown, action: GuardianJustificationAction): string {
  return guardianJustificationErrorMessage(error, action);
}
