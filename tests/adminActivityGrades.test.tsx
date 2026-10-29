import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaNotasAdmin from '../feature/admin/vistas/(academico)/notas/vistaNotasAdmin';
import { AuthContext } from '../src/contexts/AuthContext';
import {
  adminActivityGradesService, adminActivityCorrectionErrorMessage, adminActivityReadErrorMessage, activityCorrectionInputError, parseManagementActivityGradesSheet,
} from '../src/services/admin/adminActivityGradesService';
import { ACTIVITY_GRADE_ERROR_CODES, activityGradeErrorCode, activityGradeErrorCodeMessage, activityGradeErrorCodeMessages } from '../src/services/admin/activityGradeErrors';
import { adminGradesService, adminGradesErrorMessage } from '../src/services/admin/adminGradesService';
import { bimesterPublicationService } from '../src/services/admin/bimesterPublicationService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import { evaluationService } from '../src/services/admin/evaluationService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';
import type { AcademicActivityStatus } from '../src/types/teacherActivitiesApi';
import type { CriterionGradesSheetResponse } from '../src/types/teacherGradesApi';
import type { ManagementActivityGradesSheet } from '../src/types/managementActivitiesApi';

// Unit/component mocks only: no network, browser server or shared database. Synthetic data.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const context = { sectionCourseId: 10, bimesterId: 1 };
const activity = (status: AcademicActivityStatus = 'PUBLICADA', id = 300) => ({
  id, sectionCourseId: 10, bimesterId: 1, createdByTeacherId: 31, title: `Tarea ${id}`, description: null, type: 'TAREA', cuentaParaPa: true, status,
  createdAt: '2026-10-01T12:00:00Z', updatedAt: null, publishedAt: status === 'PLANIFICADA' ? null : '2026-10-02T12:00:00Z',
  annulledAt: status === 'ANULADA' ? '2026-10-03T12:00:00Z' : null, annulledByUserId: status === 'ANULADA' ? 31 : null, annulmentReason: status === 'ANULADA' ? 'Duplicada' : null,
});
const graded = (grade = 14.5, version = 2) => ({ enrollmentId: 101, studentId: 81, studentCode: 'C26000081', fullName: 'Alumno Ejemplo', gradeId: 201, grade, version,
  registeredByTeacherId: 31, registeredByTeacherName: 'Docente Ejemplo', registeredAt: '2026-10-28T15:00:00Z', updatedAt: version > 1 ? '2026-10-28T16:00:00Z' : null });
const empty = { enrollmentId: 102, studentId: 82, studentCode: null, fullName: 'Alumno Sin Nota', gradeId: null, grade: null, version: null,
  registeredByTeacherId: null, registeredByTeacherName: null, registeredAt: null, updatedAt: null };
const wireBimester = (status: Bimester['status']) => ({ id: 1, academicPeriodId: 30, number: 1, name: 'Primer bimestre', startDate: '2026-03-01', endDate: '2026-04-30', status, createdAt: '2026-02-01T12:00:00Z', updatedAt: null });
const wireSheet = (status: Bimester['status'] = 'EN_REVISION', activityStatus: AcademicActivityStatus = 'PUBLICADA', rows: unknown[] = [graded(), empty]) =>
  ({ activity: activity(activityStatus), bimester: wireBimester(status), students: rows });
const sheet = (...args: Parameters<typeof wireSheet>): ManagementActivityGradesSheet => parseManagementActivityGradesSheet(wireSheet(...args), context, 300);
const savedWire = (grade = 16, version = 3) => ({ id: 201, activityId: 300, enrollmentId: 101, grade, registeredByTeacherId: 31, registeredAt: '2026-10-28T15:00:00Z', updatedAt: '2026-10-29T10:00:00Z', version });
const manualSheet = (status: Bimester['status']): CriterionGradesSheetResponse => ({ sectionCourseId: 10, courseId: 20, academicPeriodId: 30,
  bimester: { id: 1, academicPeriodId: 30, number: 1, name: 'Primer bimestre', startDate: '2026-03-01', endDate: '2026-04-30', status },
  criteria: [{ id: 40, courseId: 20, academicPeriodId: 30, name: 'Criterio manual', description: null, order: 1, type: 'MANUAL', active: true }],
  students: [{ enrollmentId: 101, studentId: 81, fullName: 'Alumno Ejemplo', grades: [{ criterionId: 40, gradeId: 70, grade: 12, registeredAt: '2026-10-10T12:00:00Z', updatedAt: null }] }] });
