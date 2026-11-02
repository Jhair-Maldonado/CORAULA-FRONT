import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { CLASS_MATERIALS_CONTRACT_STATUSES, parseClassMaterials, parseDownloadUrl, type ClassMaterialsErrorCode } from '@/lib/classMaterialsContract';
import type { ClassMaterial, MaterialDownloadUrl } from '@/types/teacherMaterialsApi';

// Backend #53 (docs/class-materials.md): ManagementClassMaterialsController. Read-only for ADMINISTRADOR and
// DIRECTIVO: published and withdrawn materials and fresh signed URLs (the backend audits each one).
const base = (sectionCourseId: number) => `/v1/management/section-courses/${requestId(sectionCourseId)}/materials`;
function requestId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El curso o el material no son válidos.');
  return value;
}

export const MANAGEMENT_MATERIALS_EMPTY_MESSAGE = 'Este curso no tiene materiales.';

export const managementMaterialsService = {
  async list(sectionCourseId: number, signal?: AbortSignal): Promise<ClassMaterial[]> {
    return parseClassMaterials((await httpClient.get<unknown>(base(sectionCourseId), { signal })).data, sectionCourseId);
  },
  /** The URL is used at once by the caller; it is never stored or logged. */
  async downloadUrl(sectionCourseId: number, materialId: number): Promise<MaterialDownloadUrl> {
    return parseDownloadUrl((await httpClient.post<unknown>(`${base(sectionCourseId)}/${requestId(materialId)}/download-url`)).data);
  },
};

export function managementMaterialsErrorCode(error: unknown): ClassMaterialsErrorCode | null {
  return contractErrorCode<ClassMaterialsErrorCode>(error, CLASS_MATERIALS_CONTRACT_STATUSES);
}

/** After these failures the list no longer matches the server: reload it. */
export function managementMaterialsRequireReload(error: unknown): boolean {
  const code = managementMaterialsErrorCode(error);
  return code === 'MATERIAL_WITHDRAWN' || code === 'MATERIAL_CONTEXT_UNAVAILABLE' || code === 'FILE_NOT_FOUND';
}

// Server messages are never echoed.
export function managementMaterialsErrorMessage(error: unknown, action: 'list' | 'download'): string {
  switch (managementMaterialsErrorCode(error)) {
    case 'MATERIAL_WITHDRAWN': return 'El material fue retirado. Se actualizó el listado.';
    case 'FILE_NOT_FOUND': return 'El archivo del material ya no está disponible. Se actualizó el listado.';
    case 'MATERIAL_CONTEXT_UNAVAILABLE': return action === 'download' ? 'Material o curso no disponible. Se actualizó el listado.' : 'Material o curso no disponible.';
    case 'FILE_STORAGE_UNAVAILABLE': return 'El almacenamiento de archivos no está disponible. Intenta más tarde.';
    case 'VALIDATION_ERROR': return 'El curso o el material no son válidos.';
    case 'MATERIAL_METHOD_NOT_ALLOWED': return 'La operación no está permitida.';
  }
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudo completar la operación.';
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para consultar los materiales de este curso.';
    case 404: return 'Material o curso no disponible.';
    default: return action === 'list' ? 'No se pudieron consultar los materiales. Intenta nuevamente.' : 'No se pudo completar la operación. Intenta nuevamente.';
  }
}
