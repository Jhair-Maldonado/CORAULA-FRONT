import type { ClassMaterial, MaterialDownloadUrl } from '@/types/teacherMaterialsApi';

// Backend #53 (docs/class-materials.md): material contract shared by the teacher (FRONT #52) and management views.
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

// ClassMaterialsExceptionHandler: the same codes for the three audiences; 401/403 never carry a code.
export const CLASS_MATERIALS_CONTRACT_STATUSES = {
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
export type ClassMaterialsErrorCode = keyof typeof CLASS_MATERIALS_CONTRACT_STATUSES;

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

/**
 * Sends a freshly requested signed URL to a tab opened beforehand with openPendingDownloadTab. On any failure
 * (including a URL that is not http/https, rejected by parseDownloadUrl) the tab is closed and the error rethrown.
 * The URL is neither stored nor logged.
 */
export async function deliverToPendingTab(tab: PendingDownloadTab, requestUrl: () => Promise<MaterialDownloadUrl>): Promise<void> {
  try {
    const { url } = await requestUrl();
    tab.location.replace(url);
  } catch (failure) {
    tab.close();
    throw failure;
  }
}