const httpError = (status?: number, code?: string) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { error: 'X', message: 'secret detail', ...(code ? { code } : {}) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

async function withAdapter(run: (h: { calls: { method?: string; url?: string; data: unknown }[]; reply: (data: unknown, status?: number) => void }) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: { method?: string; url?: string; data: unknown }[] = [];
  let data: unknown = null, status = 200;
  httpClient.defaults.adapter = async config => { calls.push({ method: config.method, url: config.url, data: config.data }); return { config, data, status, statusText: 'OK', headers: {} }; };
  try { await run({ calls, reply: (value, code = 200) => { data = value; status = code; } }); } finally { httpClient.defaults.adapter = original; }
}

test('management reads: list and sheet routes; rows without gradeId carry no grade data; inconsistent sheets are rejected', async () => {
  await withAdapter(async h => {
    h.reply([activity('PUBLICADA', 301), activity('PLANIFICADA', 300)]);
    assert.deepEqual((await adminActivityGradesService.listActivities(context)).map(a => a.id), [300, 301]);
    assert.equal(h.calls[0].url, '/v1/management/section-courses/10/bimesters/1/activities');
    for (const bad of [[{ ...activity(), sectionCourseId: 11 }], [activity(), activity()], {}]) { h.reply(bad); await assert.rejects(adminActivityGradesService.listActivities(context)); }
    h.reply(wireSheet());
    const read = await adminActivityGradesService.getSheet(context, 300);
    assert.equal(h.calls.at(-1)?.url, '/v1/management/section-courses/10/bimesters/1/activities/300/grades');
    assert.deepEqual(read.students.map(r => [r.gradeId, r.grade, r.version]), [[201, 14.5, 2], [null, null, null]]);
    h.reply(wireSheet('EN_REVISION', 'PUBLICADA', [graded(0, 1)])); assert.equal((await adminActivityGradesService.getSheet(context, 300)).students[0].grade, 0);
    const bad: unknown[] = [
      { ...wireSheet(), bimester: { ...wireBimester('EN_REVISION'), id: 2 } }, { ...wireSheet(), activity: activity('PUBLICADA', 301) },
      wireSheet('EN_REVISION', 'PUBLICADA', [{ ...empty, grade: 0 }]), wireSheet('EN_REVISION', 'PUBLICADA', [{ ...graded(), version: null }]),
      wireSheet('EN_REVISION', 'PUBLICADA', [graded(21)]), wireSheet('EN_REVISION', 'PUBLICADA', [graded(12.345)]),
      wireSheet('EN_REVISION', 'PUBLICADA', [{ ...graded(), registeredAt: null }]), wireSheet('EN_REVISION', 'PUBLICADA', [graded(), graded()]),
      wireSheet('EN_REVISION', 'PUBLICADA', [graded(), { ...graded(), enrollmentId: 103 }]), wireSheet('EN_REVISION', 'PUBLICADA', [{ ...graded(), fullName: ' ' }]),
      { ...wireSheet(), students: null },
    ];
    for (const value of bad) { h.reply(value); await assert.rejects(adminActivityGradesService.getSheet(context, 300), Error, JSON.stringify(value).slice(0, 80)); }
  });
});

test('PATCH sends exactly {enrollmentId, grade, expectedVersion, reason} and requires the next version', async () => {
  await withAdapter(async h => {
    h.reply(savedWire());
    const saved = await adminActivityGradesService.correctGrade(201, 300, { enrollmentId: 101, grade: 16, expectedVersion: 2, reason: '  Revisión de la rúbrica  ' });
    assert.equal(saved.version, 3);
    assert.deepEqual(h.calls.at(-1), { method: 'patch', url: '/v1/management/activity-grades/201', data: JSON.stringify({ enrollmentId: 101, grade: 16, expectedVersion: 2, reason: 'Revisión de la rúbrica' }) });
    for (const value of [savedWire(16, 2), { ...savedWire(), id: 202 }, savedWire(15), { ...savedWire(), enrollmentId: 102 }, { ...savedWire(), activityId: 301 }]) {
      h.reply(value); await assert.rejects(adminActivityGradesService.correctGrade(201, 300, { enrollmentId: 101, grade: 16, expectedVersion: 2, reason: 'Motivo' }));
    }
    h.reply(savedWire(), 201); await assert.rejects(adminActivityGradesService.correctGrade(201, 300, { enrollmentId: 101, grade: 16, expectedVersion: 2, reason: 'Motivo' }));
    const count = h.calls.length;
    for (const request of [{ grade: 21 }, { grade: 1.234 }, { grade: -1 }, { reason: '  ' }, { reason: 'm'.repeat(1001) }, { expectedVersion: 0 }, { enrollmentId: 0 }]) {
      await assert.rejects(adminActivityGradesService.correctGrade(201, 300, { enrollmentId: 101, grade: 16, expectedVersion: 2, reason: 'Motivo', ...request }));
    }
    await assert.rejects(adminActivityGradesService.correctGrade(0, 300, { enrollmentId: 101, grade: 16, expectedVersion: 2, reason: 'Motivo' }));
    assert.equal(h.calls.length, count);
  });
  assert.equal(activityCorrectionInputError({ enrollmentId: 101, grade: 16, expectedVersion: 2, reason: `  ${'m'.repeat(1000)}  ` }), null);
});

test('history: initial registration without previous grade or reason; corrections with both; consecutive versions', async () => {
  const initial = { id: 1, gradeId: 201, previousGrade: null, newGrade: 14, actorId: 31, reason: null, changedAt: '2026-10-20T12:00:00Z', previousVersion: 0, newVersion: 1 };
  const correction = { id: 2, gradeId: 201, previousGrade: 14, newGrade: 14.5, actorId: 90, reason: 'Revisión', changedAt: '2026-10-28T16:00:00Z', previousVersion: 1, newVersion: 2 };
  await withAdapter(async h => {
    h.reply([initial, correction]);
    assert.deepEqual(await adminActivityGradesService.getHistory(201), [initial, correction]);
    assert.equal(h.calls[0].url, '/v1/management/activity-grades/201/history');
    for (const bad of [[{ ...initial, reason: 'x' }], [{ ...initial, previousGrade: 0 }], [{ ...correction, reason: null }], [{ ...correction, previousGrade: null }],
      [{ ...correction, newVersion: 4 }], [{ ...correction, gradeId: 202 }], [initial, initial], [{ ...correction, newGrade: 21 }], {}]) {
      h.reply(bad); await assert.rejects(adminActivityGradesService.getHistory(201));
    }
  });
});

const contract: Record<string, number[]> = {
  ACTIVITY_REQUEST_INVALID: [400], ACTIVITY_CONTEXT_UNAVAILABLE: [404], ACTIVITY_METHOD_NOT_ALLOWED: [405], BIMESTER_WINDOW_CLOSED: [409], ACTIVITY_STATE_CONFLICT: [409],
  ACTIVITY_NOT_GRADEABLE: [409], ACTIVITY_GRADE_STALE: [409], ACTIVITY_GRADE_UNCHANGED: [409], ENROLLMENT_NOT_ELIGIBLE: [409], ACADEMIC_CONTEXT_MISMATCH: [409],
  ACTIVITY_CONTEXT_CONFLICT: [409], ACTIVITY_INTERNAL_ERROR: [500],
};
const generic = ['ACTIVITY_REQUEST_INVALID', 'ACTIVITY_METHOD_NOT_ALLOWED', 'ACTIVITY_INTERNAL_ERROR'];

test('activity catalog: known codes only with their contract status, separate from the MANUAL and publication catalogs', () => {
  assert.deepEqual([...ACTIVITY_GRADE_ERROR_CODES].sort(), Object.keys(contract).sort());
  assert.deepEqual(Object.keys(activityGradeErrorCodeMessages).sort(), Object.keys(contract).filter(c => !generic.includes(c)).sort());
  for (const [code, statuses] of Object.entries(contract)) {
    for (const status of [400, 401, 403, 404, 405, 409, 422, 500, 503]) assert.equal(activityGradeErrorCode(httpError(status, code)), statuses.includes(status) ? code : null, `${code} ${status}`);
    const message = activityGradeErrorCodeMessage(httpError(statuses[0], code));
    if (generic.includes(code)) assert.equal(message, null, code); else assert.ok(message && !/secret|PRIVATE/.test(message), code);
  }
  for (const code of ['BIMESTER_STATE_CONFLICT', 'GRADE_CHANGED_CONCURRENTLY', 'PUBLICATION_STALE', 'toString', 'activity_grade_stale']) assert.equal(activityGradeErrorCode(httpError(409, code)), null, code);
});

test('correction and read messages: catalog first; any 5xx, network or unverifiable answer is uncertain', () => {
  assert.match(adminActivityCorrectionErrorMessage(httpError(409, 'ACTIVITY_GRADE_STALE')), /La nota cambió desde que cargaste la planilla/);
  assert.match(adminActivityCorrectionErrorMessage(httpError(409, 'BIMESTER_WINDOW_CLOSED')), /En revisión o Cerrado/);
  assert.equal(adminActivityCorrectionErrorMessage(httpError(400, 'ACTIVITY_REQUEST_INVALID')), adminGradesErrorMessage(httpError(400)));
  assert.equal(adminActivityCorrectionErrorMessage(httpError(409, 'UNKNOWN')), adminGradesErrorMessage(httpError(409)));
  assert.equal(adminActivityCorrectionErrorMessage(httpError(403, 'ACTIVITY_GRADE_STALE')), adminGradesErrorMessage(httpError(403)));
  for (const error of [httpError(), httpError(500, 'ACTIVITY_INTERNAL_ERROR'), httpError(503), new Error('Respuesta de corrección inconsistente.')]) {
    assert.match(adminActivityCorrectionErrorMessage(error), /No se pudo confirmar la corrección\. Se consultó la planilla sin repetirla/);
  }
  assert.match(adminActivityReadErrorMessage(httpError(404, 'ACTIVITY_CONTEXT_UNAVAILABLE')), /ya no están disponibles/);
  assert.match(adminActivityReadErrorMessage(httpError(404)), /no están disponibles/);
  for (const error of [httpError(403), httpError(), httpError(500)]) assert.doesNotMatch(adminActivityReadErrorMessage(error), /secret|PRIVATE/);
});

type View = {
  renderer: ReactTestRenderer; shown: () => string; button: (name: string) => ReactTestInstance | undefined;
  click: (name: string) => Promise<void>; change: (label: string, value: string) => Promise<void>; submit: () => Promise<void>;
  results: () => number;
};
async function view(overrides: Partial<typeof adminActivityGradesService>, run: (h: View) => Promise<void>, options: { role?: 'ADMINISTRADOR' | 'DIRECTIVO'; status?: Bimester['status']; manual?: Partial<typeof adminGradesService>; publishedAt?: string; selectActivity?: boolean } = {}) {
  const status = options.status ?? 'EN_REVISION';
  const originals = { activities: { ...adminActivityGradesService }, grades: { ...adminGradesService }, publication: bimesterPublicationService.getPublication,
    sections: sectionsService.list, courses: sectionCoursesService.list, bimesters: evaluationService.getBimesters };
  let results = 0;
  Object.assign(adminActivityGradesService, { listActivities: async () => [sheet(status).activity], getSheet: async () => sheet(status), correctGrade: async () => { throw new Error('unexpected'); }, getHistory: async () => [] }, overrides);
  Object.assign(adminGradesService, { getSheet: async () => manualSheet(status), getHistory: async () => [], correctGrade: async () => { throw new Error('unexpected'); },
    getResults: async (sectionCourseId: number, bimesterId: number) => { results++; return { sectionCourseId, bimesterId, areaId: 2, students: [] }; } }, options.manual);
  bimesterPublicationService.getPublication = (async () => options.publishedAt
    ? { bimesterId: 1, status: 'CERRADO', publishedAt: options.publishedAt, revision: 1, preparationRevision: null, courses: [], details: [] }
    : Promise.reject(new Error('sin marca'))) as typeof bimesterPublicationService.getPublication;
  sectionsService.list = async () => [{ id: 1, academicPeriodId: 30, level: 'PRIMARY', grade: 1, name: 'A', maxCapacity: 30, enrollmentOpen: false, active: true }];
  sectionCoursesService.list = async () => [{ id: 10, sectionId: 1, courseId: 20, courseCode: 'MAT', courseName: 'Matemática', active: true, teacherId: null, teacherName: null }];
  evaluationService.getBimesters = async () => [manualSheet(status).bimester];
  const globals = ['document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element }); Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  const auth: React.ContextType<typeof AuthContext> = { token: null, role: options.role ?? 'ADMINISTRADOR', status: 'authenticated', sessionValid: true, login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AuthContext.Provider value={auth}><VistaNotasAdmin /></AuthContext.Provider>, { createNodeMock: () => new Element() }); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    const change = async (label: string, value: string) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); };
    await change('Sección', '1'); await change('Curso-sección', '10'); await change('Bimestre', '1');
    if (options.selectActivity !== false) await change('Actividad', '300');
    await run({ renderer, button, change, shown: () => text(renderer.root), results: () => results,
      click: async name => { const node = button(name); assert.ok(node, name); assert.equal(!!node.props.disabled, false, name); await act(async () => { node.props.onClick(); }); },
      submit: async () => { await act(async () => { renderer.root.findAllByType('form').at(-1)!.props.onSubmit({ preventDefault() {} }); }); } });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(adminActivityGradesService, originals.activities); Object.assign(adminGradesService, originals.grades); bimesterPublicationService.getPublication = originals.publication;
    sectionsService.list = originals.sections; sectionCoursesService.list = originals.courses; evaluationService.getBimesters = originals.bimesters;
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}
const correct = 'Corregir actividad Alumno Ejemplo', history = 'Historial de actividad #201';
async function fill(h: View, grade = '16', reason = 'Revisión de la rúbrica') {
  await h.click(correct); await h.change('Nueva nota de actividad', grade); await h.change('Motivo de la corrección de actividad', reason);
}

test('role × bimester × activity matrix: only ADMINISTRADOR corrects PUBLICADA rows with a grade in EN_REVISION/CERRADO', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
    for (const status of ['PLANIFICADO', 'ABIERTO', 'EN_REVISION', 'CERRADO', 'ANULADO'] as const) {
      for (const activityStatus of ['PLANIFICADA', 'PUBLICADA', 'ANULADA'] as const) {
        const read = sheet(status, activityStatus);
        await view({ listActivities: async () => [read.activity], getSheet: async () => read }, async h => {
          const label = `${role} ${status} ${activityStatus}`;
          const admin = role === 'ADMINISTRADOR';
          assert.equal(!!h.button(correct), admin && (status === 'EN_REVISION' || status === 'CERRADO') && activityStatus === 'PUBLICADA', label);
          assert.equal(!!h.button(history), admin, label);
          assert.equal(h.button('Corregir actividad Alumno Sin Nota'), undefined, label);
          assert.equal(h.button('Historial de actividad #null'), undefined, label);
          assert.match(h.shown(), /Alumno Sin NotaSin nota/);
          assert.equal(/las notas de actividades las corrige el docente/.test(h.shown()), status === 'ABIERTO', label);
          assert.equal(/Actividad anulada/.test(h.shown()), activityStatus === 'ANULADA', label);
          if (!admin) assert.match(h.shown(), /Acceso DIRECTIVO: solo lectura\. El PA/);
        }, { role, status });
      }
    }
  }
});

