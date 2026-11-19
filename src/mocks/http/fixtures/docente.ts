// Rutas simuladas del docente (/v1/teacher). El docente de la sesión es el de docente@demo.local.
import type { IncidenciaResponse } from '@/types/incidenciasApi';
import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';
import { asObject, fail, ok, pageOf, pageParams, positiveInt, type MockReply, type MockRequest, type MockRoute } from '../mockHttp';
import type { AcademicActivity, ActivityGrade } from '@/types/teacherActivitiesApi';
import { ACADEMIC_ACTIVITY_TYPES } from '@/types/teacherActivitiesApi';
import {
  activeManualCriteria, hasSession, limaDayOf, mockJustificationAttachmentUrl, sectionStudents, studentFullName, teacherUserId,
  type MockSectionCourse, type MockStore, type MockTeacher,
} from './shared';
import {
  activitiesOf, activitySheet, attendanceOfDay, evaluationResults, gradeOf, manualSheet, registrationView, saveAttendanceRecords,
} from './academico';
import { earlyAlerts } from './admin';

const DOCENTE = ['DOCENTE'] as const;
const STATUSES: readonly TeacherAttendanceStatus[] = ['PRESENTE', 'TARDANZA', 'INASISTENCIA'];
const SEVERITIES = ['LEVE', 'MODERADA', 'GRAVE'];
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

const teacherOf = ({ store, session }: MockRequest): MockTeacher | undefined => store.teachers.find(t => t.email === session?.email);

/** Curso de la ruta, solo si está asignado al docente de la sesión. */
function ownCourse(request: MockRequest): { teacher: MockTeacher; sc: MockSectionCourse } | null {
  const teacher = teacherOf(request);
  const sc = request.store.sectionCourses.find(x => x.id === positiveInt(request.params.sectionCourseId) && x.active);
  return teacher && sc && sc.teacherId === teacher.id ? { teacher, sc } : null;
}

function courseSummary(store: MockStore, sc: MockSectionCourse) {
  const course = store.courses.find(c => c.id === sc.courseId)!;
  const section = store.sections.find(s => s.id === sc.sectionId)!;
  return {
    sectionCourseId: sc.id, assignmentId: 600 + sc.id, courseId: course.id, code: course.code, name: course.name, level: course.level, area: course.area,
    weeklyHours: course.weeklyHours, sectionId: section.id, grade: section.grade, sectionName: section.name, studentCount: sectionStudents(store, section.id).length,
  };
}

const validGrade = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 20 && Math.abs(v * 100 - Math.round(v * 100)) < 1e-8;

// ---------- Evaluación del curso: actividades, resultados, registro, alertas y materiales ----------

const CONTEXT_UNAVAILABLE = () => fail(404, 'La actividad, el curso o el bimestre no está disponible para tu cuenta.', 'ACTIVITY_CONTEXT_UNAVAILABLE');
const ACTIVITY_INVALID = (message = 'Revisa los datos de la actividad.') => fail(400, message, 'ACTIVITY_REQUEST_INVALID');

/** Curso propio y bimestre de la ruta, o la respuesta 404 del módulo de actividades. */
function activityContext(request: MockRequest) {
  const own = ownCourse(request);
  const bimester = request.store.bimesters.find(b => b.id === positiveInt(request.params.bimesterId));
  return own && bimester ? { own, bimester } : null;
}

function activityIn(request: MockRequest, sectionCourseId: number, bimesterId: number): AcademicActivity | undefined {
  const id = positiveInt(request.params.activityId);
  return request.store.activities.find(a => a.id === id && a.sectionCourseId === sectionCourseId && a.bimesterId === bimesterId);
}

function validActivityFields(input: Record<string, unknown>, partial: boolean): boolean {
  const has = (k: string) => k in input;
  if ((!partial || has('title')) && (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 255)) return false;
  if ((!partial || has('type')) && !ACADEMIC_ACTIVITY_TYPES.includes(input.type as never)) return false;
  if ((!partial || has('cuentaParaPa')) && typeof input.cuentaParaPa !== 'boolean') return false;
  return !has('description') || input.description === null || typeof input.description === 'string';
}

interface GradeEntry { enrollmentId: number; grade: unknown; expectedVersion: unknown; reason?: unknown }

