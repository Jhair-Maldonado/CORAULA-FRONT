import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import axios, { isAxiosError, type AxiosAdapter } from 'axios';
import { jwtDecode } from 'jwt-decode';
import httpClient, { MOCK_ADAPTER_MARK } from '../src/services/httpClient';
import { createMockAdapter } from '../src/mocks/http/mockAdapter';
import { createMockStore } from '../src/mocks/http/fixtures/shared';
import { authService } from '../src/services/authService';
import { getHijos } from '../src/services/padres/padreService';
import { getGuardianAttendance } from '../src/services/padres/guardianAttendanceService';
import { guardianIncidentsService } from '../src/services/padres/guardianIncidentsService';
import { guardianReportService } from '../src/services/padres/guardianReportService';
import { dashboardIndicatorsService } from '../src/services/admin/dashboardIndicatorsService';
import { dailyAttendanceService } from '../src/services/admin/dailyAttendanceService';
import { managementEarlyAlertsService } from '../src/services/admin/managementEarlyAlertsService';
import { evaluationService } from '../src/services/admin/evaluationService';
import { teacherIncidentsService } from '../src/services/teacher/teacherIncidentsService';
import { teacherGradesService } from '../src/services/teacher/teacherGradesService';
import { teacherAttendanceService } from '../src/services/teacher/teacherAttendanceService';
import { schedulesService, scheduleError } from '../src/services/admin/schedulesService';
import { evaluationErrorMessage } from '../src/services/admin/evaluationService';
import { teachersService, teacherErrorStatus } from '../src/services/admin/teachersService';
import { accountStateService } from '../src/services/admin/accountStateService';
import { coursesService } from '../src/services/admin/coursesService';
import { adminGradesService } from '../src/services/admin/adminGradesService';
import { adminActivityGradesService } from '../src/services/admin/adminActivityGradesService';
import { bimesterPublicationService } from '../src/services/admin/bimesterPublicationService';
import { gradeWindowService } from '../src/services/admin/gradeWindowService';
import { managementAttendanceService } from '../src/services/admin/managementAttendanceService';
import { managementMaterialsService } from '../src/services/admin/managementMaterialsService';
import { staffAccountsService } from '../src/services/admin/staffAccountsService';
import { auditService } from '../src/services/management/auditService';
import { teacherActivitiesService } from '../src/services/teacher/teacherActivitiesService';
import { teacherCourseRegistrationService } from '../src/services/teacher/teacherCourseRegistrationService';
import { teacherEarlyAlertsService } from '../src/services/teacher/teacherEarlyAlertsService';
import { teacherMaterialsService, teacherMaterialsErrorCode } from '../src/services/teacher/teacherMaterialsService';
import { parseAttendanceJustification, parseAttendanceJustificationsPage, parseGuardianAttendance, parseJustificationAttachmentUrl } from '../src/lib/guardianContract';

// Adaptador del modo MOCK: sin red. Los fixtures pasan por los servicios reales y sus parsers estrictos.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date('2026-11-02T15:00:00Z'); // lunes 2 de noviembre de 2026, 10:00 en Lima

function client(adapter: AxiosAdapter) {
  return axios.create({ baseURL: 'http://localhost:8080/api', adapter });
}
const fresh = (warn: (m: string) => void = () => {}) => createMockAdapter({ latencyMs: 0, store: createMockStore(() => NOW), warn });

async function status(promise: Promise<unknown>): Promise<number> {
  try { await promise; return 200; } catch (error) { assert.ok(isAxiosError(error)); return error.response?.status ?? 0; }
}

async function loginAs(api: ReturnType<typeof client>, email: string) {
  const { data } = await api.post('/v1/auth/login', { email, password: 'cualquier-clave' });
  return data as { token: string; tokenType: string; role: string; passwordChangeRequired: boolean };
}

/** Ejecuta servicios reales con el adaptador simulado y la sesión del rol indicado. */
async function asRole<T>(email: string, run: () => Promise<T>): Promise<T> {
  const original = httpClient.defaults.adapter;
  const saved = (['window', 'localStorage'] as const).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const adapter = fresh();
  httpClient.defaults.adapter = adapter;
  const { token } = await loginAs(client(adapter), email);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() { return true; } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => (k === 'token' ? token : null) } });
  try {
    return await run();
  } finally {
    httpClient.defaults.adapter = original;
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  }
}

test('login por rol: JWT decodificable con rol y expiración a 8 h; 401 y 423', async () => {
  const api = client(fresh());
  for (const [email, role] of [['admin@demo.local', 'ADMINISTRADOR'], ['secretaria@demo.local', 'DIRECTIVO'], ['docente@demo.local', 'DOCENTE'], ['padre@demo.local', 'APODERADO']]) {
    const data = await loginAs(api, email);
    assert.equal(data.role, role);
    assert.equal(data.passwordChangeRequired, false);
    const claims = jwtDecode<{ role: string; exp: number; iat: number; sub: string }>(data.token);
    assert.equal(claims.role, role);
    assert.equal(claims.sub, email);
    assert.equal(claims.exp - claims.iat, 8 * 3600);
  }
  assert.equal(await status(api.post('/v1/auth/login', { email: 'otro@demo.local', password: 'cualquier-clave' })), 401);
  assert.equal(await status(api.post('/v1/auth/login', { email: 'admin@demo.local', password: 'corta' })), 401);
  try {
    await api.post('/v1/auth/login', { email: 'bloqueado@demo.local', password: 'cualquier-clave' });
    assert.fail('debía responder 423');
  } catch (error) {
    assert.ok(isAxiosError(error));
    assert.equal(error.response?.status, 423);
  }
});

test('roles: sin token 401 sin code; rol incorrecto 403 sin code', async () => {
  const api = client(fresh());
  const { token } = await loginAs(api, 'padre@demo.local');
  try { await api.get('/v1/guardian/students'); assert.fail('401'); } catch (e) {
    assert.ok(isAxiosError(e)); assert.equal(e.response?.status, 401); assert.equal((e.response?.data as { code?: string }).code, undefined);
  }
  try { await api.get('/v1/management/academic-periods', { headers: { Authorization: `Bearer ${token}` } }); assert.fail('403'); } catch (e) {
    assert.ok(isAxiosError(e)); assert.equal(e.response?.status, 403); assert.equal((e.response?.data as { code?: string }).code, undefined);
  }
  assert.equal((await api.get('/v1/guardian/students', { headers: { Authorization: `Bearer ${token}` } })).status, 200);
});

test('ruta sin mock: 501 MOCK_NOT_IMPLEMENTED y aviso en consola con la ruta', async () => {
  const warnings: string[] = [];
  const api = client(fresh(m => warnings.push(m)));
  try {
    await api.delete('/v1/management/sections/10/courses/301');
    assert.fail('debía responder 501');
  } catch (error) {
    assert.ok(isAxiosError(error));
    assert.equal(error.response?.status, 501);
    assert.equal((error.response?.data as { code: string }).code, 'MOCK_NOT_IMPLEMENTED');
  }
  assert.deepEqual(warnings, ['[CORAULA MOCK] Ruta sin mock: DELETE /v1/management/sections/10/courses/301']);
});

