import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { CreateTeacherAccountRequest, CreateTeacherRequest, PagedTeachersResponse, TeacherAccountResponse, TeacherDetailResponse, TeacherListParams, TeacherResponse, UpdateTeacherRequest } from '@/types/teacherApi';

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
  async createAccount(id: string, payload: CreateTeacherAccountRequest): Promise<TeacherAccountResponse> {
    const account = (await httpClient.post<TeacherAccountResponse>(`${endpoint}/${encodeURIComponent(id)}/account`, payload)).data;
    if (!account || String(account.teacherId) !== id || typeof account.email !== 'string' || account.role !== 'DOCENTE' || typeof account.created !== 'boolean') {
      throw new Error('Respuesta de cuenta docente inesperada');
    }
    return account;
  },
};

// Mirrors the backend AccountEmailPolicy so typos are caught before the request.
const accountEmailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
export const maxAccountEmailLength = 255;

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function accountEmailError(email: string): string | null {
  const normalized = normalizeAccountEmail(email);
  if (!normalized) return 'Ingresa el correo del docente.';
  if (normalized.length > maxAccountEmailLength) return `El correo no puede superar ${maxAccountEmailLength} caracteres.`;
  if (!accountEmailPattern.test(normalized)) return 'Ingresa un correo con formato válido (por ejemplo, nombre@dominio.com).';
  return null;
}

// Backend texts are never shown: some are in English and 409 covers several causes.
export function teacherAccountErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  switch (error.response.status) {
    case 400: return 'No se pudo crear la cuenta: verifica que el correo sea válido y que el docente tenga DNI registrado.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para crear cuentas de docentes.';
    case 404: return 'Docente no encontrado. Recarga la página.';
    case 409: return 'El correo ya está en uso por otra cuenta, o el docente ya tiene una cuenta vinculada con otro correo.';
    case 422: return 'El docente está inactivo; reactívalo antes de crear su cuenta.';
    default: return 'El servidor no pudo completar la solicitud. Intenta nuevamente.';
  }
}

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
