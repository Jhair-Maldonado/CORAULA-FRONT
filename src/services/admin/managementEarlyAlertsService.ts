import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { EARLY_ALERTS_PAGE_SIZE, isValidEarlyAlertsPage, parseEarlyWarningsPage } from '@/lib/earlyWarningsContract';
import type { EarlyWarningsPage } from '@/types/teacherEarlyAlertsApi';

// Backend #52 (docs/early-warnings.md): EarlyWarningsController.Management + EarlyWarningsExceptionHandler.
// GET: ADMINISTRADOR y DIRECTIVO. POST evaluate: solo ADMINISTRADOR. 401/403 never carry a code.
const contractStatuses = {
  ALERT_REQUEST_INVALID: [400],
  ALERT_CONTEXT_UNAVAILABLE: [404],
  ALERT_INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type ManagementEarlyAlertsErrorCode = keyof typeof contractStatuses;
export const MANAGEMENT_EARLY_ALERTS_ERROR_CODES = Object.keys(contractStatuses) as ManagementEarlyAlertsErrorCode[];

export const MANAGEMENT_EARLY_ALERTS_EMPTY_MESSAGE = 'No hay alertas generadas en este bimestre';
export const EVALUATION_UNCONFIRMED_MESSAGE = 'No se pudo confirmar la evaluación. Se actualizó el listado.';

export interface EarlyAlertsEvaluation { bimesterId: number; createdCount: number }

export class EarlyAlertsContractError extends Error {
  constructor() { super('La respuesta de alertas tempranas no coincide con el contrato.'); this.name = 'EarlyAlertsContractError'; }
}

function requestId(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El bimestre y el curso deben ser enteros positivos.');
  return value;
}

export function parseEvaluation(value: unknown, bimesterId: number): EarlyAlertsEvaluation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EarlyAlertsContractError();
  const r = value as Record<string, unknown>;
  if (r.bimesterId !== bimesterId || typeof r.createdCount !== 'number' || !Number.isSafeInteger(r.createdCount) || r.createdCount < 0) throw new EarlyAlertsContractError();
  return { bimesterId, createdCount: r.createdCount };
}

export function evaluationNotice(createdCount: number): string {
  return createdCount === 1 ? 'Se generó 1 alerta nueva' : `Se generaron ${createdCount} alertas nuevas`;
}

export const managementEarlyAlertsService = {
  /** sectionCourseId null = every course of the bimester. */
  async list(bimesterId: number, sectionCourseId: number | null, page = 0, size = EARLY_ALERTS_PAGE_SIZE, signal?: AbortSignal): Promise<EarlyWarningsPage> {
    if (!isValidEarlyAlertsPage(page, size)) throw new Error('La paginación solicitada no es válida.');
    const params = sectionCourseId === null ? { page, size } : { sectionCourseId: requestId(sectionCourseId), page, size };
    const response = await httpClient.get<unknown>(`/v1/management/bimesters/${requestId(bimesterId)}/early-alerts`, { params, signal });
    return parseEarlyWarningsPage(response.data, { bimesterId, sectionCourseId, page, size });
  },
  /** Solo ADMINISTRADOR, sin cuerpo. Resolves only with a 200 for the same bimester. */
  async evaluate(bimesterId: number): Promise<EarlyAlertsEvaluation> {
    const response = await httpClient.post<unknown>(`/v1/management/bimesters/${requestId(bimesterId)}/early-alerts/evaluate`);
    if (response.status !== 200) throw new EarlyAlertsContractError();
    return parseEvaluation(response.data, bimesterId);
  },
};

export function managementEarlyAlertsErrorCode(error: unknown): ManagementEarlyAlertsErrorCode | null {
  return contractErrorCode(error, contractStatuses);
}

/** The result of an evaluation is unknown: no answer, a 5xx or a response outside the contract. */
export function isUnconfirmedEvaluation(error: unknown): boolean {
  if (error instanceof EarlyAlertsContractError) return true;
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

// Server messages are never echoed.
export function managementEarlyAlertsErrorMessage(error: unknown, action: 'list' | 'evaluate'): string {
  if (action === 'evaluate' && isUnconfirmedEvaluation(error)) return EVALUATION_UNCONFIRMED_MESSAGE;
  switch (managementEarlyAlertsErrorCode(error)) {
    case 'ALERT_REQUEST_INVALID': return 'El bimestre, el curso o la página no son válidos.';
    case 'ALERT_CONTEXT_UNAVAILABLE': return 'El bimestre o el curso ya no está disponible. Actualiza la información.';
  }
  if (!isAxiosError(error)) return error instanceof Error ? error.message : 'No se pudieron consultar las alertas tempranas.';
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 400: return 'El bimestre, el curso o la página no son válidos.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return action === 'evaluate' ? 'Solo el Director puede evaluar alertas.' : 'No tienes autorización para consultar las alertas.';
    case 404: return 'El bimestre o el curso ya no está disponible. Actualiza la información.';
    default: return 'No se pudieron consultar las alertas tempranas. Intenta nuevamente.';
  }
}
