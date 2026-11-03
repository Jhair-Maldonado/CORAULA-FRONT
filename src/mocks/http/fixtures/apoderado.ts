// Rutas simuladas del apoderado (/v1/guardian). El apoderado de la sesión es el de padre@demo.local.
import type { GuardianAttendanceRecord } from '@/types/guardianAttendanceApi';
import type { AttendanceJustification } from '@/types/guardianJustificationsApi';
import { fail, ok, pageOf, pageParams, positiveInt, type MockReply, type MockRequest, type MockRoute } from '../mockHttp';
import { addDays, attendanceId, attendanceStatus, criteriaFor, hasSession, limaDayOf, studentFullName, type MockStore } from './shared';

const APODERADO = ['APODERADO'] as const;
const MAX_RANGE_DAYS = 92;
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);
const average = (values: (number | null)[]): number | null => {
  const present = values.filter((v): v is number => v !== null);
  return present.length ? Math.round((present.reduce((a, b) => a + b, 0) / present.length) * 10) / 10 : null;
};

/** Estudiante vinculado de la ruta; un id ajeno responde como el backend: 404 STUDENT_NOT_FOUND. */
function linkedStudent({ store, params }: MockRequest) {
  const id = positiveInt(params.studentId);
  return store.guardianStudentIds.includes(id ?? -1) ? store.students.find(s => s.studentId === id) ?? null : null;
}
const studentNotFound = () => fail(404, 'El estudiante no existe o no está vinculado.', 'STUDENT_NOT_FOUND');