test('accepted correction: one PATCH with the row version, confirmed reload and the results (PA) read again', async () => {
  const pending = deferred<Awaited<ReturnType<typeof adminActivityGradesService.correctGrade>>>();
  const sent: unknown[] = []; let reads = 0;
  await view({ getSheet: async () => ++reads === 1 ? sheet() : sheet('EN_REVISION', 'PUBLICADA', [graded(16, 3), empty]),
    correctGrade: async (gradeId, activityId, request) => { sent.push([gradeId, activityId, request]); return pending.promise; } }, async h => {
    assert.match(h.shown(), /Alumno EjemploC2600008114\.5Docente Ejemplo/);
    await fill(h);
    assert.match(h.shown(), /Nota actual: 14\.5 \(versión 2\)/);
    const submit = h.renderer.root.findAllByType('form').at(-1)!.props.onSubmit;
    const before = h.results();
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
    assert.deepEqual(sent, [[201, 300, { enrollmentId: 101, grade: 16, expectedVersion: 2, reason: 'Revisión de la rúbrica' }]]);
    assert.equal(h.button('Corregir Alumno Ejemplo · Criterio manual')?.props.disabled, true, 'MANUAL locked while the activity correction runs');
    assert.equal(h.button('Actualizar planilla')?.props.disabled, true);
    await act(async () => { pending.resolve({ id: 201, activityId: 300, enrollmentId: 101, grade: 16, registeredByTeacherId: 31, registeredAt: '2026-10-28T15:00:00Z', updatedAt: '2026-10-29T10:00:00Z', version: 3 }); });
    assert.equal(reads, 2); assert.equal(h.results(), before + 1);
    assert.match(h.shown(), /Corrección confirmada en la planilla recargada/);
    assert.equal(h.button('Corregir Alumno Ejemplo · Criterio manual')?.props.disabled, false);
    await h.click(correct); assert.match(h.shown(), /Nota actual: 16 \(versión 3\)/);
  });
});