test('apoderado: hijos, asistencia, incidencias y libreta pasan los parsers estrictos; PDF como Blob', async () => {
  await asRole('padre@demo.local', async () => {
    const hijos = await getHijos();
    assert.deepEqual(hijos.map(h => [h.id, h.nombreCompleto]), [['57', 'Ana Arias Demo'], ['58', 'Luis Arias Demo'], ['61', 'Sofía Arias Demo']]);
    const attendance = await getGuardianAttendance('57', '2026-10-05', '2026-11-02');
    assert.ok(attendance.records.length > 0);
    assert.ok(attendance.records.every(r => r.date < '2026-11-02'), 'hoy sin registrar no aparece');
    const incidents = await guardianIncidentsService.list('57', '2026-10-04', '2026-11-02');
    assert.equal(incidents.totalElements, 2);
    assert.deepEqual(incidents.content.map(i => i.courseName), ['Matemática', 'Comunicación']);
    const published = await guardianReportService.published('57');
    assert.deepEqual(published.map(b => [b.number, b.revision]), [[3, 1], [2, 2], [1, 1]]);
    const report = await guardianReportService.report('58', 13);
    assert.equal(report.student.fullName, 'Luis Arias Demo');
    assert.equal(report.section.level, 'SECONDARY');
    assert.ok(report.courses.some(c => c.criteria.some(x => x.grade === null)), 'una nota sin registrar');
    // Libreta de Ana en el III Bimestre: notas menores que 11 (también 10,50) y un criterio sin nota.
    const ana = await guardianReportService.report('57', 13);
    assert.deepEqual(ana.courses.map(c => [c.name, c.grade]), [['Matemática', 9], ['Comunicación', 10.5], ['Ciencia y Tecnología', 14]]);
    assert.deepEqual(ana.courses[2].criteria.map(c => c.grade), [14, null]);
    assert.deepEqual(ana.areas.map(a => a.grade), [9, 10.5, 14]);
    const anaII = await guardianReportService.report('57', 12);
    assert.ok(anaII.courses.every(c => c.criteria.every(x => x.grade !== null && x.grade >= 11)), 'el resto de bimestres no cambia');
    const pdf = await guardianReportService.reportPdf('57', 11);
    assert.equal(pdf.fileName, 'libreta-C26000057-1.pdf');
    assert.match(await pdf.blob.text(), /^%PDF-1\.4[\s\S]*%%EOF\n$/);
    await assert.rejects(getGuardianAttendance('59', '2026-10-05', '2026-11-02'), /ya no está vinculado/);
    await assert.rejects(guardianReportService.report('57', 14), (e: unknown) => isAxiosError(e) && e.response?.status === 409);
  });
});

test('gestión: periodos, bimestres, vacantes, asistencia diaria y alertas pasan sus parsers', async () => {
  await asRole('secretaria@demo.local', async () => {
    const bimesters = await evaluationService.getBimesters(1);
    assert.deepEqual(bimesters.map(b => b.status), ['CERRADO', 'CERRADO', 'CERRADO', 'ABIERTO']);
    const vacancies = await dashboardIndicatorsService.vacancies(1);
    assert.deepEqual(vacancies, { totalCapacity: 95, activeEnrollmentCount: 5, availableVacancies: 90, grades: 2 });
    const daily = await dailyAttendanceService.get({ academicPeriodId: 1, date: '2026-10-30' });
    assert.equal(daily.status, 'COMPLETE');
    assert.equal(daily.expectedStudents, 5);
    assert.equal((await dailyAttendanceService.get({ academicPeriodId: 1, date: '2026-11-01' })).status, 'NO_SESSIONS');
    const alerts = await managementEarlyAlertsService.list(14, null);
    assert.equal(alerts.content[0].fullName, 'Jorge Salas Demo');
  });
});

test('escritura en memoria: lo que registra el docente se refleja en su vista y en la del apoderado', async () => {
  const adapter = fresh();
  const api = client(adapter);
  const docente = { headers: { Authorization: `Bearer ${(await loginAs(api, 'docente@demo.local')).token}` } };
  const padre = { headers: { Authorization: `Bearer ${(await loginAs(api, 'padre@demo.local')).token}` } };
  const before = (await api.get('/v1/guardian/students/57/incidents', { ...padre, params: { from: '2026-10-04', to: '2026-11-02', page: 0, size: 20 } })).data;
  const created = await api.post('/v1/teacher/incidents', {
    sectionCourseId: 301, enrollmentId: 501, occurredAt: '2026-11-02T09:30:00-05:00', location: 'Aula 5A', severity: 'GRAVE', description: 'Incidencia de prueba.', actionsTaken: null,
  }, docente);
  assert.equal(created.status, 201);
  const after = (await api.get('/v1/guardian/students/57/incidents', { ...padre, params: { from: '2026-10-04', to: '2026-11-02', page: 0, size: 20 } })).data;
  assert.equal(after.totalElements, before.totalElements + 1);
  assert.equal(after.content[0].severity, 'GRAVE');

  await api.put('/v1/teacher/courses/301/attendance/401', { records: [{ enrollmentId: 501, status: 'INASISTENCIA' }, { enrollmentId: 503, status: 'PRESENTE' }, { enrollmentId: 504, status: 'TARDANZA' }] }, { ...docente, params: { date: '2026-11-02' } });
  const session = (await api.get('/v1/teacher/courses/301/attendance', { ...docente, params: { date: '2026-11-02' } })).data.sessions[0];
  assert.deepEqual(session.students.map((s: { status: string }) => s.status), ['INASISTENCIA', 'PRESENTE', 'TARDANZA', null]);
  const today = (await api.get('/v1/guardian/students/57/attendance', { ...padre, params: { from: '2026-11-02', to: '2026-11-02' } })).data;
  assert.deepEqual(today.records.map((r: { status: string }) => r.status), ['INASISTENCIA']);

  // Un adaptador nuevo parte de los datos iniciales.
  const other = client(fresh());
  const padre2 = { headers: { Authorization: `Bearer ${(await loginAs(other, 'padre@demo.local')).token}` } };
  assert.equal((await other.get('/v1/guardian/students/57/incidents', { ...padre2, params: { from: '2026-10-04', to: '2026-11-02', page: 0, size: 20 } })).data.totalElements, before.totalElements);
});

test('docente: planilla de notas e incidencias pasan los parsers de sus servicios', async () => {
  await asRole('docente@demo.local', async () => {
    const sheet = await teacherGradesService.getSheet({ sectionCourseId: 301, courseId: 101, bimesterId: 13, academicPeriodId: 1 });
    assert.equal(sheet.students.length, 4);
    assert.ok(sheet.students.filter(s => s.studentId !== 61).every(s => s.grades.every(g => g.grade !== null)), 'quien se matriculó después tiene la planilla vacía');
    const incidents = await teacherIncidentsService.getIncidents({ page: 0, size: 20 });
    assert.equal(incidents.totalElements, 3);
    const attendance = await teacherAttendanceService.getAttendance(302, '2026-10-30');
    assert.equal(attendance.sessions[0].pendingCount, 0);
    await assert.rejects(teacherAttendanceService.getAttendance(303, '2026-10-30'), (e: unknown) => isAxiosError(e) && e.response?.status === 404);
  });
});

