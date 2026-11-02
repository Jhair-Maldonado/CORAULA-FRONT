import { isAxiosError } from 'axios';
import httpClient from '@/services/httpClient';
import { contractErrorCode } from '@/services/admin/contractErrors';
import { isIsoDate } from '@/lib/gradeWindowContract';
import type {
  SaveTeacherAttendanceRequest,
  TeacherAttendanceResponse,
  TeacherAttendanceSessionResponse,
  TeacherAttendanceStatus,
  TeacherAttendanceStudentResponse
} from '@/types/teacherAttendanceApi';

// BACK #83 (docs/management-attendance-contingency.md): ManagementSectionCourseAttendanceController.
// Same request and responses as the teacher portal. GET: ADMINISTRADOR y DIRECTIVO; PUT: solo ADMINISTRADOR.
// TeacherAttendanceExceptionHandler: only the justification errors carry a code, always with 400. 401/403 never do.
const contractStatuses = {
  ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED: [400],
  ATTENDANCE_REASON_REQUIRED: [400],
} as const satisfies Record<string, readonly number[]>;

export type ManagementAttendanceErrorCode = keyof typeof contractStatuses;
export const MANAGEMENT_ATTENDANCE_ERROR_CODES = Object.keys(contractStatuses) as ManagementAttendanceErrorCode[];

export const CONTINGENCY_CAUSE_REQUIRED_MESSAGE = 'La causa de contingencia es obligatoria al registrar asistencia sin lector biométrico.';
export const MANAGEMENT_REASON_REQUIRED_MESSAGE = 'El motivo es obligatorio al registrar o corregir asistencia manualmente.';
export const INVALID_RESPONSE_MESSAGE = 'La respuesta del servidor no coincide con el contrato de asistencia. Actualiza e intenta nuevamente.';

const STATUSES: readonly TeacherAttendanceStatus[] = ['PRESENTE', 'TARDANZA', 'INASISTENCIA'];

export class ManagementAttendanceContractError extends Error {
  constructor() { super('La respuesta de asistencia no coincide con el contrato.'); this.name = 'ManagementAttendanceContractError'; }
}

function invalid(): never { throw new ManagementAttendanceContractError(); }
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid(); return value as Record<string, unknown>; }
function id(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return invalid(); return value; }
function count(value: unknown): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return invalid(); return value; }
function text(value: unknown): string { if (typeof value !== 'string' || !value.trim()) return invalid(); return value; }
function optionalText(value: unknown): string | null { if (value === null) return null; return text(value); }
// @JsonFormat(pattern = "HH:mm")
function time(value: unknown): string { if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return invalid(); return value; }

function student(value: unknown): TeacherAttendanceStudentResponse {
  const s = object(value);
  const status = s.status === null ? null : STATUSES.includes(s.status as TeacherAttendanceStatus) ? s.status as TeacherAttendanceStatus : invalid();
  const attendanceId = s.attendanceId === null ? null : id(s.attendanceId);
  return {
    enrollmentId: id(s.enrollmentId), studentId: id(s.studentId), studentCode: optionalText(s.studentCode),
    fullName: text(s.fullName), attendanceId, status
  };
}

export function parseAttendanceSession(value: unknown, expectedScheduleId?: number): TeacherAttendanceSessionResponse {
  const s = object(value);
  if (!Array.isArray(s.students)) return invalid();
  const scheduleId = id(s.scheduleId);
  if (expectedScheduleId !== undefined && scheduleId !== expectedScheduleId) return invalid();
  const students = s.students.map(student);
  if (new Set(students.map(st => st.enrollmentId)).size !== students.length) return invalid();
  return {
    scheduleId, startTime: time(s.startTime), endTime: time(s.endTime), classroom: optionalText(s.classroom),
    totalStudents: count(s.totalStudents), presentCount: count(s.presentCount), lateCount: count(s.lateCount),
    absenceCount: count(s.absenceCount), pendingCount: count(s.pendingCount), students
  };
}

export function parseManagementAttendance(value: unknown, expected: { sectionCourseId: number; date: string }): TeacherAttendanceResponse {
  const r = object(value);
  if (!Array.isArray(r.sessions)) return invalid();
  const sectionCourseId = id(r.sectionCourseId);
  if (sectionCourseId !== expected.sectionCourseId || r.date !== expected.date || !isIsoDate(r.date)) return invalid();
  const grade = count(r.grade);
  const sessions = r.sessions.map(session => parseAttendanceSession(session));
  if (new Set(sessions.map(s => s.scheduleId)).size !== sessions.length) return invalid();
  return { sectionCourseId, courseName: text(r.courseName), grade, sectionName: text(r.sectionName), date: expected.date, sessions };
}

const endpoint = (sectionCourseId: number) => `/v1/management/section-courses/${encodeURIComponent(sectionCourseId)}/attendance`;

export const managementAttendanceService = {
  async getAttendance(sectionCourseId: number, date: string): Promise<TeacherAttendanceResponse> {
    const response = await httpClient.get<unknown>(endpoint(sectionCourseId), { params: { date } });
    return parseManagementAttendance(response.data, { sectionCourseId, date });
  },
  /** Solo ADMINISTRADOR. Resuelve únicamente con un 200 cuya sesión coincide con el horario enviado. */
  async saveAttendance(sectionCourseId: number, scheduleId: number, date: string, request: SaveTeacherAttendanceRequest): Promise<TeacherAttendanceSessionResponse> {
    const response = await httpClient.put<unknown>(`${endpoint(sectionCourseId)}/${encodeURIComponent(scheduleId)}`, request, { params: { date } });
    if (response.status !== 200) return invalid();
    return parseAttendanceSession(response.data, scheduleId);
  },
};

export function managementAttendanceErrorCode(error: unknown): ManagementAttendanceErrorCode | null {
  return contractErrorCode(error, contractStatuses);
}

/** Mensajes saneados: nunca se muestra el mensaje del servidor. */
export function managementAttendanceErrorMessage(error: unknown, operation: 'load' | 'save'): string {
  if (error instanceof ManagementAttendanceContractError) return INVALID_RESPONSE_MESSAGE;
  const code = managementAttendanceErrorCode(error);
  if (code === 'ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED') return CONTINGENCY_CAUSE_REQUIRED_MESSAGE;
  if (code === 'ATTENDANCE_REASON_REQUIRED') return MANAGEMENT_REASON_REQUIRED_MESSAGE;
  if (isAxiosError(error)) {
    if (!error.response) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
    switch (error.response.status) {
      case 400: return operation === 'load'
        ? 'Revisa la fecha: debe estar dentro del periodo académico.'
        : 'No se pudo registrar la asistencia: revisa la fecha y la lista de estudiantes de la sesión, actualiza e intenta nuevamente.';
      case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
      case 403: return operation === 'load'
        ? 'No tienes autorización para consultar la asistencia de este curso.'
        : 'Solo el Director puede registrar asistencia por contingencia.';
      case 404: return 'El curso, la sección o el horario ya no está disponible. Actualiza la información.';
      case 409: return 'Conflicto al guardar la asistencia: los datos cambiaron. Revisa la sesión actualizada e intenta nuevamente.';
    }
  }
  return 'No se pudo procesar la asistencia. Intenta nuevamente.';
}
