// Datos sintéticos del modo MOCK, compartidos por los portales: el mismo alumno aparece en gestión, docente y apoderado.
// Solo se cargan con NEXT_PUBLIC_APP_MODE=MOCK (ver src/services/httpClient.ts). Nombres y documentos inventados.
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import type { Bimester } from '@/types/evaluationApi';
import type { SectionResponse } from '@/types/sectionApi';
import type { CourseResponse } from '@/types/courseApi';
import type { GuardianSummaryResponse, StudentDetailResponse } from '@/types/studentApi';
import type { TeacherResponse } from '@/types/teacherApi';
import type { SchoolDay } from '@/types/scheduleApi';
import type { IncidenciaResponse } from '@/types/incidenciasApi';
import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';
import type { AttendanceJustification } from '@/types/guardianJustificationsApi';
import type { AcademicActivity, ActivityGrade } from '@/types/teacherActivitiesApi';
import type { ActivityGradeHistoryEntry } from '@/types/managementActivitiesApi';
import type { ClassMaterial } from '@/types/teacherMaterialsApi';
import type { StaffAccountSummary } from '@/types/staffAccountApi';
import type { AuditDetailResponse } from '@/types/auditApi';

/** `accountActive`: estado de la cuenta de acceso, independiente de `active` (el docente). */
export interface MockTeacher extends TeacherResponse { personId: number; email: string | null; accountActive: boolean }

export interface MockSectionCourse {
  id: number;
  sectionId: number;
  courseId: number;
  teacherId: number | null;
  active: boolean;
  scheduleId: number;
  startTime: string;
  endTime: string;
  classroom: string | null;
}

export const SCHOOL_DAYS: readonly SchoolDay[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];

/** Bloque del horario semanal de un curso de sección (GET /sections/{id}/schedule y POST/PATCH/DELETE /schedules). */
export interface MockScheduleBlock {
  id: number;
  sectionCourseId: number;
  day: SchoolDay;
  startTime: string;
  endTime: string;
  classroom: string | null;
  active: boolean;
}

/** Criterio de evaluación de un curso y periodo (EvaluationCriterion). Los lectores de gestión, docente y apoderado lo leen del store. */
export interface MockCriterion {
  id: number;
  courseId: number;
  academicPeriodId: number;
  name: string;
  description: string | null;
  order: number;
  type: 'MANUAL' | 'PARTICIPACION_ACADEMICA';
  active: boolean;
}

export interface MockCriterionGrade {
  id: number;
  enrollmentId: number;
  sectionCourseId: number;
  bimesterId: number;
  criterionId: number;
  grade: number;
  registeredByTeacherId: number;
  registeredAt: string;
  updatedAt: string | null;
}

/** Publicación de libretas. `enrollmentIds` es la foto de matrículas al publicar: quien se matricula después no tiene libreta de ese bimestre. */
export interface MockPublication { bimesterId: number; publishedAt: string; revision: number; enrollmentIds: number[] }

export interface MockStore {
  nextId(): number;
  now(): Date;
  periods: AcademicPeriod[];
  bimesters: Bimester[];
  sections: SectionResponse[];
  courses: CourseResponse[];
  teachers: MockTeacher[];
  sectionCourses: MockSectionCourse[];
  /** Bloques del horario: se siembran desde los cursos y las escrituras de /schedules los modifican (ver scheduleBlocks). */
  scheduleBlocks: MockScheduleBlock[];
  /** Criterios de evaluación: se siembran con `criteriaFor` y las escrituras de /evaluation-criteria los modifican. */
  criteria: MockCriterion[];
  students: StudentDetailResponse[];
  /** Hijos vinculados a padre@demo.local. */
  guardianStudentIds: number[];
  /** Asistencia guardada por el docente: clave `${scheduleId}|${fecha}` → enrollmentId → estado. */
  attendance: Map<string, Map<number, TeacherAttendanceStatus>>;
  criterionGrades: MockCriterionGrade[];
  incidents: IncidenciaResponse[];
  publications: MockPublication[];
  justifications: AttendanceJustification[];
  /** Actividades académicas por curso y bimestre (portal docente y lectura de gestión). */
  activities: AcademicActivity[];
  activityGrades: ActivityGrade[];
  activityGradeHistory: ActivityGradeHistoryEntry[];
  materials: ClassMaterial[];
  /** Cuentas de Secretaría (DIRECTIVO). */
  staff: StaffAccountSummary[];
  audit: AuditDetailResponse[];
}