// Proceso aparte: httpClient decide al importarse si instala el adaptador.
function probe(env: Record<string, string>): { mark: boolean; status?: number; role?: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'coraula-mode-'));
  const script = path.join(dir, 'probe.mts');
  writeFileSync(script, `
    const { default: httpClient, MOCK_ADAPTER_MARK } = await import(${JSON.stringify(pathToFileURL(path.join(ROOT, 'src/services/httpClient.ts')).href)});
    const mark = Boolean(httpClient.defaults.adapter && httpClient.defaults.adapter[MOCK_ADAPTER_MARK]);
    let result = { mark };
    if (mark) {
      const res = await httpClient.post('/v1/auth/login', { email: 'padre@demo.local', password: 'cualquier-clave' });
      result = { mark, status: res.status, role: res.data.role };
    }
    console.log(JSON.stringify(result));
  `);
  try {
    const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('NEXT_PUBLIC_') && k !== 'NODE_ENV'));
    const run = spawnSync(process.execPath, ['--import', 'tsx', script], { cwd: ROOT, env: { ...clean, ...env } as NodeJS.ProcessEnv, encoding: 'utf8', timeout: 60_000 });
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout.trim().split('\n').at(-1)!);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('MOCK instala el adaptador y responde sin red (no hay backend en localhost:8080); fuera de MOCK no se instala', () => {
  assert.deepEqual(probe({ NEXT_PUBLIC_APP_MODE: 'MOCK', NEXT_PUBLIC_MOCK_LATENCY_MS: '0' }), { mark: true, status: 200, role: 'APODERADO' });
  assert.deepEqual(probe({ NEXT_PUBLIC_USE_MOCKS: 'true', NEXT_PUBLIC_MOCK_LATENCY_MS: '0' }), { mark: true, status: 200, role: 'APODERADO' });
  assert.deepEqual(probe({ NEXT_PUBLIC_APP_MODE: 'LOCAL', NEXT_PUBLIC_USE_MOCKS: 'true' }), { mark: false });
  assert.deepEqual(probe({ NEXT_PUBLIC_APP_MODE: 'PRODUCTION', NEXT_PUBLIC_API_URL: 'https://api.ejemplo.test/api' }), { mark: false });
  assert.deepEqual(probe({}), { mark: false });
  // En este proceso de pruebas (LOCAL) tampoco está instalado.
  assert.equal(Boolean((httpClient.defaults.adapter as unknown as Record<string, unknown> | undefined)?.[MOCK_ADAPTER_MARK]), false);
});

test('justificaciones (#57) en MOCK: flujo completo apoderado ↔ directivo con los 409 del contrato', async () => {
  const api = client(fresh());
  const auth = async (email: string) => ({ headers: { Authorization: `Bearer ${(await loginAs(api, email)).token}` } });
  const [padre, docente, directivo, admin] = await Promise.all(
    ['padre@demo.local', 'docente@demo.local', 'secretaria@demo.local', 'admin@demo.local'].map(auth),
  );
  const codeOf = async (promise: Promise<unknown>) => {
    try { await promise; return 'OK'; } catch (error) { assert.ok(isAxiosError(error)); return `${error.response?.status} ${error.response?.data?.code ?? ''}`.trim(); }
  };
  const form = (field: 'reason' | 'response', text: string, file?: File) => {
    const data = new FormData();
    data.append(field, text);
    if (file) data.append('file', file, file.name);
    return data;
  };
  const attendance = async (from: string, to: string) =>
    parseGuardianAttendance((await api.get('/v1/guardian/students/57/attendance', { ...padre, params: { from, to } })).data, { studentId: 57, from, to });
  const decide = (id: number, decision: string, who = directivo) =>
    api.post(`/v1/management/attendance-justifications/${id}/decision`, { decision, comment: 'Revisado.' }, who);
  const submitPath = (attendanceId: number) => `/v1/guardian/students/57/attendance/${attendanceId}/justifications`;

  // Semillas: PENDIENTE, OBSERVADA y APROBADA sobre faltas reales de Ana, enlazadas con su asistencia.
  const seeds = parseAttendanceJustificationsPage((await api.get('/v1/guardian/students/57/justifications', { ...padre, params: { page: 0, size: 20 } })).data, { page: 0, size: 20, studentId: 57 });
  assert.deepEqual(seeds.content.map(j => j.status).sort(), ['APROBADA', 'OBSERVADA', 'PENDIENTE']);
  const history = await attendance('2026-09-23', '2026-11-02');
  for (const seed of seeds.content) {
    const record = history.records.find(r => r.attendanceId === seed.attendanceId);
    assert.ok(record, `semilla ${seed.id} enlazada`);
    assert.equal(record.status, seed.attendanceStatus);
    assert.deepEqual(record.justification, { id: seed.id, status: seed.status });
    assert.equal(record.justified, seed.status === 'APROBADA');
  }

  // Envío: el docente registra una inasistencia hoy y el apoderado la justifica con un PDF.
  await api.put('/v1/teacher/courses/301/attendance/401', { records: [{ enrollmentId: 501, status: 'INASISTENCIA' }, { enrollmentId: 503, status: 'PRESENTE' }, { enrollmentId: 504, status: 'PRESENTE' }] }, { ...docente, params: { date: '2026-11-02' } });
  const [today] = (await attendance('2026-11-02', '2026-11-02')).records;
  assert.equal(today.status, 'INASISTENCIA');
  const pdf = new File(['%PDF-1.4'], 'constancia.pdf', { type: 'application/pdf' });
  const created = await api.post(submitPath(today.attendanceId), form('reason', 'Cita médica.', pdf), padre);
  assert.equal(created.status, 201);
  const justification = parseAttendanceJustification(created.data, { studentId: 57 });
  assert.deepEqual([justification.date, justification.courseName, justification.attendanceStatus, justification.attachmentName], ['2026-11-02', today.courseName, 'INASISTENCIA', 'constancia.pdf']);
  assert.deepEqual((await attendance('2026-11-02', '2026-11-02')).records[0].justification, { id: justification.id, status: 'PENDIENTE' });
  assert.equal(await codeOf(api.post(submitPath(today.attendanceId), form('reason', 'Otra vez.'), padre)), '409 JUSTIFICATION_ALREADY_ACTIVE');

  // Elegibilidad, plazo y archivos.
  const presente = history.records.find(r => r.status === 'PRESENTE')!;
  assert.equal(await codeOf(api.post(submitPath(presente.attendanceId), form('reason', 'x'), padre)), '409 ATTENDANCE_NOT_ELIGIBLE');
  const vencida = history.records.find(r => r.status !== 'PRESENTE' && r.justification === null && r.date <= '2026-10-28');
  assert.ok(vencida, 'hay una falta sin justificar fuera de plazo');
  assert.equal(await codeOf(api.post(submitPath(vencida.attendanceId), form('reason', 'x'), padre)), '409 JUSTIFICATION_DEADLINE_EXPIRED');
  assert.equal(await codeOf(api.post(submitPath(999_999_999), form('reason', 'x'), padre)), '404 ATTENDANCE_NOT_FOUND');
  const exe = new File(['x'], 'programa.exe', { type: 'application/x-msdownload' });
  assert.equal(await codeOf(api.post(submitPath(today.attendanceId), form('reason', 'x', exe), padre)), '400 FILE_TYPE_NOT_ALLOWED');
  assert.equal(await codeOf(api.post('/v1/guardian/students/59/attendance/1/justifications', form('reason', 'x'), padre)), '404 STUDENT_NOT_FOUND');

  // Decisión: solo DIRECTIVO y solo sobre PENDIENTE; la respuesta solo sobre OBSERVADA.
  assert.equal(await codeOf(decide(justification.id, 'OBSERVADA', admin)), '403');
  assert.equal(await codeOf(api.post(`/v1/guardian/students/57/justifications/${justification.id}/response`, form('response', 'x'), padre)), '409 INVALID_JUSTIFICATION_TRANSITION');
  assert.equal((await decide(justification.id, 'OBSERVADA')).data.status, 'OBSERVADA');
  const answered = await api.post(`/v1/guardian/students/57/justifications/${justification.id}/response`, form('response', 'Adjunto la constancia.'), padre);
  assert.equal(answered.data.status, 'PENDIENTE');
  assert.equal((await decide(justification.id, 'RECHAZADA')).data.status, 'RECHAZADA');
  assert.equal(await codeOf(decide(justification.id, 'APROBADA')), '409 INVALID_JUSTIFICATION_TRANSITION');
  // Tras RECHAZADA cabe otra solicitud dentro del plazo original.
  assert.equal((await api.post(submitPath(today.attendanceId), form('reason', 'Nueva solicitud.'), padre)).status, 201);

  // Aprobar la semilla PENDIENTE marca la sesión como justificada.
  const pendiente = seeds.content.find(j => j.status === 'PENDIENTE')!;
  await decide(pendiente.id, 'APROBADA');
  const approved = (await attendance('2026-09-23', '2026-11-02')).records.find(r => r.attendanceId === pendiente.attendanceId)!;
  assert.equal(approved.justified, true);

  // Descarga: URL de la propia app (sin dominios externos) y el archivo existe en public/.
  const link = parseJustificationAttachmentUrl((await api.post(`/v1/management/attendance-justifications/${pendiente.id}/attachment/download-url`, null, admin)).data);
  const url = new URL(link.url);
  assert.equal(url.hostname, 'localhost');
  assert.equal(url.pathname, '/mock/justificacion-ejemplo.pdf');
  assert.match(readFileSync(path.join(ROOT, 'public', url.pathname), 'latin1'), /^%PDF-1\.4[\s\S]*%%EOF\n$/);
  const observada = seeds.content.find(j => j.status === 'OBSERVADA')!;
  assert.equal(await codeOf(api.post(`/v1/guardian/students/57/justifications/${observada.id}/attachment/download-url`, null, padre)), '404 FILE_NOT_FOUND');
});

