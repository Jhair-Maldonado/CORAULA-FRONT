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
    const response = await httpClient.post<LoginResponse>('/v1/auth/login', {
      email: correo,
      password: contrasenia,
    });
    return response.data;
  },
};
