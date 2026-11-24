/**
 * Catálogo central de permisos de la interfaz (FRONT #167).
 *
 * SOLO controla qué ve y qué puede intentar el usuario en la UI: la autorización real es del backend
 * (SecurityConfiguration + @PreAuthorize). Los roles de cada acción copian `docs/permisos/matriz.yaml` del backend;
 * `tests/permissions.test.tsx` los compara con la copia `tests/fixtures/permisos-matriz.yaml`.
 * Módulo puro: sin React ni acceso a red. Los componentes lo consumen con `useCan` (`src/hooks/useCan.ts`).
 * Ver `docs/permisos.md` para añadir una acción.
 */
import type { BackendRole } from '@/types';

const A = 'ADMINISTRADOR';
const D = 'DIRECTIVO';

/**
 * Acciones de la UI y los roles que pueden ejecutarlas.
 * Convención: `<entidad>.<verbo>`; separar lectura (`read`) de escritura cuando la matriz las distingue.
 */
export const ACTION_ROLES = {
  /** Entrar al portal de administración (cualquier ruta bajo /api/v1/management). */
  'portal.admin': [A, D],
  'period.read': [A, D],
  'period.manage': [A],
  'justification.read': [A, D],
  /** Solo la Secretaría (DIRECTIVO) resuelve justificaciones. */
  'justification.decide': [D],
  'staff.manage': [A],
  // TODO(#138): restringir a ADMINISTRADOR cuando el backend aplique P2 de BACK #135.
  'audit.read': [A, D],
  'student.create': [A],
  'enrollment.withdraw': [A],
  'enrollment.create': [A],
  /** Suspender, reactivar y desactivar un alumno. */
  'student.changeState': [A],
  'guardian.create': [A],
  'teacher.account.create': [A],
  /** Desactivar y reactivar una cuenta de usuario. */
  'account.changeState': [A],
  'section.manage': [A],
  'attendance.contingency.save': [A],
  'bimester.annul': [A],
  /** Revisar, publicar y reabrir la publicación de un bimestre. */
  'bimester.publish': [A],
  'bimester.gradeWindow.manage': [A],
  'earlyAlert.evaluate': [A],
  'grade.read': [A, D],
  'grade.correct': [A],
  'activityGrade.history.read': [A],
  'student.import.preview': [A, D],
  'student.import.confirm': [A],
} as const satisfies Record<string, readonly BackendRole[]>;

/** Nombre de una acción del catálogo. */
export type Action = keyof typeof ACTION_ROLES;

/** Endpoint del backend que respalda una acción (ruta completa, como figura en la matriz). */
export interface ActionEndpoint {
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  ruta: string;
}

const M = '/api/v1/management';
const ep = (metodo: ActionEndpoint['metodo'], ruta: string): ActionEndpoint => ({ metodo, ruta: `${M}${ruta}` });

/**
 * Puente con la matriz del backend: endpoints que respalda cada acción. Los roles de la acción deben ser la intersección
 * de los de sus endpoints (o, con `prefijo`, la unión de los de todas las rutas bajo ese prefijo). Lo verifica la prueba.
 */
