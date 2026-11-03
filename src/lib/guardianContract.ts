// Parsers estrictos de los contratos del portal del apoderado (#55, #56, #57, #117).
// Exigen los campos y valores del contrato e IGNORAN los campos desconocidos: el backend agrega campos de forma
// aditiva y uno nuevo no debe romper la vista. Cada parser construye un objeto nuevo solo con los campos conocidos.
import type { GuardianAttendanceRecord, GuardianAttendanceResponse, JustificationStatus } from '@/types/guardianAttendanceApi';
import type { GuardianIncident, GuardianIncidentsPage } from '@/types/guardianIncidentsApi';
import type { GuardianBimesterReport, GuardianPublishedBimester } from '@/types/guardianReportApi';
import type {
  AttendanceJustification, AttendanceJustificationChange, AttendanceJustificationsPage, JustificationAttachmentUrl,
} from '@/types/guardianJustificationsApi';

export class GuardianContractError extends Error {
  constructor(subject: string) {
    super(`La respuesta de ${subject} no coincide con el contrato.`);
    this.name = 'GuardianContractError';
  }
}

type Fail = () => never;
const failFor = (subject: string): Fail => () => { throw new GuardianContractError(subject); };

const ATTENDANCE_STATUSES = ['PRESENTE', 'TARDANZA', 'INASISTENCIA'] as const;
const JUSTIFICATION_STATUSES = ['PENDIENTE', 'OBSERVADA', 'APROBADA', 'RECHAZADA'] as const;
const SEVERITIES = ['LEVE', 'MODERADA', 'GRAVE'] as const;
const JUSTIFIABLE = ['INASISTENCIA', 'TARDANZA'] as const;

function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function reader(fail: Fail) {
  const object = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : fail());
  const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : fail());
  const id = (v: unknown): number => (typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : fail());
  const count = (v: unknown): number => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : fail());
  const text = (v: unknown): string => (typeof v === 'string' ? v : fail());
  const nullableText = (v: unknown): string | null => (v === null || v === undefined ? null : text(v));
  const day = (v: unknown): string => (isDay(v) ? v : fail());
  const time = (v: unknown): string => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fail());
  const instant = (v: unknown): string => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) ? v : fail());
  const bool = (v: unknown): boolean => (typeof v === 'boolean' ? v : fail());
  const oneOf = <T extends string>(options: readonly T[], v: unknown): T => (options.includes(v as T) ? v as T : fail());
  const grade = (v: unknown): number | null => (v === null || v === undefined ? null : typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 20 ? v : fail());
  return { object, array, id, count, text, nullableText, day, time, instant, bool, oneOf, grade };
}

function page<T>(value: unknown, fail: Fail, item: (v: unknown) => T, expected: { page: number; size: number }) {
  const r = reader(fail);
  const p = r.object(value);
  const content = r.array(p.content).map(item);
  const result = { content, page: r.count(p.page), size: r.count(p.size), totalElements: r.count(p.totalElements), totalPages: r.count(p.totalPages) };
  if (result.page !== expected.page || result.size !== expected.size || content.length > result.size || content.length > result.totalElements) return fail();
  return result;
}

// ── Asistencia (#55 + #57) ─────────────────────────────────────────────────
export function parseGuardianAttendance(value: unknown, expected: { studentId: number; from: string; to: string }): GuardianAttendanceResponse {
  const fail = failFor('asistencia');
  const r = reader(fail);
  const v = r.object(value);
  const s = r.object(v.summary);
  const summary = { total: r.count(s.total), present: r.count(s.present), late: r.count(s.late), absent: r.count(s.absent) };
  if (summary.present + summary.late + summary.absent !== summary.total) return fail();
  const records = r.array(v.records).map((item): GuardianAttendanceRecord => {
    const x = r.object(item);
    const j = x.justification;
    let justification: GuardianAttendanceRecord['justification'] = null;
    if (j !== null) {
      const o = r.object(j);
      justification = { id: r.id(o.id), status: r.oneOf<JustificationStatus>(JUSTIFICATION_STATUSES, o.status) };
    }
    return {
      date: r.day(x.date), courseName: r.text(x.courseName), startTime: r.time(x.startTime), endTime: r.time(x.endTime),
      status: r.oneOf(ATTENDANCE_STATUSES, x.status), attendanceId: r.id(x.attendanceId), justified: r.bool(x.justified), justification,
    };
  });
  const result = { studentId: r.id(v.studentId), from: r.day(v.from), to: r.day(v.to), summary, records };
  if (result.studentId !== expected.studentId || result.from !== expected.from || result.to !== expected.to) return fail();
  if (records.length !== summary.total || records.some(x => x.date < result.from || x.date > result.to)) return fail();
  if (new Set(records.map(x => x.attendanceId)).size !== records.length) return fail();
  return result;
}

// ── Incidencias (#117) ─────────────────────────────────────────────────────
export function parseGuardianIncidentsPage(value: unknown, expected: { page: number; size: number }): GuardianIncidentsPage {
  const fail = failFor('incidencias');
  const r = reader(fail);
  const result = page(value, fail, (item): GuardianIncident => {
    const x = r.object(item);
    const res: GuardianIncident = {
      id: r.id(x.id),
      occurredAt: r.instant(x.occurredAt),
      severity: r.oneOf(SEVERITIES, x.severity),
      description: r.text(x.description),
      courseName: r.text(x.courseName),
    };
    if (x.teacherName !== undefined && x.teacherName !== null) {
      res.teacherName = r.text(x.teacherName);
    }
    if (x.studentName !== undefined && x.studentName !== null) {
      res.studentName = r.text(x.studentName);
    }
    return res;
  }, expected);
  if (new Set(result.content.map(x => x.id)).size !== result.content.length) return fail();
  return result;
}