export const LIMA_OFFSET = '-05:00';
const DAY_MS = 86_400_000;

/** Día actual en America/Lima (YYYY-MM-DD). */
export function limaDayOf(date: Date): string {
  return new Date(date.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function isWeekday(day: string): boolean {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

export function dayIndex(day: string): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse('2026-01-01T00:00:00Z')) / DAY_MS);
}

/** Regla de siembra: dos criterios MANUAL por curso, con ids derivados del curso. Después de sembrar, se leen del store. */
export function criteriaFor(courseId: number): { id: number; name: string; order: number }[] {
  return [
    { id: courseId * 10 + 1, name: 'Desempeño en clase', order: 1 },
    { id: courseId * 10 + 2, name: 'Evaluación escrita', order: 2 },
  ];
}

/** Criterios MANUAL activos del curso en el periodo, por orden: son las columnas de la planilla y de los resultados. */
export function activeManualCriteria(store: MockStore, courseId: number, academicPeriodId: number): MockCriterion[] {
  return store.criteria.filter(c => c.courseId === courseId && c.academicPeriodId === academicPeriodId && c.type === 'MANUAL' && c.active)
    .sort((a, b) => a.order - b.order);
}

export const studentFullName = (s: Pick<StudentDetailResponse, 'firstNames' | 'paternalLastName' | 'maternalLastName'>) =>
  [s.firstNames, s.paternalLastName, s.maternalLastName].filter(Boolean).join(' ');

const PERIOD: AcademicPeriod = { id: 1, name: 'Año escolar 2026', startDate: '2026-03-02', endDate: '2026-12-18', active: true, current: true };

const BIMESTERS: Bimester[] = [
  { id: 11, academicPeriodId: 1, number: 1, name: 'I Bimestre', startDate: '2026-03-02', endDate: '2026-05-08', status: 'CERRADO' },
  { id: 12, academicPeriodId: 1, number: 2, name: 'II Bimestre', startDate: '2026-05-18', endDate: '2026-07-17', status: 'CERRADO' },
  { id: 13, academicPeriodId: 1, number: 3, name: 'III Bimestre', startDate: '2026-08-03', endDate: '2026-10-02', status: 'CERRADO' },
  { id: 14, academicPeriodId: 1, number: 4, name: 'IV Bimestre', startDate: '2026-10-12', endDate: '2026-12-18', status: 'ABIERTO' },
];

const SECTIONS: SectionResponse[] = [
  { id: 10, academicPeriodId: 1, level: 'PRIMARY', grade: 5, name: 'A', maxCapacity: 30, enrollmentOpen: true, active: true },
  { id: 11, academicPeriodId: 1, level: 'PRIMARY', grade: 5, name: 'B', maxCapacity: 30, enrollmentOpen: true, active: true },
  { id: 12, academicPeriodId: 1, level: 'SECONDARY', grade: 1, name: 'A', maxCapacity: 35, enrollmentOpen: false, active: true },
];

const COURSES: CourseResponse[] = [
  { id: 101, code: 'MAT-P5', name: 'Matemática', level: 'PRIMARY', area: 'Matemática', weeklyHours: 6, description: 'Desarrolla el razonamiento lógico con números, geometría y resolución de problemas cotidianos.', active: true },
  { id: 102, code: 'COM-P5', name: 'Comunicación', level: 'PRIMARY', area: 'Comunicación', weeklyHours: 5, description: null, active: true },
  { id: 103, code: 'CYT-P5', name: 'Ciencia y Tecnología', level: 'PRIMARY', area: 'Ciencia y Tecnología', weeklyHours: 4, description: 'Explora fenómenos naturales mediante la observación, la indagación y experimentos sencillos.', active: true },
  { id: 104, code: 'MAT-S1', name: 'Matemática', level: 'SECONDARY', area: 'Matemática', weeklyHours: 6, description: null, active: true },
  { id: 105, code: 'COM-S1', name: 'Comunicación', level: 'SECONDARY', area: 'Comunicación', weeklyHours: 5, description: null, active: true },
];

