import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { AuditDetailResponse, AuditListParams, PagedAuditResponse } from '@/types/auditApi';

export const auditService = {
  async list(params: AuditListParams, signal?: AbortSignal): Promise<PagedAuditResponse> {
    return (await httpClient.get<PagedAuditResponse>('/v1/management/audit', { params, signal })).data;
  },
  async detail(id: number, signal?: AbortSignal): Promise<AuditDetailResponse> {
    return (await httpClient.get<AuditDetailResponse>(`/v1/management/audit/${id}`, { signal })).data;
  },
};

export function auditErrorMessage(error: unknown, detail = false): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return 'La sesión ha expirado. Vuelve a iniciar sesión.';
    if (error.response?.status === 403) return 'Acceso no autorizado. No tienes permiso para consultar auditoría.';
    if (detail && error.response?.status === 404) return 'El evento de auditoría ya no está disponible.';
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  }
  return detail ? 'No se pudo cargar el detalle. Intenta nuevamente.' : 'No se pudo cargar la auditoría. Intenta nuevamente.';
}