// ---------- #164: cobertura del MOCK (los fixtures nuevos pasan por los services reales y sus parsers) ----------

test('gestión: el horario de la sección 12 incluye bloques de 45 y 90 min sin choques', async () => {
  await asRole('admin@demo.local', async () => {
    const blocks = await schedulesService.listBySection(12);
    assert.equal(blocks.length, 13, 'dos cursos por cinco días más tres bloques sueltos');
    const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
    const duration = (b: { startTime: string; endTime: string }) => minutes(b.endTime) - minutes(b.startTime);
    const extra = blocks.filter(b => b.id >= 4061);
    assert.deepEqual(extra.map(b => [b.id, b.day, duration(b)]), [[4061, 'MIERCOLES', 45], [4062, 'JUEVES', 45], [4063, 'VIERNES', 90]]);
    assert.equal(extra[1].classroom, null);
    assert.equal(new Set(blocks.map(b => b.id)).size, blocks.length);
    const section10 = await schedulesService.listBySection(10);
    assert.equal(section10.length, 15, 'la sección 10 no cambia');
    // Mismas reglas que scheduleConflicts del mock: sección, docente y aula no pueden coincidir en el mismo tramo y día.
    const all = [...blocks, ...section10];
    const overlap = (a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) => a.startTime < b.endTime && b.startTime < a.endTime;
    for (const mine of extra) {
      for (const other of all.filter(o => o.id !== mine.id && o.day === mine.day && overlap(mine, o))) {
        assert.notEqual(other.sectionId, mine.sectionId, `sección: ${mine.id} con ${other.id}`);
        if (mine.teacherId !== null) assert.notEqual(other.teacherId, mine.teacherId, `docente: ${mine.id} con ${other.id}`);
        if (mine.classroom && other.classroom) assert.notEqual(other.classroom.toLowerCase(), mine.classroom.toLowerCase(), `aula: ${mine.id} con ${other.id}`);
      }
    }
  });
});

