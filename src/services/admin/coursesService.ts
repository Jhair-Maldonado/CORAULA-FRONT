import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { CourseListParams, CourseResponse, CreateCourseRequest, UpdateCourseRequest, PagedCourseResponse } from '@/types/courseApi';
const endpoint = '/v1/management/courses';
export const coursesService = {
  async list(params: CourseListParams = {}): Promise<PagedCourseResponse> {
    return (await httpClient.get<PagedCourseResponse>(endpoint, { params })).data;
  },
  async getById(id: string): Promise<CourseResponse> {
    return (await httpClient.get<CourseResponse>(`${endpoint}/${encodeURIComponent(id)}`)).data;
  },
  async create(payload: CreateCourseRequest): Promise<CourseResponse> {
    return (await httpClient.post<CourseResponse>(endpoint, payload)).data;
  },
  async update(id: string, payload: UpdateCourseRequest): Promise<CourseResponse> {
    return (await httpClient.patch<CourseResponse>(`${endpoint}/${encodeURIComponent(id)}`, payload)).data;
  },
};
export function courseErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}
export function courseErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  const body: unknown = error.response.data;
  const message = typeof body === 'string' && body.trim() ? body :
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message.trim()
      ? body.message : undefined;
  switch (error.response.status) {
    case 400: return message || 'Revisa los campos: código, nombre, nivel, área y horas semanales (entero entre 1 y 40).';
    case 401: return 'Tu sesión no permite completar la solicitud.';
    case 403: return 'No tienes autorización para realizar esta operación.';
    case 404: return 'Curso no encontrado.';
    case 409: return 'Ya existe un curso con ese código. Utiliza un código diferente.';
    default: return message || 'No se pudo completar la solicitud. Intenta nuevamente.';
  }
}
