import type { AdminStudent, AdminStudentDetail, GuardianCreateValues, StudentCreateValues, StudentEditValues } from '@/types/adminStudent';
import type { CreateStudentGuardianRequest, CreateStudentRequest, EnrollmentStatus, GuardianRelationship, GuardianSummaryResponse, StudentDetailResponse, StudentLevel, StudentStatus, StudentSummaryResponse, UpdateStudentRequest } from '@/types/studentApi';
import { isIsoDate, localToday } from '@/services/admin/enrollmentsService';

export const studentLevelLabels: Record<StudentLevel, string> = { PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };
export const studentStatusLabels: Record<StudentStatus, string> = {
  ACTIVE: 'Activo', SUSPENDED: 'Suspendido', DEACTIVATED: 'De baja', WITHDRAWN: 'Retirado', GRADUATED: 'Egresado',
};
export type StudentStatusTone = 'success' | 'warning' | 'neutral';

/**
 * Tono visual del chip de estado del alumno: Activo en verde, Suspendido en ámbar y el resto en neutro.
 * El texto del chip (estadoLabel) siempre se muestra: el color nunca es el único canal (R7).
 */
export function studentStatusTone(status: StudentStatus): StudentStatusTone {
  if (status === 'ACTIVE') return 'success';
  return status === 'SUSPENDED' ? 'warning' : 'neutral';
}
const enrollmentLabels: Record<EnrollmentStatus, string> = { ACTIVE: 'Activa', WITHDRAWN: 'Retirada', COMPLETED: 'Finalizada' };
export const guardianRelationshipLabels: Record<GuardianRelationship, string> = {
  FATHER: 'Padre', MOTHER: 'Madre', TUTOR: 'Tutor', GUARDIAN: 'Apoderado', OTHER: 'Otro',
};

export function studentFullName(person: { firstNames: string; paternalLastName: string; maternalLastName: string | null }): string {
  return [person.firstNames, person.paternalLastName, person.maternalLastName].filter(Boolean).join(' ');
}

export function toAdminStudent(student: StudentSummaryResponse): AdminStudent {
  return {
    ...student, id: String(student.studentId), nombres: student.firstNames,
    apellidoPaterno: student.paternalLastName, apellidoMaterno: student.maternalLastName,
    nombreCompleto: studentFullName(student),
    nivelLabel: student.level === null ? null : studentLevelLabels[student.level],
    estadoLabel: studentStatusLabels[student.studentStatus] ?? 'Estado desconocido',
    matriculaLabel: student.enrollmentStatus === null ? null : enrollmentLabels[student.enrollmentStatus],
    tieneMatriculaActiva: student.enrollmentId !== null && student.enrollmentStatus === 'ACTIVE',
  };
}

const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'UTC' });

/**
 * Fecha LocalDate (`YYYY-MM-DD`) en formato legible es-PE (por ejemplo, «1 ene 2016»).
 * Se formatea en UTC para que la zona horaria del navegador no mueva el día. Devuelve null si es nula o inválida.
 */
export function formatStudentDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // El viaje de ida y vuelta descarta fechas inexistentes (30 de febrero), que Date corrige en silencio.
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : dateFormat.format(date);
}

/**
 * Etiqueta del aula del alumno, por ejemplo «3.° A · Primaria». Solo existe con matrícula activa;
 * omite las partes que el servidor no envía y devuelve null si no queda ninguna.
 */
export function studentClassroomLabel(student: Pick<AdminStudent, 'tieneMatriculaActiva' | 'grade' | 'sectionName' | 'nivelLabel'>): string | null {
  if (!student.tieneMatriculaActiva) return null;
  const section = student.sectionName?.replace(/^secci[oó]n\s+/i, '').trim();
  const classroom = [student.grade === null ? null : `${student.grade}.°`, section || null].filter(Boolean).join(' ');
  return [classroom || null, student.nivelLabel].filter(Boolean).join(' · ') || null;
}

/** Detalle para el panel del administrador; conserva las fechas crudas (las usan el retiro y la edición) y añade las legibles. */
export function toAdminStudentDetail(student: StudentDetailResponse): AdminStudentDetail {
  const base = toAdminStudent(student);
  return { ...base, personId: student.personId, phone: student.phone,
    enrollmentDate: student.enrollmentDate, guardians: student.guardians,
    birthDateLabel: formatStudentDate(student.birthDate), enrollmentDateLabel: formatStudentDate(student.enrollmentDate),
    aulaLabel: studentClassroomLabel(base) };
}

export function toStudentEditValues(student: AdminStudentDetail): StudentEditValues {
  return {
    studentCode: student.studentCode ?? '', dni: student.dni ?? '', firstNames: student.nombres,
    paternalLastName: student.apellidoPaterno, maternalLastName: student.apellidoMaterno ?? '',
    birthDate: student.birthDate ?? '', phone: student.phone ?? '', reason: '',
  };
}