// ── Libreta (#56) ──────────────────────────────────────────────────────────
export function parsePublishedBimesters(value: unknown): GuardianPublishedBimester[] {
  const fail = failFor('libretas publicadas');
  const r = reader(fail);
  const list = r.array(value).map((item): GuardianPublishedBimester => {
    const x = r.object(item);
    return {
      bimesterId: r.id(x.bimesterId), number: r.id(x.number), name: r.text(x.name), academicPeriodId: r.id(x.academicPeriodId),
      academicPeriodName: r.text(x.academicPeriodName), publishedAt: r.instant(x.publishedAt), revision: r.id(x.revision),
    };
  });
  if (new Set(list.map(x => x.bimesterId)).size !== list.length) return fail();
  return list;
}

export function parseGuardianReport(value: unknown, expected: { studentId: number; bimesterId: number }): GuardianBimesterReport {
  const fail = failFor('libreta');
  const r = reader(fail);
  const v = r.object(value);
  const st = r.object(v.student), se = r.object(v.section), pe = r.object(v.period), bi = r.object(v.bimester);
  const report: GuardianBimesterReport = {
    student: { id: r.id(st.id), code: r.nullableText(st.code), fullName: r.text(st.fullName) },
    section: { id: r.id(se.id), name: r.text(se.name), grade: r.id(se.grade), level: r.text(se.level) },
    period: { id: r.id(pe.id), name: r.text(pe.name) },
    bimester: { id: r.id(bi.id), number: r.id(bi.number), name: r.text(bi.name) },
    courses: r.array(v.courses).map(item => {
      const c = r.object(item);
      return {
        name: r.text(c.name), areaName: r.text(c.areaName), grade: r.grade(c.grade),
        criteria: r.array(c.criteria).map(cr => { const o = r.object(cr); return { name: r.text(o.name), grade: r.grade(o.grade) }; }),
      };
    }),
    areas: r.array(v.areas).map(item => { const a = r.object(item); return { name: r.text(a.name), grade: r.grade(a.grade) }; }),
    publishedAt: r.instant(v.publishedAt),
    revision: r.id(v.revision),
  };
  if (report.student.id !== expected.studentId || report.bimester.id !== expected.bimesterId) return fail();
  return report;
}

// ── Justificaciones (#57) ──────────────────────────────────────────────────
export function parseAttendanceJustification(value: unknown, expected: { studentId?: number; id?: number } = {}): AttendanceJustification {
  const fail = failFor('justificación');
  const r = reader(fail);
  const x = r.object(value);
  const nullableCount = (v: unknown) => (v === null || v === undefined ? null : r.count(v));
  const history = r.array(x.history).map((item): AttendanceJustificationChange => {
    const h = r.object(item);
    return {
      from: h.from === null || h.from === undefined ? null : r.oneOf<JustificationStatus>(JUSTIFICATION_STATUSES, h.from),
      to: r.oneOf<JustificationStatus>(JUSTIFICATION_STATUSES, h.to), comment: r.nullableText(h.comment), at: r.instant(h.at),
    };
  });
  const result: AttendanceJustification = {
    id: r.id(x.id), attendanceId: r.id(x.attendanceId), studentId: r.id(x.studentId), date: r.day(x.date), courseName: r.text(x.courseName),
    attendanceStatus: r.oneOf(JUSTIFIABLE, x.attendanceStatus), reason: r.text(x.reason), status: r.oneOf<JustificationStatus>(JUSTIFICATION_STATUSES, x.status),
    attachmentName: r.nullableText(x.attachmentName), attachmentMimeType: r.nullableText(x.attachmentMimeType), attachmentSizeBytes: nullableCount(x.attachmentSizeBytes),
    reviewComment: r.nullableText(x.reviewComment), response: r.nullableText(x.response), createdAt: r.instant(x.createdAt), updatedAt: r.instant(x.updatedAt), history,
  };
  if (expected.studentId !== undefined && result.studentId !== expected.studentId) return fail();
  if (expected.id !== undefined && result.id !== expected.id) return fail();
  if ((result.attachmentName === null) !== (result.attachmentMimeType === null)) return fail();
  return result;
}

export function parseAttendanceJustificationsPage(value: unknown, expected: { page: number; size: number; studentId?: number }): AttendanceJustificationsPage {
  const fail = failFor('justificaciones');
  const result = page(value, fail, item => parseAttendanceJustification(item, { studentId: expected.studentId }), expected);
  if (new Set(result.content.map(x => x.id)).size !== result.content.length) return fail();
  return result;
}

export function parseJustificationAttachmentUrl(value: unknown): JustificationAttachmentUrl {
  const fail = failFor('descarga del adjunto');
  const r = reader(fail);
  const x = r.object(value);
  const url = r.text(x.url);
  let parsed: URL;
  try { parsed = new URL(url); } catch { return fail(); }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return fail();
  const expiresInSeconds = r.id(x.expiresInSeconds);
  return { url, expiresInSeconds };
}
