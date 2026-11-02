import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
    assert.deepEqual(hijos.map(h => [h.id, h.nombreCompleto]), [['57', 'Ana Arias Demo'], ['58', 'Luis Arias Demo']]);
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
    assert.deepEqual(vacancies, { totalCapacity: 95, activeEnrollmentCount: 4, availableVacancies: 91, grades: 2 });
    const daily = await dailyAttendanceService.get({ academicPeriodId: 1, date: '2026-10-30' });
    assert.equal(daily.status, 'COMPLETE');
    assert.equal(daily.expectedStudents, 4);
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
  assert.deepEqual(session.students.map((s: { status: string }) => s.status), ['INASISTENCIA', 'PRESENTE', 'TARDANZA']);
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
    assert.equal(sheet.students.length, 3);
    assert.ok(sheet.students.every(s => s.grades.every(g => g.grade !== null)));
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
