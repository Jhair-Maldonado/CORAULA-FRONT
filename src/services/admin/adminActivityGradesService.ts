import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { parseBimesterResponse } from '@/lib/manualGradesContract';
import { gradeInputError } from '@/lib/manualGrades';
import { parseAcademicActivity, parseActivityGrade } from '@/services/teacher/teacherActivitiesService';
import { activityGradeErrorCodeMessage } from '@/services/admin/activityGradeErrors';
import { adminGradesErrorMessage, maxCorrectionReasonLength } from '@/services/admin/adminGradesService';
import type { AcademicActivity, ActivityContext, ActivityGrade } from '@/types/teacherActivitiesApi';
import type { ActivityGradeHistoryEntry, CorrectActivityGradeRequest, ManagementActivityGradesRow, ManagementActivityGradesSheet } from '@/types/managementActivitiesApi';

function invalid(): never { throw new Error('La respuesta de actividades de gestión no pudo verificarse.'); }
function requestId(value: number) { if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Identificador inválido.'); return value; }
const isId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const isGrade = (value: unknown): value is number => typeof value === 'number' && !gradeInputError(String(value));
const isTimestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
const isText = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const path = (context: ActivityContext) => `/v1/management/section-courses/${requestId(context.sectionCourseId)}/bimesters/${requestId(context.bimesterId)}/activities`;

function parseRow(value: unknown): ManagementActivityGradesRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const r = value as Record<string, unknown>;
  if (!isId(r.enrollmentId) || !isId(r.studentId) || !isText(r.fullName) || (r.studentCode !== null && !isText(r.studentCode))) return invalid();
  const identity = { enrollmentId: r.enrollmentId, studentId: r.studentId, studentCode: r.studentCode as string | null, fullName: r.fullName };
  if (r.gradeId === null) {
    // Without a grade every grade field is null: the row is not correctable.
    if ([r.grade, r.version, r.registeredByTeacherId, r.registeredByTeacherName, r.registeredAt, r.updatedAt].some(v => v !== null)) return invalid();
    return { ...identity, gradeId: null, grade: null, version: null, registeredByTeacherId: null, registeredByTeacherName: null, registeredAt: null, updatedAt: null };
  }
  if (!isId(r.gradeId) || !isGrade(r.grade) || !isId(r.version) || !isId(r.registeredByTeacherId) || !isTimestamp(r.registeredAt)
    || (r.registeredByTeacherName !== null && !isText(r.registeredByTeacherName)) || (r.updatedAt !== null && !isTimestamp(r.updatedAt))) return invalid();
  return { ...identity, gradeId: r.gradeId, grade: r.grade, version: r.version, registeredByTeacherId: r.registeredByTeacherId,
    registeredByTeacherName: r.registeredByTeacherName as string | null, registeredAt: r.registeredAt, updatedAt: r.updatedAt as string | null };
}

export function parseManagementActivityGradesSheet(value: unknown, context: ActivityContext, activityId: number): ManagementActivityGradesSheet {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const s = value as Record<string, unknown>;
  if (!Array.isArray(s.students)) return invalid();
  const activity = parseAcademicActivity(s.activity, context, activityId);
  let bimester;
  try { bimester = parseBimesterResponse(s.bimester); } catch { return invalid(); }
  if (bimester.id !== context.bimesterId) return invalid();
  const students = s.students.map(parseRow);
  const grades = students.flatMap(row => row.gradeId === null ? [] : [row.gradeId]);
  if (new Set(students.map(row => row.enrollmentId)).size !== students.length || new Set(grades).size !== grades.length) return invalid();
  return { activity, bimester, students };
}

