// Rutas simuladas de gestión (/v1/management), compartidas por ADMINISTRADOR y DIRECTIVO.
import type { GuardianSummaryResponse, StudentDetailResponse, StudentSummaryResponse } from '@/types/studentApi';
import type { SectionResponse } from '@/types/sectionApi';
import type { CourseResponse } from '@/types/courseApi';
import type { TeacherResponse } from '@/types/teacherApi';
import type { SchoolDay } from '@/types/scheduleApi';
import { asObject, fail, ok, pageOf, pageParams, positiveInt, type MockRequest, type MockRoute } from '../mockHttp';
import { MOCK_USERS } from '../mockAuth';
import type { EvaluationCriterion } from '@/types/evaluationApi';
import type { JustificationDecisionRequest } from '@/types/guardianJustificationsApi';
import {
  activeManualCriteria, attendanceStatus, hasSession, limaDayOf, mockJustificationAttachmentUrl, sectionStudents, studentFullName, teacherUserId, SCHOOL_DAYS,
  type MockScheduleBlock, type MockStore, type MockTeacher,
} from './shared';
import {
  activitiesOf, attendanceOfDay, attendanceSession, evaluationResults, gradeWindow, managementActivitySheet, manualSheet, publicationView, saveAttendanceRecords, scheduleBlocks, scheduleView,
} from './academico';

const MANAGEMENT = ['ADMINISTRADOR', 'DIRECTIVO'] as const;
const DECISIONS: readonly JustificationDecisionRequest['decision'][] = ['APROBADA', 'RECHAZADA', 'OBSERVADA'];

function summary(s: StudentDetailResponse): StudentSummaryResponse {
  return {
    studentId: s.studentId, studentCode: s.studentCode, dni: s.dni, firstNames: s.firstNames, paternalLastName: s.paternalLastName,
    maternalLastName: s.maternalLastName, birthDate: s.birthDate, studentStatus: s.studentStatus, enrollmentId: s.enrollmentId,
    enrollmentStatus: s.enrollmentStatus, academicPeriodId: s.academicPeriodId, academicPeriodName: s.academicPeriodName,
    sectionId: s.sectionId, level: s.level, grade: s.grade, sectionName: s.sectionName,
  };
}

function teacherView(t: MockTeacher): TeacherResponse {
  return { id: t.id, dni: t.dni, firstNames: t.firstNames, paternalLastName: t.paternalLastName, maternalLastName: t.maternalLastName, fullName: t.fullName, phone: t.phone, specialty: t.specialty, active: t.active };
}

const matches = (search: string | undefined, ...values: (string | null)[]) =>
  !search?.trim() || values.some(v => v?.toLowerCase().includes(search.trim().toLowerCase()));

/** Copia los campos conocidos y presentes del cuerpo: las escrituras se aplican en memoria. */
function patch<T extends object>(target: T, body: unknown, fields: readonly (keyof T)[]): T {
  const input = asObject(body);
  for (const field of fields) if (input[field as string] !== undefined) (target as Record<keyof T, unknown>)[field] = input[field as string];
  return target;
}

const findPeriod = (store: MockStore, id: number | null) => store.periods.find(p => p.id === id);

function dailyAttendance({ store, query }: MockRequest) {
  const academicPeriodId = positiveInt(query.academicPeriodId);
  if (!findPeriod(store, academicPeriodId)) return fail(404, 'El periodo académico no existe.');
  const date = query.date ?? limaDayOf(store.now());
  const sectionId = query.sectionId === undefined ? null : positiveInt(query.sectionId);
  if (query.sectionId !== undefined && !store.sections.some(s => s.id === sectionId)) return fail(404, 'La sección no existe.');
  const sections = store.sections.filter(s => s.active && s.academicPeriodId === academicPeriodId && (sectionId === null || s.id === sectionId));
  const counts = { scheduledSections: 0, sectionsWithoutSessions: 0, sectionsWithConflictingFirstSession: 0, expectedStudents: 0, present: 0, late: 0, absent: 0, unrecorded: 0 };
  for (const section of sections) {
    const first = store.sectionCourses.filter(sc => sc.sectionId === section.id && sc.active).sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    if (!first || !hasSession(store, date)) { counts.sectionsWithoutSessions++; continue; }
    counts.scheduledSections++;
    for (const s of sectionStudents(store, section.id)) {
      counts.expectedStudents++;
      const status = attendanceStatus(store, first, s.enrollmentId!, date);
      if (status === 'PRESENTE') counts.present++; else if (status === 'TARDANZA') counts.late++; else if (status === 'INASISTENCIA') counts.absent++; else counts.unrecorded++;
    }
  }
  const recorded = counts.expectedStudents - counts.unrecorded;
  const status = counts.scheduledSections === 0 ? 'NO_SESSIONS' : counts.expectedStudents === 0 ? 'NO_ENROLLMENTS'
    : recorded === 0 ? 'PENDING' : counts.unrecorded > 0 ? 'PARTIAL' : 'COMPLETE';
  const attendancePercentage = status === 'PARTIAL' || status === 'COMPLETE' ? Math.round(((counts.present + counts.late) / recorded) * 1000) / 10 : null;
  return ok({ date, academicPeriodId, sectionId, status, ...counts, attendancePercentage });
}