/** Valida una nota contra la planilla y devuelve cómo aplicarla, o el error del contrato (400/409). */
function planActivityGrade(store: MockStore, sc: MockSectionCourse, bimesterOpen: boolean, activity: AcademicActivity, teacher: MockTeacher, entry: GradeEntry): { error: MockReply } | { commit: () => ActivityGrade } {
  const student = sectionStudents(store, sc.sectionId).find(s => s.enrollmentId === entry.enrollmentId);
  if (!student) return { error: fail(409, 'La matrícula no puede calificarse en esta actividad.', 'ENROLLMENT_NOT_ELIGIBLE') };
  if (!validGrade(entry.grade) || (entry.expectedVersion !== null && !Number.isSafeInteger(entry.expectedVersion))) return { error: ACTIVITY_INVALID('Revisa la nota (0 a 20, máximo dos decimales).') };
  if (!bimesterOpen) return { error: fail(409, 'El bimestre no está abierto.', 'BIMESTER_WINDOW_CLOSED') };
  if (activity.status !== 'PUBLICADA') return { error: fail(409, 'Solo se califican actividades publicadas.', 'ACTIVITY_NOT_GRADEABLE') };
  if ((student.enrollmentDate ?? '') > (activity.publishedAt ?? '').slice(0, 10)) return { error: fail(409, 'La matrícula es posterior a la publicación.', 'ENROLLMENT_NOT_ELIGIBLE') };
  const current = gradeOf(store, activity.id, entry.enrollmentId);
  if ((current?.version ?? null) !== entry.expectedVersion) return { error: fail(409, 'La nota cambió desde la última consulta.', 'ACTIVITY_GRADE_STALE') };
  const reason = typeof entry.reason === 'string' ? entry.reason.trim() : '';
  if (current) {
    if (!reason || reason.length > 1000) return { error: ACTIVITY_INVALID('Indica el motivo de la corrección.') };
    if (current.grade === entry.grade) return { error: fail(409, 'La corrección no cambia la nota.', 'ACTIVITY_GRADE_UNCHANGED') };
  } else if (entry.reason !== undefined) {
    return { error: ACTIVITY_INVALID('El registro inicial no lleva motivo.') };
  }
  const commit = (): ActivityGrade => {
    const nowIso = store.now().toISOString();
    const previousGrade = current?.grade ?? null;
    const saved: ActivityGrade = current
      ? Object.assign(current, { grade: entry.grade as number, version: current.version + 1, updatedAt: nowIso })
      : { id: store.nextId(), activityId: activity.id, enrollmentId: entry.enrollmentId, grade: entry.grade as number, registeredByTeacherId: teacher.id, registeredAt: nowIso, updatedAt: null, version: 1 };
    if (!current) store.activityGrades.push(saved);
    store.activityGradeHistory.push({
      id: store.nextId(), gradeId: saved.id, previousGrade, newGrade: saved.grade, actorId: teacherUserId(teacher.id),
      reason: reason || null, changedAt: nowIso, previousVersion: saved.version - 1, newVersion: saved.version,
    });
    return saved;
  };
  return { commit };
}

