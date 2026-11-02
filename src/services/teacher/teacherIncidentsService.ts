import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { GRAVEDADES_INCIDENCIA, INCIDENT_LOCATION_MAX, INCIDENT_TEXT_MAX } from '@/types/incidenciasApi';
import type { GravedadIncidencia, IncidenciaResponse, IncidenciasFilterQuery, IncidenciasPage, RegistrarIncidenciaRequest } from '@/types/incidenciasApi';

const endpoint = '/v1/teacher/incidents';

/** Error de datos detectado antes de enviar: la incidencia no llegó al servidor. */
export class IncidentInputError extends Error {}

function invalid(): never { throw new Error('La respuesta de incidencias no pudo verificarse.'); }
function isPositiveId(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
function positiveId(value: number) {
  if (!isPositiveId(value)) throw new IncidentInputError('Identificador inválido.');
  return value;
}
function isSeverity(value: unknown): value is GravedadIncidencia { return GRAVEDADES_INCIDENCIA.includes(value as GravedadIncidencia); }
function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}
function utcTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) || !Number.isFinite(Date.parse(value))) return invalid();
  return value;
}
const boundedText = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export function incidentLocationError(location: string): string | null {
  const v = location.trim();
  return !v ? 'Indica el lugar del hecho.' : v.length > INCIDENT_LOCATION_MAX ? `El lugar admite hasta ${INCIDENT_LOCATION_MAX} caracteres.` : null;
}
export function incidentDescriptionError(description: string): string | null {
  const v = description.trim();
  return !v ? 'La descripción de lo ocurrido es obligatoria.' : v.length > INCIDENT_TEXT_MAX ? `La descripción admite hasta ${INCIDENT_TEXT_MAX} caracteres.` : null;
}
export function incidentActionsError(actions: string): string | null {
  return actions.trim().length > INCIDENT_TEXT_MAX ? `Las acciones tomadas admiten hasta ${INCIDENT_TEXT_MAX} caracteres.` : null;
}

// America/Lima no aplica horario de verano: offset fijo UTC-05:00.
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
/** Convierte un valor de `datetime-local` (hora de Lima) a ISO-8601 con offset. */
export function limaDateTimeToIso(local: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) || !Number.isFinite(Date.parse(`${local}:00-05:00`))) throw new IncidentInputError('Indica una fecha y hora válidas.');
  return `${local}:00-05:00`;
}
/** Fecha y hora actual de Lima en formato `datetime-local`. */
export function nowLimaDateTimeLocal(now = new Date()): string {
  return new Date(now.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 16);
}
export function formatLimaDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

function requestDto(request: RegistrarIncidenciaRequest): RegistrarIncidenciaRequest {
  const occurredAt = typeof request.occurredAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(request.occurredAt) && Number.isFinite(Date.parse(request.occurredAt));
  const textError = typeof request.location !== 'string' || typeof request.description !== 'string' || (request.actionsTaken !== null && typeof request.actionsTaken !== 'string')
    ? 'Revisa los campos de la incidencia.'
    : incidentLocationError(request.location) ?? incidentDescriptionError(request.description) ?? incidentActionsError(request.actionsTaken ?? '');
  if (textError) throw new IncidentInputError(textError);
  if (!isPositiveId(request.sectionCourseId) || !isPositiveId(request.enrollmentId) || !isSeverity(request.severity) || !occurredAt) throw new IncidentInputError('Revisa los campos de la incidencia.');
  return {
    sectionCourseId: request.sectionCourseId,
    enrollmentId: request.enrollmentId,
    occurredAt: request.occurredAt,
    location: request.location.trim(),
    severity: request.severity,
    description: request.description.trim(),
    actionsTaken: request.actionsTaken?.trim() || null,
  };
}

export function parseIncident(value: unknown, expectedId?: number): IncidenciaResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const i = value as Record<string, unknown>;
  for (const field of ['id', 'sectionCourseId', 'sectionId', 'enrollmentId', 'studentId', 'teacherId']) if (!isPositiveId(i[field])) return invalid();
  if ((expectedId !== undefined && i.id !== expectedId)
    || !boundedText(i.studentName, 500) || !boundedText(i.teacherName, 500) || (i.studentCode !== null && typeof i.studentCode !== 'string')
    || !boundedText(i.location, INCIDENT_LOCATION_MAX) || !boundedText(i.description, INCIDENT_TEXT_MAX)
    || (i.actionsTaken !== null && !boundedText(i.actionsTaken, INCIDENT_TEXT_MAX)) || !isSeverity(i.severity)) return invalid();
  return {
    id: i.id as number, sectionCourseId: i.sectionCourseId as number, sectionId: i.sectionId as number, enrollmentId: i.enrollmentId as number,
    studentId: i.studentId as number, studentName: i.studentName as string, studentCode: i.studentCode as string | null,
    teacherId: i.teacherId as number, teacherName: i.teacherName as string, occurredAt: utcTimestamp(i.occurredAt),
    location: i.location as string, severity: i.severity, description: i.description as string,
    actionsTaken: i.actionsTaken as string | null, createdAt: utcTimestamp(i.createdAt),
  };
}

