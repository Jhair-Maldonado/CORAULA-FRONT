import { isAxiosError } from 'axios';
import { contractErrorCode } from '@/services/admin/contractErrors';
import type { AcademicPeriodDependency, AcademicPeriodDependencyType } from '@/types/academicPeriodApi';

// BACK #88 (docs/academic-period-activation.md): codes of POST /management/academic-periods/{id}/deactivate | reactivate.
// 401/403 never carry a code. To add a code, add its status here and its text below.
const contractStatuses = {
  VALIDATION_ERROR: [400],
  REASON_REQUIRED: [400],
  ACADEMIC_PERIOD_NOT_FOUND: [404],
  ACADEMIC_PERIOD_STATE_CONFLICT: [409],
  ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES: [409],
  ACADEMIC_PERIOD_OVERLAP: [409],
  INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type AcademicPeriodActivationErrorCode = keyof typeof contractStatuses;

// Generic codes carry no specific cause: the HTTP-based text stays.
type GenericActivationErrorCode = 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

export const academicPeriodActivationErrorCodeMessages: Record<Exclude<AcademicPeriodActivationErrorCode, GenericActivationErrorCode>, string> = {
  REASON_REQUIRED: 'Indica el motivo (obligatorio, hasta 255 caracteres).',
  ACADEMIC_PERIOD_NOT_FOUND: 'El periodo académico ya no existe. Se actualizó la lista.',
  ACADEMIC_PERIOD_STATE_CONFLICT: 'El estado del periodo cambió y esta acción ya no está permitida. Se actualizó la lista.',
  ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES: 'No se puede desactivar el periodo: todavía tiene registros activos. Resuélvelos y vuelve a intentarlo. Se actualizó la lista.',
  ACADEMIC_PERIOD_OVERLAP: 'No se puede reactivar el periodo: sus fechas se solapan con otro periodo activo. Las fechas son inclusivas, así que compartir el primer o el último día también es solapamiento. Desactiva o ajusta las fechas del otro periodo antes de reactivar. Se actualizó la lista.',
};

export function academicPeriodActivationErrorCode(error: unknown): AcademicPeriodActivationErrorCode | null {
  return contractErrorCode<AcademicPeriodActivationErrorCode>(error, contractStatuses);
}

// Blocking dependency types in display order, with where each one is resolved.
export const academicPeriodDependencyGuide: Record<AcademicPeriodDependencyType, { label: string; hint: string; href: string; link: string }> = {
  ACTIVE_ENROLLMENTS: { label: 'Matrículas activas', hint: 'Retira cada matrícula desde el perfil del alumno.', href: '/administrador/alumnos', link: 'Ir a Alumnos' },
  ACTIVE_SECTIONS: { label: 'Secciones activas', hint: 'Desactiva las secciones del periodo.', href: '/administrador/secciones', link: 'Ir a Secciones' },
  ACTIVE_SECTION_COURSES: { label: 'Cursos de sección activos', hint: 'Retira los cursos en el detalle de cada sección.', href: '/administrador/secciones', link: 'Ir a Secciones' },
  OPEN_BIMESTERS: { label: 'Bimestres abiertos', hint: 'Gestiónalos hasta que queden Cerrados o Anulados.', href: '/administrador/bimestres', link: 'Ir a Bimestres' },
  REVIEW_BIMESTERS: { label: 'Bimestres en revisión', hint: 'Gestiónalos hasta que queden Cerrados o Anulados.', href: '/administrador/bimestres', link: 'Ir a Bimestres' },
};

const dependencyTypes = Object.keys(academicPeriodDependencyGuide) as AcademicPeriodDependencyType[];
const isPositiveId = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

// Details of a recognized ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES, in display order. Unknown types are
// ignored; null when the code does not apply or a known entry is malformed (the generic text stays).
export function academicPeriodDependencies(error: unknown): AcademicPeriodDependency[] | null {
  if (academicPeriodActivationErrorCode(error) !== 'ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES' || !isAxiosError(error)) return null;
  const details: unknown = (error.response?.data as Record<string, unknown>).details;
  if (!Array.isArray(details)) return null;
  const found = new Map<AcademicPeriodDependencyType, AcademicPeriodDependency>();
  for (const item of details) {
    if (!item || typeof item !== 'object') return null;
    const { type, count, ids, truncated } = item as Record<string, unknown>;
    if (typeof type !== 'string' || !dependencyTypes.includes(type as AcademicPeriodDependencyType)) continue;
    if (found.has(type as AcademicPeriodDependencyType) || !isPositiveId(count) || !Array.isArray(ids) || ids.length > 20 || ids.length > count
      || !ids.every(isPositiveId) || typeof truncated !== 'boolean') return null;
    found.set(type as AcademicPeriodDependencyType, { type: type as AcademicPeriodDependencyType, count, ids: [...ids], truncated });
  }
  return found.size ? dependencyTypes.flatMap(type => found.get(type) ?? []) : null;
}

// Without a response, a 5xx or an unexpected body, the state may or may not have changed: never retry automatically.
export function isUncertainAcademicPeriodActivation(error: unknown): boolean {
  if (!isAxiosError(error)) return true;
  const status = error.response?.status;
  return status === undefined || status >= 500;
}

// 404, 409 and uncertain outcomes close the dialog and reload the list; 400/401/403 keep the dialog.
export function academicPeriodActivationReloads(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return isUncertainAcademicPeriodActivation(error) || status === 404 || status === 409;
}

export function academicPeriodActivationErrorMessage(error: unknown): string {
  if (isUncertainAcademicPeriodActivation(error)) return 'No se pudo confirmar el cambio de estado. Se recargó la lista sin repetir la solicitud; revisa el estado del periodo antes de continuar.';
  const code = academicPeriodActivationErrorCode(error);
  if (code && code in academicPeriodActivationErrorCodeMessages) return academicPeriodActivationErrorCodeMessages[code as keyof typeof academicPeriodActivationErrorCodeMessages];
  switch (isAxiosError(error) ? error.response?.status : undefined) {
    case 400: return 'Revisa el motivo (obligatorio, hasta 255 caracteres).';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'Solo el Administrador puede desactivar o reactivar periodos académicos.';
    case 404: return 'El periodo académico ya no existe. Se actualizó la lista.';
    case 409: return 'El periodo cambió y la operación ya no está permitida. Se actualizó la lista; revísala antes de continuar.';
    default: return 'No se pudo cambiar el estado del periodo. Intenta nuevamente.';
  }
}
