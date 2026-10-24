import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { CreateStudentRequest, PagedStudentsResponse, StudentDetailResponse, StudentListParams, UpdateStudentRequest } from '@/types/studentApi';

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
  async create(request: CreateStudentRequest): Promise<StudentDetailResponse> {
    // Whitelist the wire fields; studentCode and UI-only fields never travel.
    const response = await httpClient.post<StudentDetailResponse>(endpoint, {
      dni: request.dni, firstNames: request.firstNames, paternalLastName: request.paternalLastName,
      maternalLastName: request.maternalLastName, birthDate: request.birthDate, phone: request.phone, reason: request.reason,
    });
    const data = response.data;
    if (response.status !== 201 || !data || !Number.isSafeInteger(data.studentId) || data.studentId <= 0 || data.dni !== request.dni) {
      throw new Error('La respuesta del registro no coincide con la solicitud.');
    }
    return data;
  },
};

// Without a response, a 5xx or an unexpected body, the student may or may not exist: never retry automatically.
export function isUncertainStudentCreate(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

export function studentCreateErrorMessage(error: unknown): string {
  if (isUncertainStudentCreate(error)) return 'No se pudo confirmar el registro. Busca al alumno en el listado antes de intentarlo de nuevo.';
  switch (studentErrorStatus(error)) {
    case 400: return 'Revisa los datos del alumno: DNI de 8 dígitos, nombres, apellido paterno y fecha de nacimiento válidos.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede registrar alumnos.';
    case 409: return 'No se pudo registrar: el DNI ya está registrado para otra persona.';
    default: return 'No se pudo registrar al alumno. Intenta nuevamente.';
  }
}

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
