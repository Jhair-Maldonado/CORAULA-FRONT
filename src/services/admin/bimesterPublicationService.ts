import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { parseBimesterResponse } from '@/lib/manualGradesContract';
import { evaluationResultReasonLabel } from '@/lib/evaluationResultsContract';
import { bimesterPublicationErrorCodeMessage } from '@/services/admin/bimesterPublicationErrors';
import { bimesterStatusLabels, type Bimester } from '@/types/evaluationApi';
import type { EvaluationResultReason } from '@/types/evaluationResultsApi';
import type { BimesterPublicationView, PublicationCourseStatus, PublicationPending, PublishBimesterRequest, ReopenBimesterRequest } from '@/types/bimesterPublicationApi';

export type PublicationAction = 'review' | 'publish' | 'reopen';
export const maxReopenReasonLength = 255;

const base = '/v1/management/bimesters';
function invalid(): never { throw new Error('La respuesta de publicación no coincide con el contrato.'); }
function id(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid(); return value; }
function nullableId(value: unknown): number | null { return value === null ? null : id(value); }
function timestamp(value: unknown): string { if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return invalid(); return value; }
function nullableTimestamp(value: unknown): string | null { return value === null ? null : timestamp(value); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function requestId(value: number) { if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El ID del bimestre debe ser un entero positivo.'); return value; }

function course(value: unknown): PublicationCourseStatus {
  const c = object(value);
  if (typeof c.applicable !== 'boolean' || typeof c.registered !== 'boolean' || (c.registered && !c.applicable)) return invalid();
  return { sectionCourseId: id(c.sectionCourseId), applicable: c.applicable, registered: c.registered, registeredAt: nullableTimestamp(c.registeredAt) };
}
function pending(value: unknown): PublicationPending {
  const p = object(value);
  if (!Array.isArray(p.reasons) || !p.reasons.length || p.reasons.some(r => typeof r !== 'string' || !r.trim())) return invalid();
  return { sectionCourseId: nullableId(p.sectionCourseId), enrollmentId: nullableId(p.enrollmentId), reasons: [...p.reasons] as string[] };
}

export function parseBimesterPublicationView(value: unknown, bimesterId: number): BimesterPublicationView {
  const v = object(value);
  if (id(v.bimesterId) !== bimesterId || !Object.prototype.hasOwnProperty.call(bimesterStatusLabels, String(v.status))) return invalid();
  if (typeof v.revision !== 'number' || !Number.isSafeInteger(v.revision) || v.revision < 0 || !Array.isArray(v.courses) || !Array.isArray(v.details)) return invalid();
  const publishedAt = nullableTimestamp(v.publishedAt);
  const courses = v.courses.map(course), details = v.details.map(pending);
  if (new Set(courses.map(c => c.sectionCourseId)).size !== courses.length) return invalid();
  if (publishedAt !== null) {
    // Published: read without rebuilding the preparation.
    if (v.status !== 'CERRADO' || v.revision < 1 || v.preparationRevision !== null || courses.length || details.length) return invalid();
  } else if (v.revision !== 0 || typeof v.preparationRevision !== 'string' || !v.preparationRevision.trim()) return invalid();
  return { bimesterId, status: v.status as Bimester['status'], publishedAt, revision: v.revision, preparationRevision: v.preparationRevision as string | null, courses, details };
}

export function reopenReasonError(reason: string): string | null {
  const motive = reason.trim();
  if (!motive) return 'Indica el motivo de la reapertura.';
  return motive.length > maxReopenReasonLength ? `El motivo no puede superar los ${maxReopenReasonLength} caracteres.` : null;
}

// Pendings block /review and /publish (backend requireReady); the backend still decides.
export function hasPublicationPendings(view: BimesterPublicationView): boolean {
  return view.details.length > 0 || view.courses.some(c => c.applicable && !c.registered);
}

export const bimesterPublicationService = {
  async getPublication(bimesterId: number, signal?: AbortSignal): Promise<BimesterPublicationView> {
    const response = await httpClient.get<unknown>(`${base}/${requestId(bimesterId)}/publication`, { signal });
    if (response.status !== 200) throw new Error('Estado de publicación no confirmado.');
    return parseBimesterPublicationView(response.data, bimesterId);
  },
  async review(bimesterId: number): Promise<BimesterPublicationView> {
    const response = await httpClient.post<unknown>(`${base}/${requestId(bimesterId)}/review`);
    if (response.status !== 200) throw new Error('Paso a revisión no confirmado.');
    const view = parseBimesterPublicationView(response.data, bimesterId);
    if (view.status !== 'EN_REVISION' || view.publishedAt !== null) throw new Error('La respuesta no confirma el paso a revisión.');
    return view;
  },
  async publish(bimesterId: number, preparationRevision: string): Promise<BimesterPublicationView> {
    if (typeof preparationRevision !== 'string' || !preparationRevision.trim() || preparationRevision.length > 64) throw new Error('Consulta la preparación antes de publicar.');
    // Whitelist the wire fields: confirmation and the fingerprint read from the panel.
    const body: PublishBimesterRequest = { confirmed: true, preparationRevision };
    const response = await httpClient.post<unknown>(`${base}/${requestId(bimesterId)}/publish`, body);
    if (response.status !== 200) throw new Error('Publicación no confirmada.');
    const view = parseBimesterPublicationView(response.data, bimesterId);
    if (view.status !== 'CERRADO' || view.publishedAt === null) throw new Error('La respuesta no confirma la publicación.');
    return view;
  },
  async reopen(bimesterId: number, reason: string): Promise<Bimester> {
    const error = reopenReasonError(reason);
    if (error) throw new Error(error);
    const body: ReopenBimesterRequest = { reason: reason.trim() };
    const response = await httpClient.post<unknown>(`${base}/${requestId(bimesterId)}/reopen`, body);
    if (response.status !== 200) throw new Error('Reapertura no confirmada.');
    const bimester = parseBimesterResponse(response.data);
    if (bimester.id !== bimesterId || bimester.status !== 'ABIERTO') throw new Error('La respuesta no confirma la reapertura.');
    return bimester;
  },
};

// Without a response, a 5xx or an unexpected body, the action may or may not have happened: never retry.
export function isUncertainPublicationAction(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

const invalidRequest: Record<PublicationAction, string> = {
  review: 'La solicitud de paso a revisión no es válida. Actualiza el panel.',
  publish: 'La solicitud de publicación no es válida. Actualiza el panel.',
  reopen: 'Revisa el motivo de la reapertura (obligatorio, hasta 255 caracteres).',
};

export function publicationActionErrorMessage(error: unknown, action: PublicationAction): string {
  if (isUncertainPublicationAction(error)) return 'No se pudo confirmar la operación. Se consultó el estado sin repetirla; revisa el panel antes de continuar.';
  const byCode = bimesterPublicationErrorCodeMessage(error);
  if (byCode) return byCode;
  switch (isAxiosError(error) ? error.response?.status : undefined) {
    case 400: return invalidRequest[action];
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Director puede pasar a revisión, publicar o reabrir un bimestre.';
    case 404: return 'El bimestre ya no está disponible. Se recargó el panel.';
    case 409: return 'El bimestre cambió. Se recargó el panel; revísalo antes de continuar.';
    default: return 'No se pudo completar la operación. Se recargó el panel.';
  }
}

export function publicationReadErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return 'El estado de publicación no pudo confirmarse. Actualiza el panel.';
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para consultar la publicación del bimestre.';
    case 404: return 'El bimestre ya no está disponible.';
    default: return 'No se pudo consultar el estado de publicación. Intenta nuevamente.';
  }
}

const resultReasons = new Set(['INSUFFICIENT_MANUAL_CRITERIA', 'INVALID_PA_CRITERION_COUNT', 'PA_UNAVAILABLE', 'AREA_INCOMPLETE']);

export function publicationReasonLabel(reason: string, sectionLabel?: (sectionId: number) => string | undefined): string {
  switch (reason) {
    case 'COURSE_NOT_REGISTERED': return 'Curso sin registro final del docente';
    case 'ACADEMIC_CONTEXT_INACTIVE': return 'La sección o el curso están inactivos';
    case 'NO_ACTIVE_POPULATION': return 'No hay matrículas activas en el periodo';
  }
  const section = /^SECTION_WITHOUT_COURSES:(\d+)$/.exec(reason);
  if (section) return `${sectionLabel?.(Number(section[1])) ?? `Sección #${section[1]}`}: tiene alumnos y ningún curso activo`;
  if (resultReasons.has(reason) || /^MISSING_MANUAL_GRADE:\d+$/.test(reason)) return evaluationResultReasonLabel(reason as EvaluationResultReason);
  return 'Pendiente no reconocido';
}
