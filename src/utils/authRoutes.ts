import { BackendRole } from '@/types';

export const CHANGE_PASSWORD_ROUTE = '/cambiar-contrasena';

/** Portal de inicio de cada rol autenticado. */
export function portalPathForRole(role: BackendRole | null): string {
  if (role === 'ADMINISTRADOR' || role === 'DIRECTIVO') return '/administrador';
  if (role === 'DOCENTE') return '/docente';
  if (role === 'ESTUDIANTE') return '/alumno';
  if (role === 'APODERADO') return '/padre';
  return '/login';
}

/** Destino tras un login correcto: el cambio obligatorio tiene prioridad sobre el portal. */
export function postLoginPath(role: BackendRole, passwordChangeRequired: boolean): string {
  return passwordChangeRequired ? CHANGE_PASSWORD_ROUTE : portalPathForRole(role);
}
