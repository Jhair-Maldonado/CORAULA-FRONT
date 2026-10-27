import httpClient, { LOGIN_URL } from './httpClient';
import { BackendRole } from '@/types';

export interface LoginResponse {
  token: string;
  tokenType: string;
  role: BackendRole;
  passwordChangeRequired: boolean;
}

/** Respuesta de POST /v1/auth/change-password: mismos campos del login, con un token nuevo. */
export type ChangePasswordResponse = LoginResponse;

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const CHANGE_PASSWORD_PATH = '/v1/auth/change-password';

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
    const response = await httpClient.post<LoginResponse>(LOGIN_URL, {
      email: correo,
      password: contrasenia,
    });
    return response.data;
  },

  /**
   * Cambia la contraseña de la cuenta autenticada. El token devuelto reemplaza al anterior,
   * que queda revocado en el backend. Las contraseñas se envían sin recortar.
   */
  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await httpClient.post<ChangePasswordResponse>(CHANGE_PASSWORD_PATH, request);
    return response.data;
  },
};
