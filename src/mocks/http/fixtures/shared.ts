// Datos sintéticos del modo MOCK, compartidos por los portales: el mismo alumno aparece en gestión, docente y apoderado.
// Solo se cargan con NEXT_PUBLIC_APP_MODE=MOCK (ver src/services/httpClient.ts). Nombres y documentos inventados.
import type { AcademicPeriod } from '@/types/academicPeriodApi';
import type { Bimester } from '@/types/evaluationApi';
import type { SectionResponse } from '@/types/sectionApi';
import type { CourseResponse } from '@/types/courseApi';
import type { GuardianSummaryResponse, StudentDetailResponse } from '@/types/studentApi';
import type { TeacherResponse } from '@/types/teacherApi';
import type { IncidenciaResponse } from '@/types/incidenciasApi';
import type { TeacherAttendanceStatus } from '@/types/teacherAttendanceApi';

export interface MockTeacher extends TeacherResponse { personId: number; email: string | null }

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

export interface MockPublication { bimesterId: number; publishedAt: string; revision: number }

export interface MockStore {
  nextId(): number;
  now(): Date;
  periods: AcademicPeriod[];
  bimesters: Bimester[];
  sections: SectionResponse[];
  courses: CourseResponse[];
  teachers: MockTeacher[];
  sectionCourses: MockSectionCourse[];
  students: StudentDetailResponse[];
  /** Hijos vinculados a padre@demo.local. */
  guardianStudentIds: number[];
  /** Asistencia guardada por el docente: clave `${scheduleId}|${fecha}` → enrollmentId → estado. */
  attendance: Map<string, Map<number, TeacherAttendanceStatus>>;
  criterionGrades: MockCriterionGrade[];
  incidents: IncidenciaResponse[];
  publications: MockPublication[];
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

/** Criterios MANUAL de cada curso: dos por curso, con ids derivados del curso. */
export function criteriaFor(courseId: number): { id: number; name: string; order: number }[] {
  return [
    { id: courseId * 10 + 1, name: 'Desempeño en clase', order: 1 },
    { id: courseId * 10 + 2, name: 'Evaluación escrita', order: 2 },
  ];
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
  { id: 101, code: 'MAT-P5', name: 'Matemática', level: 'PRIMARY', area: 'Matemática', weeklyHours: 6, description: null, active: true },
  { id: 102, code: 'COM-P5', name: 'Comunicación', level: 'PRIMARY', area: 'Comunicación', weeklyHours: 5, description: null, active: true },
  { id: 103, code: 'CYT-P5', name: 'Ciencia y Tecnología', level: 'PRIMARY', area: 'Ciencia y Tecnología', weeklyHours: 4, description: null, active: true },
  { id: 104, code: 'MAT-S1', name: 'Matemática', level: 'SECONDARY', area: 'Matemática', weeklyHours: 6, description: null, active: true },
  { id: 105, code: 'COM-S1', name: 'Comunicación', level: 'SECONDARY', area: 'Comunicación', weeklyHours: 5, description: null, active: true },
];

const TEACHERS: MockTeacher[] = [
  { id: 201, personId: 901, dni: '40000001', firstNames: 'Rosa', paternalLastName: 'Quispe', maternalLastName: 'Demo', fullName: 'Rosa Quispe Demo', phone: '900000001', specialty: 'Matemática', active: true, email: 'docente@demo.local' },
  { id: 202, personId: 902, dni: '40000002', firstNames: 'Carlos', paternalLastName: 'Huamán', maternalLastName: 'Demo', fullName: 'Carlos Huamán Demo', phone: null, specialty: 'Ciencias', active: true, email: null },
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
): StudentDetailResponse {
  const section = SECTIONS.find(s => s.id === sectionId)!;
  return {
    studentId, personId: 1000 + studentId, studentCode: `C26${String(studentId).padStart(6, '0')}`, dni: `7${String(studentId).padStart(7, '0')}`,
    firstNames, paternalLastName, maternalLastName: 'Demo', birthDate: section.level === 'PRIMARY' ? '2016-04-12' : '2013-09-03',
    studentStatus: 'ACTIVE', enrollmentId, enrollmentStatus: 'ACTIVE', academicPeriodId: 1, academicPeriodName: PERIOD.name,
    sectionId, level: section.level, grade: section.grade, sectionName: section.name, phone: null, enrollmentDate: '2026-02-20', guardians,
  };
}

function seedGrades(students: StudentDetailResponse[], sectionCourses: MockSectionCourse[], nextId: () => number): MockCriterionGrade[] {
  const grades: MockCriterionGrade[] = [];
  for (const bimester of BIMESTERS.filter(b => b.status === 'CERRADO')) {
    for (const s of students) {
      for (const sc of sectionCourses.filter(x => x.sectionId === s.sectionId)) {
        for (const criterion of criteriaFor(sc.courseId)) {
          // Una nota sin registrar para mostrar «Sin nota» en la libreta.
          if (s.studentId === 58 && sc.courseId === 105 && criterion.order === 2 && bimester.number === 3) continue;
          grades.push({
            id: nextId(), enrollmentId: s.enrollmentId!, sectionCourseId: sc.id, bimesterId: bimester.id, criterionId: criterion.id,
            grade: 11 + ((s.studentId + criterion.id + bimester.number * 3) % 9), registeredByTeacherId: sc.teacherId ?? 202,
            registeredAt: `${bimester.endDate}T15:00:00Z`, updatedAt: null,
          });
        }
      }
    }
  }
  return grades;
}

/** Estado nuevo e independiente: cada sesión del navegador (o cada test) parte de los mismos datos. */
export function createMockStore(now: () => Date = () => new Date()): MockStore {
  let id = 10_000;
  const nextId = () => ++id;
  const students = [
    student(57, 'Ana', 'Arias', 10, 501, [PADRE]),
    student(58, 'Luis', 'Arias', 12, 502, [PADRE]),
    student(59, 'María', 'Torres', 10, 503),
    student(60, 'Jorge', 'Salas', 10, 504),
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
  return {
    nextId,
    now,
    periods: [{ ...PERIOD }],
    bimesters: BIMESTERS.map(b => ({ ...b })),
    sections: SECTIONS.map(s => ({ ...s })),
    courses: COURSES.map(c => ({ ...c })),
    teachers: TEACHERS.map(t => ({ ...t })),
    sectionCourses,
    students,
    guardianStudentIds: [57, 58],
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
    ],
  };
}

/** Estado de asistencia: el guardado por el docente o uno determinista para días pasados. Hoy sin registrar: null. */
export function attendanceStatus(store: MockStore, sc: MockSectionCourse, enrollmentId: number, day: string): TeacherAttendanceStatus | null {
  const saved = store.attendance.get(`${sc.scheduleId}|${day}`)?.get(enrollmentId);
  if (saved) return saved;
  if (day >= limaDayOf(store.now())) return null;
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

export const sectionStudents = (store: MockStore, sectionId: number) =>
  store.students.filter(s => s.sectionId === sectionId && s.enrollmentStatus === 'ACTIVE');
