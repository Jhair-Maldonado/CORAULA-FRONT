// Rutas simuladas del estudiante (/v1/student). El estudiante de la sesión es Ana (57), la de alumno@demo.local.
import { fail, ok, type MockRoute } from '../mockHttp';
import { studentFullName } from './shared';

const ESTUDIANTE = ['ESTUDIANTE'] as const;
/** Estudiante del store asociado a alumno@demo.local. */
const DEMO_STUDENT_ID = 57;

export const alumnoRoutes: MockRoute[] = [
  {
    method: 'GET', pattern: '/v1/student/me', roles: ESTUDIANTE,
    handler: ({ store }) => {
      const s = store.students.find(x => x.studentId === DEMO_STUDENT_ID);
      if (!s || s.sectionId === null || s.level === null || s.grade === null) return fail(404, 'La cuenta no tiene matrícula vigente.', 'STUDENT_NOT_ENROLLED');
      return ok({
        studentId: s.studentId, studentCode: s.studentCode, fullName: studentFullName(s), academicPeriodId: s.academicPeriodId, academicPeriodName: s.academicPeriodName,
        sectionId: s.sectionId, sectionName: s.sectionName, level: s.level, grade: s.grade,
      });
    },
  },
];
