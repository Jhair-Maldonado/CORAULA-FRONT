import httpClient from './httpClient';
import { BackendRole } from '@/types';

export interface LoginResponse {
  token: string;
  tokenType: string;
  role: BackendRole;
}

/**
 * Servicio exclusivo para operaciones de autenticación.
 * Consume `httpClient` heredando sus interceptores de seguridad.
 */
export const authService = {
  /**
   * Autentica un usuario contra el backend y retorna credenciales y rol.
   * En caso de éxito, el JWT debe almacenarse globalmente usando AuthContext.
   */
  async login(correo: string, contrasenia: string): Promise<LoginResponse> {
    // --- INICIO MOCK DE PRUEBA ---
    if (contrasenia === 'usuario1234') {
      let mockRole: BackendRole | null = null;
      if (correo === 'admin.test@coraula.local') mockRole = 'ADMINISTRADOR';
      else if (correo === 'directivo.test@coraula.local') mockRole = 'DIRECTIVO';
      else if (correo === 'docente.test@coraula.local') mockRole = 'DOCENTE';
      else if (correo === 'estudiante.test@coraula.local') mockRole = 'ESTUDIANTE';
      else if (correo === 'apoderado.test@coraula.local') mockRole = 'APODERADO';

      if (mockRole) {
        // Simular un retraso de red
        await new Promise(resolve => setTimeout(resolve, 800));
        return {
          token: `mock-jwt-token-${mockRole.toLowerCase()}`,
          tokenType: 'Bearer',
          role: mockRole
        };
      }
    }
    // --- FIN MOCK DE PRUEBA ---

    const response = await httpClient.post<LoginResponse>('/v1/auth/login', {
      email: correo,
      password: contrasenia,
    });
    return response.data;
  },
};
