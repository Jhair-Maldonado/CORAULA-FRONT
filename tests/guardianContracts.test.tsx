import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import {
  GuardianContractError, parseAttendanceJustification, parseAttendanceJustificationsPage, parseGuardianAttendance, parseGuardianIncidentsPage,
  parseGuardianReport, parseJustificationAttachmentUrl, parsePublishedBimesters,
} from '../src/lib/guardianContract';
import {
  GUARDIAN_JUSTIFICATION_CONTRACT_STATUSES, GUARDIAN_PORTAL_CONTRACT_STATUSES, guardianJustificationErrorCode, guardianJustificationErrorMessage,
  guardianPortalErrorCode, guardianReadErrorMessage, isUnconfirmedJustificationWrite,
} from '../src/services/padres/guardianErrors';
import { getGuardianAttendance } from '../src/services/padres/guardianAttendanceService';
import { guardianIncidentsErrorMessage, guardianIncidentsService } from '../src/services/padres/guardianIncidentsService';
import { guardianReportFileName, guardianReportService } from '../src/services/padres/guardianReportService';
import { guardianJustificationsService, justificationFileError, justificationTextError } from '../src/services/padres/guardianJustificationsService';

// Contratos y servicios del portal del apoderado: datos sintéticos, sin red (adaptador HTTP sustituido).
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const attendance = (over: Record<string, unknown> = {}) => ({
  studentId: 57, from: '2026-10-01', to: '2026-10-31', summary: { total: 2, present: 1, late: 0, absent: 1 },
  records: [
    { date: '2026-10-05', courseName: 'Matemática', startTime: '08:00', endTime: '09:30', status: 'PRESENTE', attendanceId: 501, justified: false, justification: null },
    { date: '2026-10-06', courseName: 'Historia', startTime: '10:00', endTime: '11:30', status: 'INASISTENCIA', attendanceId: 502, justified: true, justification: { id: 9, status: 'APROBADA' } },
  ],
  ...over,
});
const incident = (id: number, over: Record<string, unknown> = {}) => ({ id, occurredAt: '2026-10-06T15:00:00Z', severity: 'LEVE', description: 'Llegó sin material.', courseName: 'Arte', ...over });
const pageOf = (content: unknown[], over: Record<string, unknown> = {}) => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, ...over });
const published = (id: number, over: Record<string, unknown> = {}) => ({
  bimesterId: id, number: id, name: `Bimestre ${id}`, academicPeriodId: 3, academicPeriodName: 'Periodo 2026', publishedAt: '2026-06-01T10:00:00-05:00', revision: 1, ...over,
});
const report = (over: Record<string, unknown> = {}) => ({
  student: { id: 57, code: 'C26000057', fullName: 'Ana Arias Prueba' }, section: { id: 4, name: 'A', grade: 5, level: 'PRIMARY' },
  period: { id: 3, name: 'Periodo 2026' }, bimester: { id: 11, number: 1, name: 'Bimestre 1' },
  courses: [{ name: 'Matemática', areaName: 'Matemática', criteria: [{ name: 'Resuelve problemas', grade: 15 }], grade: 15.5 }],
  areas: [{ name: 'Matemática', grade: null }], publishedAt: '2026-06-01T10:00:00-05:00', revision: 2, ...over,
});
const justification = (over: Record<string, unknown> = {}) => ({
  id: 9, attendanceId: 502, studentId: 57, date: '2026-10-06', courseName: 'Historia', attendanceStatus: 'INASISTENCIA', reason: 'Cita médica',
  status: 'PENDIENTE', attachmentName: null, attachmentMimeType: null, attachmentSizeBytes: null, reviewComment: null, response: null,
  createdAt: '2026-10-06T20:00:00Z', updatedAt: '2026-10-06T20:00:00Z', history: [{ from: null, to: 'PENDIENTE', comment: null, at: '2026-10-06T20:00:00Z' }], ...over,
});
const httpError = (status: number | undefined, code?: string) => new AxiosError('PRIVATE', 'ERR_TEST', undefined, undefined,
  status === undefined ? undefined : { status, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR', ...(code ? { code } : {}) } } as AxiosResponse);

type Call = { method: string; url: string; params?: unknown; data?: unknown; headers?: unknown; responseType?: string };
async function withHttp(reply: (call: Call) => { status: number; data: unknown; headers?: Record<string, string> }, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call = { method: String(config.method).toUpperCase(), url: String(config.url), params: config.params, data: config.data, headers: config.headers, responseType: config.responseType };
    calls.push(call);
    const r = reply(call);
    return { data: r.data, status: r.status, statusText: '', headers: r.headers ?? {}, config } as AxiosResponse;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}

test('asistencia: exige attendanceId, justified y el estado OBSERVADA; ignora campos desconocidos', () => {
  const parsed = parseGuardianAttendance(attendance({ extra: 1, records: [{ ...attendance().records[1], futureField: 'x', justification: { id: 9, status: 'OBSERVADA', note: 'y' } }], summary: { total: 1, present: 0, late: 0, absent: 1, other: 4 } }), { studentId: 57, from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(parsed.records[0], { date: '2026-10-06', courseName: 'Historia', startTime: '10:00', endTime: '11:30', status: 'INASISTENCIA', attendanceId: 502, justified: true, justification: { id: 9, status: 'OBSERVADA' } });
  assert.ok(!('extra' in parsed) && !('other' in parsed.summary) && !('futureField' in parsed.records[0]));
  const expected = { studentId: 57, from: '2026-10-01', to: '2026-10-31' };
  const record = attendance().records[0];
  for (const bad of [
    attendance({ studentId: 58 }), attendance({ from: '2026-10-02' }), attendance({ summary: { total: 3, present: 1, late: 0, absent: 1 } }),
    attendance({ records: [{ ...record, attendanceId: undefined }, attendance().records[1]] }), attendance({ records: [{ ...record, justified: 'no' }, attendance().records[1]] }),
    attendance({ records: [{ ...record, status: 'FALTA' }, attendance().records[1]] }), attendance({ records: [{ ...record, justification: { id: 1, status: 'OTRO' } }, attendance().records[1]] }),
    attendance({ records: [{ ...record, date: '2026-11-01' }, attendance().records[1]] }), attendance({ records: [record, { ...attendance().records[1], attendanceId: 501 }] }),
    attendance({ records: [{ ...record, startTime: '8:00' }, attendance().records[1]] }), null,
  ]) assert.throws(() => parseGuardianAttendance(bad, expected), GuardianContractError);
});

test('incidencias, libretas, libreta y justificaciones: contrato estricto que ignora campos desconocidos', () => {
  const incidents = parseGuardianIncidentsPage(pageOf([incident(1, { teacher: 'X' }), incident(2, { severity: 'GRAVE' })]), { page: 0, size: 20 });
  assert.deepEqual(incidents.content[0], incident(1));
  for (const bad of [pageOf([incident(1, { severity: 'ALTA' })]), pageOf([incident(1), incident(1)]), pageOf([incident(1, { occurredAt: '2026-10-06' })]), pageOf([], { page: 1 }), pageOf([incident(1)], { totalElements: 0 })]) {
    assert.throws(() => parseGuardianIncidentsPage(bad, { page: 0, size: 20 }), /incidencias no coincide/);
  }
  assert.deepEqual(parsePublishedBimesters([published(2, { hash: 'x' }), published(1)]).map(b => b.bimesterId), [2, 1]);
  for (const bad of [[published(1), published(1)], [published(1, { revision: 0 })], [published(1, { publishedAt: 'ayer' })], {}]) assert.throws(() => parsePublishedBimesters(bad), GuardianContractError);
  const r = parseGuardianReport(report({ evidence: 'oculta' }), { studentId: 57, bimesterId: 11 });
  assert.equal(r.courses[0].grade, 15.5); assert.equal(r.areas[0].grade, null); assert.ok(!('evidence' in r));
  for (const bad of [report({ student: { id: 58, code: null, fullName: 'X' } }), report({ bimester: { id: 12, number: 1, name: 'B' } }), report({ areas: [{ name: 'A', grade: 21 }] }), report({ courses: [{ name: 'M', areaName: 'M', grade: 10 }] })]) {
    assert.throws(() => parseGuardianReport(bad, { studentId: 57, bimesterId: 11 }), /libreta no coincide/);
  }
  assert.equal(parseAttendanceJustification(justification({ internal: 1 }), { studentId: 57, id: 9 }).history[0].from, null);
  for (const bad of [justification({ status: 'NUEVA' }), justification({ attendanceStatus: 'PRESENTE' }), justification({ attachmentName: 'a.pdf' }), justification({ studentId: 58 }), justification({ history: null })]) {
    assert.throws(() => parseAttendanceJustification(bad, { studentId: 57 }), GuardianContractError);
  }
  assert.equal(parseAttendanceJustificationsPage(pageOf([justification()]), { page: 0, size: 20, studentId: 57 }).content.length, 1);
  assert.throws(() => parseAttendanceJustificationsPage(pageOf([justification(), justification()]), { page: 0, size: 20 }), GuardianContractError);
  assert.deepEqual(parseJustificationAttachmentUrl({ url: 'https://files.example/x?sig=1', expiresInSeconds: 300, other: true }), { url: 'https://files.example/x?sig=1', expiresInSeconds: 300 });
  for (const bad of [{ url: 'javascript:alert(1)', expiresInSeconds: 300 }, { url: 'https://x', expiresInSeconds: 0 }, { url: 1 }]) assert.throws(() => parseJustificationAttachmentUrl(bad), GuardianContractError);
});

test('códigos: solo cuentan con su estado del contrato; 401/403 sin code; mensajes saneados', () => {
  assert.equal(guardianPortalErrorCode(httpError(409, 'REPORT_NOT_PUBLISHED')), 'REPORT_NOT_PUBLISHED');
  assert.equal(guardianPortalErrorCode(httpError(400, 'REPORT_NOT_PUBLISHED')), null);
  assert.equal(guardianPortalErrorCode(httpError(403, 'STUDENT_NOT_FOUND')), null);
  assert.equal(guardianJustificationErrorCode(httpError(409, 'JUSTIFICATION_DEADLINE_EXPIRED')), 'JUSTIFICATION_DEADLINE_EXPIRED');
  assert.equal(guardianJustificationErrorCode(httpError(503, 'FILE_STORAGE_UNAVAILABLE')), 'FILE_STORAGE_UNAVAILABLE');
  for (const [code, statuses] of Object.entries({ ...GUARDIAN_PORTAL_CONTRACT_STATUSES })) {
    for (const subject of ['attendance', 'incidents', 'report'] as const) assert.doesNotMatch(guardianReadErrorMessage(httpError(statuses[0], code), subject), /DETALLE INTERNO/);
  }
  for (const [code, statuses] of Object.entries(GUARDIAN_JUSTIFICATION_CONTRACT_STATUSES)) {
    assert.doesNotMatch(guardianJustificationErrorMessage(httpError(statuses[0], code), 'list'), /DETALLE INTERNO/);
  }
  assert.match(guardianReadErrorMessage(httpError(404, 'STUDENT_NOT_FOUND'), 'incidents'), /ya no está vinculado/);
  assert.match(guardianReadErrorMessage(httpError(409, 'REPORT_NOT_PUBLISHED'), 'report'), /todavía no está publicada/);
  assert.match(guardianReadErrorMessage(httpError(403), 'report'), /perfil de apoderado/);
  assert.match(guardianReadErrorMessage(httpError(401), 'students'), /sesión ha expirado/);
  assert.match(guardianReadErrorMessage(httpError(undefined), 'attendance'), /conectar con el servidor/);
  assert.match(guardianReadErrorMessage(new GuardianContractError('libreta'), 'report'), /No se pudo cargar la libreta/);
  assert.match(guardianJustificationErrorMessage(httpError(409, 'JUSTIFICATION_ALREADY_ACTIVE'), 'submit'), /solicitud vigente/);
  // Un envío sin respuesta, con 5xx o fuera de contrato no se confirma ni se reintenta solo.
  for (const error of [httpError(undefined), httpError(500), new GuardianContractError('justificación')]) {
    assert.ok(isUnconfirmedJustificationWrite(error)); assert.match(guardianJustificationErrorMessage(error, 'submit'), /No se pudo confirmar el envío/);
  }
  assert.ok(!isUnconfirmedJustificationWrite(httpError(503, 'FILE_STORAGE_UNAVAILABLE')));
  assert.match(guardianJustificationErrorMessage(httpError(503, 'FILE_STORAGE_UNAVAILABLE'), 'submit'), /almacenamiento/);
});

test('servicios de lectura: rutas, parámetros y validación previa sin petición', async () => {
  await withHttp(call => {
    if (call.url.endsWith('/incidents')) return { status: 200, data: pageOf([incident(1)], { size: 10 }) };
    if (call.url.endsWith('/published')) return { status: 200, data: [published(1)] };
    if (call.url.endsWith('/report')) return { status: 200, data: report() };
    return { status: 200, data: attendance() };
  }, async calls => {
    assert.equal((await guardianIncidentsService.list('57', '2026-10-01', '2026-10-31', 0, 10)).content.length, 1);
    assert.equal((await guardianReportService.published('57')).length, 1);
    assert.equal((await guardianReportService.report('57', 11)).bimester.id, 11);
    assert.equal((await getGuardianAttendance('57', '2026-10-01', '2026-10-31')).records[1].justification?.id, 9);
    assert.deepEqual(calls.map(c => [c.method, c.url, c.params]), [
      ['GET', '/v1/guardian/students/57/incidents', { from: '2026-10-01', to: '2026-10-31', page: 0, size: 10 }],
      ['GET', '/v1/guardian/students/57/bimesters/published', undefined],
      ['GET', '/v1/guardian/students/57/bimesters/11/report', undefined],
      ['GET', '/v1/guardian/students/57/attendance', { from: '2026-10-01', to: '2026-10-31' }],
    ]);
    const before = calls.length;
    await assert.rejects(guardianIncidentsService.list('57', '2026-01-01', '2026-04-03'), /92 días/);
    await assert.rejects(guardianIncidentsService.list('hijo-002', '2026-10-01', '2026-10-31'), /estudiante vinculado/);
    await assert.rejects(guardianIncidentsService.list('57', '2026-10-01', '2026-10-31', 0, 101), /paginación/);
    await assert.rejects(guardianReportService.report('57', 0), /bimestre publicado/);
    await assert.rejects(guardianReportService.report('57; DROP', 11), /estudiante vinculado/);
    assert.equal(calls.length, before);
    assert.equal(guardianIncidentsErrorMessage(new Error('DETALLE INTERNO')), 'No se pudieron cargar las incidencias. Intenta nuevamente.');
  });
  await withHttp(() => ({ status: 200, data: report() }), async () => {
    await assert.rejects(guardianReportService.report('58', 11), GuardianContractError);
  });
});

test('PDF de la libreta: blob con el JWT y nombre saneado de Content-Disposition', async () => {
  assert.equal(guardianReportFileName('attachment; filename="libreta-C26000057-1.pdf"', 'x.pdf'), 'libreta-C26000057-1.pdf');
  assert.equal(guardianReportFileName('attachment; filename="../../etc/passwd"', 'libreta-1.pdf'), 'libreta-1.pdf');
  assert.equal(guardianReportFileName('attachment; filename="..\\evil<script>.pdf"', 'f.pdf'), 'evilscript.pdf');
  assert.equal(guardianReportFileName(undefined, 'libreta-1.pdf'), 'libreta-1.pdf');
  const pdf = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
  await withHttp(() => ({ status: 200, data: pdf, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="libreta-C26000057-1.pdf"' } }), async calls => {
    const result = await guardianReportService.reportPdf('57', 11);
    assert.equal(result.blob, pdf); assert.equal(result.fileName, 'libreta-C26000057-1.pdf');
    assert.equal(calls[0].url, '/v1/guardian/students/57/bimesters/11/report.pdf'); assert.equal(calls[0].responseType, 'blob');
  });
  for (const headers of [{ 'content-type': 'text/html' }, {}] as Record<string, string>[]) {
    await withHttp(() => ({ status: 200, data: pdf, headers }), async () => { await assert.rejects(guardianReportService.reportPdf('57', 11), GuardianContractError); });
  }
  await withHttp(() => ({ status: 200, data: new Blob([], { type: 'application/pdf' }), headers: { 'content-type': 'application/pdf' } }), async () => {
    await assert.rejects(guardianReportService.reportPdf('57', 11), GuardianContractError);
  });
});

test('justificaciones: multipart validado, 201 confirmado y nada se envía si la validación falla', async () => {
  const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
  assert.equal(justificationTextError('  ', 'motivo'), 'Indica el motivo.');
  assert.match(justificationTextError('x'.repeat(2001), 'respuesta') ?? '', /2000 caracteres/);
  assert.equal(justificationFileError(file('a.pdf', 'application/pdf')), null);
  assert.equal(justificationFileError(file('a.jpeg', 'image/jpeg')), null);
  assert.match(justificationFileError(file('a.exe', 'application/pdf')) ?? '', /PDF, JPEG o PNG/);
  assert.match(justificationFileError(file('a.gif', 'image/gif')) ?? '', /PDF, JPEG o PNG/);
  assert.match(justificationFileError(file('a.pdf', 'application/pdf', 0)) ?? '', /vacío/);
  assert.match(justificationFileError(file('a.pdf', 'application/pdf', 15 * 1024 * 1024 + 1)) ?? '', /15 MB/);

  await withHttp(call => {
    if (call.url.endsWith('/justifications') && call.method === 'POST') return { status: 201, data: justification() };
    if (call.url.endsWith('/response')) return { status: 200, data: justification({ status: 'PENDIENTE', response: 'Adjunto constancia' }) };
    if (call.url.endsWith('/download-url')) return { status: 200, data: { url: 'https://files.example/a?sig=1', expiresInSeconds: 300 } };
    if (call.url.endsWith('/justifications/9')) return { status: 200, data: justification() };
    return { status: 200, data: pageOf([justification({ status: 'OBSERVADA' })]) };
  }, async calls => {
    const created = await guardianJustificationsService.submit('57', 502, '  Cita médica  ', file('constancia.pdf', 'application/pdf'));
    assert.equal(created.id, 9);
    const form = calls[0].data as FormData;
    assert.ok(form instanceof FormData); assert.equal(form.get('reason'), 'Cita médica'); assert.equal((form.get('file') as File).name, 'constancia.pdf');
    assert.equal(calls[0].url, '/v1/guardian/students/57/attendance/502/justifications');
    assert.equal((await guardianJustificationsService.list('57', { status: 'OBSERVADA' })).content[0].status, 'OBSERVADA');
    assert.deepEqual(calls[1].params, { status: 'OBSERVADA', page: 0, size: 20 });
    assert.equal((await guardianJustificationsService.detail('57', 9)).id, 9);
    assert.equal((await guardianJustificationsService.respond('57', 9, 'Adjunto constancia')).status, 'PENDIENTE');
    assert.equal((calls[3].data as FormData).get('response'), 'Adjunto constancia'); assert.equal((calls[3].data as FormData).get('file'), null);
    assert.equal((await guardianJustificationsService.attachmentUrl('57', 9)).expiresInSeconds, 300);
    assert.deepEqual(calls.map(c => `${c.method} ${c.url}`), [
      'POST /v1/guardian/students/57/attendance/502/justifications', 'GET /v1/guardian/students/57/justifications',
      'GET /v1/guardian/students/57/justifications/9', 'POST /v1/guardian/students/57/justifications/9/response',
      'POST /v1/guardian/students/57/justifications/9/attachment/download-url',
    ]);
    const before = calls.length;
    await assert.rejects(guardianJustificationsService.submit('57', 502, ' '), /Indica el motivo/);
    await assert.rejects(guardianJustificationsService.submit('57', 0, 'Motivo'), /sesión de asistencia/);
    await assert.rejects(guardianJustificationsService.submit('57', 502, 'Motivo', file('a.gif', 'image/gif')), /PDF, JPEG o PNG/);
    assert.equal(calls.length, before);
    assert.match(guardianJustificationErrorMessage(await guardianJustificationsService.submit('57', 502, ' ').catch(e => e), 'submit'), /Indica el motivo/);
  });
  // Un 200 en lugar de 201, otra sesión o un estado distinto de PENDIENTE no confirman el envío.
  for (const reply of [{ status: 200, data: justification() }, { status: 201, data: justification({ attendanceId: 503 }) }, { status: 201, data: justification({ status: 'APROBADA' }) }]) {
    await withHttp(() => reply, async () => {
      const error = await guardianJustificationsService.submit('57', 502, 'Motivo').catch(e => e);
      assert.ok(error instanceof GuardianContractError); assert.match(guardianJustificationErrorMessage(error, 'submit'), /No se pudo confirmar el envío/);
    });
  }
  await withHttp(() => ({ status: 200, data: pageOf([justification({ status: 'APROBADA' })]) }), async () => {
    await assert.rejects(guardianJustificationsService.list('57', { status: 'OBSERVADA' }), GuardianContractError);
  });
});