// Returns null when no field changed, so the form can close without a request.
export function toUpdateStudent(values: StudentEditValues, original: AdminStudentDetail): UpdateStudentRequest | null {
  const patch: Omit<UpdateStudentRequest, 'reason'> = {};
  const previous = toStudentEditValues(original);
  const fields = ['studentCode', 'dni', 'firstNames', 'paternalLastName', 'maternalLastName', 'birthDate', 'phone'] as const;
  for (const field of fields) {
    const next = values[field].trim();
    if (next !== previous[field].trim()) patch[field] = next;
  }
  return Object.keys(patch).length ? { ...patch, reason: values.reason.trim() } : null;
}

export function studentEditValidation(values: StudentEditValues, original: AdminStudentDetail): string | null {
  if (!values.firstNames.trim() || !values.paternalLastName.trim()) return 'Nombres y apellido paterno son obligatorios.';
  if (!values.reason.trim()) return 'Indica el motivo de la actualización.';
  const limits = { studentCode: 50, dni: 20, firstNames: 120, paternalLastName: 120, maternalLastName: 120, phone: 30 } as const;
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    if (values[field].trim().length > limits[field]) return 'Uno de los campos supera la longitud permitida.';
  }
  if (original.studentCode !== null && !values.studentCode.trim()) return 'El backend no permite borrar un código existente.';
  if (original.birthDate !== null && !values.birthDate) return 'El backend no permite borrar una fecha de nacimiento existente.';
  if (values.birthDate) {
    const date = new Date(values.birthDate + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== values.birthDate) return 'Ingresa una fecha de nacimiento válida.';
  }
  return null;
}

export const studentCreateReason = 'Alta individual';
export const emptyStudentCreateValues: StudentCreateValues = {
  dni: '', firstNames: '', paternalLastName: '', maternalLastName: '', birthDate: '', phone: '',
};

export function studentCreateValidation(values: StudentCreateValues): string | null {
  if (!/^\d{8}$/.test(values.dni.trim())) return 'El DNI debe tener exactamente 8 dígitos.';
  if (!values.firstNames.trim() || !values.paternalLastName.trim()) return 'Nombres y apellido paterno son obligatorios.';
  const limits = { firstNames: 120, paternalLastName: 120, maternalLastName: 120, phone: 30 } as const;
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    if (values[field].trim().length > limits[field]) return 'Nombres y apellidos admiten hasta 120 caracteres; el teléfono, hasta 30.';
  }
  if (!isIsoDate(values.birthDate)) return 'Ingresa una fecha de nacimiento válida.';
  if (values.birthDate > localToday()) return 'La fecha de nacimiento no puede ser futura.';
  return null;
}

// Empty optional fields travel as null; studentCode is never sent.
export function toCreateStudent(values: StudentCreateValues): CreateStudentRequest {
  return {
    dni: values.dni.trim(), firstNames: values.firstNames.trim(), paternalLastName: values.paternalLastName.trim(),
    maternalLastName: values.maternalLastName.trim() || null, birthDate: values.birthDate,
    phone: values.phone.trim() || null, reason: studentCreateReason,
  };
}

export const guardianCreateReason = 'Alta de apoderado';
export const emptyGuardianCreateValues: GuardianCreateValues = {
  dni: '', firstNames: '', paternalLastName: '', maternalLastName: '', phone: '', relationship: '', primary: false, authorizedPickup: false,
};

const isGuardianRelationship = (value: string): value is GuardianRelationship => Object.keys(guardianRelationshipLabels).includes(value);
export const hasActivePrimaryGuardian = (guardians: GuardianSummaryResponse[]) => guardians.some(guardian => guardian.active && guardian.primary);

// Complete local validation for immediate feedback; the backend also rejects blank names or a missing relationship with 400.
export function guardianCreateValidation(values: GuardianCreateValues, guardians: GuardianSummaryResponse[]): string | null {
  const dni = values.dni.trim();
  if (!/^\d{8}$/.test(dni)) return 'El DNI debe tener exactamente 8 dígitos.';
  // Any listed link, active or not, makes the backend answer 409.
  if (guardians.some(guardian => guardian.dni?.trim() === dni)) return 'Esta persona ya figura como apoderado de este alumno.';
  if (!values.firstNames.trim() || !values.paternalLastName.trim()) return 'Nombres y apellido paterno son obligatorios.';
  const limits = { firstNames: 120, paternalLastName: 120, maternalLastName: 120, phone: 30 } as const;
  for (const field of Object.keys(limits) as (keyof typeof limits)[]) {
    if (values[field].trim().length > limits[field]) return 'Nombres y apellidos admiten hasta 120 caracteres; el teléfono, hasta 30.';
  }
  if (!isGuardianRelationship(values.relationship)) return 'Selecciona la relación con el alumno.';
  if (values.primary && hasActivePrimaryGuardian(guardians)) return 'El alumno ya tiene un apoderado principal activo.';
  return null;
}

// Empty optional fields travel as null; personId is never sent.
export function toCreateGuardian(values: GuardianCreateValues): CreateStudentGuardianRequest {
  if (!isGuardianRelationship(values.relationship)) throw new Error('Relación de apoderado no válida.');
  return {
    dni: values.dni.trim(), firstNames: values.firstNames.trim(), paternalLastName: values.paternalLastName.trim(),
    maternalLastName: values.maternalLastName.trim() || null, phone: values.phone.trim() || null,
    relationship: values.relationship, primary: values.primary, authorizedPickup: values.authorizedPickup, reason: guardianCreateReason,
  };
}