test('gestión: horario y curso por id; 404, sección vacía y 403 para el docente', async () => {
  await asRole('admin@demo.local', async () => {
    const blocks = await schedulesService.listBySection(10);
    assert.equal(blocks.length, 15, 'tres cursos por cinco días');
    assert.deepEqual([...new Set(blocks.map(b => b.day))], ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']);
    assert.equal(new Set(blocks.map(b => b.id)).size, blocks.length);
    assert.ok(blocks.every(b => b.sectionId === 10 && /^\d{2}:\d{2}$/.test(b.startTime)));
    assert.deepEqual(await schedulesService.listBySection(11), []);
    await assert.rejects(schedulesService.listBySection(99), (e: unknown) => isAxiosError(e) && e.response?.status === 404);
    assert.equal((await coursesService.getById('101')).name, 'Matemática');
    await assert.rejects(coursesService.getById('999'), (e: unknown) => isAxiosError(e) && e.response?.status === 404 && (e.response.data as { message: string }).message === 'El curso no existe.');
  });
  await asRole('docente@demo.local', async () => {
    await assert.rejects(schedulesService.listBySection(10), (e: unknown) => isAxiosError(e) && e.response?.status === 403);
    await assert.rejects(coursesService.getById('101'), (e: unknown) => isAxiosError(e) && e.response?.status === 403);
  });
});

test('docente: asistencia en día hábil lista la sesión con todos los alumnos pendientes', async () => {
  await asRole('docente@demo.local', async () => {
    const attendance = await teacherAttendanceService.getAttendance(301, '2026-11-02');
    assert.ok(attendance.sessions.length > 0);
    const session = attendance.sessions[0];
    assert.equal(session.pendingCount, session.totalStudents);
    assert.equal(session.totalStudents, 4);
  });
});

test('apoderado: la hija matriculada después de publicar no tiene libreta (lista vacía y 404 REPORT_NOT_FOUND)', async () => {
  const api = client(fresh());
  const padre = { headers: { Authorization: `Bearer ${(await loginAs(api, 'padre@demo.local')).token}` } };
  assert.deepEqual((await api.get('/v1/guardian/students/61/bimesters/published', padre)).data, []);
  assert.equal((await api.get('/v1/guardian/students/57/bimesters/published', padre)).data.length, 3);
  try {
    await api.get('/v1/guardian/students/61/bimesters/13/report', padre);
    assert.fail('404');
  } catch (e) {
    assert.ok(isAxiosError(e));
    assert.equal(e.response?.status, 404);
    assert.equal((e.response?.data as { code: string }).code, 'REPORT_NOT_FOUND');
  }
  // Bimestre sin publicar: sigue siendo 409.
  try { await api.get('/v1/guardian/students/57/bimesters/14/report', padre); assert.fail('409'); } catch (e) {
    assert.ok(isAxiosError(e)); assert.equal((e.response?.data as { code: string }).code, 'REPORT_NOT_PUBLISHED');
  }
  assert.equal((await api.get('/v1/guardian/students/57/bimesters/13/report', padre)).status, 200);
});

test('gestión: evaluación, notas, actividades, publicación, plazo, asistencia, materiales, personal y auditoría pasan sus parsers', async () => {
  await asRole('admin@demo.local', async () => {
    assert.equal((await evaluationService.getCriteria(101, 1)).activeManualCriteriaCount, 2);
    assert.equal((await evaluationService.getCriterion(1011)).courseId, 101);
    const context = { sectionCourseId: 301, courseId: 101, academicPeriodId: 1, bimesterId: 13 };
    assert.equal((await adminGradesService.getSheet(context)).students.length, 4);
    const results = await adminGradesService.getResults(301, 14);
    assert.ok(results.students.every(s => s.courseGrade === null && s.reasons.includes('INSUFFICIENT_MANUAL_CRITERIA')));
    assert.ok(results.students.some(s => s.pa !== null), 'PA desde las notas de actividades');

    const activities = await adminActivityGradesService.listActivities({ sectionCourseId: 301, bimesterId: 14 });
    assert.deepEqual(activities.map(a => a.status), ['PUBLICADA', 'ANULADA', 'PLANIFICADA']);
    const published = activities.find(a => a.status === 'PUBLICADA')!;
    const sheet = await adminActivityGradesService.getSheet({ sectionCourseId: 301, bimesterId: 14 }, published.id);
    const corrected = sheet.students.find(s => s.version === 2)!;
    assert.equal((await adminActivityGradesService.getHistory(corrected.gradeId!)).length, 2);
    await assert.rejects(adminActivityGradesService.getSheet({ sectionCourseId: 301, bimesterId: 14 }, 999999), (e: unknown) => isAxiosError(e) && e.response?.status === 404);

    const open = await bimesterPublicationService.getPublication(14);
    assert.equal(open.publishedAt, null);
    assert.ok(open.details.length > 0);
    assert.equal((await bimesterPublicationService.getPublication(13)).status, 'CERRADO');
    assert.equal((await gradeWindowService.get(14)).deadline, '2026-12-25');

    assert.equal((await managementAttendanceService.getAttendance(301, '2026-11-02')).sessions[0].pendingCount, 4);
    const materials = await managementMaterialsService.list(301);
    assert.equal(materials.length, 3);
    assert.equal((await managementMaterialsService.list(303)).length, 0);
    assert.ok((await managementMaterialsService.downloadUrl(301, materials[0].id)).expiresInSeconds > 0);
    assert.equal((await staffAccountsService.list()).length, 3);
    assert.equal((await staffAccountsService.list({ status: 'DISABLED' })).length, 1);
    const audit = await auditService.list({ page: 0, size: 5, entity: 'SECTION' });
    assert.equal(audit.totalElements, 2);
    assert.equal((await auditService.detail(audit.content[0].id)).entity, 'SECTION');
    await assert.rejects(auditService.detail(1), (e: unknown) => isAxiosError(e) && e.response?.status === 404);
  });
  await asRole('secretaria@demo.local', async () => {
    await assert.rejects(staffAccountsService.list(), (e: unknown) => isAxiosError(e) && e.response?.status === 403);
    assert.equal((await adminGradesService.getResults(302, 14)).students.length, 4);
  });
});

test('docente: actividades, planilla, resultados, registro, alertas y materiales; escritura en memoria', async () => {
  await asRole('docente@demo.local', async () => {
    const context = { sectionCourseId: 301, bimesterId: 14 };
    const list = await teacherActivitiesService.getActivities(context);
    assert.equal(list.length, 3);
    const published = list.find(a => a.status === 'PUBLICADA')!;
    const sheet = await teacherActivitiesService.getGradesSheet(context, published.id);
    assert.equal(sheet.students.find(s => s.studentId === 61)!.eligibleForPa, false, 'matrícula posterior a la publicación');
    assert.equal(sheet.students.find(s => s.studentId === 57)!.pa, 15);

    const created = await teacherActivitiesService.createActivity(context, { title: 'Práctica nueva', description: null, type: 'PRACTICA', cuentaParaPa: true });
    assert.equal(created.status, 'PLANIFICADA');
    const codeOf = (e: unknown) => (isAxiosError(e) ? (e.response?.data as { code?: string }).code : undefined);
    await assert.rejects(teacherActivitiesService.saveGrade(context, created.id, { enrollmentId: 501, grade: 14, expectedVersion: null }), (e: unknown) => codeOf(e) === 'ACTIVITY_NOT_GRADEABLE');
    assert.equal((await teacherActivitiesService.publishActivity(context, created.id)).status, 'PUBLICADA');
    assert.equal((await teacherActivitiesService.saveGrade(context, created.id, { enrollmentId: 501, grade: 14, expectedVersion: null })).version, 1);
    await assert.rejects(teacherActivitiesService.saveGrade(context, created.id, { enrollmentId: 501, grade: 16, expectedVersion: null }), (e: unknown) => codeOf(e) === 'ACTIVITY_GRADE_STALE');
    const batch = await teacherActivitiesService.saveGrades(context, created.id, [
      { enrollmentId: 501, grade: 16, expectedVersion: 1, reason: 'Revisión del cuaderno.' }, { enrollmentId: 503, grade: 12, expectedVersion: null },
    ]);
    assert.deepEqual(batch.map(g => [g.enrollmentId, g.version]), [[501, 2], [503, 1]]);
    assert.equal((await teacherActivitiesService.annulActivity(context, created.id, 'Duplicada.')).status, 'ANULADA');
    assert.equal((await teacherActivitiesService.getActivities(context)).length, 4);

    assert.equal((await teacherGradesService.getResults(301, 14)).students.length, 4);
    assert.equal((await teacherCourseRegistrationService.get(301, 13)).registered, true);
    const open = await teacherCourseRegistrationService.get(301, 14);
    assert.deepEqual([open.registered, open.revision, open.publishedAt], [false, 0, null]);
    assert.equal((await teacherEarlyAlertsService.list(301, 14)).totalElements, 1);
    assert.equal((await teacherEarlyAlertsService.list(302, 14)).totalElements, 0);
    assert.equal((await teacherMaterialsService.list(301)).length, 3);
    await assert.rejects(teacherActivitiesService.getActivities({ sectionCourseId: 304, bimesterId: 14 }), (e: unknown) => isAxiosError(e) && e.response?.status === 404);
  });
});

test('gestión: escrituras en memoria de los flujos restaurados (estado del alumno, matrícula, apoderado, asignaciones)', async () => {
  const api = client(fresh());
  const admin = { headers: { Authorization: `Bearer ${(await loginAs(api, 'admin@demo.local')).token}` } };
  const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return isAxiosError(e) ? `${e.response?.status} ${(e.response?.data as { code?: string }).code ?? ''}`.trim() : 'x'; } };

  const suspended = (await api.patch('/v1/management/students/59/suspend', { reasonCode: 'ADMINISTRATIVE_REVIEW', justification: 'Revisión.' }, admin)).data;
  assert.deepEqual([suspended.previousStatus, suspended.studentStatus], ['ACTIVE', 'SUSPENDED']);
  assert.equal(await code(api.patch('/v1/management/students/59/suspend', { reasonCode: 'ADMINISTRATIVE_REVIEW', justification: 'x' }, admin)), '409 STUDENT_STATUS_CONFLICT');
  assert.equal(await code(api.patch('/v1/management/students/59/reactivate', { reasonCode: 'OTHER', justification: '' }, admin)), '400 VALIDATION_ERROR');
  assert.equal((await api.patch('/v1/management/students/59/reactivate', { reasonCode: 'OTHER', justification: 'Resuelto.' }, admin)).data.studentStatus, 'ACTIVE');

  const withdrawn = (await api.patch('/v1/management/students/60/enrollments/504/withdraw', { withdrawalDate: '2026-11-02', withdrawalReason: 'Traslado.' }, admin)).data;
  assert.equal(withdrawn.status, 'WITHDRAWN');
  assert.equal(await code(api.patch('/v1/management/students/60/enrollments/504/withdraw', { withdrawalDate: '2026-11-02', withdrawalReason: 'Otra vez.' }, admin)), '409 ENROLLMENT_STATUS_CONFLICT');
  const enrolled = await api.post('/v1/management/students/60/enrollments', { academicPeriodId: 1, sectionId: 11, enrollmentDate: '2026-11-03', reason: 'Nueva sección.' }, admin);
  assert.equal(enrolled.status, 201);
  assert.equal(enrolled.data.sectionId, 11);
  assert.equal(await code(api.post('/v1/management/students/60/enrollments', { academicPeriodId: 1, sectionId: 11, enrollmentDate: '2026-11-03', reason: 'x' }, admin)), '409 ACTIVE_ENROLLMENT_EXISTS');

  const guardian = { dni: '45000001', firstNames: 'Julia', paternalLastName: 'Salas', maternalLastName: null, phone: null, relationship: 'MOTHER', primary: true, authorizedPickup: false, reason: 'Alta.' };
  assert.equal((await api.post('/v1/management/students/59/guardians', guardian, admin)).status, 201);
  assert.equal(await code(api.post('/v1/management/students/59/guardians', guardian, admin)), '409 GUARDIAN_ALREADY_LINKED');

  assert.equal((await api.post('/v1/management/teachers/201/assignments', { sectionCourseId: 305 }, admin)).status, 201);
  assert.equal((await api.get('/v1/management/teachers/201', admin)).data.assignments.length, 3);
  assert.equal((await api.delete('/v1/management/teachers/201/assignments/905', admin)).status, 204);
  assert.equal((await api.get('/v1/management/teachers/201', admin)).data.assignments.length, 2);
});

