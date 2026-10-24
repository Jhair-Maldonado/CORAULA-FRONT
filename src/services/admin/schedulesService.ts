import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { CreateScheduleRequest, ScheduleResponse, UpdateScheduleRequest } from '@/types/scheduleApi';

const endpoint = '/v1/management/schedules';
export const schedulesService = {
  async listBySection(sectionId: string | number): Promise<ScheduleResponse[]> {
    return (await httpClient.get<ScheduleResponse[]>(`/v1/management/sections/${encodeURIComponent(sectionId)}/schedule`)).data;
  },
  async create(request: CreateScheduleRequest): Promise<ScheduleResponse> {
    return (await httpClient.post<ScheduleResponse>(endpoint, request)).data;
  },
  async update(id: number, request: UpdateScheduleRequest): Promise<ScheduleResponse> {
    return (await httpClient.patch<ScheduleResponse>(`${endpoint}/${id}`, request)).data;
  },
  async remove(id: number): Promise<void> {
    await httpClient.delete(`${endpoint}/${id}`);
  },
};

export interface ScheduleError {
  status?: number;
  message: string;
  details: string[];
}

function detailText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
    const field = 'field' in value && typeof value.field === 'string' ? `${value.field}: ` : '';
    return field + value.message;
  }
  return JSON.stringify(value) ?? String(value);
}

export function scheduleError(error: unknown): ScheduleError {
  if (!isAxiosError(error)) return { message: error instanceof Error ? error.message : 'No se pudo completar la solicitud.', details: [] };
  if (!error.response) return { message: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.', details: [] };
  const status = error.response.status;
  const body: unknown = error.response.data;
  const defaults: Record<number, string> = {
    400: 'Revisa los datos ingresados.', 401: 'Tu sesión no permite completar la solicitud.',
    403: 'No tienes permisos para realizar esta operación.', 404: 'El recurso solicitado no existe.',
    409: 'El horario entra en conflicto con otras clases.', 422: 'No se cumple una regla de negocio. Actualiza los recursos y revisa los datos.',
  };
  const message = status === 401 ? defaults[401] : typeof body === 'string' && body.trim() ? body :
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message.trim() ? body.message :
      defaults[status] ?? 'El servidor no pudo completar la solicitud. Intenta nuevamente.';
  const raw = body && typeof body === 'object' && 'details' in body ? body.details : undefined;
  return { status, message, details: raw == null ? [] : (Array.isArray(raw) ? raw : [raw]).map(detailText) };
}