const TEACHERS: MockTeacher[] = [
  { id: 201, personId: 901, dni: '40000001', firstNames: 'Rosa', paternalLastName: 'Quispe', maternalLastName: 'Demo', fullName: 'Rosa Quispe Demo', phone: '900000001', specialty: 'Matemática', active: true, email: 'docente@demo.local', accountActive: true },
  { id: 202, personId: 902, dni: '40000002', firstNames: 'Carlos', paternalLastName: 'Huamán', maternalLastName: 'Demo', fullName: 'Carlos Huamán Demo', phone: null, specialty: 'Ciencias', active: true, email: null, accountActive: true },
];

const SECTION_COURSES: MockSectionCourse[] = [
  { id: 301, sectionId: 10, courseId: 101, teacherId: 201, active: true, scheduleId: 401, startTime: '08:00', endTime: '09:30', classroom: 'Aula 5A' },
  { id: 302, sectionId: 10, courseId: 102, teacherId: 201, active: true, scheduleId: 402, startTime: '09:45', endTime: '11:15', classroom: 'Aula 5A' },
  { id: 303, sectionId: 10, courseId: 103, teacherId: 202, active: true, scheduleId: 403, startTime: '11:30', endTime: '13:00', classroom: 'Laboratorio' },
  { id: 304, sectionId: 12, courseId: 104, teacherId: 202, active: true, scheduleId: 404, startTime: '08:00', endTime: '09:30', classroom: 'Aula 1S' },
  { id: 305, sectionId: 12, courseId: 105, teacherId: null, active: true, scheduleId: 405, startTime: '09:45', endTime: '11:15', classroom: null },
];

const PADRE: GuardianSummaryResponse = {
  guardianId: 801, personId: 951, dni: '41000001', firstNames: 'Elena', paternalLastName: 'Arias', maternalLastName: 'Demo',
  phone: '900000101', relationship: 'MOTHER', primary: true, authorizedPickup: true, active: true,
};

function student(
  studentId: number, firstNames: string, paternalLastName: string, sectionId: number, enrollmentId: number, guardians: GuardianSummaryResponse[] = [],
  enrollmentDate = '2026-02-20', phone: string | null = null,
): StudentDetailResponse {
  const section = SECTIONS.find(s => s.id === sectionId)!;
  return {
    studentId, personId: 1000 + studentId, studentCode: `C26${String(studentId).padStart(6, '0')}`, dni: `7${String(studentId).padStart(7, '0')}`,
    firstNames, paternalLastName, maternalLastName: 'Demo', birthDate: section.level === 'PRIMARY' ? '2016-04-12' : '2013-09-03',
    studentStatus: 'ACTIVE', enrollmentId, enrollmentStatus: 'ACTIVE', academicPeriodId: 1, academicPeriodName: PERIOD.name,
    sectionId, level: section.level, grade: section.grade, sectionName: section.name, phone, enrollmentDate, guardians,
  };
}

// Libreta de Ana (57) en el III Bimestre: notas menores que 11 (Matemática 9; Comunicación 10,50) y un criterio
// sin nota (Ciencia y Tecnología). Solo cambia ese alumno y ese bimestre; el resto usa la fórmula general.
const ANA_III_BIMESTRE: Readonly<Record<number, readonly (number | null)[]>> = { 101: [8, 10], 102: [10, 11], 103: [14, null] };