// ---------- #164: roles de las escrituras simuladas (el backend las limita a ADMINISTRADOR) ----------

test('roles: DIRECTIVO recibe 403 en las escrituras y el historial que el backend reserva al ADMINISTRADOR', async () => {
  const api = client(fresh());
  const secretaria = { headers: { Authorization: `Bearer ${(await loginAs(api, 'secretaria@demo.local')).token}` } };
  const admin = { headers: { Authorization: `Bearer ${(await loginAs(api, 'admin@demo.local')).token}` } };
  const justification = { reasonCode: 'ADMINISTRATIVE_REVIEW', justification: 'Revisión.' };
  for (const action of ['suspend', 'reactivate', 'deactivate']) {
    assert.equal(await status(api.patch(`/v1/management/students/59/${action}`, justification, secretaria)), 403);
  }
  assert.equal(await status(api.post('/v1/management/students/60/enrollments', { academicPeriodId: 1, sectionId: 11, enrollmentDate: '2026-11-03' }, secretaria)), 403);
  assert.equal(await status(api.patch('/v1/management/students/60/enrollments/504/withdraw', { withdrawalDate: '2026-11-02', withdrawalReason: 'Traslado.' }, secretaria)), 403);
  assert.equal(await status(api.post('/v1/management/students/59/guardians', { dni: '45000001' }, secretaria)), 403);
  assert.equal(await status(api.get('/v1/management/activity-grades/1/history', secretaria)), 403);
  assert.equal(await status(api.post('/v1/management/teachers/201/account', { email: 'nuevo@demo.local' }, secretaria)), 403);
  assert.equal(await status(api.patch('/v1/management/accounts/950/deactivate', { reasonCode: 'OTHER', justification: 'x' }, secretaria)), 403);
  // El 403 no cambia el estado: el administrador sigue viendo al alumno activo.
  assert.equal((await api.get('/v1/management/students/59', admin)).data.studentStatus, 'ACTIVE');
  // Las escrituras que el backend abre a ambos roles responden para Secretaría.
  assert.equal((await api.post('/v1/management/schedules', { sectionCourseId: 301, day: 'LUNES', startTime: '14:00', endTime: '15:00' }, secretaria)).status, 201);
  assert.equal((await api.post('/v1/management/teachers', { dni: '40000077', firstNames: 'Ines', paternalLastName: 'Rojas' }, secretaria)).status, 201);
});

// ---------- #164: docentes y cuentas (perfil del docente, #154 y #155) ----------

test('docentes: alta, edición, cuenta de acceso y estado de la cuenta pasan por los services reales', async () => {
  const status = (e: unknown) => teacherErrorStatus(e);
  await asRole('admin@demo.local', async () => {
    const created = await teachersService.create({ dni: '40000077', firstNames: 'Ines', paternalLastName: 'Rojas', maternalLastName: 'Demo', phone: null, specialty: 'Arte' });
    assert.deepEqual([created.fullName, created.active, created.specialty], ['Ines Rojas Demo', true, 'Arte']);
    assert.equal((await teachersService.list({ search: 'Ines' })).totalElements, 1);
    const other = { firstNames: 'Otra', paternalLastName: 'Persona', maternalLastName: null, phone: null, specialty: null };
    await assert.rejects(teachersService.create({ dni: '40000077', ...other }), (e: unknown) => status(e) === 409);
    await assert.rejects(teachersService.create({ dni: '123', ...other }), (e: unknown) => status(e) === 400);

    const id = String(created.id);
    const updated = await teachersService.update(id, { specialty: '', phone: '900000077', active: false });
    assert.deepEqual([updated.specialty, updated.phone, updated.active], [null, '900000077', false]);
    await assert.rejects(teachersService.update('999', { phone: '1' }), (e: unknown) => status(e) === 404);
    await assert.rejects(teachersService.update('201', { dni: '40000002' }), (e: unknown) => status(e) === 409);
    await assert.rejects(teachersService.createAccount(id, { email: 'ines@demo.local' }), (e: unknown) => status(e) === 422, 'docente inactivo');

    await teachersService.update(id, { active: true });
    await assert.rejects(teachersService.createAccount(id, { email: 'sin-formato' }), (e: unknown) => status(e) === 400);
    await assert.rejects(teachersService.createAccount(id, { email: 'docente@demo.local' }), (e: unknown) => status(e) === 409, 'correo de otra cuenta');
    await assert.rejects(teachersService.createAccount('999', { email: 'x@demo.local' }), (e: unknown) => status(e) === 404);
    const account = await teachersService.createAccount(id, { email: 'Ines@Demo.local' });
    assert.deepEqual([account.email, account.created, account.role], ['ines@demo.local', true, 'DOCENTE']);
    assert.equal((await teachersService.createAccount(id, { email: 'ines@demo.local' })).created, false);
    await assert.rejects(teachersService.createAccount(id, { email: 'otro@demo.local' }), (e: unknown) => status(e) === 409, 'cuenta con otro correo');
    assert.deepEqual((await teachersService.getById(id)).account, { userId: account.userId, email: 'ines@demo.local', active: true });

    // El backend solo gestiona cuentas DIRECTIVO (lockDirectivo): la cuenta de un docente responde 404 ACCOUNT_NOT_FOUND.
    for (const action of ['DEACTIVATE', 'REACTIVATE'] as const) {
      await assert.rejects(accountStateService.change(account.userId, action, { reasonCode: 'OTHER', justification: 'Docente.' }), (e: unknown) => isAxiosError(e) && e.response?.status === 404 && (e.response.data as { code?: string }).code === 'ACCOUNT_NOT_FOUND');
    }
    assert.equal((await teachersService.getById(id)).account!.active, true, 'el 404 no cambia la cuenta');
    await assert.rejects(accountStateService.change(999999, 'DEACTIVATE', { reasonCode: 'OTHER', justification: 'x' }), (e: unknown) => status(e) === 404);
    // Cuentas de Secretaría: el estado se refleja en el listado de personal.
    const off = await accountStateService.change(950, 'DEACTIVATE', { reasonCode: 'RESIGNATION', justification: 'Renuncia.' });
    assert.deepEqual([off.active, off.previousActive], [false, true]);
    assert.equal((await staffAccountsService.list({ status: 'DISABLED' })).filter(a => a.userId === 950).length, 1);
    await assert.rejects(accountStateService.change(950, 'DEACTIVATE', { reasonCode: 'RESIGNATION', justification: 'Otra vez.' }), (e: unknown) => status(e) === 409);
    await assert.rejects(accountStateService.change(950, 'REACTIVATE', { reasonCode: 'RESIGNATION', justification: 'Motivo de otra acción.' } as never), (e: unknown) => status(e) === 400);
    assert.equal((await accountStateService.change(950, 'REACTIVATE', { reasonCode: 'RETURN_TO_POST', justification: 'Regresa.' })).active, true);
  });
  await asRole('secretaria@demo.local', async () => {
    await assert.rejects(teachersService.createAccount('201', { email: 'nuevo@demo.local' }), (e: unknown) => status(e) === 403);
    await assert.rejects(accountStateService.change(950, 'DEACTIVATE', { reasonCode: 'OTHER', justification: 'x' }), (e: unknown) => status(e) === 403);
    assert.equal((await teachersService.update('201', { phone: '900000009' })).phone, '900000009');
  });
});

// ---------- #164: horario con bloques en el store (#156) ----------

