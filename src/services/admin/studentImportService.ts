import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { StudentImportConfirmation, StudentImportHttpError, StudentImportPreview } from '@/types/studentImport';

async function upload<T>(action: 'preview' | 'confirm', file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  const response = await httpClient.post<T>(
    `/v1/management/students/import/${action}`,
    form,
    // Override the client's JSON default; browser supplies multipart boundary.
    { headers: { 'Content-Type': undefined } },
  );
  return response.data;
}

export const studentImportService = {
  preview: (file: File) => upload<StudentImportPreview>('preview', file),
  confirm: (file: File) => upload<StudentImportConfirmation>('confirm', file),
};

export function studentImportErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  const status = error.response?.status;
  const body: unknown = error.response?.data;
  // Defensive extraction, without declaring an unconfirmed error-envelope contract.
  const message = typeof body === 'string' ? body :
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message : null;
  if (status === 400) return message || 'El archivo o su estructura no son válidos.';
  if (status === 401) return 'La sesión no permite completar la solicitud.';
  if (status === 403) return message || 'No tienes autorización para importar matrículas.';
  if (status === 409) return message || 'Existe un conflicto al confirmar la matrícula. Revisa el archivo.';
  return message ? `${message} — Intenta nuevamente.` : 'No se pudo conectar o completar la solicitud. Intenta nuevamente.';
}

export function studentImportErrorPreview(error: unknown): StudentImportPreview | null {
  if (!isAxiosError<StudentImportHttpError>(error) ||
      ![400, 409].includes(error.response?.status ?? 0)) return null;
  return error.response?.data?.preview ?? null;
}