function seedGrades(students: StudentDetailResponse[], sectionCourses: MockSectionCourse[], nextId: () => number): MockCriterionGrade[] {
  const grades: MockCriterionGrade[] = [];
  for (const bimester of BIMESTERS.filter(b => b.status === 'CERRADO')) {
    for (const s of students) {
      // Quien se matriculó después del cierre del bimestre no tiene notas de ese bimestre.
      if ((s.enrollmentDate ?? '') > bimester.endDate) continue;
      for (const sc of sectionCourses.filter(x => x.sectionId === s.sectionId)) {
        for (const criterion of criteriaFor(sc.courseId)) {
          // Una nota sin registrar para mostrar «Sin nota» en la libreta.
          if (s.studentId === 58 && sc.courseId === 105 && criterion.order === 2 && bimester.number === 3) continue;
          const override = s.studentId === 57 && bimester.number === 3 ? ANA_III_BIMESTRE[sc.courseId]?.[criterion.order - 1] : undefined;
          if (override === null) continue;
          grades.push({
            id: nextId(), enrollmentId: s.enrollmentId!, sectionCourseId: sc.id, bimesterId: bimester.id, criterionId: criterion.id,
            grade: override ?? 11 + ((s.studentId + criterion.id + bimester.number * 3) % 9), registeredByTeacherId: sc.teacherId ?? 202,
            registeredAt: `${bimester.endDate}T15:00:00Z`, updatedAt: null,
          });
        }
      }
    }
  }
  return grades;
}

/** Matrículas existentes al día de una fecha: la foto que guarda cada publicación. */
export function enrolledAt(students: StudentDetailResponse[], isoDate: string): number[] {
  return students.filter(s => s.enrollmentId !== null && (s.enrollmentDate ?? '') <= isoDate.slice(0, 10)).map(s => s.enrollmentId!);
}

/** Estado nuevo e independiente: cada sesión del navegador (o cada test) parte de los mismos datos. */
/** Un bloque por día de lunes a viernes por curso, con el horario del curso; id = scheduleId * 10 + día (1 a 5). */
function seedScheduleBlocks(sectionCourses: MockSectionCourse[]): MockScheduleBlock[] {
  const weekly = sectionCourses.filter(sc => sc.active).flatMap(sc => SCHOOL_DAYS.map((day, i) => ({
    id: sc.scheduleId * 10 + i + 1, sectionCourseId: sc.id, day, startTime: sc.startTime, endTime: sc.endTime, classroom: sc.classroom, active: true,
  })));
  // NOTA: bloques sueltos de 45 y 90 min en la sección 12 para ver la grilla con duraciones distintas; no chocan con docente, sección ni aula.
  const extra: MockScheduleBlock[] = [
    { id: 4061, sectionCourseId: 304, day: 'MIERCOLES', startTime: '13:00', endTime: '13:45', classroom: 'Aula 1S', active: true },
    { id: 4062, sectionCourseId: 305, day: 'JUEVES', startTime: '14:00', endTime: '14:45', classroom: null, active: true },
    { id: 4063, sectionCourseId: 305, day: 'VIERNES', startTime: '15:00', endTime: '16:30', classroom: 'Aula 1S', active: true },
  ];
  return [...weekly, ...extra];
}

