import { contractErrorCode } from '@/services/admin/contractErrors';

// BACKEND #50 and #102 (docs/teacher-activity-grades.md, docs/management-activity-reading.md): codes of the
// management activity reads and of PATCH /management/activity-grades/{gradeId}. 401/403 never carry a code.
// The teacher catalog (teacherActivitiesService) keeps its own texts; this one speaks to the Director.
// To add a code, add its status here and its text below; the compiler rejects a specific code without a message.
const contractStatuses = {
  ACTIVITY_REQUEST_INVALID: [400],
  ACTIVITY_CONTEXT_UNAVAILABLE: [404],
  ACTIVITY_METHOD_NOT_ALLOWED: [405],
  BIMESTER_WINDOW_CLOSED: [409],
  ACTIVITY_STATE_CONFLICT: [409],
  ACTIVITY_NOT_GRADEABLE: [409],
  ACTIVITY_GRADE_STALE: [409],
  ACTIVITY_GRADE_UNCHANGED: [409],
  ENROLLMENT_NOT_ELIGIBLE: [409],
  ACADEMIC_CONTEXT_MISMATCH: [409],
  ACTIVITY_CONTEXT_CONFLICT: [409],
  ACTIVITY_INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type ActivityGradeErrorCode = keyof typeof contractStatuses;
export const ACTIVITY_GRADE_ERROR_CODES = Object.keys(contractStatuses) as ActivityGradeErrorCode[];

// Generic codes carry no specific cause: the HTTP-based text stays (any 5xx is uncertain).
type GenericActivityGradeErrorCode = 'ACTIVITY_REQUEST_INVALID' | 'ACTIVITY_METHOD_NOT_ALLOWED' | 'ACTIVITY_INTERNAL_ERROR';

export const activityGradeErrorCodeMessages: Record<Exclude<ActivityGradeErrorCode, GenericActivityGradeErrorCode>, string> = {
  ACTIVITY_CONTEXT_UNAVAILABLE: 'La actividad, la nota o su contexto ya no están disponibles.',
  BIMESTER_WINDOW_CLOSED: 'El Director solo corrige con el bimestre En revisión o Cerrado. Se recargó la planilla.',
  ACTIVITY_STATE_CONFLICT: 'La actividad cambió de estado. Se recargó la planilla.',
  ACTIVITY_NOT_GRADEABLE: 'Solo se corrigen notas de actividades publicadas. Se recargó la planilla.',
  ACTIVITY_GRADE_STALE: 'La nota cambió desde que cargaste la planilla. Se recargó con el valor vigente; revisa antes de volver a corregir.',
  ACTIVITY_GRADE_UNCHANGED: 'La nueva nota es igual a la vigente.',
  ENROLLMENT_NOT_ELIGIBLE: 'La matrícula ya no es válida para esta actividad. Se recargó la planilla.',
  ACADEMIC_CONTEXT_MISMATCH: 'El bimestre no corresponde al periodo del curso. Se recargó la planilla.',
  ACTIVITY_CONTEXT_CONFLICT: 'El contexto académico cambió. Se recargó la planilla.',
};

export function activityGradeErrorCode(error: unknown): ActivityGradeErrorCode | null {
  return contractErrorCode<ActivityGradeErrorCode>(error, contractStatuses);
}

// Specific text for a recognized code; null for generic, unknown or mismatched codes.
export function activityGradeErrorCodeMessage(error: unknown): string | null {
  const code = activityGradeErrorCode(error);
  return code && code in activityGradeErrorCodeMessages ? activityGradeErrorCodeMessages[code as keyof typeof activityGradeErrorCodeMessages] : null;
}