function vacancies({ store, query }: MockRequest) {
  const academicPeriodId = query.academicPeriodId === undefined ? store.periods.find(p => p.current)?.id ?? null : positiveInt(query.academicPeriodId);
  const groups = new Map<string, SectionResponse[]>();
  for (const s of store.sections.filter(x => x.academicPeriodId === academicPeriodId && x.active)) {
    const key = `${s.level}:${s.grade}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return ok([...groups.values()].map(list => {
    const sections = list.map(s => {
      const activeEnrollmentCount = sectionStudents(store, s.id).length;
      return { sectionId: s.id, sectionName: s.name, maxCapacity: s.maxCapacity, activeEnrollmentCount, availableVacancies: Math.max(0, s.maxCapacity - activeEnrollmentCount), enrollmentOpen: s.enrollmentOpen, active: s.active };
    });
    const totalCapacity = sections.reduce((n, s) => n + s.maxCapacity, 0);
    const activeEnrollmentCount = sections.reduce((n, s) => n + s.activeEnrollmentCount, 0);
    return { academicPeriodId, level: list[0].level, grade: list[0].grade, totalCapacity, activeEnrollmentCount, availableVacancies: sections.reduce((n, s) => n + s.availableVacancies, 0), sections };
  }));
}

/** Alertas tempranas de un bimestre; el portal docente la reutiliza filtrada por su curso. */
export function earlyAlerts({ store, params, query }: MockRequest) {
  const bimesterId = positiveInt(params.bimesterId);
  if (!store.bimesters.some(b => b.id === bimesterId)) return fail(404, 'El bimestre no está disponible.', 'ALERT_CONTEXT_UNAVAILABLE');
  const paging = pageParams(query);
  if (!paging) return fail(400, 'La paginación no es válida.', 'ALERT_REQUEST_INVALID');
  const sectionCourseId = query.sectionCourseId === undefined ? null : positiveInt(query.sectionCourseId);
  const jorge = store.students.find(s => s.studentId === 60)!;
  const alerts = bimesterId !== 14 ? [] : [{
    alertId: 7001, enrollmentId: jorge.enrollmentId!, sectionCourseId: 301, bimesterId, studentId: jorge.studentId, studentCode: jorge.studentCode,
    fullName: studentFullName(jorge), courseName: 'Matemática', sectionName: jorge.sectionName!, paAtDetection: 9.5, activityCount: 3,
    evaluatedOn: '2026-10-30', detectedAt: '2026-10-30T14:00:00Z',
  }].filter(a => sectionCourseId === null || a.sectionCourseId === sectionCourseId);
  return ok(pageOf(alerts, paging.page, paging.size));
}

// ---------- Académico: horario, evaluación, notas, publicación, asistencia, materiales, personal y auditoría ----------

const ADMIN_ONLY = ['ADMINISTRADOR'] as const;
const sectionCourseOf = (store: MockStore, id: string | undefined) => store.sectionCourses.find(sc => sc.id === positiveInt(id) && sc.active);
const bimesterOf = (store: MockStore, id: string | undefined) => store.bimesters.find(b => b.id === positiveInt(id));
const dayOf = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

const ACTIVITY_UNAVAILABLE = () => fail(404, 'Las actividades de este curso y bimestre no están disponibles.', 'ACTIVITY_CONTEXT_UNAVAILABLE');
const RESOURCE_NOT_FOUND = (message: string) => fail(404, message, 'RESOURCE_NOT_FOUND');
const MATERIAL_UNAVAILABLE = () => fail(404, 'Material o curso no disponible.', 'MATERIAL_CONTEXT_UNAVAILABLE');

/** Criterios de evaluación de un curso y periodo (EvaluationConfiguration), por orden, leídos del store. */
function criteriaConfiguration(store: MockStore, courseId: number, academicPeriodId: number) {
  const criteria: EvaluationCriterion[] = store.criteria.filter(c => c.courseId === courseId && c.academicPeriodId === academicPeriodId).sort((a, b) => a.order - b.order);
  return {
    courseId, academicPeriodId, criteria, activeManualCriteriaCount: activeManualCriteria(store, courseId, academicPeriodId).length,
    hasActiveParticipationCriterion: criteria.some(c => c.type === 'PARTICIPACION_ACADEMICA' && c.active),
  };
}

/** La publicación de cualquier bimestre del periodo congela su configuración (STRUCTURE_FROZEN), como el backend. */
const periodFrozen = (store: MockStore, periodId: number) =>
  store.publications.some(p => store.bimesters.find(b => b.id === p.bimesterId)?.academicPeriodId === periodId);
const STRUCTURE_FROZEN = () => fail(409, 'La publicación congela la configuración compartida del periodo', 'STRUCTURE_FROZEN');
const CRITERIA_FIELDS = ['academicPeriodId', 'name', 'description', 'order', 'type'];
const CRITERIA_PATCH_FIELDS = ['name', 'description', 'order', 'active'];
const validName = (v: unknown): v is string => typeof v === 'string' && !!v.trim() && v.trim().length <= 255;
const positiveInteger = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;

/** Reglas comunes de un criterio ya armado: orden único y un solo criterio PA activo por curso y periodo. */
function criterionConflict(store: MockStore, candidate: EvaluationCriterion) {
  if (store.criteria.some(c => c.id !== candidate.id && c.courseId === candidate.courseId && c.academicPeriodId === candidate.academicPeriodId && c.order === candidate.order)) {
    return fail(409, 'El orden ya existe en este curso y periodo');
  }
  if (candidate.active && candidate.type === 'PARTICIPACION_ACADEMICA'
    && store.criteria.some(c => c.id !== candidate.id && c.courseId === candidate.courseId && c.academicPeriodId === candidate.academicPeriodId && c.type === 'PARTICIPACION_ACADEMICA' && c.active)) {
    return fail(409, 'Ya existe un criterio PA activo en este curso y periodo');
  }
  return null;
}

const STUDENT_STATE_REASONS: Record<'suspend' | 'reactivate' | 'deactivate', readonly string[]> = {
  suspend: ['ADMINISTRATIVE_REVIEW', 'GUARDIAN_REQUEST', 'OTHER'],
  reactivate: ['SUSPENSION_RESOLVED', 'ADMINISTRATIVE_CORRECTION', 'OTHER'],
  deactivate: ['VOLUNTARY_WITHDRAWAL', 'TRANSFER', 'DUPLICATE_RECORD', 'ERRONEOUS_RECORD', 'OTHER'],
};
const STUDENT_STATE_TRANSITIONS: Record<'suspend' | 'reactivate' | 'deactivate', { from: readonly StudentDetailResponse['studentStatus'][]; to: StudentDetailResponse['studentStatus'] }> = {
  suspend: { from: ['ACTIVE'], to: 'SUSPENDED' },
  reactivate: { from: ['SUSPENDED'], to: 'ACTIVE' },
  deactivate: { from: ['ACTIVE', 'SUSPENDED'], to: 'DEACTIVATED' },
};

/** PATCH /students/{id}/suspend|reactivate|deactivate: cambia el estado en memoria con el catálogo de motivos del backend. */
function studentState(action: keyof typeof STUDENT_STATE_REASONS): MockRoute {
  return {
    method: 'PATCH', pattern: `/v1/management/students/:studentId/${action}`, roles: ADMIN_ONLY,
    handler: ({ store, params, body }) => {
      const student = store.students.find(x => x.studentId === positiveInt(params.studentId));
      if (!student) return fail(404, 'El estudiante no existe.', 'STUDENT_NOT_FOUND');
      const input = asObject(body);
      const justification = typeof input.justification === 'string' ? input.justification.trim() : '';
      if (typeof input.reasonCode !== 'string' || !STUDENT_STATE_REASONS[action].includes(input.reasonCode) || !justification || justification.length > 1000) {
        return fail(400, 'Revisa el motivo y la justificación.', 'VALIDATION_ERROR');
      }
      const { from, to } = STUDENT_STATE_TRANSITIONS[action];
      if (!from.includes(student.studentStatus)) return fail(409, 'El estado del alumno no permite esta acción.', 'STUDENT_STATUS_CONFLICT');
      const previousStatus = student.studentStatus;
      student.studentStatus = to;
      return ok({ studentId: student.studentId, previousStatus, studentStatus: to, reasonCode: input.reasonCode, justification, changedBy: 1, changedAt: store.now().toISOString(), accountEnabled: null });
    },
  };
}

function enrollmentView(student: StudentDetailResponse) {
  return {
    enrollmentId: student.enrollmentId!, studentId: student.studentId, academicPeriodId: student.academicPeriodId!, academicPeriodName: student.academicPeriodName!,
    sectionId: student.sectionId!, level: student.level!, grade: student.grade!, sectionName: student.sectionName!, enrollmentDate: student.enrollmentDate!,
    status: student.enrollmentStatus!, withdrawalDate: null as string | null, withdrawalReason: null as string | null,
  };
}

const SCHEDULE_CONFLICT = (details: string[]) => fail(409, 'El horario se cruza con otras clases', undefined, details);
const HOUR = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_CLASSROOM_LENGTH = 50;

/**
 * Franja de una solicitud de bloque. Al crear (`current` nulo) día y horas son obligatorios; al editar, un campo ausente
 * o nulo conserva el valor actual y un aula en blanco se elimina. Devuelve el mensaje de error si no es válida.
 */
function scheduleSlot(input: Record<string, unknown>, current: MockScheduleBlock | null): Pick<MockScheduleBlock, 'day' | 'startTime' | 'endTime' | 'classroom'> | string {
  const day = input.day ?? current?.day;
  const startTime = input.startTime ?? current?.startTime;
  const endTime = input.endTime ?? current?.endTime;
  if (typeof day !== 'string' || !SCHOOL_DAYS.includes(day as SchoolDay)) return 'El día es obligatorio.';
  if (typeof startTime !== 'string' || typeof endTime !== 'string' || !HOUR.test(startTime) || !HOUR.test(endTime)) return 'La hora de inicio y de fin son obligatorias.';
  if (startTime >= endTime) return 'La hora de inicio debe ser anterior a la hora de fin.';
  if (input.classroom !== undefined && input.classroom !== null && typeof input.classroom !== 'string') return 'El aula no es válida.';
  const classroom = typeof input.classroom === 'string' ? input.classroom.trim() || null : current?.classroom ?? null;
  if (classroom !== null && classroom.length > MAX_CLASSROOM_LENGTH) return `El aula no puede superar ${MAX_CLASSROOM_LENGTH} caracteres.`;
  return { day: day as SchoolDay, startTime, endTime, classroom };
}

/** Choques del bloque con los activos del mismo periodo (sección, docente y aula), con el texto del backend. */
function scheduleConflicts(store: MockStore, candidate: MockScheduleBlock): string[] {
  const context = (block: MockScheduleBlock) => {
    const sc = store.sectionCourses.find(x => x.id === block.sectionCourseId);
    return sc?.active ? { sectionId: sc.sectionId, teacherId: sc.teacherId, periodId: store.sections.find(s => s.id === sc.sectionId)?.academicPeriodId } : null;
  };
  const mine = context(candidate)!;
  const conflicts: string[] = [];
  for (const other of store.scheduleBlocks) {
    const theirs = other.active && other.id !== candidate.id ? context(other) : null;
    if (!theirs || theirs.periodId !== mine.periodId || other.day !== candidate.day
      || !(candidate.startTime < other.endTime && other.startTime < candidate.endTime)) continue;
    const when = `el ${other.day} de ${other.startTime} a ${other.endTime}`;
    if (theirs.sectionId === mine.sectionId) conflicts.push(`La sección ya tiene una clase ${when}`);
    if (mine.teacherId !== null && mine.teacherId === theirs.teacherId) conflicts.push(`El docente ya tiene una clase ${when}`);
    if (candidate.classroom && other.classroom && candidate.classroom.toLowerCase() === other.classroom.toLowerCase()) conflicts.push(`El aula ${other.classroom} ya está ocupada ${when}`);
  }
  return conflicts;
}

interface TeacherFields { dni: string; firstNames: string; paternalLastName: string; maternalLastName: string | null; phone: string | null; specialty: string | null }

/**
 * Campos de docente de una solicitud, o null si no son válidos. Al crear, DNI, nombres y apellido paterno son obligatorios;
 * al editar, un campo ausente o nulo queda sin cambio (undefined) y '' vacía los opcionales.
 */
function teacherFields(input: Record<string, unknown>, creating: boolean): TeacherFields | null {
  const result: Record<string, string | null | undefined> = {};
  const limits: [keyof TeacherFields, number, boolean][] = [['dni', 12, true], ['firstNames', 120, true], ['paternalLastName', 120, true], ['maternalLastName', 120, false], ['phone', 30, false], ['specialty', 100, false]];
  for (const [key, max, required] of limits) {
    const value = input[key];
    if (value === undefined || value === null) {
      if (creating && required) return null;
      result[key] = creating ? null : undefined;
    } else if (typeof value !== 'string' || value.trim().length > max || (!value.trim() && required)) {
      return null;
    } else {
      result[key] = value.trim() || null;
    }
  }
  if (result.dni !== undefined && !/^[0-9A-Z]{8,12}$/i.test(result.dni!)) return null;
  return result as unknown as TeacherFields;
}

const teacherFullName = (t: Pick<MockTeacher, 'firstNames' | 'paternalLastName' | 'maternalLastName'>) =>
  [t.firstNames, t.paternalLastName, t.maternalLastName].filter(Boolean).join(' ');

const ACCOUNT_REASONS: Record<'deactivate' | 'reactivate', readonly string[]> = {
  deactivate: ['END_OF_ASSIGNMENT', 'RESIGNATION', 'ADMINISTRATIVE_REVIEW', 'ERRONEOUS_RECORD', 'OTHER'],
  reactivate: ['RETURN_TO_POST', 'ADMINISTRATIVE_CORRECTION', 'OTHER'],
};

/**
 * PATCH /accounts/{userId}/deactivate|reactivate. NOTA: el backend busca la cuenta con lockDirectivo (solo rol DIRECTIVO), así que
 * una cuenta de docente responde 404 ACCOUNT_NOT_FOUND aunque exista; el mock solo reconoce las cuentas de Secretaría.
 */
function accountState(action: keyof typeof ACCOUNT_REASONS): MockRoute {
  return {
    method: 'PATCH', pattern: `/v1/management/accounts/:userId/${action}`, roles: ADMIN_ONLY,
    handler: ({ store, params, body }) => {
      const userId = positiveInt(params.userId);
      const staff = store.staff.find(a => a.userId === userId);
      if (userId === null || !staff) return fail(404, 'La cuenta no existe o no se puede gestionar.', 'ACCOUNT_NOT_FOUND');
      const input = asObject(body);
      const justification = typeof input.justification === 'string' ? input.justification.trim() : '';
      if (typeof input.reasonCode !== 'string' || !ACCOUNT_REASONS[action].includes(input.reasonCode) || !justification || justification.length > 1000) {
        return fail(400, 'Revisa el motivo y la justificación.', 'VALIDATION_ERROR');
      }
      const to = action === 'reactivate';
      if (staff.active === to) return fail(409, 'La cuenta ya tenía ese estado.', 'ACCOUNT_STATE_CONFLICT');
      staff.active = to;
      return ok({ userId, previousActive: !to, active: to, reasonCode: input.reasonCode, justification, changedBy: 1, changedAt: store.now().toISOString() });
    },
  };
}

const academicRoutes: MockRoute[] = [
  {
    method: 'GET', pattern: '/v1/management/courses/:courseId', roles: MANAGEMENT,
    handler: ({ store, params }) => { const c = store.courses.find(x => x.id === positiveInt(params.courseId)); return c ? ok(c) : fail(404, 'El curso no existe.'); },
  },
  {
    method: 'GET', pattern: '/v1/management/sections/:sectionId/schedule', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sectionId = positiveInt(params.sectionId);
      return store.sections.some(s => s.id === sectionId) ? ok(scheduleBlocks(store, sectionId!)) : fail(404, 'La sección no existe.');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/courses/:courseId/evaluation-criteria', roles: MANAGEMENT,
    handler: ({ store, params, query }) => {
      const course = store.courses.find(c => c.id === positiveInt(params.courseId));
      const periodId = positiveInt(query.academicPeriodId);
      if (!course) return fail(404, 'El curso no existe.');
      if (!findPeriod(store, periodId)) return fail(404, 'El periodo académico no existe.');
      return ok(criteriaConfiguration(store, course.id, periodId!));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/evaluation-criteria/:criterionId', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const criterion = store.criteria.find(c => c.id === positiveInt(params.criterionId));
      return criterion ? ok(criterion) : fail(404, 'Criterio de evaluacion no encontrado');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/section-courses/:sectionCourseId/bimesters/:bimesterId/criterion-grades', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sc = sectionCourseOf(store, params.sectionCourseId);
      const bimester = bimesterOf(store, params.bimesterId);
      return sc && bimester ? ok(manualSheet(store, sc, bimester.id)) : fail(404, 'La planilla no está disponible.');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/section-courses/:sectionCourseId/bimesters/:bimesterId/results', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sc = sectionCourseOf(store, params.sectionCourseId);
      const bimester = bimesterOf(store, params.bimesterId);
      return sc && bimester ? ok(evaluationResults(store, sc, bimester.id)) : fail(404, 'Los resultados no están disponibles para este curso y bimestre.');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/section-courses/:sectionCourseId/bimesters/:bimesterId/activities', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sc = sectionCourseOf(store, params.sectionCourseId);
      const bimester = bimesterOf(store, params.bimesterId);
      return sc && bimester ? ok(activitiesOf(store, sc.id, bimester.id)) : ACTIVITY_UNAVAILABLE();
    },
  },
  {
    method: 'GET', pattern: '/v1/management/section-courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId/grades', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sc = sectionCourseOf(store, params.sectionCourseId);
      const bimester = bimesterOf(store, params.bimesterId);
      const activity = sc && bimester && store.activities.find(a => a.id === positiveInt(params.activityId) && a.sectionCourseId === sc.id && a.bimesterId === bimester.id);
      return sc && bimester && activity ? ok(managementActivitySheet(store, sc, bimester, activity)) : ACTIVITY_UNAVAILABLE();
    },
  },
  {
    method: 'GET', pattern: '/v1/management/activity-grades/:gradeId/history', roles: ADMIN_ONLY,
    handler: ({ store, params }) => {
      const gradeId = positiveInt(params.gradeId);
      if (!store.activityGrades.some(g => g.id === gradeId)) return ACTIVITY_UNAVAILABLE();
      return ok(store.activityGradeHistory.filter(h => h.gradeId === gradeId).sort((a, b) => a.newVersion - b.newVersion));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/criterion-grades/:gradeId/history', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      // El mock no guarda correcciones de notas MANUAL: toda nota existente responde sin cambios registrados.
      return store.criterionGrades.some(g => g.id === positiveInt(params.gradeId)) ? ok([]) : RESOURCE_NOT_FOUND('La nota no existe.');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/bimesters/:bimesterId/publication', roles: MANAGEMENT,
    handler: ({ store, params }) => { const b = bimesterOf(store, params.bimesterId); return b ? ok(publicationView(store, b)) : RESOURCE_NOT_FOUND('El bimestre no existe.'); },
  },
  {
    method: 'GET', pattern: '/v1/management/bimesters/:bimesterId/grade-window', roles: MANAGEMENT,
    handler: ({ store, params }) => { const b = bimesterOf(store, params.bimesterId); return b ? ok(gradeWindow(store, b)) : RESOURCE_NOT_FOUND('El bimestre no existe.'); },
  },
  {
    method: 'GET', pattern: '/v1/management/section-courses/:sectionCourseId/attendance', roles: MANAGEMENT,
    handler: ({ store, params, query }) => {
      const sc = sectionCourseOf(store, params.sectionCourseId);
      if (!sc) return fail(404, 'El curso de la sección no existe.');
      const date = query.date ?? limaDayOf(store.now());
      const period = store.periods[0];
      if (!dayOf(date) || date < period.startDate || date > period.endDate) return fail(400, 'La fecha debe estar dentro del periodo académico.', 'VALIDATION_ERROR');
      return ok(attendanceOfDay(store, sc, date));
    },
  },
  {
    method: 'PUT', pattern: '/v1/management/section-courses/:sectionCourseId/attendance/:scheduleId', roles: ADMIN_ONLY,
    handler: ({ store, params, query, body }) => {
      const sc = sectionCourseOf(store, params.sectionCourseId);
      if (!sc || sc.scheduleId !== positiveInt(params.scheduleId)) return fail(404, 'La sesión no está disponible.');
      const date = query.date;
      if (!dayOf(date) || !hasSession(store, date)) return fail(400, 'La fecha no tiene sesión.', 'VALIDATION_ERROR');
      const input = asObject(body);
      const enrolled = new Set(sectionStudents(store, sc.sectionId).map(s => s.enrollmentId));
      const records = input.records;
      if (!Array.isArray(records) || !records.length || records.some(r => !enrolled.has(asObject(r).enrollmentId as number)
        || !['PRESENTE', 'TARDANZA', 'INASISTENCIA'].includes(asObject(r).status as string))) {
        return fail(400, 'Selecciona un estado para cada estudiante de la sesión.', 'VALIDATION_ERROR');
      }
      if (typeof input.reason !== 'string' || !input.reason.trim()) return fail(400, 'El motivo es obligatorio.', 'ATTENDANCE_REASON_REQUIRED');
      if (typeof input.contingencyCause !== 'string') return fail(400, 'La causa de contingencia es obligatoria.', 'ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED');
      saveAttendanceRecords(store, sc, date, records.map(r => ({ enrollmentId: asObject(r).enrollmentId as number, status: asObject(r).status as 'PRESENTE' | 'TARDANZA' | 'INASISTENCIA' })));
      return ok(attendanceSession(store, sc, date));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/section-courses/:sectionCourseId/materials', roles: MANAGEMENT,
    handler: ({ store, params }) => { const sc = sectionCourseOf(store, params.sectionCourseId); return sc ? ok(store.materials.filter(m => m.sectionCourseId === sc.id)) : MATERIAL_UNAVAILABLE(); },
  },
  {
    method: 'POST', pattern: '/v1/management/section-courses/:sectionCourseId/materials/:materialId/download-url', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sc = sectionCourseOf(store, params.sectionCourseId);
      const material = sc && store.materials.find(m => m.id === positiveInt(params.materialId) && m.sectionCourseId === sc.id);
      return material ? ok({ url: mockJustificationAttachmentUrl(), expiresInSeconds: 300 }) : MATERIAL_UNAVAILABLE();
    },
  },
  {
    method: 'GET', pattern: '/v1/management/staff', roles: ADMIN_ONLY,
    handler: ({ store, query }) => {
      const status = query.status;
      return ok(store.staff.filter(a => (status === undefined || (status === 'ACTIVE') === a.active) && matches(query.q, a.fullName, a.email, a.dni)));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/audit', roles: MANAGEMENT,
    handler: ({ store, query }) => {
      const paging = pageParams(query);
      if (!paging) return fail(400, 'La paginación no es válida.', 'VALIDATION_ERROR');
      const from = query.from === undefined ? null : Date.parse(query.from);
      const to = query.to === undefined ? null : Date.parse(query.to);
      const list = store.audit
        .filter(e => (query.entity === undefined || e.entity === query.entity) && (query.action === undefined || e.action === query.action)
          && (query.userId === undefined || e.userId === Number(query.userId))
          && (from === null || Date.parse(e.occurredAt) >= from) && (to === null || Date.parse(e.occurredAt) < to))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id)
        .map(({ id, userId, entity, entityId, action, reason, occurredAt }) => ({ id, userId, entity, entityId, action, reason, occurredAt }));
      return ok(pageOf(list, paging.page, paging.size));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/audit/:id', roles: MANAGEMENT,
    handler: ({ store, params }) => { const e = store.audit.find(x => x.id === positiveInt(params.id)); return e ? ok(e) : fail(404, 'El evento de auditoría no existe.'); },
  },
  // Escrituras de los flujos restaurados en la épica #151 (perfil del alumno y del docente): se aplican en memoria.
  studentState('suspend'),
  studentState('reactivate'),
  studentState('deactivate'),
  {
    method: 'POST', pattern: '/v1/management/students/:studentId/enrollments', roles: ADMIN_ONLY,
    handler: ({ store, params, body }) => {
      const student = store.students.find(x => x.studentId === positiveInt(params.studentId));
      if (!student) return fail(404, 'El estudiante no existe.', 'STUDENT_NOT_FOUND');
      const input = asObject(body);
      const period = findPeriod(store, typeof input.academicPeriodId === 'number' ? input.academicPeriodId : null);
      if (!period) return fail(404, 'El periodo académico no existe.', 'ACADEMIC_PERIOD_NOT_FOUND');
      const section = store.sections.find(s => s.id === input.sectionId);
      if (!section) return fail(404, 'La sección no existe.', 'SECTION_NOT_FOUND');
      const date = input.enrollmentDate;
      if (typeof date !== 'string' || !date) return fail(400, 'La fecha de matrícula es obligatoria.', 'ENROLLMENT_DATE_REQUIRED');
      if (date < period.startDate || date > period.endDate) return fail(400, 'La fecha está fuera del periodo.', 'ENROLLMENT_DATE_OUT_OF_PERIOD');
      if (student.studentStatus !== 'ACTIVE') return fail(409, 'El estudiante no está activo.', 'STUDENT_INACTIVE');
      if (student.enrollmentStatus === 'ACTIVE') return fail(409, 'El estudiante ya tiene una matrícula activa.', 'ACTIVE_ENROLLMENT_EXISTS');
      if (!section.active) return fail(409, 'La sección está inactiva.', 'SECTION_INACTIVE');
      if (section.academicPeriodId !== period.id) return fail(409, 'La sección pertenece a otro periodo.', 'SECTION_NOT_IN_PERIOD');
      if (!section.enrollmentOpen) return fail(409, 'La matrícula de la sección está cerrada.', 'ENROLLMENT_CLOSED');
      if (sectionStudents(store, section.id).length >= section.maxCapacity) return fail(409, 'La sección no tiene vacantes.', 'SECTION_FULL');
      Object.assign(student, {
        enrollmentId: store.nextId(), enrollmentStatus: 'ACTIVE', academicPeriodId: period.id, academicPeriodName: period.name, sectionId: section.id,
        level: section.level, grade: section.grade, sectionName: section.name, enrollmentDate: date,
      });
      return ok(enrollmentView(student), 201);
    },
  },
  {
    method: 'PATCH', pattern: '/v1/management/students/:studentId/enrollments/:enrollmentId/withdraw', roles: ADMIN_ONLY,
    handler: ({ store, params, body }) => {
      const student = store.students.find(x => x.studentId === positiveInt(params.studentId));
      if (!student) return fail(404, 'El estudiante no existe.', 'STUDENT_NOT_FOUND');
      const enrollmentId = positiveInt(params.enrollmentId);
      if (student.enrollmentId === null || enrollmentId === null) return fail(404, 'La matrícula no existe.', 'ENROLLMENT_NOT_FOUND');
      if (student.enrollmentId !== enrollmentId) return fail(409, 'La matrícula no pertenece al estudiante.', 'ENROLLMENT_NOT_OF_STUDENT');
      const input = asObject(body);
      if (typeof input.withdrawalDate !== 'string' || !input.withdrawalDate) return fail(400, 'La fecha de retiro es obligatoria.', 'WITHDRAWAL_DATE_REQUIRED');
      if (input.withdrawalDate < (student.enrollmentDate ?? '')) return fail(400, 'El retiro no puede ser anterior a la matrícula.', 'WITHDRAWAL_DATE_BEFORE_ENROLLMENT');
      if (typeof input.withdrawalReason !== 'string' || !input.withdrawalReason.trim()) return fail(400, 'El motivo del retiro es obligatorio.', 'VALIDATION_ERROR');
      if (student.enrollmentStatus !== 'ACTIVE') return fail(409, 'La matrícula ya no está activa.', 'ENROLLMENT_STATUS_CONFLICT');
      student.enrollmentStatus = 'WITHDRAWN';
      return ok({ ...enrollmentView(student), withdrawalDate: input.withdrawalDate, withdrawalReason: input.withdrawalReason });
    },
  },
  {
    method: 'POST', pattern: '/v1/management/students/:studentId/guardians', roles: ADMIN_ONLY,
    handler: ({ store, params, body }) => {
      const student = store.students.find(x => x.studentId === positiveInt(params.studentId));
      if (!student) return fail(404, 'El estudiante no existe.', 'STUDENT_NOT_FOUND');
      const b = asObject(body);
      if (typeof b.dni !== 'string' || !/^\d{8}$/.test(b.dni) || typeof b.firstNames !== 'string' || !b.firstNames.trim() || typeof b.paternalLastName !== 'string' || !b.paternalLastName.trim()
        || !['FATHER', 'MOTHER', 'TUTOR', 'GUARDIAN', 'OTHER'].includes(String(b.relationship)) || typeof b.primary !== 'boolean' || typeof b.authorizedPickup !== 'boolean') {
        return fail(400, 'Revisa los datos del apoderado.', 'VALIDATION_ERROR');
      }
      if (student.guardians.some(g => g.dni === b.dni)) return fail(409, 'El apoderado ya está vinculado.', 'GUARDIAN_ALREADY_LINKED');
      if (b.primary && student.guardians.some(g => g.primary && g.active)) return fail(409, 'Ya existe un apoderado principal.', 'PRIMARY_GUARDIAN_ALREADY_EXISTS');
      const guardian: GuardianSummaryResponse = {
        guardianId: store.nextId(), personId: store.nextId(), dni: b.dni, firstNames: b.firstNames.trim(), paternalLastName: b.paternalLastName.trim(),
        maternalLastName: typeof b.maternalLastName === 'string' && b.maternalLastName.trim() ? b.maternalLastName.trim() : null,
        phone: typeof b.phone === 'string' && b.phone.trim() ? b.phone.trim() : null, relationship: b.relationship as GuardianSummaryResponse['relationship'],
        primary: b.primary, authorizedPickup: b.authorizedPickup, active: true,
      };
      student.guardians.push(guardian);
      return ok(guardian, 201);
    },
  },
  {
    method: 'POST', pattern: '/v1/management/teachers/:teacherId/assignments', roles: MANAGEMENT,
    handler: ({ store, params, body }) => {
      const teacher = store.teachers.find(t => t.id === positiveInt(params.teacherId));
      if (!teacher) return fail(404, 'El docente no existe.');
      const sc = store.sectionCourses.find(x => x.id === asObject(body).sectionCourseId && x.active);
      if (!sc) return fail(404, 'El curso de la sección no existe.');
      if (sc.teacherId !== null) return fail(409, 'El curso ya tiene un docente asignado.');
      sc.teacherId = teacher.id;
      const course = store.courses.find(c => c.id === sc.courseId)!;
      return ok({ id: 600 + sc.id, teacherId: teacher.id, sectionCourseId: sc.id, sectionId: sc.sectionId, courseId: course.id, courseCode: course.code, courseName: course.name, assignedAt: store.now().toISOString(), active: true }, 201);
    },
  },
  {
    method: 'DELETE', pattern: '/v1/management/teachers/:teacherId/assignments/:assignmentId', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sc = store.sectionCourses.find(x => 600 + x.id === positiveInt(params.assignmentId) && x.teacherId === positiveInt(params.teacherId));
      if (!sc) return fail(404, 'La asignación no existe.');
      sc.teacherId = null;
      return ok(undefined, 204);
    },
  },
  // Criterios de evaluación (#155, CourseCriteria en detalleDelCurso.tsx): en memoria, con las reglas del backend.
  {
    method: 'POST', pattern: '/v1/management/courses/:courseId/evaluation-criteria', roles: MANAGEMENT,
    handler: ({ store, params, body }) => {
      const input = asObject(body);
      if (Object.keys(input).some(k => !CRITERIA_FIELDS.includes(k)) || !positiveInteger(input.academicPeriodId) || !validName(input.name) || !positiveInteger(input.order)
        || (input.description !== undefined && input.description !== null && typeof input.description !== 'string') || (input.type !== 'MANUAL' && input.type !== 'PARTICIPACION_ACADEMICA')) {
        return fail(400, 'Revisa los datos del criterio.', 'VALIDATION_ERROR');
      }
      const period = findPeriod(store, input.academicPeriodId);
      if (!period) return fail(404, 'Periodo academico no encontrado');
      if (periodFrozen(store, period.id)) return STRUCTURE_FROZEN();
      const course = store.courses.find(c => c.id === positiveInt(params.courseId));
      if (!course) return fail(404, 'Curso no encontrado');
      if (!course.active) return fail(409, 'El curso esta inactivo');
      if (!period.active) return fail(409, 'El periodo academico esta inactivo');
      const criterion: EvaluationCriterion = {
        id: store.nextId(), courseId: course.id, academicPeriodId: period.id, name: input.name.trim(), description: typeof input.description === 'string' ? input.description : null,
        order: input.order, type: input.type, active: true,
      };
      const conflict = criterionConflict(store, criterion);
      if (conflict) return conflict;
      store.criteria.push(criterion);
      return ok(criterion, 201);
    },
  },
  {
    method: 'PATCH', pattern: '/v1/management/evaluation-criteria/:criterionId', roles: MANAGEMENT,
    handler: ({ store, params, body }) => {
      const input = asObject(body);
      const keys = Object.keys(input);
      if (!keys.length || keys.some(k => !CRITERIA_PATCH_FIELDS.includes(k)) || (input.name !== undefined && !validName(input.name))
        || (input.order !== undefined && !positiveInteger(input.order)) || (input.active !== undefined && typeof input.active !== 'boolean')
        || (input.description !== undefined && input.description !== null && typeof input.description !== 'string')) {
        return fail(400, 'Revisa los datos del criterio.', 'VALIDATION_ERROR');
      }
      const current = store.criteria.find(c => c.id === positiveInt(params.criterionId));
      if (!current) return fail(404, 'Criterio de evaluacion no encontrado');
      if (periodFrozen(store, current.academicPeriodId)) return STRUCTURE_FROZEN();
      const next: EvaluationCriterion = {
        ...current, name: typeof input.name === 'string' ? input.name.trim() : current.name,
        description: 'description' in input ? (input.description as string | null) : current.description,
        order: typeof input.order === 'number' ? input.order : current.order, active: typeof input.active === 'boolean' ? input.active : current.active,
      };
      if (!current.active && next.active) {
        if (!store.courses.find(c => c.id === current.courseId)!.active) return fail(409, 'El curso esta inactivo');
        if (!findPeriod(store, current.academicPeriodId)!.active) return fail(409, 'El periodo academico esta inactivo');
      }
      const conflict = criterionConflict(store, next);
      if (conflict) return conflict;
      Object.assign(current, next);
      return ok(current);
    },
  },
  // Docentes (#154 y #155): alta, edición, cuenta de acceso y estado de la cuenta, en memoria.
  {
    method: 'POST', pattern: '/v1/management/teachers', roles: MANAGEMENT,
    handler: ({ store, body }) => {
      const fields = teacherFields(asObject(body), true);
      if (!fields) return fail(400, 'Revisa los datos del docente.', 'VALIDATION_ERROR');
      if (store.teachers.some(t => t.dni.toLowerCase() === fields.dni.toLowerCase())) return fail(409, 'Ya existe una persona con ese DNI.');
      const teacher: MockTeacher = { id: store.nextId(), personId: store.nextId(), ...fields, fullName: '', email: null, accountActive: true, active: true };
      teacher.fullName = teacherFullName(teacher);
      store.teachers.push(teacher);
      return ok(teacherView(teacher), 201);
    },
  },
  {
    method: 'PATCH', pattern: '/v1/management/teachers/:teacherId', roles: MANAGEMENT,
    handler: ({ store, params, body }) => {
      const teacher = store.teachers.find(t => t.id === positiveInt(params.teacherId));
      if (!teacher) return fail(404, 'El docente no existe.');
      const input = asObject(body);
      const fields = teacherFields(input, false);
      if (!fields || (input.active !== undefined && input.active !== null && typeof input.active !== 'boolean')) return fail(400, 'Revisa los datos del docente.', 'VALIDATION_ERROR');
      if (fields.dni && store.teachers.some(t => t.id !== teacher.id && t.dni.toLowerCase() === fields.dni.toLowerCase())) return fail(409, 'Ya existe una persona con ese DNI.');
      for (const [key, value] of Object.entries(fields)) if (value !== undefined) (teacher as unknown as Record<string, unknown>)[key] = value;
      if (typeof input.active === 'boolean') teacher.active = input.active;
      teacher.fullName = teacherFullName(teacher);
      return ok(teacherView(teacher));
    },
  },
  {
    method: 'POST', pattern: '/v1/management/teachers/:teacherId/account', roles: ADMIN_ONLY,
    handler: ({ store, params, body }) => {
      const teacher = store.teachers.find(t => t.id === positiveInt(params.teacherId));
      if (!teacher) return fail(404, 'No existe el docente solicitado.');
      if (!teacher.active) return fail(422, 'El docente está inactivo.');
      const raw = asObject(body).email;
      const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return fail(400, 'Se requiere un email válido.', 'VALIDATION_ERROR');
      const account = (created: boolean) => ({ userId: teacherUserId(teacher.id), teacherId: teacher.id, email, role: 'DOCENTE', created });
      if (teacher.email === email) return ok(account(false));
      const inUse = email in MOCK_USERS || store.teachers.some(t => t.email === email) || store.staff.some(a => a.email === email);
      if (inUse || teacher.email !== null) return fail(409, 'La persona del docente tiene una vinculación de cuenta incompatible.');
      teacher.email = email;
      teacher.accountActive = true;
      return ok(account(true), 201);
    },
  },
  accountState('deactivate'),
  accountState('reactivate'),
  // Horario (#156): los bloques viven en el store y el choque se evalúa dentro del periodo de la sección.
  {
    method: 'POST', pattern: '/v1/management/schedules', roles: MANAGEMENT,
    handler: ({ store, body }) => {
      const input = asObject(body);
      const sc = store.sectionCourses.find(x => x.id === input.sectionCourseId);
      if (!sc) return fail(404, 'No existe el curso de sección.');
      const slot = scheduleSlot(input, null);
      if (typeof slot === 'string') return fail(400, slot, 'VALIDATION_ERROR');
      if (!sc.active) return fail(422, 'El curso ya no está activo en la sección.');
      const block: MockScheduleBlock = { id: store.nextId(), sectionCourseId: sc.id, ...slot, active: true };
      const conflicts = scheduleConflicts(store, block);
      if (conflicts.length) return SCHEDULE_CONFLICT(conflicts);
      store.scheduleBlocks.push(block);
      return ok(scheduleView(store, block), 201);
    },
  },
  {
    method: 'PATCH', pattern: '/v1/management/schedules/:id', roles: MANAGEMENT,
    handler: ({ store, params, body }) => {
      const block = store.scheduleBlocks.find(x => x.id === positiveInt(params.id) && x.active);
      if (!block) return fail(404, `No existe el bloque horario ${params.id}.`);
      const slot = scheduleSlot(asObject(body), block);
      if (typeof slot === 'string') return fail(400, slot, 'VALIDATION_ERROR');
      if (!store.sectionCourses.find(x => x.id === block.sectionCourseId)!.active) return fail(422, 'El curso ya no está activo en la sección.');
      const conflicts = scheduleConflicts(store, { ...block, ...slot });
      if (conflicts.length) return SCHEDULE_CONFLICT(conflicts);
      Object.assign(block, slot);
      return ok(scheduleView(store, block));
    },
  },
  {
    // Baja lógica e idempotente, como el backend: borrar un bloque ya eliminado responde 204.
    method: 'DELETE', pattern: '/v1/management/schedules/:id', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const block = store.scheduleBlocks.find(x => x.id === positiveInt(params.id));
      if (!block) return fail(404, `No existe el bloque horario ${params.id}.`);
      block.active = false;
      return ok(undefined, 204);
    },
  },
];

export const adminRoutes: MockRoute[] = [
  ...academicRoutes,
  { method: 'GET', pattern: '/v1/management/academic-periods', roles: MANAGEMENT, handler: ({ store }) => ok(store.periods) },
  {
    method: 'GET', pattern: '/v1/management/academic-periods/:periodId', roles: MANAGEMENT,
    handler: ({ store, params }) => { const p = findPeriod(store, positiveInt(params.periodId)); return p ? ok(p) : fail(404, 'El periodo académico no existe.'); },
  },
  {
    method: 'GET', pattern: '/v1/management/academic-periods/:periodId/bimesters', roles: MANAGEMENT,
    handler: ({ store, params }) => { const id = positiveInt(params.periodId); return findPeriod(store, id) ? ok(store.bimesters.filter(b => b.academicPeriodId === id)) : fail(404, 'El periodo académico no existe.'); },
  },
  {
    method: 'GET', pattern: '/v1/management/sections', roles: MANAGEMENT,
    handler: ({ store, query }) => ok(store.sections.filter(s =>
      (query.academicPeriodId === undefined || s.academicPeriodId === Number(query.academicPeriodId))
      && (query.level === undefined || s.level === query.level)
      && (query.grade === undefined || s.grade === Number(query.grade))
      && (query.active === undefined || String(s.active) === query.active))),
  },
  {
    method: 'POST', pattern: '/v1/management/sections', roles: ADMIN_ONLY,
    handler: ({ store, body }) => {
      const b = asObject(body);
      if (typeof b.name !== 'string' || !b.name.trim() || !Number.isSafeInteger(b.grade) || !Number.isSafeInteger(b.maxCapacity)) return fail(400, 'Revisa los datos de la sección.', 'VALIDATION_ERROR');
      const section = patch<SectionResponse>({ id: store.nextId(), academicPeriodId: 1, level: 'PRIMARY', grade: 1, name: '', maxCapacity: 30, enrollmentOpen: true, active: true }, body,
        ['academicPeriodId', 'level', 'grade', 'name', 'maxCapacity', 'enrollmentOpen']);
      store.sections.push(section);
      return ok(section, 201);
    },
  },
  {
    method: 'GET', pattern: '/v1/management/sections/:sectionId', roles: MANAGEMENT,
    handler: ({ store, params }) => { const s = store.sections.find(x => x.id === positiveInt(params.sectionId)); return s ? ok(s) : fail(404, 'La sección no existe.'); },
  },
  {
    method: 'PATCH', pattern: '/v1/management/sections/:sectionId', roles: ADMIN_ONLY,
    handler: ({ store, params, body }) => {
      const s = store.sections.find(x => x.id === positiveInt(params.sectionId));
      return s ? ok(patch(s, body, ['level', 'grade', 'name', 'maxCapacity', 'enrollmentOpen', 'active'])) : fail(404, 'La sección no existe.');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/sections/:sectionId/courses', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const sectionId = positiveInt(params.sectionId);
      if (!store.sections.some(s => s.id === sectionId)) return fail(404, 'La sección no existe.');
      return ok(store.sectionCourses.filter(sc => sc.sectionId === sectionId).map(sc => {
        const course = store.courses.find(c => c.id === sc.courseId)!;
        return { id: sc.id, sectionId: sc.sectionId, courseId: sc.courseId, courseCode: course.code, courseName: course.name, active: sc.active, teacherId: sc.teacherId, teacherName: store.teachers.find(t => t.id === sc.teacherId)?.fullName ?? null };
      }));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/courses', roles: MANAGEMENT,
    handler: ({ store, query }) => {
      const paging = pageParams(query);
      if (!paging) return fail(400, 'La paginación no es válida.', 'VALIDATION_ERROR');
      const list = store.courses.filter(c => matches(query.search, c.name, c.code) && (query.level === undefined || c.level === query.level)
        && (query.area === undefined || c.area === query.area) && (query.active === undefined || String(c.active) === query.active));
      return ok(pageOf(list, paging.page, paging.size));
    },
  },
  {
    method: 'POST', pattern: '/v1/management/courses', roles: MANAGEMENT,
    handler: ({ store, body }) => {
      const b = asObject(body);
      if (typeof b.code !== 'string' || !b.code.trim() || typeof b.name !== 'string' || !b.name.trim()) return fail(400, 'Revisa los datos del curso.', 'VALIDATION_ERROR');
      if (store.courses.some(c => c.code === b.code)) return fail(409, 'Ya existe un curso con ese código.');
      const course = patch<CourseResponse>({ id: store.nextId(), code: '', name: '', level: 'PRIMARY', area: '', weeklyHours: 1, description: null, active: true }, body,
        ['code', 'name', 'level', 'area', 'weeklyHours', 'description']);
      store.courses.push(course);
      return ok(course, 201);
    },
  },
  {
    method: 'PATCH', pattern: '/v1/management/courses/:courseId', roles: MANAGEMENT,
    handler: ({ store, params, body }) => {
      const c = store.courses.find(x => x.id === positiveInt(params.courseId));
      return c ? ok(patch(c, body, ['code', 'name', 'level', 'area', 'weeklyHours', 'description', 'active'])) : fail(404, 'El curso no existe.');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/students', roles: MANAGEMENT,
    handler: ({ store, query }) => {
      const paging = pageParams(query);
      if (!paging) return fail(400, 'La paginación no es válida.', 'VALIDATION_ERROR');
      const list = store.students.filter(s => matches(query.search, studentFullName(s), s.dni, s.studentCode)
        && (query.sectionId === undefined || s.sectionId === Number(query.sectionId)) && (query.status === undefined || s.studentStatus === query.status)
        && (query.level === undefined || s.level === query.level) && (query.grade === undefined || s.grade === Number(query.grade)));
      return ok(pageOf(list.map(summary), paging.page, paging.size));
    },
  },
  {
    method: 'POST', pattern: '/v1/management/students', roles: ADMIN_ONLY,
    handler: ({ store, body }) => {
      const b = asObject(body);
      if (typeof b.dni !== 'string' || !/^\d{8}$/.test(b.dni) || typeof b.firstNames !== 'string' || !b.firstNames.trim() || typeof b.paternalLastName !== 'string' || !b.paternalLastName.trim()) {
        return fail(400, 'Revisa los datos del estudiante.', 'VALIDATION_ERROR');
      }
      if (store.students.some(s => s.dni === b.dni)) return fail(409, 'Ya existe un estudiante con ese DNI.');
      const studentId = store.nextId();
      const created: StudentDetailResponse = {
        studentId, personId: store.nextId(), studentCode: null, dni: b.dni, firstNames: b.firstNames.trim(), paternalLastName: b.paternalLastName.trim(),
        maternalLastName: typeof b.maternalLastName === 'string' ? b.maternalLastName : null, birthDate: typeof b.birthDate === 'string' ? b.birthDate : null,
        studentStatus: 'ACTIVE', enrollmentId: null, enrollmentStatus: null, academicPeriodId: null, academicPeriodName: null, sectionId: null, level: null,
        grade: null, sectionName: null, phone: typeof b.phone === 'string' ? b.phone : null, enrollmentDate: null, guardians: [],
      };
      store.students.push(created);
      return ok(created, 201);
    },
  },
  {
    method: 'GET', pattern: '/v1/management/students/:studentId', roles: MANAGEMENT,
    handler: ({ store, params }) => { const s = store.students.find(x => x.studentId === positiveInt(params.studentId)); return s ? ok(s) : fail(404, 'El estudiante no existe.', 'STUDENT_NOT_FOUND'); },
  },
  {
    method: 'PATCH', pattern: '/v1/management/students/:studentId', roles: MANAGEMENT,
    handler: ({ store, params, body }) => {
      const s = store.students.find(x => x.studentId === positiveInt(params.studentId));
      return s ? ok(patch(s, body, ['studentCode', 'dni', 'firstNames', 'paternalLastName', 'maternalLastName', 'birthDate', 'phone'])) : fail(404, 'El estudiante no existe.', 'STUDENT_NOT_FOUND');
    },
  },
  {
    method: 'GET', pattern: '/v1/management/teachers', roles: MANAGEMENT,
    handler: ({ store, query }) => {
      const paging = pageParams(query);
      if (!paging) return fail(400, 'La paginación no es válida.', 'VALIDATION_ERROR');
      const list = store.teachers.filter(t => matches(query.search, t.fullName, t.dni) && (query.active === undefined || String(t.active) === query.active));
      return ok(pageOf(list.map(teacherView), paging.page, paging.size));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/teachers/:teacherId', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const teacher = store.teachers.find(t => t.id === positiveInt(params.teacherId));
      if (!teacher) return fail(404, 'El docente no existe.');
      const assignments = store.sectionCourses.filter(sc => sc.teacherId === teacher.id).map(sc => {
        const course = store.courses.find(c => c.id === sc.courseId)!;
        return { id: 600 + sc.id, teacherId: teacher.id, sectionCourseId: sc.id, sectionId: sc.sectionId, courseId: course.id, courseCode: course.code, courseName: course.name, assignedAt: `2026-02-${String(20 + (sc.id % 8)).padStart(2, '0')}T15:00:00Z`, active: sc.active };
      });
      return ok({ ...teacherView(teacher), assignments, account: teacher.email ? { userId: teacherUserId(teacher.id), email: teacher.email, active: teacher.accountActive } : null });
    },
  },
  { method: 'GET', pattern: '/v1/management/vacancies', roles: MANAGEMENT, handler: vacancies },
  { method: 'GET', pattern: '/v1/management/attendance/daily', roles: MANAGEMENT, handler: dailyAttendance },
  { method: 'GET', pattern: '/v1/management/bimesters/:bimesterId/early-alerts', roles: MANAGEMENT, handler: earlyAlerts },
  {
    method: 'GET', pattern: '/v1/management/attendance-justifications', roles: MANAGEMENT,
    handler: ({ store, query }) => {
      const paging = pageParams(query);
      if (!paging) return fail(400, 'La paginación no es válida.', 'VALIDATION_ERROR');
      const { status } = query;
      let list = store.justifications;
      if (status) {
        list = list.filter(j => j.status === status);
      }
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(pageOf(list, paging.page, paging.size));
    },
  },
  {
    method: 'GET', pattern: '/v1/management/attendance-justifications/:id', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const id = positiveInt(params.id);
      const justification = store.justifications.find(j => j.id === id);
      if (!justification) return fail(404, 'La justificación no existe.', 'JUSTIFICATION_NOT_FOUND');
      return ok(justification);
    },
  },
  {
    method: 'POST', pattern: '/v1/management/attendance-justifications/:id/decision', roles: ['DIRECTIVO'],
    handler: ({ store, params, body }) => {
      const id = positiveInt(params.id);
      const justification = store.justifications.find(j => j.id === id);
      if (!justification) return fail(404, 'La justificación no existe.', 'JUSTIFICATION_NOT_FOUND');
      const input = asObject(body);
      const decision = DECISIONS.find(d => d === input.decision);
      const comment = typeof input.comment === 'string' ? input.comment.trim() : '';
      if (!decision || !comment || comment.length > 2000) return fail(400, 'Datos inválidos.', 'VALIDATION_ERROR');
      // Solo una solicitud PENDIENTE admite decisión; el backend responde 409 en cualquier otro estado.
      if (justification.status !== 'PENDIENTE') return fail(409, 'Cambio de estado no permitido.', 'INVALID_JUSTIFICATION_TRANSITION');
      const nowIso = store.now().toISOString();
      justification.status = decision;
      justification.reviewComment = comment;
      justification.updatedAt = nowIso;
      justification.history.push({ from: 'PENDIENTE', to: decision, comment, at: nowIso });
      return ok(justification);
    },
  },
  {
    method: 'POST', pattern: '/v1/management/attendance-justifications/:id/attachment/download-url', roles: MANAGEMENT,
    handler: ({ store, params }) => {
      const id = positiveInt(params.id);
      const justification = store.justifications.find(j => j.id === id);
      if (!justification) return fail(404, 'La justificación no existe.', 'JUSTIFICATION_NOT_FOUND');
      if (!justification.attachmentName) return fail(404, 'La solicitud no tiene adjunto.', 'FILE_NOT_FOUND');
      return ok({ url: mockJustificationAttachmentUrl(), expiresInSeconds: 300 });
    },
  },
];