export function createMockStore(now: () => Date = () => new Date()): MockStore {
  let id = 10_000;
  const nextId = () => ++id;
  const students = [
    student(57, 'Ana', 'Arias', 10, 501, [PADRE], '2026-02-20', '900000157'),
    student(58, 'Luis', 'Arias', 12, 502, [PADRE]),
    student(59, 'María', 'Torres', 10, 503),
    student(60, 'Jorge', 'Salas', 10, 504),
    // Hermana matriculada después de la última publicación: vinculada al apoderado pero sin libreta publicada.
    student(61, 'Sofía', 'Arias', 10, 505, [PADRE], '2026-10-20'),
  ];
  const sectionCourses = SECTION_COURSES.map(sc => ({ ...sc }));
  const today = limaDayOf(now());
  const incident = (daysAgo: number, time: string, over: Partial<IncidenciaResponse>): IncidenciaResponse => {
    const occurredAt = new Date(`${addDays(today, -daysAgo)}T${time}:00${LIMA_OFFSET}`).toISOString();
    return {
      id: nextId(), sectionCourseId: 301, sectionId: 10, enrollmentId: 501, studentId: 57, studentName: 'Ana Arias Demo', studentCode: 'C26000057',
      teacherId: 201, teacherName: 'Rosa Quispe Demo', occurredAt, location: 'Aula 5A', severity: 'LEVE', description: '',
      actionsTaken: null, createdAt: occurredAt, ...over,
    };
  };
  const store: MockStore = {
    nextId,
    now,
    periods: [{ ...PERIOD }],
    bimesters: BIMESTERS.map(b => ({ ...b })),
    sections: SECTIONS.map(s => ({ ...s })),
    courses: COURSES.map(c => ({ ...c })),
    teachers: TEACHERS.map(t => ({ ...t })),
    sectionCourses,
    scheduleBlocks: seedScheduleBlocks(sectionCourses),
    criteria: COURSES.flatMap(c => criteriaFor(c.id).map(k => ({
      id: k.id, courseId: c.id, academicPeriodId: PERIOD.id, name: k.name, description: null, order: k.order, type: 'MANUAL' as const, active: true,
    }))),
    students,
    guardianStudentIds: [57, 58, 61],
    attendance: new Map(),
    criterionGrades: seedGrades(students, sectionCourses, nextId),
    incidents: [
      incident(3, '10:05', { severity: 'LEVE', description: 'Llegó sin el material de trabajo solicitado.', actionsTaken: 'Se conversó con la estudiante.' }),
      incident(12, '11:40', { sectionCourseId: 302, severity: 'MODERADA', location: 'Patio', description: 'Discusión con un compañero durante el recreo.' }),
      incident(6, '09:15', { enrollmentId: 504, studentId: 60, studentName: 'Jorge Salas Demo', studentCode: 'C26000060', severity: 'LEVE', description: 'Uso del celular en clase.' }),
    ],
    publications: [
      { bimesterId: 11, publishedAt: '2026-05-15T10:00:00-05:00', revision: 1 },
      { bimesterId: 12, publishedAt: '2026-07-24T10:00:00-05:00', revision: 2 },
      { bimesterId: 13, publishedAt: '2026-10-09T10:00:00-05:00', revision: 1 },
    ].map(p => ({ ...p, enrollmentIds: enrolledAt(students, p.publishedAt) })),
    justifications: [],
    activities: [],
    activityGrades: [],
    activityGradeHistory: [],
    materials: [],
    staff: STAFF.map(a => ({ ...a })),
    audit: [],
  };
  store.justifications = seedJustifications(store);
  seedActivities(store);
  store.materials = seedMaterials(store);
  store.audit = seedAudit(store);
  return store;
}

const STAFF: StaffAccountSummary[] = [
  { userId: 950, personId: 960, dni: '42000001', fullName: 'Marta Rojas Demo', email: 'secretaria@demo.local', active: true },
  { userId: 951, personId: null, dni: null, fullName: null, email: 'direccion@demo.local', active: true },
  { userId: 952, personId: 962, dni: '42000002', fullName: 'Pedro Vega Demo', email: 'pedro.vega@demo.local', active: false },
];

/** Cuenta de usuario simulada del docente: 700 + id del docente (la misma que usa la ficha de gestión). */
export const teacherUserId = (teacherId: number) => 700 + teacherId;

/**
 * Actividades del IV Bimestre de Matemática (301) y Comunicación (302) de 5.º A. La sección 10 incluye a Sofía (61),
 * matriculada después de publicar la actividad «Práctica de fracciones»: no es elegible para PA en ella.
 */
