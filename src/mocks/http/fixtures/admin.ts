// Rutas simuladas de gestión (/v1/management), compartidas por ADMINISTRADOR y DIRECTIVO.
import type { StudentDetailResponse, StudentSummaryResponse } from '@/types/studentApi';
import type { SectionResponse } from '@/types/sectionApi';
import type { CourseResponse } from '@/types/courseApi';
import type { TeacherResponse } from '@/types/teacherApi';
import { asObject, fail, ok, pageOf, pageParams, positiveInt, type MockRequest, type MockRoute } from '../mockHttp';
import type { JustificationDecisionRequest } from '@/types/guardianJustificationsApi';
import {
  attendanceStatus, hasSession, limaDayOf, mockJustificationAttachmentUrl, sectionStudents, studentFullName, type MockStore, type MockTeacher,
} from './shared';

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

function earlyAlerts({ store, params, query }: MockRequest) {
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

export const adminRoutes: MockRoute[] = [
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
    method: 'POST', pattern: '/v1/management/sections', roles: MANAGEMENT,
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
    method: 'PATCH', pattern: '/v1/management/sections/:sectionId', roles: MANAGEMENT,
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
    method: 'POST', pattern: '/v1/management/students', roles: MANAGEMENT,
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
        return { id: 600 + sc.id, teacherId: teacher.id, sectionCourseId: sc.id, sectionId: sc.sectionId, courseId: course.id, courseCode: course.code, courseName: course.name, assignedAt: '2026-02-25T15:00:00Z', active: sc.active };
      });
      return ok({ ...teacherView(teacher), assignments, account: teacher.email ? { userId: 700 + teacher.id, email: teacher.email, active: true } : null });
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