test('reason and grade are validated in the UI without PATCH; the counter shows the trimmed length', async () => {
  let patches = 0;
  await view({ correctGrade: async () => { patches++; throw new Error('x'); } }, async h => {
    for (const [grade, reason] of [['16', ''], ['16', '   '], ['16', 'm'.repeat(1001)], ['14.5', 'Motivo'], ['21', 'Motivo'], ['12.345', 'Motivo']]) {
      await fill(h, grade, reason); await h.submit(); await h.click('Cancelar');
    }
    assert.equal(patches, 0);
    await fill(h, '16', 'm'.repeat(1001));
    assert.match(h.shown(), /1001\/1000/); assert.match(h.shown(), /no puede superar los 1000/);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Motivo de la corrección de actividad' }).props.maxLength, 1000);
  });
});

test('ACTIVITY_GRADE_STALE reloads the current value without resending; the PA is read again because the version moved', async () => {
  let patches = 0, reads = 0;
  await view({ getSheet: async () => ++reads === 1 ? sheet() : sheet('EN_REVISION', 'PUBLICADA', [graded(17, 3), empty]), correctGrade: async () => { patches++; throw httpError(409, 'ACTIVITY_GRADE_STALE'); } }, async h => {
    const before = h.results();
    await fill(h); await h.submit();
    assert.equal(patches, 1); assert.equal(reads, 2); assert.equal(h.results(), before + 1);
    assert.match(h.shown(), /La nota cambió desde que cargaste la planilla\. Se recargó con el valor vigente/);
    assert.doesNotMatch(h.shown(), /Corrección confirmada|secret/);
    await h.click(correct); assert.match(h.shown(), /Nota actual: 17 \(versión 3\)/);
  });
});

