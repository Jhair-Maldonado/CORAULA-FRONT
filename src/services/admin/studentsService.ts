import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { PagedStudentsResponse, StudentDetailResponse, StudentListParams, UpdateStudentRequest } from '@/types/studentApi';

const endpoint = '/v1/management/students';
export const studentsService = {
  async list(params: StudentListParams = {}): Promise<PagedStudentsResponse> {
    return (await httpClient.get<PagedStudentsResponse>(endpoint, { params })).data;
  },
  async getById(studentId: string): Promise<StudentDetailResponse> {
    return (await httpClient.get<StudentDetailResponse>(`${endpoint}/${encodeURIComponent(studentId)}`)).data;
  },
  async update(studentId: string, payload: UpdateStudentRequest): Promise<StudentDetailResponse> {
    return (await httpClient.patch<StudentDetailResponse>(`${endpoint}/${encodeURIComponent(studentId)}`, payload)).data;
  },
};

export function studentErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

export function studentErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  const body: unknown = error.response.data;
  const message = typeof body === 'string' && body.trim() ? body :
    body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message.trim() ? body.message : undefined;
  switch (error.response.status) {
    case 400: return message || 'Revisa los datos ingresados; la solicitud no es válida.';
    case 401: return 'Tu sesión no permite completar la solicitud.';
    case 403: return 'No tienes autorización para realizar esta operación.';
    case 404: return 'Alumno no encontrado.';
    case 409: return message || 'El DNI o código ya pertenece a otro registro. Revisa los datos.';
    default: return 'El servidor no pudo completar la solicitud. Intenta nuevamente.';
  }
}
