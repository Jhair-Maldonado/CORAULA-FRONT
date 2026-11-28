import { BackendRole } from '@/types';

/** Roles del personal institucional: acceden por los portales de administración y docente. */
export type StaffRole = Extract<BackendRole, 'ADMINISTRADOR' | 'DIRECTIVO' | 'DOCENTE'>;
/** Roles del portal de estudiantes y familias. */
export type PortalUserRole = Extract<BackendRole, 'ESTUDIANTE' | 'APODERADO'>;

/** Rol del personal institucional (ADMINISTRADOR, DIRECTIVO o DOCENTE). */
export const isStaffRole = (role: BackendRole | null | undefined): role is StaffRole =>
  role === 'ADMINISTRADOR' || role === 'DIRECTIVO' || role === 'DOCENTE';

/** Rol del portal de estudiantes y familias (ESTUDIANTE o APODERADO). */
export const isPortalUserRole = (role: BackendRole | null | undefined): role is PortalUserRole =>
  role === 'ESTUDIANTE' || role === 'APODERADO';

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
