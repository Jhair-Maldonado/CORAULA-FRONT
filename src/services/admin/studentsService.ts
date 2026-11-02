import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { studentErrorCode, studentErrorCodeMessage } from '@/services/admin/studentErrors';
import type { CreateStudentGuardianRequest, CreateStudentRequest, GuardianSummaryResponse, PagedStudentsResponse, StudentDetailResponse, StudentListParams, UpdateStudentRequest } from '@/types/studentApi';

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
  async addGuardian(studentId: number, request: CreateStudentGuardianRequest): Promise<GuardianSummaryResponse> {
    // Whitelist the wire fields; personId and UI-only fields never travel.
    const response = await httpClient.post<GuardianSummaryResponse>(`${endpoint}/${encodeURIComponent(String(studentId))}/guardians`, {
      dni: request.dni, firstNames: request.firstNames, paternalLastName: request.paternalLastName, maternalLastName: request.maternalLastName,
      phone: request.phone, relationship: request.relationship, primary: request.primary, authorizedPickup: request.authorizedPickup, reason: request.reason,
    });
    const data = response.data;
    if (response.status !== 201 || !data || !Number.isSafeInteger(data.guardianId) || data.guardianId <= 0 || data.dni !== request.dni
      || data.relationship !== request.relationship || data.primary !== request.primary || data.authorizedPickup !== request.authorizedPickup || data.active !== true) {
      throw new Error('La respuesta del alta de apoderado no coincide con la solicitud.');
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
  const byCode = studentErrorCodeMessage(error);
  if (byCode) return byCode;
  switch (studentErrorStatus(error)) {
    case 400: return 'Revisa los datos del alumno: DNI de 8 dígitos, nombres, apellido paterno y fecha de nacimiento válidos.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede registrar alumnos.';
    case 409: return 'No se pudo registrar: el DNI ya está registrado para otra persona.';
    default: return 'No se pudo registrar al alumno. Intenta nuevamente.';
  }
}

// Same uncertainty rule as the student create: the link may or may not exist.
export const isUncertainGuardianCreate = isUncertainStudentCreate;

export function guardianCreateErrorMessage(error: unknown): string {
  if (isUncertainGuardianCreate(error)) return 'No se pudo confirmar el alta del apoderado. Revisa la lista de apoderados antes de intentarlo de nuevo.';
  const byCode = studentErrorCodeMessage(error);
  if (byCode) return studentErrorCode(error) === 'DNI_ALREADY_EXISTS' ? byCode + ' Si es el apoderado de un hermano, por ahora no se puede vincular desde aquí.' : byCode;
  switch (studentErrorStatus(error)) {
    case 400: return 'Revisa los datos del apoderado: DNI de 8 dígitos, nombres, apellido paterno y relación.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede agregar apoderados.';
    case 404: return 'El alumno ya no existe. Vuelve al listado.';
    case 409: return 'No se pudo agregar: el DNI ya está registrado (por ejemplo, como apoderado de un hermano), la persona ya es apoderado de este alumno, o ya existe un apoderado principal. Si es el apoderado de un hermano, por ahora no se puede vincular desde aquí.';
    default: return 'No se pudo agregar al apoderado. Intenta nuevamente.';
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

// Student edit (PATCH): a recognized code wins; otherwise the backend message/HTTP text as before.
export function studentUpdateErrorMessage(error: unknown): string {
  return studentErrorCodeMessage(error) ?? studentErrorMessage(error);
}