function seedActivities(store: MockStore): void {
  const base = { createdByTeacherId: 201, bimesterId: 14, updatedAt: null, annulledAt: null, annulledByUserId: null, annulmentReason: null };
  const published = '2026-10-15T15:00:00Z';
  const practica = { ...base, id: store.nextId(), sectionCourseId: 301, title: 'Práctica de fracciones', description: 'Ejercicios 1 al 10 del cuaderno de trabajo.', type: 'PRACTICA', cuentaParaPa: true, status: 'PUBLICADA', createdAt: '2026-10-14T15:00:00Z', publishedAt: published } as AcademicActivity;
  const tarea = { ...base, id: store.nextId(), sectionCourseId: 301, title: 'Tarea de geometría', description: null, type: 'TAREA', cuentaParaPa: false, status: 'PLANIFICADA', createdAt: '2026-10-22T15:00:00Z', publishedAt: null } as AcademicActivity;
  const examen = {
    ...base, id: store.nextId(), sectionCourseId: 301, title: 'Examen de repaso', description: null, type: 'EXAMEN', cuentaParaPa: true, status: 'ANULADA',
    createdAt: '2026-10-16T15:00:00Z', publishedAt: '2026-10-16T16:00:00Z', annulledAt: '2026-10-20T15:00:00Z', annulledByUserId: teacherUserId(201), annulmentReason: 'Se reprogramó la evaluación.',
  } as AcademicActivity;
  const lectura = { ...base, id: store.nextId(), sectionCourseId: 302, title: 'Comprensión de lectura', description: null, type: 'TAREA', cuentaParaPa: true, status: 'PUBLICADA', createdAt: '2026-10-14T16:00:00Z', publishedAt: published } as AcademicActivity;
  store.activities = [practica, tarea, examen, lectura];
  const grade = (activity: AcademicActivity, enrollmentId: number, value: number, version = 1): ActivityGrade => ({
    id: store.nextId(), activityId: activity.id, enrollmentId, grade: value, registeredByTeacherId: 201, registeredAt: '2026-10-18T15:00:00Z',
    updatedAt: version > 1 ? '2026-10-19T15:00:00Z' : null, version,
  });
  const corrected = grade(practica, 503, 12.5, 2);
  store.activityGrades = [grade(practica, 501, 15), corrected, grade(lectura, 501, 17)];
  store.activityGradeHistory = [
    { id: store.nextId(), gradeId: corrected.id, previousGrade: null, newGrade: 10, actorId: teacherUserId(201), reason: null, changedAt: '2026-10-18T15:00:00Z', previousVersion: 0, newVersion: 1 },
    { id: store.nextId(), gradeId: corrected.id, previousGrade: 10, newGrade: 12.5, actorId: teacherUserId(201), reason: 'Error de digitación en la nota.', changedAt: '2026-10-19T15:00:00Z', previousVersion: 1, newVersion: 2 },
  ];
}

function seedMaterials(store: MockStore): ClassMaterial[] {
  const pdf = 'application/pdf';
  const pptx = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const material = (sectionCourseId: number, title: string, description: string | null, mimeType: string, originalName: string, sizeBytes: number, over: Partial<ClassMaterial> = {}): ClassMaterial => ({
    id: store.nextId(), sectionCourseId, authorTeacherId: 201, authorTeacherName: 'Rosa Quispe Demo', title, description, status: 'PUBLICADO',
    createdAt: '2026-09-07T15:00:00Z', publishedAt: '2026-09-07T15:00:00Z', withdrawnAt: null, withdrawnByUserId: null, withdrawalReason: null,
    file: { originalName, mimeType, sizeBytes }, ...over,
  });
  return [
    material(301, 'Guía de fracciones', 'Resumen con ejemplos resueltos.', pdf, 'guia-fracciones.pdf', 245_760),
    material(301, 'Presentación de geometría', null, pptx, 'geometria.pptx', 1_048_576),
    material(301, 'Práctica anterior', null, pdf, 'practica-anterior.pdf', 102_400, {
      status: 'RETIRADO', withdrawnAt: '2026-09-20T15:00:00Z', withdrawnByUserId: teacherUserId(201), withdrawalReason: 'Contenía un error en el enunciado 4.',
    }),
    material(302, 'Lectura del mes', 'Texto para la comprensión lectora.', docx, 'lectura-del-mes.docx', 51_200),
  ];
}

