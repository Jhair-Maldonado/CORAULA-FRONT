import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import type { SaveTeacherAttendanceRequest, TeacherAttendanceResponse } from '@/types/teacherAttendanceApi';

export const teacherAttendanceService = {
  async getAttendance(sectionCourseId: number, date: string): Promise<TeacherAttendanceResponse> {
    return (await httpClient.get<TeacherAttendanceResponse>(`/v1/teacher/courses/${sectionCourseId}/attendance`, { params: { date } })).data;
  },
  async saveAttendance(sectionCourseId: number, scheduleId: number, date: string, request: SaveTeacherAttendanceRequest): Promise<void> {
    // GET after PUT is the authoritative source of persisted IDs and statuses.
    await httpClient.put<unknown>(`/v1/teacher/courses/${sectionCourseId}/attendance/${scheduleId}`, request, { params: { date } });
  },
};

export function teacherAttendanceErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'La sesión ha expirado. Vuelve a iniciar sesión.';
    if (status === 403) return 'No tienes permiso para registrar asistencia.';
    if (status === 404) return 'El curso o la sesión ya no está disponible para tu cuenta.';
    if (status === 409) return 'Conflicto al guardar la asistencia. Puede que los datos hayan cambiado.';
    if (status === 400 || status === 422) {
      const body: unknown = error.response?.data;
      if (body && typeof body === 'object') {
        const errorBody = body as { message?: string; code?: string };
        if (errorBody.code === 'ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED') {
          return 'La causa de contingencia es obligatoria al registrar asistencia sin lector biométrico.';
        }
        if (errorBody.code === 'ATTENDANCE_REASON_REQUIRED') {
          return 'El motivo es obligatorio al registrar o corregir asistencia manualmente.';
        }
        if (typeof errorBody.message === 'string' && errorBody.message.trim()) {
          return errorBody.message;
        }
      }
      return 'Revisa la fecha y selecciona un estado para todos los estudiantes de la sesión.';
    }
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  }
  return 'No se pudo completar la solicitud. Intenta nuevamente.';
}