test('horario: crear, mover y borrar bloques; choques de sección, docente y aula devuelven 409 con detalles', async () => {
  await asRole('admin@demo.local', async () => {
    const before = await schedulesService.listBySection(10);
    // 301 (Matemática, docente 201) en un hueco libre del lunes.
    const block = await schedulesService.create({ sectionCourseId: 301, day: 'LUNES', startTime: '14:00', endTime: '15:30', classroom: ' Aula 9 ' });
    assert.deepEqual([block.sectionId, block.courseName, block.teacherId, block.classroom], [10, 'Matemática', 201, 'Aula 9']);
    assert.equal((await schedulesService.listBySection(10)).length, before.length + 1);

    /** Detalles del 409, o el estado si fue otra respuesta, o null si se creó. */
    const conflict = (promise: Promise<unknown>) => promise.then(() => null, (e: unknown) => {
      const error = scheduleError(e);
      return error.status === 409 ? error.details : [`estado ${error.status}`];
    });
    // Solape con 301 el lunes 08:00-09:30: misma sección y mismo docente.
    const overlap = await conflict(schedulesService.create({ sectionCourseId: 302, day: 'LUNES', startTime: '08:30', endTime: '09:00' }));
    assert.deepEqual(overlap, ['La sección ya tiene una clase el LUNES de 08:00 a 09:30', 'El docente ya tiene una clase el LUNES de 08:00 a 09:30']);
    // Mismo docente (202) en otra sección: 304 contra 303 (sección 10, 11:30-13:00).
    assert.deepEqual(await conflict(schedulesService.create({ sectionCourseId: 304, day: 'MARTES', startTime: '12:00', endTime: '12:30', classroom: 'Aula 1S' })), ['El docente ya tiene una clase el MARTES de 11:30 a 13:00']);
    // Aula ocupada por otra sección del mismo periodo (305 no tiene docente).
    assert.deepEqual(await conflict(schedulesService.create({ sectionCourseId: 305, day: 'LUNES', startTime: '14:30', endTime: '15:00', classroom: 'AULA 9' })), ['El aula Aula 9 ya está ocupada el LUNES de 14:00 a 15:30']);
    // Tocarse en el borde no es solape.
    assert.equal((await schedulesService.create({ sectionCourseId: 302, day: 'LUNES', startTime: '15:30', endTime: '16:00' })).startTime, '15:30');

    assert.deepEqual(await conflict(schedulesService.update(block.id, { day: 'MARTES', startTime: '08:30', endTime: '09:00' })), [
      'La sección ya tiene una clase el MARTES de 08:00 a 09:30', 'El docente ya tiene una clase el MARTES de 08:00 a 09:30',
    ]);
    const moved = await schedulesService.update(block.id, { startTime: '14:30', classroom: '' });
    assert.deepEqual([moved.day, moved.startTime, moved.endTime, moved.classroom], ['LUNES', '14:30', '15:30', null]);
    assert.equal((await schedulesService.update(block.id, {})).id, block.id, 'editar sin cambios no choca consigo mismo');

    await schedulesService.remove(block.id);
    await schedulesService.remove(block.id);
    assert.equal((await schedulesService.listBySection(10)).some(b => b.id === block.id), false);
    await assert.rejects(schedulesService.update(block.id, { day: 'VIERNES' }), (e: unknown) => scheduleError(e).status === 404);
    await assert.rejects(schedulesService.remove(999999), (e: unknown) => scheduleError(e).status === 404);
    await assert.rejects(schedulesService.create({ sectionCourseId: 999, day: 'LUNES', startTime: '14:00', endTime: '15:00' }), (e: unknown) => scheduleError(e).status === 404);
    await assert.rejects(schedulesService.create({ sectionCourseId: 301, day: 'LUNES', startTime: '15:00', endTime: '14:00' }), (e: unknown) => scheduleError(e).status === 400);
    await assert.rejects(schedulesService.create({ sectionCourseId: 301, day: 'SABADO' as never, startTime: '14:00', endTime: '15:00' }), (e: unknown) => scheduleError(e).status === 400);
    await assert.rejects(schedulesService.create({ sectionCourseId: 301, day: 'LUNES', startTime: '14:00', endTime: '15:00', classroom: 'x'.repeat(51) }), (e: unknown) => scheduleError(e).status === 400);
  });
  await asRole('docente@demo.local', async () => {
    await assert.rejects(schedulesService.create({ sectionCourseId: 301, day: 'LUNES', startTime: '14:00', endTime: '15:00' }), (e: unknown) => scheduleError(e).status === 403);
  });
});

// ---------- #164: criterios de evaluación en el store (#155) y retiro de materiales (#159) ----------

/** Cliente con sesión y un store propio, para ajustar el estado inicial antes de probar. */
async function sessionWithStore(email: string, adjust: (store: ReturnType<typeof createMockStore>) => void = () => {}) {
  const store = createMockStore(() => NOW);
  adjust(store);
  const api = client(createMockAdapter({ latencyMs: 0, store, warn: () => {} }));
  return { api, store, auth: { headers: { Authorization: `Bearer ${(await loginAs(api, email)).token}` } } };
}
const codeOf = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return isAxiosError(e) ? `${e.response?.status} ${(e.response?.data as { code?: string }).code ?? ''}`.trim() : 'x'; } };

