import httpClient from '@/services/httpClient';
import type { StudentMeResponse } from '@/types/studentProfileApi';

/** Perfil del estudiante autenticado (portal del Alumno). */
export const studentProfileService = {
  /**
   * Consulta `GET /v1/student/me`. Solo responde a un JWT con rol ESTUDIANTE.
   * Errores: 404 `STUDENT_NOT_FOUND` / `STUDENT_NOT_ENROLLED`; 401 y 403 sin código.
   * @param signal Cancela la petición al desmontar el portal.
   */
  async getMe(signal?: AbortSignal): Promise<StudentMeResponse> {
    // SECURITY: la identidad sale del JWT; la ruta no lleva ids.
    return (await httpClient.get<StudentMeResponse>('/v1/student/me', { signal })).data;
  },
};
