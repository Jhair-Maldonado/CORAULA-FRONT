// Lecturas académicas simuladas compartidas por gestión y docente: planilla, asistencia, resultados, actividades,
// horario, publicación y plazo de registro. Todas devuelven el DTO que valida el parser del service correspondiente.
import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';
import type { ScheduleResponse } from '@/types/scheduleApi';
import type { AcademicActivity, ActivityGrade, ActivityGradesSheetRow } from '@/types/teacherActivitiesApi';
import type { ManagementActivityGradesRow } from '@/types/managementActivitiesApi';
import type { EvaluationResultReason, EvaluationResultRow, EvaluationResultsResponse } from '@/types/evaluationResultsApi';
import type { GradeWindow } from '@/types/gradeWindowApi';
import type { Bimester } from '@/types/evaluationApi';
import {
  SCHOOL_DAYS, activeManualCriteria, addDays, attendanceId, attendanceStatus, hasSession, latestJustification, limaDayOf, sectionStudents, studentFullName,
  type MockScheduleBlock, type MockSectionCourse, type MockStore,
} from './shared';

/** Planilla de notas MANUAL de un curso y bimestre (CriterionGradesSheetResponse). */
export function manualSheet(store: MockStore, sc: MockSectionCourse, bimesterId: number) {
  const bimester = store.bimesters.find(b => b.id === bimesterId)!;
  const criteria = activeManualCriteria(store, sc.courseId, bimester.academicPeriodId).map(({ id, name, description, order }) => ({ id, courseId: sc.courseId, academicPeriodId: bimester.academicPeriodId, name, description, order, type: 'MANUAL' as const, active: true }));
  const students = sectionStudents(store, sc.sectionId).map(s => ({
    enrollmentId: s.enrollmentId!, studentId: s.studentId, fullName: studentFullName(s),
    grades: criteria.map(c => {
      const g = store.criterionGrades.find(x => x.enrollmentId === s.enrollmentId && x.sectionCourseId === sc.id && x.bimesterId === bimesterId && x.criterionId === c.id);
      return { criterionId: c.id, gradeId: g?.id ?? null, grade: g?.grade ?? null, registeredAt: g?.registeredAt ?? null, updatedAt: g?.updatedAt ?? null };
    }),
  }));
  return { courseId: sc.courseId, sectionCourseId: sc.id, academicPeriodId: bimester.academicPeriodId, bimester, criteria, students, gradeWindow: null };
}

/** Sesión de asistencia del curso (TeacherAttendanceSessionResponse). */
export function attendanceSession(store: MockStore, sc: MockSectionCourse, date: string) {
  const students = sectionStudents(store, sc.sectionId).map(s => {
    const status = attendanceStatus(store, sc, s.enrollmentId!, date);
    const id = status ? attendanceId(sc, s.enrollmentId!, date) : null;
    // Estado de la justificación vigente (BACK #139): solo existe sobre una asistencia ya registrada.
    const justificationStatus = id === null ? null : latestJustification(store, id)?.status ?? null;
    return { enrollmentId: s.enrollmentId!, studentId: s.studentId, studentCode: s.studentCode, fullName: studentFullName(s), attendanceId: id, status, justificationStatus };
  });
  const count = (st: TeacherAttendanceStatus | null) => students.filter(s => s.status === st).length;
  return {
    scheduleId: sc.scheduleId, startTime: sc.startTime, endTime: sc.endTime, classroom: sc.classroom, totalStudents: students.length,
    presentCount: count('PRESENTE'), lateCount: count('TARDANZA'), absenceCount: count('INASISTENCIA'), pendingCount: count(null), students,
  };
}

/** Asistencia del día de un curso (TeacherAttendanceResponse): sin sesiones los días sin clase. */
export function attendanceOfDay(store: MockStore, sc: MockSectionCourse, date: string) {
  const course = store.courses.find(c => c.id === sc.courseId)!;
  const section = store.sections.find(s => s.id === sc.sectionId)!;
  const sessions = hasSession(store, date) ? [attendanceSession(store, sc, date)] : [];
  return { sectionCourseId: sc.id, courseName: course.name, grade: section.grade, sectionName: section.name, date, sessions };
}

/** Guarda en memoria los estados de una sesión de asistencia. */
export function saveAttendanceRecords(store: MockStore, sc: MockSectionCourse, date: string, records: { enrollmentId: number; status: TeacherAttendanceStatus }[]): void {
  const key = `${sc.scheduleId}|${date}`;
  const saved = new Map(store.attendance.get(key));
  for (const r of records) saved.set(r.enrollmentId, r.status);
  store.attendance.set(key, saved);
}