function filterParams(filters: IncidenciasFilterQuery): IncidenciasFilterQuery {
  const { severity, sectionId, dateFrom, dateTo, page = 0, size = 20 } = filters;
  if ((severity !== undefined && !isSeverity(severity)) || (sectionId !== undefined && !isPositiveId(sectionId))
    || (dateFrom !== undefined && !isIsoDate(dateFrom)) || (dateTo !== undefined && !isIsoDate(dateTo))
    || !Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(size) || size < 1 || size > 100) throw new IncidentInputError('Revisa los filtros del historial.');
  if (dateFrom && dateTo && dateFrom > dateTo) throw new IncidentInputError('La fecha inicial no puede ser posterior a la fecha final.');
  return Object.fromEntries(Object.entries({ severity, sectionId, dateFrom, dateTo, page, size }).filter(([, v]) => v !== undefined));
}

export const teacherIncidentsService = {
  async registerIncident(request: RegistrarIncidenciaRequest): Promise<IncidenciaResponse> {
    const dto = requestDto(request);
    const response = await httpClient.post<unknown>(endpoint, dto);
    if (response.status !== 201) return invalid();
    const saved = parseIncident(response.data);
    if (saved.sectionCourseId !== dto.sectionCourseId || saved.enrollmentId !== dto.enrollmentId || saved.severity !== dto.severity
      || saved.location !== dto.location || saved.description !== dto.description || saved.actionsTaken !== dto.actionsTaken
      || Date.parse(saved.occurredAt) !== Date.parse(dto.occurredAt)) return invalid();
    // El id confirmado es el del cuerpo. Location suele quedar oculto por CORS:
    // su ausencia no es error; si llega, debe apuntar al mismo id.
    const location: unknown = response.headers?.location;
    if (location !== undefined && location !== null && location !== '' && (typeof location !== 'string' || !location.endsWith(`${endpoint}/${saved.id}`))) return invalid();
    return saved;
  },
  async getIncidents(filters: IncidenciasFilterQuery = {}, signal?: AbortSignal): Promise<IncidenciasPage> {
    const params = filterParams(filters);
    const response = await httpClient.get<unknown>(endpoint, { params, signal });
    const body = response.data as Record<string, unknown> | null;
    if (response.status !== 200 || !body || typeof body !== 'object' || !Array.isArray(body.content)) return invalid();
    const { page, size, totalElements, totalPages } = body;
    if (page !== params.page || size !== params.size || !Number.isSafeInteger(totalElements) || (totalElements as number) < 0
      || !Number.isSafeInteger(totalPages) || (totalPages as number) < 0 || body.content.length > (size as number)) return invalid();
    const content = body.content.map(item => parseIncident(item));
    if (new Set(content.map(i => i.id)).size !== content.length) return invalid();
    if ((params.severity && content.some(i => i.severity !== params.severity)) || (params.sectionId && content.some(i => i.sectionId !== params.sectionId))) return invalid();
    return { content, page: page as number, size: size as number, totalElements: totalElements as number, totalPages: totalPages as number };
  },
  async getIncident(incidentId: number, signal?: AbortSignal): Promise<IncidenciaResponse> {
    const response = await httpClient.get<unknown>(`${endpoint}/${positiveId(incidentId)}`, { signal });
    if (response.status !== 200) return invalid();
    return parseIncident(response.data, incidentId);
  },
};

export function teacherIncidentsErrorCode(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  const body: unknown = error.response?.data;
  return body && typeof body === 'object' && 'code' in body && typeof body.code === 'string' ? body.code : null;
}

/** Un POST sin respuesta (o con fallo del servidor/verificación) pudo haberse guardado: no reintentar automáticamente. */
export function isUncertainIncidentRegistration(error: unknown): boolean {
  if (error instanceof IncidentInputError) return false;
  return !isAxiosError(error) || !error.response || error.response.status >= 500;
}

export function teacherIncidentsErrorMessage(error: unknown): string {
  if (error instanceof IncidentInputError) return error.message;
  switch (teacherIncidentsErrorCode(error)) {
    case 'INCIDENT_VALIDATION_ERROR': return 'Revisa los datos: lugar (1–120 caracteres), descripción (1–1000), acciones (hasta 1000) y filtros.';
    case 'INCIDENT_DATE_IN_FUTURE': return 'La fecha y hora del hecho no puede ser posterior al momento actual.';
    case 'INCIDENT_DATE_OUT_OF_RANGE': return 'La fecha del hecho está fuera del periodo académico o es anterior a la matrícula del estudiante.';
    case 'TEACHER_CONTEXT_NOT_AVAILABLE': return 'El curso ya no está asignado a tu cuenta o no está activo. Actualiza la lista de cursos.';
    case 'ENROLLMENT_NOT_AVAILABLE': return 'El estudiante ya no tiene una matrícula activa en esta sección.';
    case 'INCIDENT_NOT_FOUND': return 'La incidencia no existe o no fue registrada por tu cuenta.';
    case 'INCIDENT_INTERNAL_ERROR': return 'Ocurrió un error en el servidor. Consulta el historial antes de volver a intentar.';
  }
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'La sesión ha expirado. Vuelve a iniciar sesión.';
    if (status === 403) return 'No tienes permiso para gestionar incidencias.';
    if (status === 400) return 'Revisa los datos de la incidencia.';
    if (status === 404) return 'El recurso solicitado no está disponible para tu cuenta.';
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  }
  return 'No se pudo completar la solicitud. Intenta nuevamente.';
}

export const UNCERTAIN_INCIDENT_MESSAGE = 'No se pudo confirmar si la incidencia se registró. Revisa el historial antes de volver a intentarlo; no se reintentó automáticamente.';
