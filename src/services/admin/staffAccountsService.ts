import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { accountEmailError, normalizeAccountEmail } from '@/services/admin/teachersService';
import type { CreateStaffAccountRequest, CreateStaffAccountResponse, StaffAccountSummary, StaffListParams } from '@/types/staffAccountApi';

// BACK #105: Secretaría (DIRECTIVO) accounts. Wire details live here only, so a contract adjustment
// in the backend CONFIRMACIÓN touches this file and the types.
const endpoint = '/v1/management/staff';

export interface StaffFormValues {
  dni: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string;
  phone: string;
  email: string;
}

export const emptyStaffForm: StaffFormValues = { dni: '', firstNames: '', paternalLastName: '', maternalLastName: '', phone: '', email: '' };

const nameLimit = 120;
const phoneLimit = 30;

export function staffFormValidation(values: StaffFormValues): string | null {
  if (!/^\d{8}$/.test(values.dni.trim())) return 'El DNI debe tener exactamente 8 dígitos.';
  if (!values.firstNames.trim() || !values.paternalLastName.trim()) return 'Nombres y apellido paterno son obligatorios.';
  if ([values.firstNames, values.paternalLastName, values.maternalLastName].some(value => value.trim().length > nameLimit)) {
    return `Nombres y apellidos no pueden superar ${nameLimit} caracteres.`;
  }
  if (values.phone.trim().length > phoneLimit) return `El teléfono no puede superar ${phoneLimit} caracteres.`;
  if (!values.email.trim()) return 'Ingresa el correo de la cuenta.';
  return accountEmailError(values.email);
}

export function toCreateStaffAccount(values: StaffFormValues): CreateStaffAccountRequest {
  const optional = (value: string) => value.trim() || null;
  return {
    dni: values.dni.trim(),
    firstNames: values.firstNames.trim(),
    paternalLastName: values.paternalLastName.trim(),
    maternalLastName: optional(values.maternalLastName),
    phone: optional(values.phone),
    email: normalizeAccountEmail(values.email),
  };
}

const isSummary = (value: unknown): value is StaffAccountSummary => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return Number.isSafeInteger(item.userId) && typeof item.email === 'string' && typeof item.active === 'boolean';
};

export const staffAccountsService = {
  async list(params: StaffListParams = {}): Promise<StaffAccountSummary[]> {
    const query: StaffListParams = {};
    if (params.status) query.status = params.status;
    if (params.q?.trim()) query.q = params.q.trim();
    const data: unknown = (await httpClient.get<StaffAccountSummary[]>(endpoint, { params: query })).data;
    if (!Array.isArray(data) || !data.every(isSummary)) throw new Error('Respuesta del listado de personal inesperada');
    return data;
  },
  async create(payload: CreateStaffAccountRequest): Promise<CreateStaffAccountResponse> {
    const response = await httpClient.post<CreateStaffAccountResponse>(endpoint, payload);
    const created = response.data;
    if (response.status !== 201 || !created || !Number.isSafeInteger(created.userId) || created.role !== 'DIRECTIVO'
      || created.dni !== payload.dni || normalizeAccountEmail(created.email ?? '') !== payload.email) {
      throw new Error('Respuesta del alta de personal inesperada');
    }
    return created;
  },
};

// Codes from BACK #105 used to tell the 409 causes apart; anything else falls back to the HTTP status.
const staffContractStatuses = {
  PERSON_DNI_CONFLICT: [409],
  VALIDATION_ERROR: [400],
  INVALID_REQUEST_BODY: [400],
} as const satisfies Record<string, readonly number[]>;

// Without a response, a 5xx or an unexpected body, the account may or may not exist: never retry automatically.
export function isUncertainStaffCreate(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

// Backend texts are never shown.
export function staffCreateErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo confirmar el alta. Actualiza el listado antes de volver a intentarlo.';
  if (!error.response) return 'No se pudo conectar con el servidor. Actualiza el listado antes de volver a intentarlo.';
  if (contractErrorCode(error, staffContractStatuses) === 'PERSON_DNI_CONFLICT') {
    return 'Ya existe una persona registrada con ese DNI. No se puede reutilizar para una cuenta de Secretaría.';
  }
  switch (error.response.status) {
    case 400: return 'Revisa los datos: DNI de 8 dígitos, nombres, apellido paterno y un correo válido.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede crear cuentas de Secretaría.';
    case 409: return 'El correo ya está en uso por otra cuenta, o el DNI ya está registrado.';
    default: return 'El servidor no pudo completar el alta. Actualiza el listado antes de volver a intentarlo.';
  }
}

export function staffLoadErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo leer el listado de personal.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  switch (error.response.status) {
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes acceso a la gestión de personal.';
    default: return 'No se pudo cargar el listado de personal. Intenta nuevamente.';
  }
}