test('rejected corrections reload the sheet with a fixed text, never retry and leave the results alone', async () => {
  const cases: [AxiosError, RegExp | string][] = [
    [httpError(409, 'BIMESTER_WINDOW_CLOSED'), /En revisión o Cerrado/], [httpError(409, 'ACTIVITY_NOT_GRADEABLE'), /actividades publicadas/],
    [httpError(409, 'ACTIVITY_GRADE_UNCHANGED'), /igual a la vigente/], [httpError(409, 'ENROLLMENT_NOT_ELIGIBLE'), /matrícula ya no es válida/],
    [httpError(404, 'ACTIVITY_CONTEXT_UNAVAILABLE'), /ya no están disponibles/], [httpError(400, 'ACTIVITY_REQUEST_INVALID'), adminGradesErrorMessage(httpError(400))],
    [httpError(403), adminGradesErrorMessage(httpError(403))], [httpError(401), adminGradesErrorMessage(httpError(401))],
  ];
  for (const [failure, expected] of cases) {
    let patches = 0, reads = 0;
    await view({ getSheet: async () => { reads++; return sheet(); }, correctGrade: async () => { patches++; throw failure; } }, async h => {
      const before = h.results();
      await fill(h); await h.submit();
      assert.equal(patches, 1); assert.equal(reads, 2); assert.equal(h.results(), before);
      if (typeof expected === 'string') assert.ok(h.shown().includes(expected)); else assert.match(h.shown(), expected);
      assert.doesNotMatch(h.shown(), /secret|PRIVATE|Corrección confirmada/);
    });
  }
});