test('criterios: la configuración, la planilla y los resultados leen del store; crear y editar respetan las reglas del backend', async () => {
  const { api, store, auth } = await sessionWithStore('admin@demo.local', s => { s.publications = []; });
  const url = (path: string) => `/v1/management${path}`;
  const before = (await api.get(url('/courses/101/evaluation-criteria?academicPeriodId=1'), auth)).data;
  assert.deepEqual(before.criteria.map((c: { id: number }) => c.id), [1011, 1012]);

  const created = await api.post(url('/courses/101/evaluation-criteria'), { academicPeriodId: 1, name: ' Exposición ', description: null, order: 3, type: 'MANUAL' }, auth);
  assert.equal(created.status, 201);
  assert.deepEqual([created.data.name, created.data.active, created.data.type], ['Exposición', true, 'MANUAL']);
  assert.equal((await api.get(url(`/evaluation-criteria/${created.data.id}`), auth)).data.order, 3);
  assert.equal((await api.get(url('/courses/101/evaluation-criteria?academicPeriodId=1'), auth)).data.activeManualCriteriaCount, 3);
  // La planilla MANUAL y los resultados incluyen la columna nueva.
  const sheet = (await api.get(url('/section-courses/301/bimesters/14/criterion-grades'), auth)).data;
  assert.equal(sheet.criteria.length, 3);
  assert.equal(sheet.students[0].grades.length, 3);
  const results = (await api.get(url('/section-courses/301/bimesters/14/results'), auth)).data;
  assert.ok(results.students[0].reasons.includes(`MISSING_MANUAL_GRADE:${created.data.id}`));

  // Editar: nombre, descripción, orden y baja; la baja saca la columna de la planilla.
  const edited = (await api.patch(url(`/evaluation-criteria/${created.data.id}`), { name: 'Exposición oral', description: 'Rúbrica', order: 4 }, auth)).data;
  assert.deepEqual([edited.name, edited.description, edited.order], ['Exposición oral', 'Rúbrica', 4]);
  assert.equal((await api.patch(url(`/evaluation-criteria/${created.data.id}`), { description: null }, auth)).data.description, null);
  await api.patch(url(`/evaluation-criteria/${created.data.id}`), { active: false }, auth);
  assert.equal((await api.get(url('/section-courses/301/bimesters/14/criterion-grades'), auth)).data.criteria.length, 2);
  assert.equal((await api.get(url('/courses/101/evaluation-criteria?academicPeriodId=1'), auth)).data.criteria.length, 3, 'el inactivo se sigue listando');

  // Participación académica: solo un criterio PA activo por curso y periodo.
  const pa = { academicPeriodId: 1, name: 'Participación', order: 5, type: 'PARTICIPACION_ACADEMICA' };
  const first = await api.post(url('/courses/101/evaluation-criteria'), pa, auth);
  assert.equal((await api.get(url('/courses/101/evaluation-criteria?academicPeriodId=1'), auth)).data.hasActiveParticipationCriterion, true);
  assert.equal(await codeOf(api.post(url('/courses/101/evaluation-criteria'), { ...pa, order: 6 }, auth)), '409');
  assert.equal(await codeOf(api.patch(url(`/evaluation-criteria/${first.data.id}`), { active: false }, auth)), 'ok');
  assert.equal((await api.post(url('/courses/101/evaluation-criteria'), { ...pa, order: 6 }, auth)).status, 201);

  // Errores.
  assert.equal(await codeOf(api.post(url('/courses/101/evaluation-criteria'), { academicPeriodId: 1, name: 'Repetido', order: 1, type: 'MANUAL' }, auth)), '409', 'orden duplicado');
  assert.equal(await codeOf(api.patch(url(`/evaluation-criteria/${created.data.id}`), { order: 1 }, auth)), '409');
  assert.equal(await codeOf(api.post(url('/courses/101/evaluation-criteria'), { academicPeriodId: 1, name: '  ', order: 9, type: 'MANUAL' }, auth)), '400 VALIDATION_ERROR');
  assert.equal(await codeOf(api.post(url('/courses/101/evaluation-criteria'), { academicPeriodId: 1, name: 'x', order: 0, type: 'MANUAL' }, auth)), '400 VALIDATION_ERROR');
  assert.equal(await codeOf(api.post(url('/courses/101/evaluation-criteria'), { academicPeriodId: 1, name: 'x', order: 9, type: 'OTRO' }, auth)), '400 VALIDATION_ERROR');
  assert.equal(await codeOf(api.post(url('/courses/101/evaluation-criteria'), { academicPeriodId: 1, name: 'x', order: 9, type: 'MANUAL', weight: 5 }, auth)), '400 VALIDATION_ERROR');
  assert.equal(await codeOf(api.patch(url(`/evaluation-criteria/${created.data.id}`), {}, auth)), '400 VALIDATION_ERROR');
  assert.equal(await codeOf(api.patch(url(`/evaluation-criteria/${created.data.id}`), { name: null }, auth)), '400 VALIDATION_ERROR');
  assert.equal(await codeOf(api.post(url('/courses/999/evaluation-criteria'), { academicPeriodId: 1, name: 'x', order: 9, type: 'MANUAL' }, auth)), '404');
  assert.equal(await codeOf(api.post(url('/courses/101/evaluation-criteria'), { academicPeriodId: 99, name: 'x', order: 9, type: 'MANUAL' }, auth)), '404');
  assert.equal(await codeOf(api.patch(url('/evaluation-criteria/999999'), { name: 'x' }, auth)), '404');
  store.courses.find(c => c.id === 102)!.active = false;
  assert.equal(await codeOf(api.post(url('/courses/102/evaluation-criteria'), { academicPeriodId: 1, name: 'x', order: 9, type: 'MANUAL' }, auth)), '409', 'curso inactivo');
  assert.equal(await codeOf(api.patch(url('/evaluation-criteria/1021'), { active: false }, auth)), 'ok');
  assert.equal(await codeOf(api.patch(url('/evaluation-criteria/1021'), { active: true }, auth)), '409', 'reactivar en un curso inactivo');
});

test('criterios: con bimestres publicados la configuración está congelada (STRUCTURE_FROZEN); el service real la lee y DIRECTIVO escribe; el docente no', async () => {
  await asRole('secretaria@demo.local', async () => {
    const config = await evaluationService.getCriteria('101', 1);
    assert.equal(config.criteria.length, 2);
    await assert.rejects(evaluationService.createCriterion('101', { academicPeriodId: 1, name: 'Nuevo', description: null, order: 3, type: 'MANUAL' }),
      (e: unknown) => isAxiosError(e) && e.response?.status === 409 && (e.response.data as { code?: string }).code === 'STRUCTURE_FROZEN' && evaluationErrorMessage(e).includes('congela'));
    await assert.rejects(evaluationService.updateCriterion(1011, { name: 'Otro' }), (e: unknown) => isAxiosError(e) && (e.response?.data as { code?: string }).code === 'STRUCTURE_FROZEN');
  });
  const { api, auth } = await sessionWithStore('secretaria@demo.local', s => { s.publications = []; });
  assert.equal((await api.post('/v1/management/courses/101/evaluation-criteria', { academicPeriodId: 1, name: 'Nuevo', order: 3, type: 'MANUAL' }, auth)).status, 201);
  assert.equal((await api.patch('/v1/management/evaluation-criteria/1011', { name: 'Participación en clase' }, auth)).data.name, 'Participación en clase');
  await asRole('docente@demo.local', async () => {
    await assert.rejects(evaluationService.createCriterion('101', { academicPeriodId: 1, name: 'Nuevo', description: null, order: 3, type: 'MANUAL' }), (e: unknown) => isAxiosError(e) && e.response?.status === 403);
  });
});

test('criterios: el docente y el apoderado ven los criterios del store', async () => {
  const { api, auth } = await sessionWithStore('admin@demo.local', s => { s.publications = []; });
  await api.patch('/v1/management/evaluation-criteria/1012', { active: false }, auth);
  const docente = { headers: { Authorization: `Bearer ${(await loginAs(api, 'docente@demo.local')).token}` } };
  const sheet = (await api.get('/v1/teacher/courses/301/bimesters/14/criterion-grades', docente)).data;
  assert.deepEqual(sheet.criteria.map((c: { id: number }) => c.id), [1011]);
  assert.equal(await codeOf(api.post('/v1/teacher/courses/301/bimesters/14/criterion-grades', { enrollmentId: 503, criterionId: 1012, grade: 15 }, docente)), '400 VALIDATION_ERROR');
});

test('materiales del docente: retirar pasa por el service real y su parser; 400, 404, 409 y 403', async () => {
  await asRole('docente@demo.local', async () => {
    const published = (await teacherMaterialsService.list(301)).find(m => m.status === 'PUBLICADO')!;
    const withdrawn = await teacherMaterialsService.withdraw(301, published.id, '  Versión desactualizada.  ');
    assert.deepEqual([withdrawn.status, withdrawn.withdrawalReason, withdrawn.withdrawnByUserId], ['RETIRADO', 'Versión desactualizada.', 901]);
    assert.ok(withdrawn.withdrawnAt);
    assert.equal((await teacherMaterialsService.list(301)).find(m => m.id === published.id)!.status, 'RETIRADO');
    const code = async (p: Promise<unknown>) => teacherMaterialsErrorCode((await p.then(() => null, (e: unknown) => e)));
    assert.equal(await code(teacherMaterialsService.withdraw(301, published.id, 'Otra vez.')), 'MATERIAL_WITHDRAWN');
    assert.equal(await code(teacherMaterialsService.withdraw(301, 999999, 'No existe.')), 'MATERIAL_CONTEXT_UNAVAILABLE');
    assert.equal(await code(teacherMaterialsService.withdraw(304, published.id, 'Curso ajeno.')), 'MATERIAL_CONTEXT_UNAVAILABLE');
    await assert.rejects(teacherMaterialsService.withdraw(301, published.id, '   '), /motivo/i);
  });
  const { api, auth } = await sessionWithStore('docente@demo.local');
  const list = (await api.get('/v1/teacher/courses/301/materials', auth)).data as { id: number }[];
  assert.equal(await codeOf(api.post(`/v1/teacher/courses/301/materials/${list[0].id}/withdraw`, { reason: 'x'.repeat(1001) }, auth)), '400 VALIDATION_ERROR');
  assert.equal(await codeOf(api.post(`/v1/teacher/courses/301/materials/${list[0].id}/withdraw`, {}, auth)), '400 VALIDATION_ERROR');
  await asRole('secretaria@demo.local', async () => {
    await assert.rejects(teacherMaterialsService.withdraw(301, list[0].id, 'Sin permiso.'), (e: unknown) => isAxiosError(e) && e.response?.status === 403);
  });
});
