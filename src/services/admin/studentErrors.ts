import { isAxiosError } from 'axios';

// BACKEND #75 and #41 (docs/student-enrollment-error-contract.md): code → the only HTTP statuses it may travel with.
// Only the student/guardian/enrollment writes and the state changes send it; GETs and 401/403 never do.
// To add a code, add its status here and its text below; the compiler rejects a specific code without a message.
const contractStatuses = {
  VALIDATION_ERROR: [400],
  INVALID_REQUEST_BODY: [400],
  // 400 for guardians, still 500 for students and enrollments.
  INVALID_PARAMETER: [400, 500],
  INTERNAL_ERROR: [500],
  STUDENT_NOT_FOUND: [404],
  STUDENT_INACTIVE: [409],
  DNI_ALREADY_EXISTS: [409],
  STUDENT_CODE_ALREADY_EXISTS: [409],
  STUDENT_CODE_EXHAUSTED: [409],
  STUDENT_PERSON_ALREADY_EXISTS: [409],
  PERSON_NOT_FOUND: [404],
  GUARDIAN_ALREADY_LINKED: [409],
  PRIMARY_GUARDIAN_ALREADY_EXISTS: [409],
  GUARDIAN_REGISTRATION_CONFLICT: [409],
  ACADEMIC_PERIOD_NOT_FOUND: [404],
  ACADEMIC_PERIOD_INACTIVE: [409],
  SECTION_NOT_FOUND: [404],
  SECTION_INACTIVE: [409],
  SECTION_NOT_IN_PERIOD: [409],
  ENROLLMENT_CLOSED: [409],
  SECTION_FULL: [409],
  ACTIVE_ENROLLMENT_EXISTS: [409],
  ENROLLMENT_DATE_REQUIRED: [400],
  ENROLLMENT_DATE_OUT_OF_PERIOD: [400],
  ENROLLMENT_NOT_FOUND: [404],
  ENROLLMENT_NOT_OF_STUDENT: [409],
  ENROLLMENT_STATUS_CONFLICT: [409],
  WITHDRAWAL_DATE_REQUIRED: [400],
  WITHDRAWAL_DATE_BEFORE_ENROLLMENT: [400],
  STUDENT_STATUS_CONFLICT: [409],
  STUDENT_HAS_ACTIVE_ENROLLMENT: [409],
} as const satisfies Record<string, readonly number[]>;

export type StudentErrorCode = keyof typeof contractStatuses;
export const STUDENT_ERROR_CODES = Object.keys(contractStatuses) as StudentErrorCode[];

// Generic codes carry no specific cause: each operation keeps its current HTTP-based text.
type GenericStudentErrorCode = 'VALIDATION_ERROR' | 'INVALID_REQUEST_BODY' | 'INVALID_PARAMETER' | 'INTERNAL_ERROR';

export const studentErrorCodeMessages: Record<Exclude<StudentErrorCode, GenericStudentErrorCode>, string> = {
  STUDENT_NOT_FOUND: 'El alumno ya no existe. Vuelve al listado.',
  STUDENT_INACTIVE: 'El alumno no está activo; no se puede completar la operación.',
  DNI_ALREADY_EXISTS: 'El DNI ya está registrado para otra persona.',
  STUDENT_CODE_ALREADY_EXISTS: 'El código de alumno ya pertenece a otro alumno.',
  STUDENT_CODE_EXHAUSTED: 'No hay códigos de alumno disponibles. Contacta al administrador del sistema.',
  STUDENT_PERSON_ALREADY_EXISTS: 'Esta persona ya está registrada como alumno. Búscala en el listado.',
  PERSON_NOT_FOUND: 'La persona indicada ya no existe. Actualiza los datos.',
  GUARDIAN_ALREADY_LINKED: 'Esta persona ya es apoderado de este alumno.',
  PRIMARY_GUARDIAN_ALREADY_EXISTS: 'El alumno ya tiene un apoderado principal activo. Desmarca «principal» o revisa la lista.',
  GUARDIAN_REGISTRATION_CONFLICT: 'Conflicto al registrar el apoderado. Revisa la lista de apoderados antes de intentarlo de nuevo.',
  ACADEMIC_PERIOD_NOT_FOUND: 'El periodo académico ya no existe. Actualiza los datos.',
  ACADEMIC_PERIOD_INACTIVE: 'El periodo académico no está activo.',
  SECTION_NOT_FOUND: 'La sección ya no existe. Actualiza los datos.',
  SECTION_INACTIVE: 'La sección está inactiva.',
  SECTION_NOT_IN_PERIOD: 'La sección no pertenece al periodo seleccionado.',
  ENROLLMENT_CLOSED: 'La matrícula de la sección está cerrada.',
  SECTION_FULL: 'La sección no tiene vacantes.',
  ACTIVE_ENROLLMENT_EXISTS: 'El alumno ya tiene una matrícula activa.',
  ENROLLMENT_DATE_REQUIRED: 'Ingresa la fecha de matrícula.',
  ENROLLMENT_DATE_OUT_OF_PERIOD: 'La fecha de matrícula debe estar dentro del periodo seleccionado.',
  ENROLLMENT_NOT_FOUND: 'La matrícula ya no existe.',
  ENROLLMENT_NOT_OF_STUDENT: 'La matrícula no pertenece a este alumno.',
  ENROLLMENT_STATUS_CONFLICT: 'La matrícula ya no está activa.',
  WITHDRAWAL_DATE_REQUIRED: 'Ingresa la fecha de retiro.',
  WITHDRAWAL_DATE_BEFORE_ENROLLMENT: 'La fecha de retiro no puede ser anterior a la fecha de matrícula.',
  STUDENT_STATUS_CONFLICT: 'El estado del alumno cambió y esta acción ya no está permitida. Se actualizó el perfil.',
  STUDENT_HAS_ACTIVE_ENROLLMENT: 'El alumno tiene una matrícula activa. Retírala con «Retirar matrícula» y vuelve a intentar la baja.',
};

// A known string code whose HTTP status matches the contract; anything else is ignored (behaviour stays HTTP-based).
export function studentErrorCode(error: unknown): StudentErrorCode | null {
  if (!isAxiosError(error) || !error.response) return null;
  const { status, data } = error.response;
  const code: unknown = data && typeof data === 'object' ? (data as Record<string, unknown>).code : undefined;
  if (typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(contractStatuses, code)) return null;
  const statuses: readonly number[] = contractStatuses[code as StudentErrorCode];
  return statuses.includes(status) ? code as StudentErrorCode : null;
}

// Specific text for a recognized code; null for generic, unknown or mismatched codes.
export function studentErrorCodeMessage(error: unknown): string | null {
  const code = studentErrorCode(error);
  return code && code in studentErrorCodeMessages ? studentErrorCodeMessages[code as keyof typeof studentErrorCodeMessages] : null;
}
