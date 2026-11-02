import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import {
  CLASS_MATERIALS_CONTRACT_STATUSES, MATERIAL_DESCRIPTION_MAX_LENGTH, MATERIAL_FILE_TYPES, MATERIAL_MAX_BYTES, MATERIAL_MAX_NAME_LENGTH,
  MATERIAL_TITLE_MAX_LENGTH, MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH, parseClassMaterial, parseClassMaterials, parseDownloadUrl,
} from '@/lib/classMaterialsContract';
import type { ClassMaterial, MaterialDownloadUrl, PublishClassMaterialRequest } from '@/types/teacherMaterialsApi';

// The material contract lives in @/lib/classMaterialsContract (shared with management); re-exported for existing callers.
export {
  DOWNLOAD_POPUP_BLOCKED_MESSAGE, MATERIAL_DESCRIPTION_MAX_LENGTH, MATERIAL_FILE_TYPES, MATERIAL_MAX_BYTES, MATERIAL_MAX_NAME_LENGTH,
  MATERIAL_TITLE_MAX_LENGTH, MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH, openPendingDownloadTab, parseClassMaterial, parseClassMaterials, parseDownloadUrl,
} from '@/lib/classMaterialsContract';
export type { PendingDownloadTab } from '@/lib/classMaterialsContract';

export const MATERIAL_ACCEPT = MATERIAL_FILE_TYPES.flatMap(t => [`.${t.extension}`, t.mimeType]).join(',');

const contractStatuses = CLASS_MATERIALS_CONTRACT_STATUSES;
export type TeacherMaterialsErrorCode = keyof typeof contractStatuses;
export const TEACHER_MATERIALS_ERROR_CODES = Object.keys(contractStatuses) as TeacherMaterialsErrorCode[];

const base = (sectionCourseId: number) => `/v1/teacher/courses/${requestId(sectionCourseId)}/materials`;
function requestId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El curso o el material no son válidos.');
  return value;
}

function invalid(): never { throw new Error('La respuesta de materiales no coincide con el contrato.'); }

/** Teacher-side file check (own copy; the shared materialesService validation is not used). */
export function materialFileError(file: Pick<File, 'name' | 'size' | 'type'> | null | undefined): string | null {
  if (!file) return 'Selecciona un archivo.';
  const name = file.name.slice(Math.max(file.name.lastIndexOf('/'), file.name.lastIndexOf('\\')) + 1).trim();
  if (!name || name.length > MATERIAL_MAX_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) return 'El nombre del archivo no es válido (hasta 255 caracteres).';
  const dot = name.lastIndexOf('.');
  const extension = dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
  const type = MATERIAL_FILE_TYPES.find(t => t.extension === extension);
  if (!type) return 'Formato no permitido. Solo PDF, Word (.docx) o PowerPoint (.pptx).';
  // The browser type is advisory; a different known type contradicts the extension.
  if (file.type && file.type !== 'application/octet-stream' && file.type !== type.mimeType) return 'El tipo del archivo no coincide con su extensión.';
  if (file.size <= 0) return 'El archivo está vacío.';
  if (file.size > MATERIAL_MAX_BYTES) return 'El archivo supera el máximo de 15 MB.';
  return null;
}

export function materialTitleError(title: string): string | null {
  const value = title.trim();
  if (!value) return 'Escribe el título del material.';
  return value.length > MATERIAL_TITLE_MAX_LENGTH ? `El título admite hasta ${MATERIAL_TITLE_MAX_LENGTH} caracteres.` : null;
}
export function materialDescriptionError(description: string): string | null {
  return description.trim().length > MATERIAL_DESCRIPTION_MAX_LENGTH ? `La descripción admite hasta ${MATERIAL_DESCRIPTION_MAX_LENGTH} caracteres.` : null;
}
export function withdrawalReasonError(reason: string): string | null {
  const value = reason.trim();
  if (!value) return 'Indica el motivo del retiro.';
  return value.length > MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH ? `El motivo admite hasta ${MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH} caracteres.` : null;
}

