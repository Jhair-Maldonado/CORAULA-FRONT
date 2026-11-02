import { isIsoDate } from '@/lib/gradeWindowContract';
import type { EarlyWarning, EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';

// Backend #52 (docs/early-warnings.md): PagedResult<EarlyWarningView>, shared by the teacher (FRONT #107)
// and management views. Strict: anything outside the contract throws.

export const EARLY_ALERTS_PAGE_SIZE = 20;
/** EarlyWarningsService.validatePage: size from 1 to 100, page from 0. */
export const EARLY_ALERTS_MAX_PAGE_SIZE = 100;

function invalid(): never { throw new Error('La respuesta de alertas tempranas no coincide con el contrato.'); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function id(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid(); return value; }
function count(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalid(); return value; }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return invalid(); return value; }
function timestamp(value: unknown): string { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return invalid(); return value; }
// V26: nota_pa DECIMAL(3,1) between 0 and 10.9.
function pa(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 11 || Math.abs(value * 10 - Math.round(value * 10)) > 1e-8) return invalid();
  return value;
}

export function isValidEarlyAlertsPage(page: number, size: number): boolean {
  return Number.isSafeInteger(page) && page >= 0 && Number.isSafeInteger(size) && size >= 1 && size <= EARLY_ALERTS_MAX_PAGE_SIZE;
}

type Expected = { sectionCourseId?: number | null; bimesterId: number; page: number; size: number };

function warning(value: unknown, expected: Expected): EarlyWarning {
  const w = object(value);
  const sectionCourseId = id(w.sectionCourseId), bimesterId = id(w.bimesterId);
  if (bimesterId !== expected.bimesterId) return invalid();
  if (expected.sectionCourseId != null && sectionCourseId !== expected.sectionCourseId) return invalid();
  if (w.studentCode !== null && (typeof w.studentCode !== 'string' || !w.studentCode.trim())) return invalid();
  if (!isIsoDate(w.evaluatedOn)) return invalid();
  return {
    alertId: id(w.alertId), enrollmentId: id(w.enrollmentId), sectionCourseId, bimesterId, studentId: id(w.studentId),
    studentCode: w.studentCode as string | null, fullName: text(w.fullName), courseName: text(w.courseName), sectionName: text(w.sectionName),
    paAtDetection: pa(w.paAtDetection), activityCount: id(w.activityCount), evaluatedOn: w.evaluatedOn, detectedAt: timestamp(w.detectedAt),
  };
}

/** Without sectionCourseId (management, all courses) alerts of every course of the bimester are accepted. */
export function parseEarlyWarningsPage(value: unknown, expected: Expected): EarlyWarningsPage {
  const p = object(value);
  if (!Array.isArray(p.content)) return invalid();
  const page = count(p.page), size = id(p.size), totalElements = count(p.totalElements), totalPages = count(p.totalPages);
  // The backend counts and lists in separate reads, so content is not matched against totalElements exactly.
  if (page !== expected.page || size !== expected.size || totalPages !== Math.ceil(totalElements / size) || p.content.length > size) return invalid();
  // UNIQUE (matricula_id, seccion_curso_id, bimestre_id): one alert per enrollment and course in the bimester.
  const content = p.content.map(item => warning(item, expected));
  if (new Set(content.map(w => w.alertId)).size !== content.length) return invalid();
  if (new Set(content.map(w => `${w.enrollmentId}:${w.sectionCourseId}`)).size !== content.length) return invalid();
  return { content, page, size, totalElements, totalPages };
}
