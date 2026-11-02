import { contractErrorCode } from '@/services/admin/contractErrors';

// BACKEND #51-A (docs/bimester-publication.md) and #100 (docs/bimester-reopening.md): codes of
// POST /management/bimesters/{b}/review | publish | reopen. 401/403 never carry a code.
// To add a code, add its status here and its text below; the compiler rejects a specific code without a message.
const contractStatuses = {
  VALIDATION_ERROR: [400],
  REASON_REQUIRED: [400],
  PUBLICATION_CONFIRMATION_REQUIRED: [400],
  RESOURCE_NOT_FOUND: [404],
  BIMESTER_STATE_CONFLICT: [409],
  COURSES_NOT_REGISTERED: [409],
  RESULTS_PENDING: [409],
  PUBLICATION_STALE: [409],
  INTERNAL_ERROR: [500],
} as const satisfies Record<string, readonly number[]>;

export type BimesterPublicationErrorCode = keyof typeof contractStatuses;
export const BIMESTER_PUBLICATION_ERROR_CODES = Object.keys(contractStatuses) as BimesterPublicationErrorCode[];

// Generic codes carry no specific cause: the HTTP-based text stays.
type GenericBimesterPublicationErrorCode = 'VALIDATION_ERROR' | 'INTERNAL_ERROR';

export const bimesterPublicationErrorCodeMessages: Record<Exclude<BimesterPublicationErrorCode, GenericBimesterPublicationErrorCode>, string> = {
  REASON_REQUIRED: 'Indica el motivo de la reapertura (obligatorio, hasta 255 caracteres).',
  PUBLICATION_CONFIRMATION_REQUIRED: 'Debes confirmar explícitamente la publicación.',
  RESOURCE_NOT_FOUND: 'El bimestre ya no está disponible. Se recargó el panel.',
  BIMESTER_STATE_CONFLICT: 'El estado del bimestre cambió y la operación ya no está permitida. Se recargó el panel.',
  COURSES_NOT_REGISTERED: 'Hay cursos sin registro final vigente. Se actualizó la lista de pendientes.',
  RESULTS_PENDING: 'Hay resultados pendientes. Se actualizó la lista de pendientes.',
  PUBLICATION_STALE: 'La preparación cambió desde tu última consulta. Se recargó el panel; revísalo antes de publicar.',
};

export function bimesterPublicationErrorCode(error: unknown): BimesterPublicationErrorCode | null {
  return contractErrorCode<BimesterPublicationErrorCode>(error, contractStatuses);
}

// Specific text for a recognized code; null for generic, unknown or mismatched codes.
export function bimesterPublicationErrorCodeMessage(error: unknown): string | null {
  const code = bimesterPublicationErrorCode(error);
  return code && code in bimesterPublicationErrorCodeMessages ? bimesterPublicationErrorCodeMessages[code as keyof typeof bimesterPublicationErrorCodeMessages] : null;
}