export const teacherMaterialsService = {
  async list(sectionCourseId: number, signal?: AbortSignal): Promise<ClassMaterial[]> {
    return parseClassMaterials((await httpClient.get<unknown>(base(sectionCourseId), { signal })).data, sectionCourseId);
  },
  async publish(sectionCourseId: number, request: PublishClassMaterialRequest): Promise<ClassMaterial> {
    const invalidInput = materialTitleError(request.title) ?? materialDescriptionError(request.description ?? '') ?? materialFileError(request.file);
    if (invalidInput) throw new Error(invalidInput);
    const form = new FormData();
    form.append('title', request.title.trim());
    const description = request.description?.trim();
    if (description) form.append('description', description);
    form.append('file', request.file);
    // Only removes the client's JSON default: the browser sets multipart/form-data with its boundary.
    const response = await httpClient.post<unknown>(base(sectionCourseId), form, { headers: { 'Content-Type': undefined } });
    if (response.status !== 201) return invalid();
    const saved = parseClassMaterial(response.data, sectionCourseId);
    if (saved.status !== 'PUBLICADO' || saved.title !== request.title.trim()) return invalid();
    return saved;
  },
  async withdraw(sectionCourseId: number, materialId: number, reason: string): Promise<ClassMaterial> {
    const invalidReason = withdrawalReasonError(reason);
    if (invalidReason) throw new Error(invalidReason);
    const response = await httpClient.post<unknown>(`${base(sectionCourseId)}/${requestId(materialId)}/withdraw`, { reason: reason.trim() });
    const saved = parseClassMaterial(response.data, sectionCourseId);
    if (saved.id !== materialId || saved.status !== 'RETIRADO') return invalid();
    return saved;
  },
  async downloadUrl(sectionCourseId: number, materialId: number): Promise<MaterialDownloadUrl> {
    return parseDownloadUrl((await httpClient.post<unknown>(`${base(sectionCourseId)}/${requestId(materialId)}/download-url`)).data);
  },
};

export function teacherMaterialsErrorCode(error: unknown): TeacherMaterialsErrorCode | null {
  return contractErrorCode<TeacherMaterialsErrorCode>(error, contractStatuses);
}

/** After these failures the list no longer matches the server: reload it. */
export function materialsRequireReload(error: unknown): boolean {
  const code = teacherMaterialsErrorCode(error);
  return code === 'MATERIAL_WITHDRAWN' || code === 'MATERIAL_CONTEXT_UNAVAILABLE' || code === 'FILE_NOT_FOUND';
}

/** A publish whose result is unknown (no answer or a 5xx other than storage unavailable). */
export function isUncertainPublish(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || (status >= 500 && teacherMaterialsErrorCode(error) !== 'FILE_STORAGE_UNAVAILABLE');
}

// Server messages are never echoed.
export function teacherMaterialsErrorMessage(error: unknown, action: 'list' | 'publish' | 'withdraw' | 'download'): string {
  switch (teacherMaterialsErrorCode(error)) {
    case 'FILE_EMPTY': return 'El archivo está vacío.';
    case 'FILE_TOO_LARGE': return 'El archivo supera el máximo de 15 MB.';
    case 'FILE_NAME_INVALID': return 'El nombre del archivo no es válido.';
    case 'FILE_TYPE_NOT_ALLOWED': return 'El servidor rechazó el formato: solo PDF, Word (.docx) o PowerPoint (.pptx) con contenido real del formato.';
    case 'FILE_STORAGE_UNAVAILABLE': return action === 'publish'
      ? 'El almacenamiento de archivos no está disponible. El material no se publicó.'
      : 'El almacenamiento de archivos no está disponible. Intenta más tarde.';
    case 'FILE_NOT_FOUND': return 'El archivo del material ya no está disponible. Se actualizó el listado.';
    case 'MATERIAL_CONTEXT_UNAVAILABLE': return 'Material o curso no disponible para tu cuenta. Se actualizó el listado.';
    case 'MATERIAL_WITHDRAWN': return 'El material ya fue retirado. Se actualizó el listado.';
    case 'MATERIAL_METHOD_NOT_ALLOWED': return 'La operación no está permitida.';
    case 'MATERIAL_INTERNAL_ERROR': return action === 'publish'
      ? 'El servidor no confirmó la publicación. Revisa el listado antes de volver a enviarlo.'
      : 'No se pudo completar la operación. Intenta nuevamente.';
    case 'VALIDATION_ERROR': return action === 'withdraw' ? 'Revisa el motivo del retiro (1 a 1000 caracteres).' : 'Revisa el título, la descripción y el archivo.';
  }
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudo completar la operación.';
  switch (error.response?.status) {
    case undefined: return action === 'publish'
      ? 'No hubo respuesta del servidor. Revisa el listado antes de volver a enviar el material.'
      : 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para gestionar los materiales de este curso.';
    case 404: return 'Material o curso no disponible para tu cuenta.';
    default: return action === 'publish'
      ? 'El servidor no confirmó la publicación. Revisa el listado antes de volver a enviarlo.'
      : 'No se pudo completar la operación. Intenta nuevamente.';
  }
}