/** Vista de un bloque (ScheduleResponse): el curso, el docente y la sección se leen del curso de sección vigente. */
export function scheduleView(store: MockStore, block: MockScheduleBlock): ScheduleResponse {
  const sc = store.sectionCourses.find(x => x.id === block.sectionCourseId)!;
  const course = store.courses.find(c => c.id === sc.courseId)!;
  const teacher = store.teachers.find(t => t.id === sc.teacherId);
  return {
    id: block.id, sectionCourseId: sc.id, sectionId: sc.sectionId, courseId: course.id, courseName: course.name, teacherId: teacher?.id ?? null,
    teacherName: teacher?.fullName ?? null, day: block.day, startTime: block.startTime, endTime: block.endTime, classroom: block.classroom,
  };
}

/**
 * Bloques activos del horario de una sección (ScheduleResponse), ordenados por día y hora. Los bloques viven en el store:
 * se siembran con un bloque de lunes a viernes por curso y las escrituras de /schedules los crean, mueven o eliminan.
 * NOTA: la asistencia no lee estos bloques. El mock modela una sola sesión diaria por curso y la identifica con el
 * scheduleId del curso de sección (ver attendanceSession); por eso mover un bloque no cambia la hora de la asistencia.
 */
export function scheduleBlocks(store: MockStore, sectionId: number): ScheduleResponse[] {
  return store.scheduleBlocks
    .filter(b => b.active && store.sectionCourses.some(sc => sc.id === b.sectionCourseId && sc.active && sc.sectionId === sectionId))
    .map(b => scheduleView(store, b))
    .sort((a, b) => SCHOOL_DAYS.indexOf(a.day) - SCHOOL_DAYS.indexOf(b.day) || a.startTime.localeCompare(b.startTime) || a.id - b.id);
}

// ---------- Actividades ----------

const round = (value: number, decimals: number) => Math.round(value * 10 ** decimals) / 10 ** decimals;
const day = (iso: string) => iso.slice(0, 10);

export const activitiesOf = (store: MockStore, sectionCourseId: number, bimesterId: number): AcademicActivity[] =>
  store.activities.filter(a => a.sectionCourseId === sectionCourseId && a.bimesterId === bimesterId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id);

/** La matrícula cuenta para PA en la actividad si existía al publicarla. */
const eligible = (activity: AcademicActivity, enrollmentDate: string | null) =>
  activity.status === 'PUBLICADA' && activity.publishedAt !== null && (enrollmentDate ?? '') <= day(activity.publishedAt);

/** Promedio de PA (un decimal) de una matrícula: actividades publicadas que cuentan para PA y tienen nota. */
function participation(store: MockStore, sc: MockSectionCourse, bimesterId: number, enrollmentId: number, enrollmentDate: string | null) {
  const assigned = activitiesOf(store, sc.id, bimesterId).filter(a => a.cuentaParaPa && eligible(a, enrollmentDate));
  const grades = assigned.flatMap(a => store.activityGrades.filter(g => g.activityId === a.id && g.enrollmentId === enrollmentId));
  return {
    pa: grades.length ? round(grades.reduce((n, g) => n + g.grade, 0) / grades.length, 1) : null,
    assignedActivities: assigned.length, gradedActivities: grades.length,
  };
}

export const gradeOf = (store: MockStore, activityId: number, enrollmentId: number): ActivityGrade | null =>
  store.activityGrades.find(g => g.activityId === activityId && g.enrollmentId === enrollmentId) ?? null;

/** Planilla de una actividad para el docente (ActivityGradesSheet). */
export function activitySheet(store: MockStore, sc: MockSectionCourse, bimester: Bimester, activity: AcademicActivity) {
  const students: ActivityGradesSheetRow[] = sectionStudents(store, sc.sectionId).map(s => ({
    enrollmentId: s.enrollmentId!, studentId: s.studentId, fullName: studentFullName(s), eligibleForPa: activity.cuentaParaPa && eligible(activity, s.enrollmentDate),
    grade: gradeOf(store, activity.id, s.enrollmentId!), ...participation(store, sc, bimester.id, s.enrollmentId!, s.enrollmentDate),
  }));
  return { activity, bimester, students };
}

/** Planilla de una actividad para gestión (ManagementActivityGradesSheet): sin PA, con el docente que registró. */
export function managementActivitySheet(store: MockStore, sc: MockSectionCourse, bimester: Bimester, activity: AcademicActivity) {
  const students: ManagementActivityGradesRow[] = sectionStudents(store, sc.sectionId).map(s => {
    const g = gradeOf(store, activity.id, s.enrollmentId!);
    return {
      enrollmentId: s.enrollmentId!, studentId: s.studentId, studentCode: s.studentCode, fullName: studentFullName(s), gradeId: g?.id ?? null, grade: g?.grade ?? null,
      version: g?.version ?? null, registeredByTeacherId: g?.registeredByTeacherId ?? null,
      registeredByTeacherName: g ? store.teachers.find(t => t.id === g.registeredByTeacherId)?.fullName ?? null : null,
      registeredAt: g?.registeredAt ?? null, updatedAt: g?.updatedAt ?? null,
    };
  });
  return { activity, bimester, students };
}