const evaluationRoutes: MockRoute[] = [
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities', roles: DOCENTE,
    handler: request => { const ctx = activityContext(request); return ctx ? ok(activitiesOf(request.store, ctx.own.sc.id, ctx.bimester.id)) : CONTEXT_UNAVAILABLE(); },
  },
  {
    method: 'POST', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities', roles: DOCENTE,
    handler: request => {
      const { store, body } = request;
      const ctx = activityContext(request);
      if (!ctx) return CONTEXT_UNAVAILABLE();
      const input = asObject(body);
      if (!validActivityFields(input, false)) return ACTIVITY_INVALID();
      if (ctx.bimester.status !== 'ABIERTO') return fail(409, 'El bimestre no está abierto.', 'BIMESTER_WINDOW_CLOSED');
      const activity: AcademicActivity = {
        id: store.nextId(), sectionCourseId: ctx.own.sc.id, bimesterId: ctx.bimester.id, createdByTeacherId: ctx.own.teacher.id, title: (input.title as string).trim(),
        description: typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null, type: input.type as AcademicActivity['type'],
        cuentaParaPa: input.cuentaParaPa as boolean, status: 'PLANIFICADA', createdAt: store.now().toISOString(), updatedAt: null, publishedAt: null,
        annulledAt: null, annulledByUserId: null, annulmentReason: null,
      };
      store.activities.push(activity);
      return ok(activity, 201, { location: `/api/v1/teacher/courses/${activity.sectionCourseId}/bimesters/${activity.bimesterId}/activities/${activity.id}` });
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      const activity = ctx && activityIn(request, ctx.own.sc.id, ctx.bimester.id);
      return activity ? ok(activity) : CONTEXT_UNAVAILABLE();
    },
  },
  {
    method: 'PATCH', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      const activity = ctx && activityIn(request, ctx.own.sc.id, ctx.bimester.id);
      if (!ctx || !activity) return CONTEXT_UNAVAILABLE();
      const input = asObject(request.body);
      if (!Object.keys(input).length || !validActivityFields(input, true)) return ACTIVITY_INVALID();
      if (activity.status === 'ANULADA') return fail(409, 'La actividad ya cambió de estado.', 'ACTIVITY_STATE_CONFLICT');
      for (const key of ['title', 'description', 'type', 'cuentaParaPa'] as const) if (key in input) Object.assign(activity, { [key]: key === 'title' ? (input.title as string).trim() : key === 'description' ? (typeof input.description === 'string' && input.description.trim() ? input.description.trim() : null) : input[key] });
      activity.updatedAt = request.store.now().toISOString();
      return ok(activity);
    },
  },
  {
    method: 'POST', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId/publish', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      const activity = ctx && activityIn(request, ctx.own.sc.id, ctx.bimester.id);
      if (!ctx || !activity) return CONTEXT_UNAVAILABLE();
      if (activity.status !== 'PLANIFICADA') return fail(409, 'La actividad ya cambió de estado.', 'ACTIVITY_STATE_CONFLICT');
      if (ctx.bimester.status !== 'ABIERTO') return fail(409, 'El bimestre no está abierto.', 'BIMESTER_WINDOW_CLOSED');
      const nowIso = request.store.now().toISOString();
      Object.assign(activity, { status: 'PUBLICADA', publishedAt: nowIso, updatedAt: nowIso });
      return ok(activity);
    },
  },
  {
    method: 'POST', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId/annul', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      const activity = ctx && activityIn(request, ctx.own.sc.id, ctx.bimester.id);
      if (!ctx || !activity) return CONTEXT_UNAVAILABLE();
      const reason = asObject(request.body).reason;
      if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000) return ACTIVITY_INVALID('Indica el motivo de la anulación.');
      if (activity.status === 'ANULADA') return fail(409, 'La actividad ya cambió de estado.', 'ACTIVITY_STATE_CONFLICT');
      const nowIso = request.store.now().toISOString();
      Object.assign(activity, { status: 'ANULADA', annulledAt: nowIso, annulledByUserId: teacherUserId(ctx.own.teacher.id), annulmentReason: reason.trim(), updatedAt: nowIso });
      return ok(activity);
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId/grades', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      const activity = ctx && activityIn(request, ctx.own.sc.id, ctx.bimester.id);
      return ctx && activity ? ok(activitySheet(request.store, ctx.own.sc, ctx.bimester, activity)) : CONTEXT_UNAVAILABLE();
    },
  },
  {
    method: 'PUT', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId/grades/:enrollmentId', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      const activity = ctx && activityIn(request, ctx.own.sc.id, ctx.bimester.id);
      if (!ctx || !activity) return CONTEXT_UNAVAILABLE();
      const input = asObject(request.body);
      const plan = planActivityGrade(request.store, ctx.own.sc, ctx.bimester.status === 'ABIERTO', activity, ctx.own.teacher,
        { enrollmentId: positiveInt(request.params.enrollmentId) ?? -1, grade: input.grade, expectedVersion: input.expectedVersion ?? null, reason: input.reason });
      return 'error' in plan ? plan.error : ok(plan.commit());
    },
  },
  {
    method: 'PUT', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/activities/:activityId/grades', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      const activity = ctx && activityIn(request, ctx.own.sc.id, ctx.bimester.id);
      if (!ctx || !activity) return CONTEXT_UNAVAILABLE();
      const grades = asObject(request.body).grades;
      if (!Array.isArray(grades) || grades.length < 1 || grades.length > 100) return ACTIVITY_INVALID('El lote admite entre 1 y 100 notas.');
      // Atómico: se valida cada nota antes de aplicar alguna.
      const plans = grades.map(g => {
        const e = asObject(g);
        return planActivityGrade(request.store, ctx.own.sc, ctx.bimester.status === 'ABIERTO', activity, ctx.own.teacher,
          { enrollmentId: typeof e.enrollmentId === 'number' ? e.enrollmentId : -1, grade: e.grade, expectedVersion: e.expectedVersion ?? null, reason: e.reason });
      });
      const failed = plans.find(p => 'error' in p);
      if (failed && 'error' in failed) return failed.error;
      return ok(plans.map(p => ('commit' in p ? p.commit() : null)));
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/results', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      return ctx ? ok(evaluationResults(request.store, ctx.own.sc, ctx.bimester.id)) : fail(404, 'Los resultados no están disponibles para este curso y bimestre.');
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/registration', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      return ctx ? ok(registrationView(request.store, ctx.own.sc, ctx.bimester)) : fail(404, 'Curso no disponible para tu cuenta.', 'RESOURCE_NOT_FOUND');
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/early-alerts', roles: DOCENTE,
    handler: request => {
      const ctx = activityContext(request);
      if (!ctx) return fail(404, 'Curso no disponible para tu cuenta.', 'ALERT_CONTEXT_UNAVAILABLE');
      return earlyAlerts({ ...request, params: { bimesterId: String(ctx.bimester.id) }, query: { ...request.query, sectionCourseId: String(ctx.own.sc.id) } });
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/materials', roles: DOCENTE,
    handler: request => {
      const own = ownCourse(request);
      return own ? ok(request.store.materials.filter(m => m.sectionCourseId === own.sc.id)) : fail(404, 'Material o curso no disponible.', 'MATERIAL_CONTEXT_UNAVAILABLE');
    },
  },
  {
    // Retira el material en memoria: el motivo se valida antes que el contexto, como @Valid en el backend.
    method: 'POST', pattern: '/v1/teacher/courses/:sectionCourseId/materials/:materialId/withdraw', roles: DOCENTE,
    handler: request => {
      const reason = asObject(request.body).reason;
      if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000) return fail(400, 'Peticion invalida; revise campos, tipos y valores', 'VALIDATION_ERROR');
      const own = ownCourse(request);
      const material = own && request.store.materials.find(m => m.id === positiveInt(request.params.materialId) && m.sectionCourseId === own.sc.id);
      if (!own || !material) return fail(404, 'Material o contexto no disponible', 'MATERIAL_CONTEXT_UNAVAILABLE');
      if (material.status === 'RETIRADO') return fail(409, 'El material ya fue retirado', 'MATERIAL_WITHDRAWN');
      Object.assign(material, { status: 'RETIRADO', withdrawnAt: request.store.now().toISOString(), withdrawnByUserId: teacherUserId(own.teacher.id), withdrawalReason: reason.trim() });
      return ok(material);
    },
  },
  {
    method: 'POST', pattern: '/v1/teacher/courses/:sectionCourseId/materials/:materialId/download-url', roles: DOCENTE,
    handler: request => {
      const own = ownCourse(request);
      const material = own && request.store.materials.find(m => m.id === positiveInt(request.params.materialId) && m.sectionCourseId === own.sc.id);
      return material ? ok({ url: mockJustificationAttachmentUrl(), expiresInSeconds: 300 }) : fail(404, 'Material o curso no disponible.', 'MATERIAL_CONTEXT_UNAVAILABLE');
    },
  },
];

