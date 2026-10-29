import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { CreateSectionRequest, SectionLevel, SectionListParams, SectionResponse, SectionStatusRequest, UpdateSectionRequest } from '@/types/sectionApi';

const endpoint = '/v1/management/sections';
export const maxSectionNameLength = 10;
export const maxGradeByLevel: Record<SectionLevel, number> = { PRIMARY: 6, SECONDARY: 5 };

const path = (id: string | number) => `${endpoint}/${encodeURIComponent(id)}`;

export const sectionsService = {
  async list(params: SectionListParams = {}): Promise<SectionResponse[]> {
    return (await httpClient.get<SectionResponse[]>(endpoint, { params })).data;
  },
  async getById(id: string | number): Promise<SectionResponse> {
    return (await httpClient.get<SectionResponse>(path(id))).data;
  },
  async create(payload: CreateSectionRequest): Promise<SectionResponse> {
    return (await httpClient.post<SectionResponse>(endpoint, payload)).data;
  },
  async update(id: string | number, payload: UpdateSectionRequest): Promise<SectionResponse> {
    if (!Object.keys(payload).length) throw new Error('No hay cambios para guardar.');
    return (await httpClient.patch<SectionResponse>(path(id), payload)).data;
  },
  async changeStatus(id: string | number, payload: SectionStatusRequest): Promise<SectionResponse> {
    return (await httpClient.patch<SectionResponse>(path(id), payload)).data;
  },
};

export type DeactivationResult =
  | { kind: 'deactivated'; section: SectionResponse }
  | { kind: 'needsConfirmation' }
  | { kind: 'alreadyInactive'; section: SectionResponse };

// The backend answers every 409 with the same body and no stable code, so the cause is never read from its text.
// A 409 to { active: false } without confirmation has only two causes: the section is already inactive, or it has
// active enrollments. Re-reading the section tells them apart: if it is still active, the cause is active enrollments.
export async function deactivateSection(id: string | number): Promise<DeactivationResult> {
  try {
    return { kind: 'deactivated', section: await sectionsService.changeStatus(id, { active: false }) };
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 409) throw error;
    let current: SectionResponse;
    try {
      current = await sectionsService.getById(id);
    } catch {
      throw error;
    }
    return current.active ? { kind: 'needsConfirmation' } : { kind: 'alreadyInactive', section: current };
  }
}

export function confirmDeactivation(id: string | number): Promise<SectionResponse> {
  return sectionsService.changeStatus(id, { active: false, confirmActiveEnrollments: true });
}

export function sectionValidation(values: CreateSectionRequest): string | null {
  if (!Number.isSafeInteger(values.academicPeriodId) || values.academicPeriodId <= 0) return 'Selecciona un periodo académico.';
  const maxGrade = maxGradeByLevel[values.level];
  if (!Number.isInteger(values.grade) || values.grade < 1 || values.grade > maxGrade) return `Selecciona un grado entre 1 y ${maxGrade}.`;
  const name = values.name.trim();
  if (!name) return 'Ingresa el nombre de la sección.';
  if (name.length > maxSectionNameLength) return `El nombre no puede superar ${maxSectionNameLength} caracteres.`;
  if (!Number.isSafeInteger(values.maxCapacity) || values.maxCapacity <= 0) return 'La capacidad máxima debe ser un entero mayor que 0.';
  return null;
}

// Level is fixed once the section exists, so it never travels in the PATCH.
export function sectionChanges(original: SectionResponse, values: CreateSectionRequest): UpdateSectionRequest {
  const changes: UpdateSectionRequest = {};
  const name = values.name.trim();
  if (values.academicPeriodId !== original.academicPeriodId) changes.academicPeriodId = values.academicPeriodId;
  if (values.grade !== original.grade) changes.grade = values.grade;
  if (name !== original.name) changes.name = name;
  if (values.maxCapacity !== original.maxCapacity) changes.maxCapacity = values.maxCapacity;
  if (values.enrollmentOpen !== original.enrollmentOpen) changes.enrollmentOpen = values.enrollmentOpen;
  return changes;
}