test('uncertain answers: no retry; the results are read again only when the grade may have changed', async () => {
  for (const [reload, expectResults] of [['applied', true], ['unchanged', false], ['fails', true]] as const) {
    let patches = 0, reads = 0;
    await view({ getSheet: async () => {
      reads++;
      if (reads === 1) return sheet();
      if (reload === 'fails') throw httpError();
      return reload === 'applied' ? sheet('EN_REVISION', 'PUBLICADA', [graded(16, 3), empty]) : sheet();
    }, correctGrade: async () => { patches++; throw httpError(); } }, async h => {
      const before = h.results();
      await fill(h); await h.submit();
      assert.equal(patches, 1, reload); assert.equal(h.results(), before + (expectResults ? 1 : 0), reload);
      assert.match(h.shown(), /No se pudo confirmar la corrección/);
      assert.doesNotMatch(h.shown(), /Corrección confirmada/);
    });
  }
});

test('MANUAL correction in progress locks the activity correction', async () => {
  const pending = deferred<never>();
  await view({}, async h => {
    await h.click('Corregir Alumno Ejemplo · Criterio manual');
    await h.change('Nueva nota', '15'); await h.change('Motivo', 'Corrección MANUAL');
    await act(async () => { h.renderer.root.findAllByType('form').at(-1)!.props.onSubmit({ preventDefault() {} }); });
    assert.equal(h.button(correct)?.props.disabled, true);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Actividad' }).props.disabled, true);
  }, { manual: { correctGrade: async () => pending.promise } });
});

