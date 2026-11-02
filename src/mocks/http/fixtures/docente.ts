// Rutas simuladas del docente (/v1/teacher). El docente de la sesión es el de docente@demo.local.
import type { IncidenciaResponse } from '@/types/incidenciasApi';
import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';
import { asObject, fail, ok, pageOf, pageParams, positiveInt, type MockRequest, type MockRoute } from '../mockHttp';
import {
  attendanceId, attendanceStatus, criteriaFor, hasSession, limaDayOf, sectionStudents, studentFullName,
  type MockSectionCourse, type MockStore, type MockTeacher,
} from './shared';

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

function sheet(store: MockStore, sc: MockSectionCourse, bimesterId: number) {
  const bimester = store.bimesters.find(b => b.id === bimesterId)!;
  const criteria = criteriaFor(sc.courseId).map(c => ({ id: c.id, courseId: sc.courseId, academicPeriodId: bimester.academicPeriodId, name: c.name, description: null, order: c.order, type: 'MANUAL' as const, active: true }));
  const students = sectionStudents(store, sc.sectionId).map(s => ({
    enrollmentId: s.enrollmentId!, studentId: s.studentId, fullName: studentFullName(s),
    grades: criteria.map(c => {
      const g = store.criterionGrades.find(x => x.enrollmentId === s.enrollmentId && x.sectionCourseId === sc.id && x.bimesterId === bimesterId && x.criterionId === c.id);
      return { criterionId: c.id, gradeId: g?.id ?? null, grade: g?.grade ?? null, registeredAt: g?.registeredAt ?? null, updatedAt: g?.updatedAt ?? null };
    }),
  }));
  return { courseId: sc.courseId, sectionCourseId: sc.id, academicPeriodId: bimester.academicPeriodId, bimester, criteria, students, gradeWindow: null };
}

const validGrade = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 20 && Math.abs(v * 100 - Math.round(v * 100)) < 1e-8;

export const docenteRoutes: MockRoute[] = [
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
      const course = store.courses.find(c => c.id === own.sc.courseId)!;
      const section = store.sections.find(s => s.id === own.sc.sectionId)!;
      const sessions = !hasSession(store, date) ? [] : [own.sc].map(sc => {
        const students = sectionStudents(store, sc.sectionId).map(s => {
          const status = attendanceStatus(store, sc, s.enrollmentId!, date);
          return { enrollmentId: s.enrollmentId!, studentId: s.studentId, studentCode: s.studentCode, fullName: studentFullName(s), attendanceId: status ? attendanceId(sc, s.enrollmentId!, date) : null, status };
        });
        const count = (st: TeacherAttendanceStatus | null) => students.filter(s => s.status === st).length;
        return {
          scheduleId: sc.scheduleId, startTime: sc.startTime, endTime: sc.endTime, classroom: sc.classroom, totalStudents: students.length,
          presentCount: count('PRESENTE'), lateCount: count('TARDANZA'), absenceCount: count('INASISTENCIA'), pendingCount: count(null), students,
        };
      });
      return ok({ sectionCourseId: own.sc.id, courseName: course.name, grade: section.grade, sectionName: section.name, date, sessions });
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
      const key = `${own.sc.scheduleId}|${date}`;
      const saved = new Map(store.attendance.get(key));
      for (const r of records) saved.set(asObject(r).enrollmentId as number, asObject(r).status as TeacherAttendanceStatus);
      store.attendance.set(key, saved);
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
      return ok(sheet(request.store, own.sc, bimesterId!));
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
      if (!enrolled || !criteriaFor(own.sc.courseId).some(c => c.id === criterionId) || !validGrade(grade)) return fail(400, 'Revisa la nota (0 a 20, máximo dos decimales).', 'VALIDATION_ERROR');
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
