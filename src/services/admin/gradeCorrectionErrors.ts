import { contractErrorCode } from '@/services/admin/contractErrors';

// BACKEND #51-A (docs/bimester-publication.md): codes of PATCH /management/criterion-grades/{gradeId}.
// GRADE_CHANGED_CONCURRENTLY (stale expectedGrade) comes from BACK #100; until then the backend sends
// BIMESTER_STATE_CONFLICT for both a closed window and a stale grade. 401/403 never carry a code.
// To add a code, add its status here and its text below; the compiler rejects a specific code without a message.
const contractStatuses = {
  VALIDATION_ERROR: [400],
  REASON_REQUIRED: [400],
  RESOURCE_NOT_FOUND: [404],
  BIMESTER_STATE_CONFLICT: [409],
  GRADE_CHANGED_CONCURRENTLY: [409],
  // Structural changes only; a value correction should never receive it.
  STRUCTURE_FROZEN: [409],
  INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type GradeCorrectionErrorCode = keyof typeof contractStatuses;
export const GRADE_CORRECTION_ERROR_CODES = Object.keys(contractStatuses) as GradeCorrectionErrorCode[];

// Generic codes carry no specific cause: the HTTP-based text stays.
type GenericGradeCorrectionErrorCode = 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

export const gradeCorrectionErrorCodeMessages: Record<Exclude<GradeCorrectionErrorCode, GenericGradeCorrectionErrorCode>, string> = {
  REASON_REQUIRED: 'Indica el motivo de la corrección (obligatorio, hasta 1000 caracteres).',
  RESOURCE_NOT_FOUND: 'La nota o su contexto ya no está disponible. Se recargó la planilla.',
  BIMESTER_STATE_CONFLICT: 'El bimestre o la nota cambiaron. Se recargó la planilla; revisa antes de volver a corregir.',
  GRADE_CHANGED_CONCURRENTLY: 'Otra persona cambió esta nota. Se recargó la planilla con el valor actual; revisa antes de volver a corregir.',
  STRUCTURE_FROZEN: 'La configuración del periodo está congelada por una publicación. Se recargó la planilla.',
};

export function gradeCorrectionErrorCode(error: unknown): GradeCorrectionErrorCode | null {
  return contractErrorCode<GradeCorrectionErrorCode>(error, contractStatuses);
}

// Specific text for a recognized code; null for generic, unknown or mismatched codes.
export function gradeCorrectionErrorCodeMessage(error: unknown): string | null {
  const code = gradeCorrectionErrorCode(error);
  return code && code in gradeCorrectionErrorCodeMessages ? gradeCorrectionErrorCodeMessages[code as keyof typeof gradeCorrectionErrorCodeMessages] : null;
}
