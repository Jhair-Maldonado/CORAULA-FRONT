import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import type { ClassMaterial, MaterialDownloadUrl, PublishClassMaterialRequest } from '@/types/teacherMaterialsApi';

// Backend #53/#47 file rules, copied from develop:
// - FileContext.MATERIAL = {PDF, DOCX, PPTX}; FileType mime types and extensions below.
// - StoredFileService.MAX_BYTES = 15 * 1024 * 1024 (15 728 640 bytes), MAX_NAME_LENGTH = 255.
// - ClassMaterial.requiredText(title, 255); description ≤ 2000 (blank = null); withdrawal reason 1–1000.
// The backend checks the real content signature; these checks only avoid an upload that would be rejected.
export const MATERIAL_FILE_TYPES = [
  { extension: 'pdf', mimeType: 'application/pdf', label: 'PDF' },
  { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word (.docx)' },
  { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint (.pptx)' },
] as const;
export const MATERIAL_MAX_BYTES = 15 * 1024 * 1024;
export const MATERIAL_MAX_NAME_LENGTH = 255;
export const MATERIAL_TITLE_MAX_LENGTH = 255;
export const MATERIAL_DESCRIPTION_MAX_LENGTH = 2000;
export const MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH = 1000;
export const MATERIAL_ACCEPT = MATERIAL_FILE_TYPES.flatMap(t => [`.${t.extension}`, t.mimeType]).join(',');

const contractStatuses = {
  VALIDATION_ERROR: [400],
  FILE_EMPTY: [400],
  FILE_TOO_LARGE: [400],
  FILE_NAME_INVALID: [400],
  FILE_TYPE_NOT_ALLOWED: [400],
  FILE_NOT_FOUND: [404],
  MATERIAL_CONTEXT_UNAVAILABLE: [404],
  MATERIAL_WITHDRAWN: [409],
  MATERIAL_METHOD_NOT_ALLOWED: [405],
  MATERIAL_INTERNAL_ERROR: [500],
  FILE_STORAGE_UNAVAILABLE: [503],
} as const satisfies Record<string, readonly number[]>;
export type TeacherMaterialsErrorCode = keyof typeof contractStatuses;
export const TEACHER_MATERIALS_ERROR_CODES = Object.keys(contractStatuses) as TeacherMaterialsErrorCode[];

const base = (sectionCourseId: number) => `/v1/teacher/courses/${requestId(sectionCourseId)}/materials`;
function requestId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El curso o el material no son válidos.');
  return value;
}

function invalid(): never { throw new Error('La respuesta de materiales no coincide con el contrato.'); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function id(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid(); return value; }
function text(value: unknown, max?: number): string { if (typeof value !== 'string' || !value.trim() || (max && value.length > max)) return invalid(); return value; }
function timestamp(value: unknown): string { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return invalid(); return value; }

export function parseClassMaterial(value: unknown, sectionCourseId: number): ClassMaterial {
  const m = object(value);
  if (id(m.sectionCourseId) !== sectionCourseId) return invalid();
  if (m.status !== 'PUBLICADO' && m.status !== 'RETIRADO') return invalid();
  if (m.description !== null && (typeof m.description !== 'string' || !m.description.trim() || m.description.length > MATERIAL_DESCRIPTION_MAX_LENGTH)) return invalid();
  const f = object(m.file);
  const sizeBytes = f.sizeBytes;
  if (!MATERIAL_FILE_TYPES.some(t => t.mimeType === f.mimeType)) return invalid();
  if (typeof sizeBytes !== 'number' || !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MATERIAL_MAX_BYTES) return invalid();
  // ClassMaterial invariant: withdrawal data exists iff the material is RETIRADO.
  const withdrawn = m.status === 'RETIRADO';
  if (!withdrawn && (m.withdrawnAt !== null || m.withdrawnByUserId !== null || m.withdrawalReason !== null)) return invalid();
  return {
    id: id(m.id), sectionCourseId, authorTeacherId: id(m.authorTeacherId), authorTeacherName: text(m.authorTeacherName),
    title: text(m.title, MATERIAL_TITLE_MAX_LENGTH), description: m.description as string | null, status: m.status,
    createdAt: timestamp(m.createdAt), publishedAt: timestamp(m.publishedAt),
    withdrawnAt: withdrawn ? timestamp(m.withdrawnAt) : null, withdrawnByUserId: withdrawn ? id(m.withdrawnByUserId) : null,
    withdrawalReason: withdrawn ? text(m.withdrawalReason, MATERIAL_WITHDRAWAL_REASON_MAX_LENGTH) : null,
    file: { originalName: text(f.originalName, MATERIAL_MAX_NAME_LENGTH), mimeType: f.mimeType as string, sizeBytes },
  };
}

export function parseClassMaterials(value: unknown, sectionCourseId: number): ClassMaterial[] {
  if (!Array.isArray(value)) return invalid();
  const list = value.map(item => parseClassMaterial(item, sectionCourseId));
  if (new Set(list.map(m => m.id)).size !== list.length) return invalid();
  return list;
}

export function parseDownloadUrl(value: unknown): MaterialDownloadUrl {
  const d = object(value);
  if (typeof d.url !== 'string') return invalid();
  let parsed: URL;
  try { parsed = new URL(d.url); } catch { return invalid(); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return invalid();
  if (typeof d.expiresInSeconds !== 'number' || !Number.isSafeInteger(d.expiresInSeconds) || d.expiresInSeconds <= 0) return invalid();
  return { url: d.url, expiresInSeconds: d.expiresInSeconds };
}

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

export const DOWNLOAD_POPUP_BLOCKED_MESSAGE = 'Tu navegador bloqueó la descarga; permite ventanas emergentes para este sitio';

/** The tab that will receive the signed URL. Only what the download flow uses from Window. */
export interface PendingDownloadTab { opener: unknown; location: { replace(url: string): void }; close(): void }

/**
 * Opens an empty tab synchronously inside the click, so pop-up blockers allow it, and cuts its link to this page.
 * Returns null when the browser blocked it. The signed URL is assigned later with location.replace.
 */
export function openPendingDownloadTab(open: (url: string, target: string) => PendingDownloadTab | null = (u, t) => window.open(u, t)): PendingDownloadTab | null {
  const tab = open('', '_blank');
  if (tab) tab.opener = null;
  return tab;
}

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
