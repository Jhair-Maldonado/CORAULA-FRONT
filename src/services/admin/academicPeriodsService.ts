import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type {
  AcademicPeriod, AcademicPeriodActivationAction, AcademicPeriodActivationRequest, CreateAcademicPeriodRequest, UpdateAcademicPeriodRequest,
} from '@/types/academicPeriodApi';

const endpoint = '/v1/management/academic-periods';
export const maxAcademicPeriodNameLength = 100;

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseAcademicPeriod(value: unknown): AcademicPeriod {
  const row = value as Partial<Record<keyof AcademicPeriod, unknown>> | null;
  if (!row || typeof row !== 'object' || !Number.isSafeInteger(row.id) || (row.id as number) <= 0 || typeof row.name !== 'string'
    || !isIsoDate(row.startDate) || !isIsoDate(row.endDate) || typeof row.active !== 'boolean' || typeof row.current !== 'boolean') {
    throw new Error('Respuesta de periodo académico inesperada.');
  }
  return { id: row.id as number, name: row.name, startDate: row.startDate, endDate: row.endDate, active: row.active, current: row.current };
}

function checkId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('El ID del periodo académico debe ser un entero positivo.');
}

function sameId(period: AcademicPeriod, id: number) {
  if (period.id !== id) throw new Error('La respuesta no corresponde al periodo académico solicitado.');
  return period;
}

export const maxAcademicPeriodReasonLength = 255;
const activationTargets: Record<AcademicPeriodActivationAction, boolean> = { deactivate: false, reactivate: true };

export function academicPeriodReasonError(reason: string): string | null {
  const motive = reason.trim();
  if (!motive) return 'Indica el motivo.';
  return motive.length > maxAcademicPeriodReasonLength ? `El motivo no puede superar los ${maxAcademicPeriodReasonLength} caracteres.` : null;
}

async function changeActivation(id: number, action: AcademicPeriodActivationAction, reason: string): Promise<AcademicPeriod> {
  checkId(id);
  if (academicPeriodReasonError(reason)) throw new Error('El motivo no es válido.');
  // Only {reason}: the backend rejects extra fields.
  const request: AcademicPeriodActivationRequest = { reason: reason.trim() };
  const period = sameId(parseAcademicPeriod((await httpClient.post<unknown>(`${endpoint}/${id}/${action}`, request)).data), id);
  if (period.active !== activationTargets[action]) throw new Error('La respuesta no refleja el cambio de estado solicitado.');
  return period;
}

export const academicPeriodsService = {
  async list(): Promise<AcademicPeriod[]> {
    const data: unknown = (await httpClient.get<unknown>(endpoint)).data;
    if (!Array.isArray(data)) throw new Error('Respuesta de periodos académicos inesperada.');
    return data.map(parseAcademicPeriod);
  },
  async getById(id: number): Promise<AcademicPeriod> {
    checkId(id);
    return sameId(parseAcademicPeriod((await httpClient.get<unknown>(`${endpoint}/${id}`)).data), id);
  },
  async create(payload: CreateAcademicPeriodRequest): Promise<AcademicPeriod> {
    return parseAcademicPeriod((await httpClient.post<unknown>(endpoint, payload)).data);
  },
  async update(id: number, payload: UpdateAcademicPeriodRequest): Promise<AcademicPeriod> {
    checkId(id);
    if (!Object.keys(payload).length) throw new Error('No hay cambios para guardar.');
    return sameId(parseAcademicPeriod((await httpClient.patch<unknown>(`${endpoint}/${id}`, payload)).data), id);
  },
  deactivate(id: number, reason: string): Promise<AcademicPeriod> {
    return changeActivation(id, 'deactivate', reason);
  },
  reactivate(id: number, reason: string): Promise<AcademicPeriod> {
    return changeActivation(id, 'reactivate', reason);
  },
};

export function academicPeriodValidation(values: CreateAcademicPeriodRequest): string | null {
  const name = values.name.trim();
  if (!name) return 'Ingresa el nombre del periodo académico.';
  if (name.length > maxAcademicPeriodNameLength) return `El nombre no puede superar ${maxAcademicPeriodNameLength} caracteres.`;
  if (!isIsoDate(values.startDate) || !isIsoDate(values.endDate)) return 'Ingresa fechas de inicio y fin válidas.';
  if (values.endDate <= values.startDate) return 'La fecha de fin debe ser posterior a la fecha de inicio.';
  return null;
}

export function academicPeriodChanges(original: AcademicPeriod, values: CreateAcademicPeriodRequest): UpdateAcademicPeriodRequest {
  const changes: UpdateAcademicPeriodRequest = {};
  const name = values.name.trim();
  if (name !== original.name) changes.name = name;
  if (values.startDate !== original.startDate) changes.startDate = values.startDate;
  if (values.endDate !== original.endDate) changes.endDate = values.endDate;
  return changes;
}

// Backend texts are never shown; only the overlap 409 is told apart by its code (#43).
export function academicPeriodErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'No se pudo completar la solicitud. Intenta nuevamente.';
  if (!error.response) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  const body: unknown = error.response.data;
  if (error.response.status === 409 && body && typeof body === 'object' && 'code' in body && body.code === 'ACADEMIC_PERIOD_OVERLAP') {
    return 'Las fechas se solapan con otro periodo académico activo. Las fechas son inclusivas: compartir el primer o el último día también es solapamiento, así que el periodo debe empezar al día siguiente del fin del otro.';
  }
  switch (error.response.status) {
    case 400: return 'Revisa los datos: nombre de 1 a 100 caracteres y fecha de fin posterior a la de inicio.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para gestionar periodos académicos.';
    case 404: return 'Periodo académico no encontrado. Actualiza la lista.';
    case 409: return 'No se pudo guardar: ya existe un periodo con ese nombre, las fechas se solapan con otro periodo activo, o las nuevas fechas dejan bimestres fuera del rango.';
    default: return 'El servidor no pudo completar la solicitud. Intenta nuevamente.';
  }
}

export function academicPeriodsLoadErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 403) return 'No tienes autorización para consultar periodos académicos.';
  return academicPeriodErrorMessage(error);
}

export function formatPeriodDate(value: string): string {
  return value.split('-').reverse().join('/');
}

export function academicPeriodLabel(period: AcademicPeriod): string {
  return `${period.name} (${formatPeriodDate(period.startDate)} – ${formatPeriodDate(period.endDate)})${period.current ? ' · Vigente' : ''}${period.active ? '' : ' · Inactivo'}`;
}
