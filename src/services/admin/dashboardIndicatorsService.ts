import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { Bimester } from '@/types/evaluationApi';

// Indicators of the management dashboard, built only from existing backend endpoints.

export interface PeriodVacancies { totalCapacity: number; activeEnrollmentCount: number; availableVacancies: number; grades: number }

function invalid(): never { throw new Error('La respuesta de vacantes no coincide con el contrato.'); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function count(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalid(); return value; }
function requestId(value: number) { if (!Number.isSafeInteger(value) || value <= 0) throw new Error('El ID del periodo debe ser un entero positivo.'); return value; }

// GET /management/vacancies?academicPeriodId= → GradeVacanciesView[]; totals are summed per grade.
export function parsePeriodVacancies(value: unknown, academicPeriodId: number): PeriodVacancies {
  if (!Array.isArray(value)) return invalid();
  const seen = new Set<string>();
  const totals: PeriodVacancies = { totalCapacity: 0, activeEnrollmentCount: 0, availableVacancies: 0, grades: value.length };
  for (const item of value) {
    const g = object(item);
    if (g.academicPeriodId !== academicPeriodId || (g.level !== 'PRIMARY' && g.level !== 'SECONDARY') || !Array.isArray(g.sections)) return invalid();
    const grade = count(g.grade), capacity = count(g.totalCapacity), enrolled = count(g.activeEnrollmentCount), available = count(g.availableVacancies);
    if (grade < 1 || available > capacity) return invalid();
    const key = `${g.level}:${grade}`;
    if (seen.has(key)) return invalid();
    seen.add(key);
    totals.totalCapacity += capacity; totals.activeEnrollmentCount += enrolled; totals.availableVacancies += available;
  }
  if (![totals.totalCapacity, totals.activeEnrollmentCount, totals.availableVacancies].every(Number.isSafeInteger)) return invalid();
  return totals;
}

// No backend guarantee of a single ABIERTO bimester: the current one is the non-annulled bimester whose
// dates include today (Lima); overlapping dates resolve to the lowest number.
export function currentBimester(bimesters: Bimester[], today: string): Bimester | null {
  return bimesters
    .filter(b => b.status !== 'ANULADO' && b.startDate <= today && today <= b.endDate)
    .sort((a, b) => a.number - b.number)[0] ?? null;
}

export const dashboardIndicatorsService = {
  async vacancies(academicPeriodId: number, signal?: AbortSignal): Promise<PeriodVacancies> {
    const response = await httpClient.get<unknown>('/v1/management/vacancies', { params: { academicPeriodId: requestId(academicPeriodId) }, signal });
    if (response.status !== 200) invalid();
    return parsePeriodVacancies(response.data, academicPeriodId);
  },
};

type Indicator = 'bimester' | 'vacancies';
const notFound: Record<Indicator, string> = {
  bimester: 'El periodo académico ya no está disponible.',
  vacancies: 'El periodo académico ya no está disponible.',
};
const forbidden: Record<Indicator, string> = {
  bimester: 'No tienes permiso para consultar los bimestres.',
  vacancies: 'No tienes permiso para consultar las vacantes.',
};
const generic: Record<Indicator, string> = {
  bimester: 'No se pudieron consultar los bimestres. Intenta nuevamente.',
  vacancies: 'No se pudieron consultar las vacantes. Intenta nuevamente.',
};

// Sanitized: the server message is never shown. These endpoints define no error codes.
export function dashboardIndicatorErrorMessage(error: unknown, indicator: Indicator): string {
  if (!isAxiosError(error)) return generic[indicator];
  switch (error.response?.status) {
    case undefined: return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    case 401: return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
    case 403: return forbidden[indicator];
    case 404: return notFound[indicator];
    case 409: return indicator === 'vacancies' ? 'El periodo académico está inactivo; no tiene vacantes que mostrar.' : generic[indicator];
    default: return generic[indicator];
  }
}