function validRange(from: unknown, to: unknown): from is string {
  if (!isDay(from) || !isDay(to) || from > to) return false;
  return (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1 <= MAX_RANGE_DAYS;
}

function report(store: MockStore, studentId: number, bimesterId: number) {
  const student = store.students.find(s => s.studentId === studentId)!;
  const section = store.sections.find(s => s.id === student.sectionId)!;
  const bimester = store.bimesters.find(b => b.id === bimesterId)!;
  const period = store.periods.find(p => p.id === bimester.academicPeriodId)!;
  const publication = store.publications.find(p => p.bimesterId === bimesterId)!;
  const courses = store.sectionCourses.filter(sc => sc.sectionId === section.id).map(sc => {
    const course = store.courses.find(c => c.id === sc.courseId)!;
    const criteria = criteriaFor(course.id).map(c => ({
      name: c.name,
      grade: store.criterionGrades.find(g => g.enrollmentId === student.enrollmentId && g.sectionCourseId === sc.id && g.bimesterId === bimesterId && g.criterionId === c.id)?.grade ?? null,
    }));
    return { name: course.name, areaName: course.area, criteria, grade: average(criteria.map(c => c.grade)) };
  });
  const areas = [...new Set(courses.map(c => c.areaName))].map(name => ({ name, grade: average(courses.filter(c => c.areaName === name).map(c => c.grade)) }));
  return {
    student: { id: student.studentId, code: student.studentCode, fullName: studentFullName(student) },
    section: { id: section.id, name: section.name, grade: section.grade, level: section.level },
    period: { id: period.id, name: period.name },
    bimester: { id: bimester.id, number: bimester.number, name: bimester.name },
    courses, areas, publishedAt: publication.publishedAt, revision: publication.revision,
  };
}

/** PDF mínimo válido (una página, texto ASCII) para probar la descarga. */
export function buildMiniPdf(lines: string[]): Uint8Array {
  const ascii = (s: string) => s.normalize('NFD').replace(/[^\x20-\x7E]/g, '').replace(/([()\\])/g, '\\$1');
  const stream = ['BT', '/F1 12 Tf', '50 780 Td', '16 TL', ...lines.map(l => `(${ascii(l)}) '`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

function publishedReport(request: MockRequest): MockReply | ReturnType<typeof report> {
  const student = linkedStudent(request);
  if (!student) return studentNotFound();
  const bimesterId = positiveInt(request.params.bimesterId);
  if (!request.store.bimesters.some(b => b.id === bimesterId)) return fail(404, 'La libreta no existe.', 'REPORT_NOT_FOUND');
  if (!request.store.publications.some(p => p.bimesterId === bimesterId)) return fail(409, 'La libreta no está publicada.', 'REPORT_NOT_PUBLISHED');
  return report(request.store, student.studentId, bimesterId!);
}
const isReply = (value: unknown): value is MockReply => typeof value === 'object' && value !== null && 'status' in value;

export const apoderadoRoutes: MockRoute[] = [
  {
    method: 'GET', pattern: '/v1/guardian/students', roles: APODERADO,
    handler: ({ store }) => ok(store.guardianStudentIds.map(id => store.students.find(s => s.studentId === id)!).map(s => ({
      studentId: s.studentId, studentCode: s.studentCode, fullName: studentFullName(s), grade: s.enrollmentStatus === 'ACTIVE' ? s.grade : null,
      sectionName: s.enrollmentStatus === 'ACTIVE' ? s.sectionName : null,
    }))),
  },
  {
    method: 'GET', pattern: '/v1/guardian/students/:studentId/attendance', roles: APODERADO,
    handler: request => {
      const { store, query } = request;
      const student = linkedStudent(request);
      if (!student) return studentNotFound();
      if (!validRange(query.from, query.to)) return fail(400, 'El rango de fechas no es válido.', 'DATE_RANGE_INVALID');
      const records: GuardianAttendanceRecord[] = [];
      for (let day = query.from; day <= query.to && day <= limaDayOf(store.now()); day = addDays(day, 1)) {
        if (!hasSession(store, day)) continue;
        for (const sc of store.sectionCourses.filter(x => x.sectionId === student.sectionId && x.active)) {
          const status = attendanceStatus(store, sc, student.enrollmentId!, day);
          if (!status) continue;
          records.push({
            date: day, courseName: store.courses.find(c => c.id === sc.courseId)!.name, startTime: sc.startTime, endTime: sc.endTime, status,
            attendanceId: attendanceId(sc, student.enrollmentId!, day), justified: false, justification: null,
          });
        }
      }
      records.sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
      const count = (s: GuardianAttendanceRecord['status']) => records.filter(r => r.status === s).length;
      return ok({
        studentId: student.studentId, from: query.from, to: query.to,
        summary: { total: records.length, present: count('PRESENTE'), late: count('TARDANZA'), absent: count('INASISTENCIA') }, records,
      });
    },
  },
  {
    method: 'GET', pattern: '/v1/guardian/students/:studentId/incidents', roles: APODERADO,
    handler: request => {
      const { store, query } = request;
      const student = linkedStudent(request);
      if (!student) return studentNotFound();
      if (!validRange(query.from, query.to)) return fail(400, 'El rango de fechas no es válido.', 'DATE_RANGE_INVALID');
      const paging = pageParams(query);
      if (!paging) return fail(400, 'La paginación no es válida.', 'VALIDATION_ERROR');
      const list = store.incidents
        .filter(i => i.studentId === student.studentId && limaDayOf(new Date(i.occurredAt)) >= query.from && limaDayOf(new Date(i.occurredAt)) <= query.to)
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .map(i => ({ id: i.id, occurredAt: i.occurredAt, severity: i.severity, description: i.description, courseName: store.courses.find(c => c.id === store.sectionCourses.find(sc => sc.id === i.sectionCourseId)?.courseId)?.name ?? 'Curso' }));
      return ok(pageOf(list, paging.page, paging.size));
    },
  },
  {
    method: 'GET', pattern: '/v1/guardian/students/:studentId/bimesters/published', roles: APODERADO,
    handler: request => {
      const { store } = request;
      if (!linkedStudent(request)) return studentNotFound();
      return ok(store.publications
        .map(p => ({ p, b: store.bimesters.find(b => b.id === p.bimesterId)! }))
        .sort((x, y) => y.b.number - x.b.number)
        .map(({ p, b }) => ({
          bimesterId: b.id, number: b.number, name: b.name, academicPeriodId: b.academicPeriodId,
          academicPeriodName: store.periods.find(x => x.id === b.academicPeriodId)!.name, publishedAt: p.publishedAt, revision: p.revision,
        })));
    },
  },
  {
    method: 'GET', pattern: '/v1/guardian/students/:studentId/bimesters/:bimesterId/report', roles: APODERADO,
    handler: request => { const result = publishedReport(request); return isReply(result) ? result : ok(result, 200, { 'cache-control': 'no-store' }); },
  },
  {
    method: 'GET', pattern: '/v1/guardian/students/:studentId/bimesters/:bimesterId/report.pdf', roles: APODERADO,
    handler: request => {
      const result = publishedReport(request);
      if (isReply(result)) return result;
      const pdf = buildMiniPdf([
        'CORAULA - Libreta de notas (MODO SIMULADO)', result.student.fullName, `${result.period.name} - ${result.bimester.name}`, '',
        ...result.courses.map(c => `${c.name}: ${c.grade ?? 'Sin nota'}`),
      ]);
      const code = (result.student.code ?? 'alumno').replace(/[^A-Za-z0-9_-]/g, '') || 'alumno';
      return ok(new Blob([pdf as BlobPart], { type: 'application/pdf' }), 200, {
        'content-type': 'application/pdf', 'content-disposition': `attachment; filename="libreta-${code}-${result.bimester.number}.pdf"`, 'cache-control': 'no-store',
      });
    },
  },
  {
    method: 'GET', pattern: '/v1/guardian/students/:studentId/justifications', roles: APODERADO,
    handler: request => {
      const student = linkedStudent(request);
      if (!student) return studentNotFound();
      const paging = pageParams(request.query);
      if (!paging) return fail(400, 'La paginación no es válida.', 'VALIDATION_ERROR');
      const { status } = request.query;
      let list = request.store.justifications.filter(j => j.studentId === student.studentId);
      if (status) {
        list = list.filter(j => j.status === status);
      }
      list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return ok(pageOf(list, paging.page, paging.size));
    },
  },
  {
    method: 'GET', pattern: '/v1/guardian/students/:studentId/justifications/:id', roles: APODERADO,
    handler: request => {
      const student = linkedStudent(request);
      if (!student) return studentNotFound();
      const id = positiveInt(request.params.id);
      const justification = request.store.justifications.find(j => j.id === id && j.studentId === student.studentId);
      if (!justification) return fail(404, 'La justificación no existe.', 'JUSTIFICATION_NOT_FOUND');
      return ok(justification);
    },
  },
  {
    method: 'POST', pattern: '/v1/guardian/students/:studentId/attendance/:attendanceId/justifications', roles: APODERADO,
    handler: request => {
      const student = linkedStudent(request);
      if (!student) return studentNotFound();
      const attendanceId = positiveInt(request.params.attendanceId);
      if (!attendanceId) return fail(404, 'La sesión de asistencia no existe.', 'ATTENDANCE_NOT_FOUND');

      let reason = '';
      let attachmentName: string | null = null;
      let attachmentMimeType: string | null = null;
      let attachmentSizeBytes: number | null = null;
      if (typeof FormData !== 'undefined' && request.body instanceof FormData) {
        reason = (request.body.get('reason') as string) ?? '';
        const f = request.body.get('file');
        if (f && typeof f === 'object' && 'name' in f) {
          const file = f as File;
          attachmentName = file.name;
          attachmentMimeType = file.type || 'application/pdf';
          attachmentSizeBytes = file.size;
        }
      } else if (typeof request.body === 'object' && request.body !== null) {
        reason = (request.body as any).reason ?? '';
      }
      if (!reason.trim()) return fail(400, 'El motivo es obligatorio.', 'VALIDATION_ERROR');

      const nowIso = new Date().toISOString();
      const created: AttendanceJustification = {
        id: request.store.nextId(),
        attendanceId,
        studentId: student.studentId,
        date: limaDayOf(request.store.now()),
        courseName: 'Matemática',
        attendanceStatus: 'INASISTENCIA',
        reason: reason.trim(),
        status: 'PENDIENTE',
        attachmentName,
        attachmentMimeType,
        attachmentSizeBytes,
        reviewComment: null,
        response: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [{ from: null, to: 'PENDIENTE', comment: 'Solicitud presentada por el apoderado.', at: nowIso }],
      };
      request.store.justifications.unshift(created);
      return ok(created, 201);
    },
  },
  {
    method: 'POST', pattern: '/v1/guardian/students/:studentId/justifications/:id/response', roles: APODERADO,
    handler: request => {
      const student = linkedStudent(request);
      if (!student) return studentNotFound();
      const id = positiveInt(request.params.id);
      const justification = request.store.justifications.find(j => j.id === id && j.studentId === student.studentId);
      if (!justification) return fail(404, 'La justificación no existe.', 'JUSTIFICATION_NOT_FOUND');
      if (justification.status !== 'OBSERVADA') return fail(409, 'Solo se puede responder a una justificación observada.', 'INVALID_JUSTIFICATION_TRANSITION');

      let responseText = '';
      if (typeof FormData !== 'undefined' && request.body instanceof FormData) {
        responseText = (request.body.get('response') as string) ?? '';
      } else if (typeof request.body === 'object' && request.body !== null) {
        responseText = (request.body as any).response ?? '';
      }
      if (!responseText.trim()) return fail(400, 'La respuesta es obligatoria.', 'VALIDATION_ERROR');

      const nowIso = new Date().toISOString();
      justification.status = 'PENDIENTE';
      justification.response = responseText.trim();
      justification.updatedAt = nowIso;
      justification.history.push({
        from: 'OBSERVADA',
        to: 'PENDIENTE',
        comment: responseText.trim(),
        at: nowIso,
      });
      return ok(justification);
    },
  },
  {
    method: 'POST', pattern: '/v1/guardian/students/:studentId/justifications/:id/attachment/download-url', roles: APODERADO,
    handler: request => {
      const student = linkedStudent(request);
      if (!student) return studentNotFound();
      const id = positiveInt(request.params.id);
      const justification = request.store.justifications.find(j => j.id === id && j.studentId === student.studentId);
      if (!justification) return fail(404, 'La justificación no existe.', 'JUSTIFICATION_NOT_FOUND');
      return ok({ url: 'https://storage.googleapis.com/test-bucket/justificacion.pdf', expiresInSeconds: 300 });
    },
  },
];