test('a published bimester warns that the correction increments the published revision', async () => {
  await view({}, async h => {
    await h.click(correct);
    assert.match(h.shown(), /Bimestre publicado el .*: la corrección queda auditada e incrementa la revisión publicada/);
  }, { status: 'CERRADO', publishedAt: '2026-05-02T15:00:00Z' });
  await view({}, async h => { await h.click(correct); assert.doesNotMatch(h.shown(), /Bimestre publicado/); }, { status: 'EN_REVISION' });
});

test('late PATCH after switching activity is ignored: no notice and no results reload', async () => {
  const pending = deferred<Awaited<ReturnType<typeof adminActivityGradesService.correctGrade>>>();
  const second = { ...activity('PUBLICADA', 301) };
  await view({ listActivities: async () => [sheet().activity, parseManagementActivityGradesSheet({ ...wireSheet(), activity: second }, context, 301).activity],
    getSheet: async (_c, activityId) => activityId === 301 ? parseManagementActivityGradesSheet({ ...wireSheet(), activity: second }, context, 301) : sheet(),
    correctGrade: async () => pending.promise }, async h => {
    await fill(h); await h.submit();
    const before = h.results();
    await act(async () => { h.renderer.root.findByProps({ 'aria-label': 'Actividad' }).props.onChange({ target: { value: '301' } }); });
    await act(async () => { pending.resolve({ id: 201, activityId: 300, enrollmentId: 101, grade: 16, registeredByTeacherId: 31, registeredAt: '2026-10-28T15:00:00Z', updatedAt: null, version: 3 }); });
    assert.equal(h.results(), before);
    assert.doesNotMatch(h.shown(), /Corrección confirmada/);
    assert.match(h.shown(), /Tarea 301/);
  });
});