export const docenteRoutes: MockRoute[] = [
  ...evaluationRoutes,
  {
    method: 'GET', pattern: '/v1/teacher/me', roles: DOCENTE,
    handler: request => {
      const t = teacherOf(request);
      if (!t) return fail(403, 'La cuenta no tiene un perfil docente activo.');
      return ok({ id: t.id, personId: t.personId, dni: t.dni, firstNames: t.firstNames, paternalLastName: t.paternalLastName, maternalLastName: t.maternalLastName, fullName: t.fullName, phone: t.phone, specialty: t.specialty, active: t.active });
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses', roles: DOCENTE,
    handler: request => {
      const t = teacherOf(request);
      return ok(request.store.sectionCourses.filter(sc => sc.active && sc.teacherId === t?.id).map(sc => courseSummary(request.store, sc)));
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId', roles: DOCENTE,
    handler: request => {
      const own = ownCourse(request);
      if (!own) return fail(404, 'Curso no encontrado.');
      return ok({ ...courseSummary(request.store, own.sc), description: request.store.courses.find(c => c.id === own.sc.courseId)?.description ?? null });
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/students', roles: DOCENTE,
    handler: request => {
      const own = ownCourse(request);
      if (!own) return fail(404, 'Curso no encontrado.');
      return ok(sectionStudents(request.store, own.sc.sectionId).map(s => ({ studentId: s.studentId, studentCode: s.studentCode, fullName: studentFullName(s), enrollmentId: s.enrollmentId! })));
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/attendance', roles: DOCENTE,
    handler: request => {
      const { store, query } = request;
      const own = ownCourse(request);
      if (!own) return fail(404, 'Curso no encontrado.');
      const date = query.date ?? limaDayOf(store.now());
      if (!isDay(date)) return fail(400, 'La fecha no es válida.', 'VALIDATION_ERROR');
      return ok(attendanceOfDay(store, own.sc, date));
    },
  },
  {
    method: 'PUT', pattern: '/v1/teacher/courses/:sectionCourseId/attendance/:scheduleId', roles: DOCENTE,
    handler: request => {
      const { store, query, params, body } = request;
      const own = ownCourse(request);
      if (!own || own.sc.scheduleId !== positiveInt(params.scheduleId)) return fail(404, 'La sesión no está disponible.');
      const date = query.date;
      if (!isDay(date) || !hasSession(store, date)) return fail(400, 'La fecha no tiene sesión.', 'VALIDATION_ERROR');
      const records = asObject(body).records;
      const enrolled = new Set(sectionStudents(store, own.sc.sectionId).map(s => s.enrollmentId));
      if (!Array.isArray(records) || records.some(r => !enrolled.has(asObject(r).enrollmentId as number) || !STATUSES.includes(asObject(r).status as TeacherAttendanceStatus))) {
        return fail(400, 'Selecciona un estado para cada estudiante de la sesión.', 'VALIDATION_ERROR');
      }
      saveAttendanceRecords(store, own.sc, date, records.map(r => ({ enrollmentId: asObject(r).enrollmentId as number, status: asObject(r).status as TeacherAttendanceStatus })));
      return ok(undefined, 204);
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters', roles: DOCENTE,
    handler: request => (ownCourse(request) ? ok(request.store.bimesters) : fail(404, 'Curso no encontrado.')),
  },
  {
    method: 'GET', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/criterion-grades', roles: DOCENTE,
    handler: request => {
      const own = ownCourse(request);
      const bimesterId = positiveInt(request.params.bimesterId);
      if (!own || !request.store.bimesters.some(b => b.id === bimesterId)) return fail(404, 'La planilla no está disponible.');
      return ok(manualSheet(request.store, own.sc, bimesterId!));
    },
  },
  {
    method: 'POST', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/criterion-grades', roles: DOCENTE,
    handler: request => {
      const { store, body } = request;
      const own = ownCourse(request);
      const bimester = store.bimesters.find(b => b.id === positiveInt(request.params.bimesterId));
      if (!own || !bimester) return fail(404, 'La planilla no está disponible.');
      if (bimester.status !== 'ABIERTO') return fail(409, 'El bimestre no admite registro de notas');
      const { enrollmentId, criterionId, grade } = asObject(body);
      const enrolled = sectionStudents(store, own.sc.sectionId).some(s => s.enrollmentId === enrollmentId);
      if (!enrolled || !activeManualCriteria(store, own.sc.courseId, bimester.academicPeriodId).some(c => c.id === criterionId) || !validGrade(grade)) return fail(400, 'Revisa la nota (0 a 20, máximo dos decimales).', 'VALIDATION_ERROR');
      if (store.criterionGrades.some(g => g.enrollmentId === enrollmentId && g.sectionCourseId === own.sc.id && g.bimesterId === bimester.id && g.criterionId === criterionId)) {
        return fail(409, 'la nota ya existe');
      }
      const saved = {
        id: store.nextId(), enrollmentId: enrollmentId as number, sectionCourseId: own.sc.id, bimesterId: bimester.id, criterionId: criterionId as number, grade,
        registeredByTeacherId: own.teacher.id, registeredAt: store.now().toISOString(), updatedAt: null,
      };
      store.criterionGrades.push(saved);
      return ok(saved, 201);
    },
  },
  {
    method: 'PATCH', pattern: '/v1/teacher/courses/:sectionCourseId/bimesters/:bimesterId/criterion-grades/:gradeId', roles: DOCENTE,
    handler: request => {
      const { store, body, params } = request;
      const own = ownCourse(request);
      const saved = store.criterionGrades.find(g => g.id === positiveInt(params.gradeId) && g.bimesterId === positiveInt(params.bimesterId) && g.sectionCourseId === own?.sc.id);
      if (!own || !saved) return fail(404, 'La nota no está disponible.');
      const { grade, expectedGrade } = asObject(body);
      if (!validGrade(grade)) return fail(400, 'Revisa la nota (0 a 20, máximo dos decimales).', 'VALIDATION_ERROR');
      if (expectedGrade !== saved.grade) return fail(409, 'la nota cambió desde la última consulta');
      Object.assign(saved, { grade, updatedAt: store.now().toISOString() });
      return ok(saved);
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/incidents', roles: DOCENTE,
    handler: request => {
      const { store, query } = request;
      const teacher = teacherOf(request);
      const paging = pageParams(query);
      if (!paging) return fail(400, 'Revisa los filtros del historial.', 'VALIDATION_ERROR');
      const list = store.incidents
        .filter(i => i.teacherId === teacher?.id && (query.severity === undefined || i.severity === query.severity)
          && (query.sectionId === undefined || i.sectionId === Number(query.sectionId))
          && (query.dateFrom === undefined || limaDayOf(new Date(i.occurredAt)) >= query.dateFrom)
          && (query.dateTo === undefined || limaDayOf(new Date(i.occurredAt)) <= query.dateTo))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      return ok(pageOf(list, paging.page, paging.size));
    },
  },
  {
    method: 'GET', pattern: '/v1/teacher/incidents/:incidentId', roles: DOCENTE,
    handler: request => {
      const incident = request.store.incidents.find(i => i.id === positiveInt(request.params.incidentId) && i.teacherId === teacherOf(request)?.id);
      return incident ? ok(incident) : fail(404, 'La incidencia no existe.');
    },
  },
  {
    method: 'POST', pattern: '/v1/teacher/incidents', roles: DOCENTE,
    handler: request => {
      const { store, body } = request;
      const teacher = teacherOf(request);
      const b = asObject(body);
      const sc = store.sectionCourses.find(x => x.id === b.sectionCourseId && x.teacherId === teacher?.id);
      const student = sc && sectionStudents(store, sc.sectionId).find(s => s.enrollmentId === b.enrollmentId);
      if (!teacher || !sc || !student) return fail(404, 'El curso o la matrícula no están disponibles.');
      const occurred = typeof b.occurredAt === 'string' ? Date.parse(b.occurredAt) : NaN;
      if (!Number.isFinite(occurred) || typeof b.location !== 'string' || !b.location.trim() || typeof b.description !== 'string' || !b.description.trim() || !SEVERITIES.includes(String(b.severity))) {
        return fail(400, 'Revisa los datos de la incidencia.', 'VALIDATION_ERROR');
      }
      const saved: IncidenciaResponse = {
        id: store.nextId(), sectionCourseId: sc.id, sectionId: sc.sectionId, enrollmentId: student.enrollmentId!, studentId: student.studentId,
        studentName: studentFullName(student), studentCode: student.studentCode, teacherId: teacher.id, teacherName: teacher.fullName,
        occurredAt: new Date(occurred).toISOString(), location: b.location.trim(), severity: b.severity as IncidenciaResponse['severity'],
        description: b.description.trim(), actionsTaken: typeof b.actionsTaken === 'string' && b.actionsTaken.trim() ? b.actionsTaken.trim() : null,
        createdAt: store.now().toISOString(),
      };
      store.incidents.push(saved);
      return ok(saved, 201, { location: `/api/v1/teacher/incidents/${saved.id}` });
    },
  },
];
