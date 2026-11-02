import { contractErrorCode } from '@/services/admin/contractErrors';

// BACKEND #39 (docs/grade-window.md): codes of PUT /management/bimesters/{b}/grade-window/registration-date
// and POST .../extension. GRADE_WINDOW_EXPIRED belongs to the teacher endpoints. 401/403 never carry a code.
// To add a code, add its status here and its texts below; the compiler rejects a specific code without a message.
const contractStatuses = {
  VALIDATION_ERROR: [400],
  REASON_REQUIRED: [400],
  RESOURCE_NOT_FOUND: [404],
  BIMESTER_STATE_CONFLICT: [409],
  INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type GradeWindowAction = 'registrationDate' | 'extension';
export type GradeWindowErrorCode = keyof typeof contractStatuses;
export const GRADE_WINDOW_ERROR_CODES = Object.keys(contractStatuses) as GradeWindowErrorCode[];

// Generic codes carry no specific cause: the HTTP-based text stays.
type GenericGradeWindowErrorCode = 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

export const gradeWindowErrorCodeMessages: Record<Exclude<GradeWindowErrorCode, GenericGradeWindowErrorCode>, Record<GradeWindowAction, string>> = {
  REASON_REQUIRED: {
    registrationDate: 'Indica el motivo del cambio de fecha (obligatorio, hasta 255 caracteres).',
    extension: 'Indica el motivo de la ampliación (obligatorio, hasta 255 caracteres).',
  },
  RESOURCE_NOT_FOUND: {
    registrationDate: 'El bimestre ya no está disponible. Se recargó el panel.',
    extension: 'El bimestre ya no está disponible. Se recargó el panel.',
  },
  BIMESTER_STATE_CONFLICT: {
    registrationDate: 'La fecha de registro solo puede fijarse con el bimestre Planificado o Abierto, y su estado cambió. Se recargó el panel.',
    extension: 'El plazo solo puede ampliarse con el bimestre Abierto, y su estado cambió. Se recargó el panel.',
  },
};

export function gradeWindowErrorCode(error: unknown): GradeWindowErrorCode | null {
  return contractErrorCode<GradeWindowErrorCode>(error, contractStatuses);
}

// Specific text for a recognized code; null for generic, unknown or mismatched codes.
export function gradeWindowErrorCodeMessage(error: unknown, action: GradeWindowAction): string | null {
  const code = gradeWindowErrorCode(error);
  return code && code in gradeWindowErrorCodeMessages ? gradeWindowErrorCodeMessages[code as keyof typeof gradeWindowErrorCodeMessages][action] : null;
}