test('history (ADMINISTRADOR): initial registration and corrections with versions; empty and failed reads', async () => {
  const entries = [
    { id: 1, gradeId: 201, previousGrade: null, newGrade: 14, actorId: 31, reason: null, changedAt: '2026-10-20T12:00:00Z', previousVersion: 0, newVersion: 1 },
    { id: 2, gradeId: 201, previousGrade: 14, newGrade: 14.5, actorId: 90, reason: 'Revisión', changedAt: '2026-10-28T16:00:00Z', previousVersion: 1, newVersion: 2 },
  ];
  await view({ getHistory: async () => entries }, async h => {
    await h.click(history);
    assert.match(h.shown(), /Registro inicial: 14 · versión 0 → 1/);
    assert.match(h.shown(), /14 → 14\.5 · versión 1 → 2Revisión/);
    assert.match(h.shown(), /Usuario #90/);
  });
  let reads = 0;
  await view({ getHistory: async () => { if (++reads === 1) throw httpError(404, 'ACTIVITY_CONTEXT_UNAVAILABLE'); return []; } }, async h => {
    await h.click(history); assert.match(h.shown(), /ya no están disponibles/);
    await act(async () => { h.renderer.root.findAllByType('button').filter(b => text(b) === 'Reintentar').at(-1)!.props.onClick(); });
    assert.match(h.shown(), /No hay registros en el historial/);
  });
});

test('empty activity list and read failures show their state without fabricated rows', async () => {
  await view({ listActivities: async () => [] }, async h => {
    assert.match(h.shown(), /No hay actividades en este curso y bimestre/);
    assert.equal(h.renderer.root.findAllByProps({ 'aria-label': 'Actividad' }).length, 0);
  }, { selectActivity: false });
  let reads = 0;
  await view({ listActivities: async () => { if (++reads === 1) throw httpError(404, 'ACTIVITY_CONTEXT_UNAVAILABLE'); return [sheet().activity]; } }, async h => {
    assert.match(h.shown(), /La actividad, la nota o su contexto ya no están disponibles/);
    await act(async () => { h.renderer.root.findAllByType('button').filter(b => text(b) === 'Reintentar').at(-1)!.props.onClick(); });
    await h.change('Actividad', '300');
    assert.match(h.shown(), /Alumno Ejemplo/);
  }, { selectActivity: false });
  await view({ getSheet: async () => { throw httpError(500); } }, async h => {
    assert.match(h.shown(), /no pudo confirmarse/);
    assert.equal(h.button(correct), undefined);
  });
});