function seedAudit(store: MockStore): AuditDetailResponse[] {
  const event = (n: number, entity: string, entityId: number, action: string, userId: number | null, reason: string | null,
    previousValue: Record<string, unknown> | null, newValue: Record<string, unknown> | null): AuditDetailResponse => ({
    id: store.nextId(), userId, entity, entityId, action, reason, occurredAt: `2026-10-${String(10 + n).padStart(2, '0')}T14:30:00Z`,
    previousValue, newValue, sourceIp: userId === null ? null : '192.0.2.10', userAgent: userId === null ? null : 'Navegador de prueba',
  });
  return [
    event(1, 'COURSE', 101, 'UPDATE', 1, 'Corrección de horas semanales.', { weeklyHours: 5 }, { weeklyHours: 6 }),
    event(2, 'TEACHER', 201, 'UPDATE', 1, 'Actualización de teléfono.', { phone: null }, { phone: '900000001' }),
    event(3, 'SECTION', 10, 'CREATE', 1, null, null, { name: 'A', grade: 5 }),
    event(4, 'SCHEDULE', 4011, 'CREATE', 1, null, null, { day: 'LUNES', startTime: '08:00' }),
    event(5, 'ATTENDANCE_SESSION', 401, 'UPDATE', 1, 'Contingencia por falla del lector.', { present: 20 }, { present: 22 }),
    event(6, 'SECTION', 11, 'UPDATE', 2, 'Cambio de capacidad.', { maxCapacity: 28 }, { maxCapacity: 30 }),
    event(7, 'COURSE', 103, 'CREATE', 2, null, null, { code: 'CYT-P5' }),
    event(8, 'TEACHER', 202, 'CREATE', null, 'Carga inicial del sistema.', null, { dni: '40000002' }),
  ];
}

/** Estado de asistencia: el guardado por el docente o uno determinista para días pasados. Hoy sin registrar: null. */
export function attendanceStatus(store: MockStore, sc: MockSectionCourse, enrollmentId: number, day: string): TeacherAttendanceStatus | null {
  const saved = store.attendance.get(`${sc.scheduleId}|${day}`)?.get(enrollmentId);
  if (saved) return saved;
  if (day >= limaDayOf(store.now())) return null;
  // Antes de su matrícula el alumno no tiene sesiones registradas.
  if (day < (store.students.find(s => s.enrollmentId === enrollmentId)?.enrollmentDate ?? '')) return null;
  const roll = (dayIndex(day) * 7 + sc.id + enrollmentId * 3) % 23;
  return roll === 0 ? 'INASISTENCIA' : roll === 1 ? 'TARDANZA' : 'PRESENTE';
}

/** Id estable del registro de asistencia (único por sesión, día y matrícula). */
export function attendanceId(sc: MockSectionCourse, enrollmentId: number, day: string): number {
  return (dayIndex(day) * 1000 + sc.id) * 1000 + (enrollmentId % 1000);
}

/** Hay sesión si el día es laborable y está dentro del periodo. */
export function hasSession(store: MockStore, day: string): boolean {
  const period = store.periods[0];
  return isWeekday(day) && day >= period.startDate && day <= period.endDate;
}

export interface MockAttendanceSession {
  attendanceId: number;
  date: string;
  courseName: string;
  startTime: string;
  endTime: string;
  status: TeacherAttendanceStatus;
}

/** Sesiones registradas de una matrícula entre dos días (hasta hoy), con su attendanceId estable. */
export function attendanceSessions(store: MockStore, sectionId: number, enrollmentId: number, from: string, to: string): MockAttendanceSession[] {
  const sessions: MockAttendanceSession[] = [];
  for (let day = from; day <= to && day <= limaDayOf(store.now()); day = addDays(day, 1)) {
    if (!hasSession(store, day)) continue;
    for (const sc of store.sectionCourses.filter(x => x.sectionId === sectionId && x.active)) {
      const status = attendanceStatus(store, sc, enrollmentId, day);
      if (!status) continue;
      sessions.push({
        attendanceId: attendanceId(sc, enrollmentId, day), date: day, courseName: store.courses.find(c => c.id === sc.courseId)!.name,
        startTime: sc.startTime, endTime: sc.endTime, status,
      });
    }
  }
  return sessions;
}

/** Sesión de la matrícula con ese attendanceId (el día va codificado en el id), o null. */
export function findAttendanceSession(store: MockStore, sectionId: number, enrollmentId: number, id: number): MockAttendanceSession | null {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const day = addDays('2026-01-01', Math.floor(id / 1_000_000));
  return attendanceSessions(store, sectionId, enrollmentId, day, day).find(s => s.attendanceId === id) ?? null;
}