export const ACTION_ENDPOINTS: Record<Action, readonly ActionEndpoint[] | { prefijo: string }> = {
  'portal.admin': { prefijo: `${M}/` },
  'period.read': [ep('GET', '/academic-periods')],
  'period.manage': [
    ep('POST', '/academic-periods'),
    ep('PATCH', '/academic-periods/{id}'),
    ep('POST', '/academic-periods/{id}/deactivate'),
    ep('POST', '/academic-periods/{id}/reactivate'),
  ],
  'justification.read': [ep('GET', '/attendance-justifications'), ep('GET', '/attendance-justifications/{id}')],
  'justification.decide': [ep('POST', '/attendance-justifications/{id}/decision')],
  'staff.manage': [ep('GET', '/staff'), ep('POST', '/staff'), ep('GET', '/staff/{userId}')],
  'audit.read': [ep('GET', '/audit'), ep('GET', '/audit/{id}')],
  'student.create': [ep('POST', '/students')],
  'enrollment.withdraw': [ep('PATCH', '/students/{studentId}/enrollments/{enrollmentId}/withdraw')],
  'enrollment.create': [ep('POST', '/students/{studentId}/enrollments')],
  'student.changeState': [
    ep('PATCH', '/students/{studentId}/suspend'),
    ep('PATCH', '/students/{studentId}/reactivate'),
    ep('PATCH', '/students/{studentId}/deactivate'),
  ],
  'guardian.create': [ep('POST', '/students/{studentId}/guardians')],
  'teacher.account.create': [ep('POST', '/teachers/{teacherId}/account')],
  'account.changeState': [ep('PATCH', '/accounts/{userId}/deactivate'), ep('PATCH', '/accounts/{userId}/reactivate')],
  'section.manage': [ep('POST', '/sections'), ep('PATCH', '/sections/{id}')],
  'attendance.contingency.save': [ep('PUT', '/section-courses/{sectionCourseId}/attendance/{scheduleId}')],
  'bimester.annul': [ep('POST', '/bimesters/{id}/annul')],
  'bimester.publish': [
    ep('POST', '/bimesters/{b}/review'),
    ep('POST', '/bimesters/{b}/publish'),
    ep('POST', '/bimesters/{b}/reopen'),
  ],
  'bimester.gradeWindow.manage': [
    ep('POST', '/bimesters/{id}/grade-window/extension'),
    ep('PUT', '/bimesters/{id}/grade-window/registration-date'),
  ],
  'earlyAlert.evaluate': [ep('POST', '/bimesters/{bimesterId}/early-alerts/evaluate')],
  'grade.read': [ep('GET', '/section-courses/{sectionCourseId}/bimesters/{bimesterId}/criterion-grades')],
  'grade.correct': [ep('PATCH', '/criterion-grades/{gradeId}'), ep('PATCH', '/activity-grades/{gradeId}')],
  'activityGrade.history.read': [ep('GET', '/activity-grades/{gradeId}/history')],
  'student.import.preview': [ep('POST', '/students/import/preview')],
  'student.import.confirm': [ep('POST', '/students/import/confirm')],
};

/** Datos de sesión que `canWithSession` necesita (subconjunto de AuthContext). */
export interface PermissionSession {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  sessionValid: boolean;
  role: BackendRole | null;
}

/** Mensaje uniforme cuando el backend responde 403 a una escritura. */
export const FORBIDDEN_ACTION_MESSAGE = 'No tienes permiso para esta acción.';

const hasAction = (action: string): action is Action => Object.hasOwn(ACTION_ROLES, action);

/** Roles autorizados para la acción (vacío si no existe). Útil para `AuthGuard`. */
export function rolesFor(action: Action): readonly BackendRole[] {
  return hasAction(action) ? ACTION_ROLES[action] : [];
}

/** Indica si el rol puede ejecutar la acción. Falso con rol nulo o desconocido y con acción inexistente. */
export function can(role: string | null | undefined, action: Action): boolean {
  if (!role || !hasAction(action)) return false;
  return (ACTION_ROLES[action] as readonly string[]).includes(role);
}

/** Como `can`, pero exige además una sesión autenticada y vigente. */
export function canWithSession(auth: PermissionSession | null | undefined, action: Action): boolean {
  return !!auth && auth.status === 'authenticated' && auth.sessionValid && can(auth.role, action);
}

/** Error 403 de permisos (no el 403 del cambio obligatorio de contraseña). */
export function isForbidden(error: unknown): boolean {
  const e = error as { response?: { status?: number; data?: { code?: string } } } | null | undefined;
  return e?.response?.status === 403 && e.response.data?.code !== 'PASSWORD_CHANGE_REQUIRED';
}
