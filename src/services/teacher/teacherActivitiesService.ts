import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { ACADEMIC_ACTIVITY_TYPES } from '@/types/teacherActivitiesApi';
import type { AcademicActivity, ActivityContext, CreateAcademicActivityRequest } from '@/types/teacherActivitiesApi';

function positiveId(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Identificador inválido.');
  return value;
}
const path = (context: ActivityContext) => `/v1/teacher/courses/${positiveId(context.sectionCourseId)}/bimesters/${positiveId(context.bimesterId)}/activities`;
function invalid(): never { throw new Error('La respuesta de actividades no pudo verificarse.'); }
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+Z$/.test(value) || !Number.isFinite(Date.parse(value))) return invalid();
  return value;
}
export function activityTitleError(title: string): string | null {
  return !title.trim() ? 'Ingresa el título de la actividad.' : title.trim().length > 255 ? 'El título admite hasta 255 caracteres.' : null;
}
function requestDto(request: CreateAcademicActivityRequest): CreateAcademicActivityRequest {
  if (typeof request.title !== 'string' || activityTitleError(request.title) || !ACADEMIC_ACTIVITY_TYPES.includes(request.type) || typeof request.cuentaParaPa !== 'boolean' || (request.description !== null && typeof request.description !== 'string')) throw new Error('Revisa los campos de la actividad.');
  return { title: request.title.trim(), description: request.description?.trim() || null, type: request.type, cuentaParaPa: request.cuentaParaPa };
}
export function parseAcademicActivity(value: unknown, context: ActivityContext, expectedId?: number): AcademicActivity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const a = value as Record<string, unknown>;
  for (const field of ['id', 'sectionCourseId', 'bimesterId', 'createdByTeacherId']) if (typeof a[field] !== 'number' || !Number.isSafeInteger(a[field]) || (a[field] as number) <= 0) return invalid();
  if (a.sectionCourseId !== context.sectionCourseId || a.bimesterId !== context.bimesterId || (expectedId !== undefined && a.id !== expectedId) || a.status !== 'PLANIFICADA' || typeof a.title !== 'string' || activityTitleError(a.title) || (a.description !== null && typeof a.description !== 'string') || !ACADEMIC_ACTIVITY_TYPES.includes(a.type as CreateAcademicActivityRequest['type']) || typeof a.cuentaParaPa !== 'boolean') return invalid();
  const createdAt = timestamp(a.createdAt), updatedAt = a.updatedAt === null ? null : timestamp(a.updatedAt);
  return { id: a.id as number, sectionCourseId: context.sectionCourseId, bimesterId: context.bimesterId, createdByTeacherId: a.createdByTeacherId as number, title: a.title, description: a.description as string | null, type: a.type as CreateAcademicActivityRequest['type'], cuentaParaPa: a.cuentaParaPa, status: 'PLANIFICADA', createdAt, updatedAt };
}
export const teacherActivitiesService = {
  async getActivities(context: ActivityContext, signal?: AbortSignal): Promise<AcademicActivity[]> {
    const response = await httpClient.get<unknown>(path(context), { signal });
    if (response.status !== 200 || !Array.isArray(response.data)) return invalid();
    const rows = response.data.map(a => parseAcademicActivity(a, context));
    if (new Set(rows.map(a => a.id)).size !== rows.length) return invalid();
    return rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);
  },
  async getActivity(context: ActivityContext, activityId: number, signal?: AbortSignal): Promise<AcademicActivity> {
    const response = await httpClient.get<unknown>(`${path(context)}/${positiveId(activityId)}`, { signal });
    if (response.status !== 200) return invalid();
    return parseAcademicActivity(response.data, context, activityId);
  },
  async createActivity(context: ActivityContext, request: CreateAcademicActivityRequest): Promise<AcademicActivity> {
    const dto = requestDto(request);
    const response = await httpClient.post<unknown>(path(context), dto);
    if (response.status !== 201) return invalid();
    const saved = parseAcademicActivity(response.data, context);
    if (saved.title !== dto.title || saved.description !== dto.description || saved.type !== dto.type || saved.cuentaParaPa !== dto.cuentaParaPa) return invalid();
    const location: unknown = response.headers.location;
    // Location may be hidden by CORS. Validate it when observable; confirmation
    // still requires the response DTO and the subsequent collection read.
    if (location !== undefined && (typeof location !== 'string' || !location.endsWith(`${path(context)}/${saved.id}`))) return invalid();
    return saved;
  },
};
export function isAmbiguousActivityCreation(error: unknown): boolean {
  return !isAxiosError(error) || !error.response || error.response.status >= 500;
}
export function teacherActivitiesErrorMessage(error: unknown): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  switch (status) {
    case 400: return 'Revisa el título, tipo y contexto de la actividad.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para acceder a estas actividades.';
    case 404: return 'El curso, bimestre o actividad no está disponible para tu cuenta.';
    case 409: return 'El contexto académico cambió o el bimestre no corresponde al curso. Actualiza la lista.';
    default: return 'No se pudo confirmar la operación. Consulta el listado antes de volver a intentar.';
  }
}