// ---------- Resultados del bimestre (#45) ----------

/**
 * Resultados calculados de un curso. Los cursos del mock tienen dos criterios MANUAL y ninguno de participación, así que
 * el cálculo real (mínimo 5 criterios MANUAL) los deja pendientes: no hay nota final y se explica el motivo, como el backend.
 */
export function evaluationResults(store: MockStore, sc: MockSectionCourse, bimesterId: number): EvaluationResultsResponse {
  const criteria = activeManualCriteria(store, sc.courseId, store.bimesters.find(b => b.id === bimesterId)!.academicPeriodId);
  const course = store.courses.find(c => c.id === sc.courseId)!;
  const areas = [...new Set(store.courses.map(c => c.area))];
  const students = sectionStudents(store, sc.sectionId).map((s): EvaluationResultRow => {
    const manual = criteria.map(c => store.criterionGrades.find(g => g.enrollmentId === s.enrollmentId && g.sectionCourseId === sc.id && g.bimesterId === bimesterId && g.criterionId === c.id)?.grade ?? null);
    const missing = criteria.filter((_, i) => manual[i] === null).map(c => `MISSING_MANUAL_GRADE:${c.id}` as EvaluationResultReason);
    const { pa } = participation(store, sc, bimesterId, s.enrollmentId!, s.enrollmentDate);
    const reasons: EvaluationResultReason[] = ['INSUFFICIENT_MANUAL_CRITERIA', ...(pa === null ? ['PA_UNAVAILABLE' as const] : []), ...missing, 'AREA_INCOMPLETE'];
    const indicator = missing.length ? null : round(manual.reduce<number>((n, g) => n + (g ?? 0), 0) / manual.length, 2);
    return {
      enrollmentId: s.enrollmentId!, studentId: s.studentId, fullName: studentFullName(s), pa, criteriaIndicator: indicator,
      courseGrade: null, courseApproved: null, areaGrade: null, areaApproved: null, reasons,
      // El parser exige estos objetos y no los conserva.
      courseEvidence: { manualCriteria: criteria.length }, areaEvidence: { area: course.area },
    } as EvaluationResultRow;
  });
  return { sectionCourseId: sc.id, bimesterId, areaId: areas.indexOf(course.area) + 1, students };
}

// ---------- Publicación y plazo de registro ----------

/** Estado de publicación del bimestre (BimesterPublicationView): publicado, o preparación pendiente de registro. */
export function publicationView(store: MockStore, bimester: Bimester) {
  const publication = store.publications.find(p => p.bimesterId === bimester.id);
  if (publication) {
    return { bimesterId: bimester.id, status: 'CERRADO' as const, publishedAt: publication.publishedAt, revision: publication.revision, preparationRevision: null, courses: [], details: [] };
  }
  const courses = store.sectionCourses.filter(sc => sc.active).map(sc => ({
    sectionCourseId: sc.id, applicable: sectionStudents(store, sc.sectionId).length > 0, registered: false, registeredAt: null,
  }));
  return {
    bimesterId: bimester.id, status: bimester.status, publishedAt: null, revision: 0, preparationRevision: `mock-preparacion-${bimester.id}`, courses,
    details: courses.filter(c => c.applicable).map(c => ({ sectionCourseId: c.sectionCourseId, enrollmentId: null, reasons: ['COURSE_NOT_REGISTERED'] })),
  };
}

/** Registro del curso en el bimestre (TeacherCourseRegistration). Publicado ⇔ revisión ≥ 1. */
export function registrationView(store: MockStore, sc: MockSectionCourse, bimester: Bimester) {
  const publication = store.publications.find(p => p.bimesterId === bimester.id);
  const applicable = sectionStudents(store, sc.sectionId).length > 0;
  return {
    sectionCourseId: sc.id, bimesterId: bimester.id, status: bimester.status, applicable, registered: !!publication && applicable,
    registeredAt: publication && applicable ? publication.publishedAt : null, publishedAt: publication?.publishedAt ?? null, revision: publication?.revision ?? 0,
  };
}

/** Plazo de registro de notas (GradeWindow): la fecha de registro es el fin del bimestre y el plazo, 7 días después. */
export function gradeWindow(store: MockStore, bimester: Bimester): GradeWindow {
  const deadline = addDays(bimester.endDate, 7);
  return {
    bimesterId: bimester.id, registrationDate: bimester.endDate, registrationDateConfigured: false, extendedDeadline: null, deadline,
    expired: limaDayOf(store.now()) > deadline, timeZone: 'America/Lima',
  };
}
