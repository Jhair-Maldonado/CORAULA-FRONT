import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { TeacherCourseDetailResponse, TeacherCourseStudentResponse, TeacherCourseSummaryResponse } from '@/types/teacherCoursesApi';

const endpoint = '/v1/teacher/courses';

export const teacherCoursesService = {
  async getCourses(): Promise<TeacherCourseSummaryResponse[]> {
    return (await httpClient.get<TeacherCourseSummaryResponse[]>(endpoint)).data;
  },
  async getCourse(sectionCourseId: number): Promise<TeacherCourseDetailResponse> {
    return (await httpClient.get<TeacherCourseDetailResponse>(`${endpoint}/${sectionCourseId}`)).data;
  },
  async getStudents(sectionCourseId: number): Promise<TeacherCourseStudentResponse[]> {
    return (await httpClient.get<TeacherCourseStudentResponse[]>(`${endpoint}/${sectionCourseId}/students`)).data;
  },
};

export function teacherCoursesErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    switch (error.response?.status) {
      case 401: return 'La sesión ha expirado. Vuelve a iniciar sesión.';
      case 403: return 'No tienes permiso para acceder a estos cursos.';
      case 404: return 'Curso no encontrado o no asignado a tu cuenta.';
    }
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  }
  return 'No se pudo cargar la información. Intenta nuevamente.';
}
