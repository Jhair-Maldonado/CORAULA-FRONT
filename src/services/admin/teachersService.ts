import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { CreateTeacherRequest, PagedTeachersResponse, TeacherDetailResponse, TeacherListParams, TeacherResponse, UpdateTeacherRequest } from '@/types/teacherApi';

const endpoint = '/v1/management/teachers';
export const teachersService = {
  async list(params: TeacherListParams = {}): Promise<PagedTeachersResponse> {
    return (await httpClient.get<PagedTeachersResponse>(endpoint, { params })).data;
  },
  async getById(id: string): Promise<TeacherDetailResponse> {
    return (await httpClient.get<TeacherDetailResponse>(`${endpoint}/${encodeURIComponent(id)}`)).data;
  },
  async create(payload: CreateTeacherRequest): Promise<TeacherResponse> {
    return (await httpClient.post<TeacherResponse>(endpoint, payload)).data;
  },
  async update(id: string, payload: UpdateTeacherRequest): Promise<TeacherResponse> {
    return (await httpClient.patch<TeacherResponse>(`${endpoint}/${encodeURIComponent(id)}`, payload)).data;
  },
};

export function teacherErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function teacherErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  const body: unknown = error.response.data;
  const message = typeof body === 'string' && body.trim() ? body :
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message.trim() ? body.message : undefined;
  switch (error.response.status) {
    case 400: return message || 'Revisa los datos ingresados; la solicitud no es válida.';
    case 401: return 'Tu sesión no permite completar la solicitud.';
    case 403: return 'No tienes autorización para realizar esta operación.';
    case 404: return 'Docente no encontrado.';
    case 409: return 'Ya existe una persona con ese DNI. Utiliza un DNI diferente.';
    case 422: return message || 'La operación no cumple las reglas de negocio.';
    default: return 'El servidor no pudo completar la solicitud. Intenta nuevamente.';
  }
}
