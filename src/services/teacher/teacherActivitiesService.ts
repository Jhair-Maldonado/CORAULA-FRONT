import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { ACADEMIC_ACTIVITY_STATUSES, ACADEMIC_ACTIVITY_TYPES } from '@/types/teacherActivitiesApi';
import type { AcademicActivity, AcademicActivityStatus, ActivityContext, ActivityGrade, ActivityGradesSheet, ActivityGradesSheetRow, CreateAcademicActivityRequest, SaveActivityGradeEntry, UpdateAcademicActivityRequest } from '@/types/teacherActivitiesApi';
import { parseBimesterResponse } from '@/lib/manualGradesContract';

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
function nullableTimestamp(value: unknown): string | null { return value === null ? null : timestamp(value); }
const isPositiveId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
export function activityTitleError(title: string): string | null {
  return !title.trim() ? 'Ingresa el título de la actividad.' : title.trim().length > 255 ? 'El título admite hasta 255 caracteres.' : null;
}
const reasonError = (reason: string, missing: string) => !reason.trim() ? missing : reason.trim().length > 1000 ? 'El motivo admite hasta 1000 caracteres.' : null;
export function annulmentReasonError(reason: string): string | null { return reasonError(reason, 'Indica el motivo de la anulación.'); }
function requestDto(request: CreateAcademicActivityRequest): CreateAcademicActivityRequest {
  if (typeof request.title !== 'string' || activityTitleError(request.title) || !ACADEMIC_ACTIVITY_TYPES.includes(request.type) || typeof request.cuentaParaPa !== 'boolean' || (request.description !== null && typeof request.description !== 'string')) throw new Error('Revisa los campos de la actividad.');
  return { title: request.title.trim(), description: request.description?.trim() || null, type: request.type, cuentaParaPa: request.cuentaParaPa };
}
export function activityChanges(original: AcademicActivity, values: CreateAcademicActivityRequest): UpdateAcademicActivityRequest {
  const normalized = requestDto(values);
  const previous = requestDto(original);
  return Object.fromEntries(Object.entries(normalized).filter(([key, value]) => previous[key as keyof CreateAcademicActivityRequest] !== value));
}
export function activityMatchesChanges(activity: AcademicActivity, changes: UpdateAcademicActivityRequest): boolean {
  return Object.entries(changes).every(([key, value]) => activity[key as keyof CreateAcademicActivityRequest] === value);
}
function patchDto(input: UpdateAcademicActivityRequest): UpdateAcademicActivityRequest {
  const keys = Object.keys(input);
  if (!keys.length || keys.some(k => !['title', 'description', 'type', 'cuentaParaPa'].includes(k))) throw new Error('La edición requiere campos modificados válidos.');
  if (('title' in input && (typeof input.title !== 'string' || activityTitleError(input.title))) || ('description' in input && input.description !== null && typeof input.description !== 'string') || ('type' in input && !ACADEMIC_ACTIVITY_TYPES.includes(input.type!)) || ('cuentaParaPa' in input && typeof input.cuentaParaPa !== 'boolean')) throw new Error('Revisa los campos de la actividad.');
  return { ...input, ...('title' in input ? { title: input.title!.trim() } : {}), ...('description' in input ? { description: input.description?.trim() || null } : {}) };
}
export function parseAcademicActivity(value: unknown, context: ActivityContext, expectedId?: number): AcademicActivity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const a = value as Record<string, unknown>;
  for (const field of ['id', 'sectionCourseId', 'bimesterId', 'createdByTeacherId']) if (!isPositiveId(a[field])) return invalid();
  if (a.sectionCourseId !== context.sectionCourseId || a.bimesterId !== context.bimesterId || (expectedId !== undefined && a.id !== expectedId) || !ACADEMIC_ACTIVITY_STATUSES.includes(a.status as AcademicActivityStatus) || typeof a.title !== 'string' || activityTitleError(a.title) || (a.description !== null && typeof a.description !== 'string') || !ACADEMIC_ACTIVITY_TYPES.includes(a.type as CreateAcademicActivityRequest['type']) || typeof a.cuentaParaPa !== 'boolean') return invalid();
  const status = a.status as AcademicActivityStatus;
  const createdAt = timestamp(a.createdAt), updatedAt = nullableTimestamp(a.updatedAt);
  const publishedAt = nullableTimestamp(a.publishedAt), annulledAt = nullableTimestamp(a.annulledAt);
  if (a.annulledByUserId !== null && !isPositiveId(a.annulledByUserId)) return invalid();
  if (a.annulmentReason !== null && (typeof a.annulmentReason !== 'string' || annulmentReasonError(a.annulmentReason))) return invalid();
  // Publication and annulment data must match the state: PLANIFICADA has neither,
  // PUBLICADA has its publication date and ANULADA keeps any original publication date.
  const annulment = [annulledAt, a.annulledByUserId, a.annulmentReason];
  if (status === 'ANULADA' ? annulment.some(v => v === null) : annulment.some(v => v !== null)) return invalid();
  if ((status === 'PLANIFICADA' && publishedAt !== null) || (status === 'PUBLICADA' && publishedAt === null)) return invalid();
  return { id: a.id as number, sectionCourseId: context.sectionCourseId, bimesterId: context.bimesterId, createdByTeacherId: a.createdByTeacherId as number, title: a.title, description: a.description as string | null, type: a.type as CreateAcademicActivityRequest['type'], cuentaParaPa: a.cuentaParaPa, status, createdAt, updatedAt, publishedAt, annulledAt, annulledByUserId: a.annulledByUserId as number | null, annulmentReason: a.annulmentReason as string | null };
}
const hasDecimals = (value: number, decimals: number) => Math.abs(value * 10 ** decimals - Math.round(value * 10 ** decimals)) < 1e-8;
const isActivityGrade = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 20 && hasDecimals(value, 2);
export function parseActivityGrade(value: unknown, activityId: number, enrollmentId?: number): ActivityGrade {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const g = value as Record<string, unknown>;
  for (const field of ['id', 'activityId', 'enrollmentId', 'registeredByTeacherId', 'version']) if (!isPositiveId(g[field])) return invalid();
  if (g.activityId !== activityId || (enrollmentId !== undefined && g.enrollmentId !== enrollmentId) || !isActivityGrade(g.grade)) return invalid();
  return { id: g.id as number, activityId, enrollmentId: g.enrollmentId as number, grade: g.grade, registeredByTeacherId: g.registeredByTeacherId as number, registeredAt: timestamp(g.registeredAt), updatedAt: nullableTimestamp(g.updatedAt), version: g.version as number };
}
function count(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalid();
  return value;
}
function parseSheetRow(value: unknown, activityId: number): ActivityGradesSheetRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const r = value as Record<string, unknown>;
  if (!isPositiveId(r.enrollmentId) || !isPositiveId(r.studentId) || typeof r.fullName !== 'string' || !r.fullName.trim() || typeof r.eligibleForPa !== 'boolean') return invalid();
  // PA arrives with one decimal (HALF_UP on the server) and is read-only here.
  if (r.pa !== null && (!isActivityGrade(r.pa) || !hasDecimals(r.pa, 1))) return invalid();
  const assignedActivities = count(r.assignedActivities), gradedActivities = count(r.gradedActivities);
  if (gradedActivities > assignedActivities) return invalid();
  return { enrollmentId: r.enrollmentId, studentId: r.studentId, fullName: r.fullName, eligibleForPa: r.eligibleForPa, grade: r.grade === null ? null : parseActivityGrade(r.grade, activityId, r.enrollmentId), pa: r.pa as number | null, assignedActivities, gradedActivities };
}
export function parseActivityGradesSheet(value: unknown, context: ActivityContext, activityId: number): ActivityGradesSheet {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const s = value as Record<string, unknown>;
  const activity = parseAcademicActivity(s.activity, context, activityId);
  let bimester;
  try { bimester = parseBimesterResponse(s.bimester); } catch { return invalid(); }
  if (bimester.id !== context.bimesterId || !Array.isArray(s.students)) return invalid();
  const students = s.students.map(row => parseSheetRow(row, activityId));
  if (new Set(students.map(r => r.enrollmentId)).size !== students.length) return invalid();
  return { activity, bimester, students };
}
/** Client-side rules for one entry against the loaded row; null when it can be sent. */
export function activityGradeEntryError(entry: SaveActivityGradeEntry, current: ActivityGrade | null): string | null {
  if (!isPositiveId(entry.enrollmentId) || !isActivityGrade(entry.grade)) return 'La nota debe estar entre 0 y 20 con máximo dos decimales.';
  if ((current?.version ?? null) !== entry.expectedVersion) return 'La versión de la nota no coincide con la planilla.';
  if (!current) return entry.reason === undefined ? null : 'El registro inicial no lleva motivo.';
  if (current.grade === entry.grade) return 'La corrección debe cambiar la nota vigente.';
  return reasonError(entry.reason ?? '', 'Indica el motivo de la corrección.');
}
function gradeDto(entry: SaveActivityGradeEntry) {
  if (!isPositiveId(entry.enrollmentId) || !isActivityGrade(entry.grade) || (entry.expectedVersion !== null && !isPositiveId(entry.expectedVersion))) throw new Error('Revisa la nota y su versión.');
  if (entry.expectedVersion === null ? entry.reason !== undefined : typeof entry.reason !== 'string' || reasonError(entry.reason, 'sin motivo')) throw new Error('Revisa el motivo de la corrección.');
  return { grade: entry.grade, expectedVersion: entry.expectedVersion, ...(entry.reason !== undefined ? { reason: entry.reason.trim() } : {}) };
}
function verifySavedGrade(saved: ActivityGrade, entry: SaveActivityGradeEntry): ActivityGrade {
  return saved.grade === entry.grade && saved.version === (entry.expectedVersion ?? 0) + 1 ? saved : invalid();
}
export const teacherActivitiesService = {
  async updateActivity(context: ActivityContext, activityId: number, input: UpdateAcademicActivityRequest): Promise<AcademicActivity> {
    const dto = patchDto(input);
    const response = await httpClient.patch<unknown>(`${path(context)}/${positiveId(activityId)}`, dto);
    if (response.status !== 200) return invalid();
    const saved = parseAcademicActivity(response.data, context, activityId);
    if (!activityMatchesChanges(saved, dto)) return invalid();
    return saved;
  },
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
    if (saved.status !== 'PLANIFICADA' || saved.title !== dto.title || saved.description !== dto.description || saved.type !== dto.type || saved.cuentaParaPa !== dto.cuentaParaPa) return invalid();
    const location: unknown = response.headers.location;
    // Location may be hidden by CORS. Validate it when observable; confirmation
    // still requires the response DTO and the subsequent collection read.
    if (location !== undefined && (typeof location !== 'string' || !location.endsWith(`${path(context)}/${saved.id}`))) return invalid();
    return saved;
  },
  async publishActivity(context: ActivityContext, activityId: number): Promise<AcademicActivity> {
    const response = await httpClient.post<unknown>(`${path(context)}/${positiveId(activityId)}/publish`, {});
    if (response.status !== 200) return invalid();
    const saved = parseAcademicActivity(response.data, context, activityId);
    return saved.status === 'PUBLICADA' ? saved : invalid();
  },
  async annulActivity(context: ActivityContext, activityId: number, reason: string): Promise<AcademicActivity> {
    if (typeof reason !== 'string' || annulmentReasonError(reason)) throw new Error('Revisa el motivo de la anulación.');
    const response = await httpClient.post<unknown>(`${path(context)}/${positiveId(activityId)}/annul`, { reason: reason.trim() });
    if (response.status !== 200) return invalid();
    const saved = parseAcademicActivity(response.data, context, activityId);
    return saved.status === 'ANULADA' && saved.annulmentReason === reason.trim() ? saved : invalid();
  },
  async getGradesSheet(context: ActivityContext, activityId: number, signal?: AbortSignal): Promise<ActivityGradesSheet> {
    const response = await httpClient.get<unknown>(`${path(context)}/${positiveId(activityId)}/grades`, { signal });
    if (response.status !== 200) return invalid();
    return parseActivityGradesSheet(response.data, context, activityId);
  },
  async saveGrade(context: ActivityContext, activityId: number, entry: SaveActivityGradeEntry): Promise<ActivityGrade> {
    const dto = gradeDto(entry);
    const response = await httpClient.put<unknown>(`${path(context)}/${positiveId(activityId)}/grades/${entry.enrollmentId}`, dto);
    if (response.status !== 200) return invalid();
    return verifySavedGrade(parseActivityGrade(response.data, activityId, entry.enrollmentId), entry);
  },
  /** Atomic batch: the server applies every entry or none, ordered by enrollment. */
  async saveGrades(context: ActivityContext, activityId: number, entries: SaveActivityGradeEntry[]): Promise<ActivityGrade[]> {
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 100) throw new Error('El lote admite entre 1 y 100 notas.');
    const sorted = [...entries].sort((a, b) => a.enrollmentId - b.enrollmentId);
    const grades = sorted.map(entry => ({ enrollmentId: entry.enrollmentId, ...gradeDto(entry) }));
    if (new Set(grades.map(g => g.enrollmentId)).size !== grades.length) throw new Error('El lote no admite matrículas repetidas.');
    const response = await httpClient.put<unknown>(`${path(context)}/${positiveId(activityId)}/grades`, { grades });
    if (response.status !== 200 || !Array.isArray(response.data) || response.data.length !== sorted.length) return invalid();
    return response.data.map((value, i) => verifySavedGrade(parseActivityGrade(value, activityId, sorted[i].enrollmentId), sorted[i]));
  },
};
export function isAmbiguousActivityCreation(error: unknown): boolean {
  return !isAxiosError(error) || !error.response || error.response.status >= 500;
}
export const ACTIVITY_ERROR_CODES = ['ACTIVITY_REQUEST_INVALID', 'ACTIVITY_CONTEXT_UNAVAILABLE', 'BIMESTER_WINDOW_CLOSED', 'ACTIVITY_STATE_CONFLICT', 'ACTIVITY_NOT_GRADEABLE', 'ACTIVITY_GRADE_STALE', 'ACTIVITY_GRADE_UNCHANGED', 'ENROLLMENT_NOT_ELIGIBLE', 'ACADEMIC_CONTEXT_MISMATCH', 'ACTIVITY_CONTEXT_CONFLICT', 'ACTIVITY_METHOD_NOT_ALLOWED', 'ACTIVITY_INTERNAL_ERROR'] as const;
export type ActivityErrorCode = typeof ACTIVITY_ERROR_CODES[number];
const codeMessages: Record<ActivityErrorCode, string> = {
  ACTIVITY_REQUEST_INVALID: 'Revisa los datos enviados: nota de 0 a 20 con máximo dos decimales y motivo cuando corresponda.',
  ACTIVITY_CONTEXT_UNAVAILABLE: 'El curso, bimestre, actividad o estudiante no está disponible para tu cuenta.',
  BIMESTER_WINDOW_CLOSED: 'El bimestre no está abierto para esta operación.',
  ACTIVITY_STATE_CONFLICT: 'La actividad ya cambió de estado. Revisa los datos vigentes.',
  ACTIVITY_NOT_GRADEABLE: 'Solo se pueden calificar actividades publicadas.',
  ACTIVITY_GRADE_STALE: 'La nota cambió desde que cargaste la planilla. Se recargó; revisa los valores vigentes antes de volver a guardar.',
  ACTIVITY_GRADE_UNCHANGED: 'La corrección no cambia la nota vigente.',
  ENROLLMENT_NOT_ELIGIBLE: 'Un estudiante no puede calificarse en esta actividad (matrícula fuera del contexto o posterior a la publicación).',
  ACADEMIC_CONTEXT_MISMATCH: 'El bimestre no corresponde al periodo del curso.',
  ACTIVITY_CONTEXT_CONFLICT: 'El contexto académico cambió. Actualiza la lista.',
  ACTIVITY_METHOD_NOT_ALLOWED: 'La operación no está disponible.',
  ACTIVITY_INTERNAL_ERROR: 'El servidor no completó la operación y la revirtió. Consulta los datos antes de volver a intentar.',
};
export function activityErrorCode(error: unknown): ActivityErrorCode | null {
  const data: unknown = isAxiosError(error) ? error.response?.data : undefined;
  const code = data && typeof data === 'object' ? (data as Record<string, unknown>).code : undefined;
  return ACTIVITY_ERROR_CODES.includes(code as ActivityErrorCode) ? code as ActivityErrorCode : null;
}
/** No response, an unverifiable response or an unexpected 5xx: the write may have been applied. */
export function isUncertainActivityResult(error: unknown): boolean {
  return isAmbiguousActivityCreation(error) && activityErrorCode(error) !== 'ACTIVITY_INTERNAL_ERROR';
}
export function teacherActivitiesErrorMessage(error: unknown): string {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  // 401/403 come from global security without a module code.
  const code = status === 401 || status === 403 ? null : activityErrorCode(error);
  if (code) return codeMessages[code];
  switch (status) {
    case 400: return 'Revisa el título, tipo y contexto de la actividad.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes autorización para acceder a estas actividades.';
    case 404: return 'El curso, bimestre o actividad no está disponible para tu cuenta.';
    case 409: return 'El contexto académico cambió o el bimestre no corresponde al curso. Actualiza la lista.';
    default: return 'No se pudo confirmar la operación. Consulta el listado antes de volver a intentar.';
  }
}