/** Plazo de #57: vence al terminar el segundo día hábil posterior a la sesión (America/Lima, sin feriados). */
export function justificationDeadlineExpired(sessionDay: string, now: Date): boolean {
  let day = sessionDay;
  for (let business = 0; business < 2;) {
    day = addDays(day, 1);
    if (isWeekday(day)) business++;
  }
  return limaDayOf(now) > day;
}

/** Ruta del adjunto de ejemplo servido por la propia app (public/mock): en MOCK nunca se abre un dominio externo. */
export const MOCK_JUSTIFICATION_ATTACHMENT_PATH = '/mock/justificacion-ejemplo.pdf';
export function mockJustificationAttachmentUrl(): string {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:3000';
  return `${origin}${MOCK_JUSTIFICATION_ATTACHMENT_PATH}`;
}

/** Solicitud vigente de una sesión: la última que no fue rechazada. */
export function activeJustification(store: MockStore, attendanceIdValue: number): AttendanceJustification | null {
  return store.justifications.find(j => j.attendanceId === attendanceIdValue && j.status !== 'RECHAZADA') ?? null;
}

/** Última solicitud de una sesión (la lista se guarda de la más reciente a la más antigua). */
export function latestJustification(store: MockStore, attendanceIdValue: number): AttendanceJustification | null {
  return store.justifications.find(j => j.attendanceId === attendanceIdValue) ?? null;
}

/**
 * Semillas de #57 sobre faltas reales del mock de Ana (57): deja libre la más reciente para «Justificar» y cubre
 * PENDIENTE (decidir), OBSERVADA (responder) y APROBADA (justified). Las horas caen el mismo día de la sesión.
 */
function seedJustifications(store: MockStore): AttendanceJustification[] {
  const today = limaDayOf(store.now());
  const faltas = attendanceSessions(store, 10, 501, addDays(today, -40), addDays(today, -1))
    .filter(s => s.status === 'INASISTENCIA' || s.status === 'TARDANZA')
    .sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
  const at = (day: string, time: string) => new Date(`${day}T${time}:00${LIMA_OFFSET}`).toISOString();
  const seed = (
    session: MockAttendanceSession | undefined,
    status: 'PENDIENTE' | 'OBSERVADA' | 'APROBADA',
    reason: string,
    attachment: boolean,
    reviewComment: string | null,
  ): AttendanceJustification | null => {
    if (!session) return null;
    const created = at(session.date, '18:00');
    const reviewed = at(session.date, '20:00');
    return {
      id: store.nextId(), attendanceId: session.attendanceId, studentId: 57, studentName: 'Ana Arias Demo', studentCode: 'C26000057',
      date: session.date, courseName: session.courseName, attendanceStatus: session.status as 'INASISTENCIA' | 'TARDANZA',
      reason, status,
      attachmentName: attachment ? 'constancia-medica.pdf' : null, attachmentMimeType: attachment ? 'application/pdf' : null,
      attachmentSizeBytes: attachment ? 102_400 : null, reviewComment, response: null,
      createdAt: created, updatedAt: status === 'PENDIENTE' ? created : reviewed,
      history: [
        { from: null, to: 'PENDIENTE', comment: null, at: created },
        ...(status === 'PENDIENTE' ? [] : [{ from: 'PENDIENTE' as const, to: status, comment: reviewComment, at: reviewed }]),
      ],
    };
  };
  return [
    seed(faltas[1], 'PENDIENTE', 'Cita médica odontológica programada con anticipación.', true, null),
    seed(faltas[2], 'OBSERVADA', 'Congestión vehicular imprevista en la ruta escolar.', false,
      'Por favor precisar si cuenta con constancia o reporte del servicio de transporte.'),
    seed(faltas[3], 'APROBADA', 'Descanso médico por gripe.', true, 'Constancia médica conforme.'),
  ].filter((j): j is AttendanceJustification => j !== null);
}

export const sectionStudents = (store: MockStore, sectionId: number) =>
  store.students.filter(s => s.sectionId === sectionId && s.enrollmentStatus === 'ACTIVE');
