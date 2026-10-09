import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { UpdateVacancySectionRequest, UpdateVacancySectionResponse, VacancyGradeResponse } from '@/types/vacanciesApi';

export const vacanciesService = {
  async list(): Promise<VacancyGradeResponse[]> {
    return (await httpClient.get<VacancyGradeResponse[]>('/v1/management/vacancies')).data;
  },
  async updateSection(sectionId: number, request: UpdateVacancySectionRequest): Promise<UpdateVacancySectionResponse> {
    return (await httpClient.patch<UpdateVacancySectionResponse>(`/v1/management/vacancies/sections/${sectionId}`, request)).data;
  },
};

export function vacanciesErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 401) return 'La sesión ha expirado. Vuelve a iniciar sesión.';
    if (error.response?.status === 403) return 'No tienes permiso para gestionar vacantes.';
    if (error.response?.status === 404) return 'La sección ya no está disponible.';
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    const body: unknown = error.response.data;
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string' && body.message.trim()) return body.message;
  }
  return 'No se pudo completar la solicitud. Intenta nuevamente.';
}
