import type { TeacherAttendanceStatus, TeacherContingencyCause } from '@/types/teacherAttendanceApi';

// RF-16 / RF-42 (BACK #37 y #83): reglas de causa y motivo comunes al docente y al Director.
// Sin integración con el lector biométrico, toda toma manual es CONTINGENCIA (causa + motivo) si alguna
// matrícula no tiene registro, y CORRECCION_MANUAL (solo motivo) si cambia un estado guardado.

export const ATTENDANCE_REASON_MAX_LENGTH = 255;

export const CONTINGENCY_CAUSES: readonly { value: TeacherContingencyCause; label: string }[] = [
  { value: 'LECTOR_NO_DISPONIBLE', label: 'Lector biométrico no disponible' },
  { value: 'FALLA_CONECTIVIDAD', label: 'Falla de conectividad' },
  { value: 'HUELLA_NO_RECONOCIDA', label: 'Huella no reconocida' },
  { value: 'CAIDA_SISTEMA', label: 'Caída del sistema' }
];

export const DEFAULT_CONTINGENCY_CAUSE: TeacherContingencyCause = 'LECTOR_NO_DISPONIBLE';

export const REASON_REQUIRED_MESSAGE = 'El motivo es obligatorio al registrar o corregir asistencia manualmente.';
export const REASON_TOO_LONG_MESSAGE = 'El motivo no puede superar los 255 caracteres.';

type Statuses = Readonly<Record<number, TeacherAttendanceStatus | null | undefined>>;

/** Primera toma: alguna matrícula sin registro guardado (o lista vacía). */
export function isFirstCapture(enrollmentIds: readonly number[], saved: Statuses): boolean {
  if (enrollmentIds.length === 0) return true;
  return enrollmentIds.some(id => saved[id] == null);
}

/** Alguna matrícula cambia respecto de lo guardado; sin borrador, cuenta como PRESENTE. */
export function hasAttendanceChanges(enrollmentIds: readonly number[], saved: Statuses, draft: Statuses): boolean {
  return enrollmentIds.some(id => (saved[id] ?? null) !== (draft[id] ?? 'PRESENTE'));
}

export function isReasonValid(reason: string, required: boolean): boolean {
  const trimmed = reason.trim();
  return !required || (trimmed.length > 0 && trimmed.length <= ATTENDANCE_REASON_MAX_LENGTH);
}