function parseHistoryEntry(value: unknown, gradeId: number): ActivityGradeHistoryEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const h = value as Record<string, unknown>;
  if (!isId(h.id) || h.gradeId !== gradeId || !isGrade(h.newGrade) || !isId(h.actorId) || !isTimestamp(h.changedAt)) return invalid();
  if (typeof h.previousVersion !== 'number' || !Number.isSafeInteger(h.previousVersion) || h.previousVersion < 0 || h.newVersion !== h.previousVersion + 1) return invalid();
  // The initial registration (version 0 → 1) has no previous grade nor reason; a correction has both.
  const initial = h.previousVersion === 0;
  if (initial ? h.previousGrade !== null || h.reason !== null : !isGrade(h.previousGrade) || !isText(h.reason)) return invalid();
  return { id: h.id, gradeId, previousGrade: h.previousGrade as number | null, newGrade: h.newGrade, actorId: h.actorId, reason: h.reason as string | null,
    changedAt: h.changedAt, previousVersion: h.previousVersion, newVersion: h.newVersion as number };
}

export function activityCorrectionInputError(request: CorrectActivityGradeRequest): string | null {
  const reason = request.reason.trim();
  if (!isId(request.enrollmentId) || !isId(request.expectedVersion)) return 'La fila no es corregible.';
  if (!isGrade(request.grade)) return 'La nota debe estar entre 0 y 20, con máximo dos decimales.';
  if (!reason) return 'Indica el motivo de la corrección.';
  return reason.length > maxCorrectionReasonLength ? `El motivo no puede superar los ${maxCorrectionReasonLength} caracteres.` : null;
}

export const adminActivityGradesService = {
  async listActivities(context: ActivityContext, signal?: AbortSignal): Promise<AcademicActivity[]> {
    const response = await httpClient.get<unknown>(path(context), { signal });
    if (response.status !== 200 || !Array.isArray(response.data)) throw new Error('Actividades no confirmadas.');
    const rows = response.data.map(a => parseAcademicActivity(a, context));
    if (new Set(rows.map(a => a.id)).size !== rows.length) return invalid();
    return rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);
  },
  async getSheet(context: ActivityContext, activityId: number, signal?: AbortSignal): Promise<ManagementActivityGradesSheet> {
    const response = await httpClient.get<unknown>(`${path(context)}/${requestId(activityId)}/grades`, { signal });
    if (response.status !== 200) throw new Error('Planilla de actividad no confirmada.');
    return parseManagementActivityGradesSheet(response.data, context, activityId);
  },
  async correctGrade(gradeId: number, activityId: number, request: CorrectActivityGradeRequest): Promise<ActivityGrade> {
    const error = activityCorrectionInputError(request);
    if (error) throw new Error(error);
    // Whitelist the wire fields; the grade's context cannot be changed through the body.
    const body: CorrectActivityGradeRequest = { enrollmentId: request.enrollmentId, grade: request.grade, expectedVersion: request.expectedVersion, reason: request.reason.trim() };
    const response = await httpClient.patch<unknown>(`/v1/management/activity-grades/${requestId(gradeId)}`, body);
    if (response.status !== 200) throw new Error('Corrección no confirmada.');
    const saved = parseActivityGrade(response.data, activityId, request.enrollmentId);
    if (saved.id !== gradeId || saved.grade !== request.grade || saved.version !== request.expectedVersion + 1) throw new Error('Respuesta de corrección inconsistente.');
    return saved;
  },
  async getHistory(gradeId: number, signal?: AbortSignal): Promise<ActivityGradeHistoryEntry[]> {
    const response = await httpClient.get<unknown>(`/v1/management/activity-grades/${requestId(gradeId)}/history`, { signal });
    if (response.status !== 200 || !Array.isArray(response.data)) throw new Error('Historial no confirmado.');
    const rows = response.data.map(entry => parseHistoryEntry(entry, gradeId));
    if (new Set(rows.map(h => h.id)).size !== rows.length) return invalid();
    return rows;
  },
};

// Without a response, any 5xx or an unverifiable body, the correction may or may not have been applied.
export function isUncertainActivityCorrection(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

export function adminActivityCorrectionErrorMessage(error: unknown): string {
  if (isUncertainActivityCorrection(error)) return 'No se pudo confirmar la corrección. Se consultó la planilla sin repetirla; revisa la nota vigente.';
  return activityGradeErrorCodeMessage(error) ?? adminGradesErrorMessage(error);
}

export function adminActivityReadErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 404) return activityGradeErrorCodeMessage(error) ?? 'Las actividades de este curso y bimestre no están disponibles.';
  return adminGradesErrorMessage(error);
}
