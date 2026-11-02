import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import VistaNotasDocente from '../feature/docente/vistas/notas/vistaNotasDocente';
import ModalCorreccionNota from '../feature/docente/vistas/notas/ModalCorreccionNota';
import PlazoRegistroNotas, { NO_GRADE_WINDOW_MESSAGE } from '../feature/docente/vistas/notas/PlazoRegistroNotas';
import { DocenteSessionProvider } from '../src/app/docente/components/DocenteSessionContext';
import {
  GRADE_CHANGED_CONCURRENTLY_MESSAGE, GRADE_WINDOW_EXPIRED_MESSAGE, TEACHER_GRADE_CORRECTION_ERROR_CODES, correctionRequiresReload, gradeCorrectionError,
  teacherGradeCorrectionErrorCode, teacherGradeCorrectionErrorMessage, teacherGradesErrorMessage, teacherGradesService,
} from '../src/services/teacher/teacherGradesService';
import { parseCriterionGradesSheetResponse } from '../src/lib/manualGradesContract';
import { adaptCriterionGradesSheet, canCorrectGrade } from '../src/lib/manualGrades';
import httpClient from '../src/services/httpClient';
import { GRADE_CORRECTION_REASONS, gradeCorrectionReasonLabels, type TeacherCorrectCriterionGradeRequest } from '../src/types/teacherGradesApi';
import type { GradeWindow } from '../src/types/gradeWindowApi';

// Unit/component mocks only: no network, browser server or shared database. Synthetic data.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const context = { sectionCourseId: 10, courseId: 20, bimesterId: 40, academicPeriodId: 30 };
const window_ = (over: Partial<GradeWindow> = {}): GradeWindow => ({ bimesterId: 40, registrationDate: '2026-12-10', registrationDateConfigured: true,
  extendedDeadline: null, deadline: '2026-12-17', expired: false, timeZone: 'America/Lima', ...over });
const bimesterWire = (status = 'ABIERTO') => ({ id: 40, academicPeriodId: 30, number: 1, name: 'Bimestre 1', startDate: '2026-10-01', endDate: '2026-12-10', status });
const criteria = [
  { id: 1, courseId: 20, academicPeriodId: 30, name: 'Comprensión', description: null, order: 1, type: 'MANUAL', active: true },
  { id: 2, courseId: 20, academicPeriodId: 30, name: 'Inactivo', description: null, order: 2, type: 'MANUAL', active: false },
];
function sheetWire(over: { grade?: number; gradeWindow?: unknown; status?: string; omitWindow?: boolean } = {}) {
  const base: Record<string, unknown> = {
    ...context, bimester: bimesterWire(over.status), criteria,
    students: [{ enrollmentId: 100, studentId: 200, fullName: 'Ana Pérez', grades: [
      { criterionId: 1, gradeId: 500, grade: over.grade ?? 12, registeredAt: '2026-11-01T12:00:00Z', updatedAt: null },
      { criterionId: 2, gradeId: 501, grade: 14, registeredAt: '2026-11-01T12:00:00Z', updatedAt: null },
    ] }, { enrollmentId: 101, studentId: 201, fullName: 'Beto Ríos', grades: [
      { criterionId: 1, gradeId: null, grade: null, registeredAt: null, updatedAt: null },
      { criterionId: 2, gradeId: null, grade: null, registeredAt: null, updatedAt: null },
    ] }],
  };
  if (!over.omitWindow) base.gradeWindow = over.gradeWindow === undefined ? window_() : over.gradeWindow;
  return base;
}
const saved = (grade = 15) => ({ id: 500, enrollmentId: 100, sectionCourseId: 10, bimesterId: 40, criterionId: 1, grade, registeredByTeacherId: 300, registeredAt: '2026-11-01T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z' });
const request = (over: Partial<TeacherCorrectCriterionGradeRequest> = {}): TeacherCorrectCriterionGradeRequest =>
  ({ grade: 15, reasonCode: 'TYPING_ERROR', justification: '  Se digitó 12 en lugar de 15 por error.  ', expectedGrade: 12, ...over });

const httpError = (status?: number, data: unknown = { message: 'secret detail' }) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data } as AxiosResponse : undefined);
const coded = (status: number, code: string) => httpError(status, { error: 'X', message: 'secret detail', code });

type Reply = { status?: number; data: unknown };
type Route = (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>;
type Call = { method?: string; url?: string; data: unknown };
async function withAdapter(route: Route, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async config => {
    calls.push({ method: config.method, url: config.url, data: config.data === undefined ? undefined : JSON.parse(String(config.data)) });
    const reply = await route(config);
    const status = reply.status ?? 200;
    const response = { config, data: reply.data, status, statusText: String(status), headers: {} } as AxiosResponse;
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, response);
    return response;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
function withDom() {
  const globals = ['window', 'document', 'localStorage', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { style: {} } } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  // next/link prefetch schedules through self.setTimeout (its idle-callback fallback): a no-op keeps the test free of timers.
  Object.defineProperty(globalThis, 'self', { configurable: true, value: { setTimeout: () => 0, clearTimeout() {} } });
  return () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete (globalThis as Record<string, unknown>)[name]; } };
}

// ---------- Contract and service ----------

test('sheet parser reads gradeWindow with the shared #39 parser; absent or null stays null', () => {
  assert.deepEqual(parseCriterionGradesSheetResponse(sheetWire(), context).gradeWindow, window_());
  assert.equal(parseCriterionGradesSheetResponse(sheetWire({ omitWindow: true }), context).gradeWindow, null);
  assert.equal(parseCriterionGradesSheetResponse(sheetWire({ gradeWindow: null }), context).gradeWindow, null);
  const extended = window_({ extendedDeadline: '2026-12-20', deadline: '2026-12-20' });
  assert.deepEqual(parseCriterionGradesSheetResponse(sheetWire({ gradeWindow: extended }), context).gradeWindow, extended);
  for (const bad of [window_({ bimesterId: 41 }), window_({ deadline: '2026-12-18' }), window_({ timeZone: 'UTC' as never }), { ...window_(), expired: 'no' }, 'x', []])
    assert.throws(() => parseCriterionGradesSheetResponse(sheetWire({ gradeWindow: bad }), context), Error, JSON.stringify(bad));
});

test('correctGrade sends PATCH with exactly the structured body and a trimmed justification', async () => {
  await withAdapter(() => ({ data: saved() }), async calls => {
    assert.deepEqual(await teacherGradesService.correctGrade(10, 40, 500, request()), saved());
    assert.deepEqual(calls, [{ method: 'patch', url: '/v1/teacher/courses/10/bimesters/40/criterion-grades/500',
      data: { grade: 15, reasonCode: 'TYPING_ERROR', justification: 'Se digitó 12 en lugar de 15 por error.', expectedGrade: 12 } }]);
  });
});

test('client validation runs before any request: grade, grade ≠ expectedGrade, reason and 20–1000 characters', async () => {
  const cases: [Partial<TeacherCorrectCriterionGradeRequest>, RegExp][] = [
    [{ grade: 12 }, /distinta de la nota actual/], [{ grade: 21 }, /entre 0 y 20/], [{ grade: 15.555 }, /dos decimales/],
    [{ reasonCode: '' as never }, /Selecciona un motivo/], [{ reasonCode: 'OTRO' as never }, /Selecciona un motivo/],
    [{ justification: ' '.repeat(5) + 'x'.repeat(19) + ' ' }, /al menos 20/], [{ justification: 'x'.repeat(1001) }, /hasta 1000/],
  ];
  await withAdapter(() => ({ data: saved() }), async calls => {
    for (const [over, expected] of cases) await assert.rejects(teacherGradesService.correctGrade(10, 40, 500, request(over)), expected, JSON.stringify(over));
    for (const id of [0, -1, 1.5]) await assert.rejects(teacherGradesService.correctGrade(10, 40, id, request()), /no es válida/);
    assert.equal(calls.length, 0);
  });
  assert.equal(gradeCorrectionError(request({ justification: 'x'.repeat(20) })), null);
  assert.equal(gradeCorrectionError(request({ justification: 'x'.repeat(1000) })), null);
  assert.equal(gradeCorrectionError(request({ grade: 0, expectedGrade: 12 })), null);
});

test('a response for another grade, context or value is rejected', async () => {
  for (const data of [{ ...saved(), id: 501 }, { ...saved(), sectionCourseId: 11 }, { ...saved(), bimesterId: 41 }, saved(16), { ...saved(), grade: null }]) {
    await withAdapter(() => ({ data }), async () => { await assert.rejects(teacherGradesService.correctGrade(10, 40, 500, request()), Error, JSON.stringify(data)); });
  }
});

test('error catalog: codes only with their contract status; GRADE_WINDOW_EXPIRED keeps its message; texts are sanitized', () => {
  const contract: Record<string, number> = { VALIDATION_ERROR: 400, REASON_REQUIRED: 400, RESOURCE_NOT_FOUND: 404, BIMESTER_STATE_CONFLICT: 409,
    GRADE_WINDOW_EXPIRED: 409, GRADE_CHANGED_CONCURRENTLY: 409, INTERNAL_ERROR: 500 };
  assert.deepEqual([...TEACHER_GRADE_CORRECTION_ERROR_CODES].sort(), Object.keys(contract).sort());
  for (const [code, status] of Object.entries(contract)) {
    for (const other of [400, 404, 409, 500]) assert.equal(teacherGradeCorrectionErrorCode(coded(other, code)), other === status ? code : null, `${code} ${other}`);
    assert.doesNotMatch(teacherGradeCorrectionErrorMessage(coded(status, code)), /secret|PRIVATE/);
  }
  assert.equal(teacherGradeCorrectionErrorCode(httpError(403)), null);
  assert.equal(teacherGradeCorrectionErrorMessage(coded(409, 'GRADE_WINDOW_EXPIRED')), GRADE_WINDOW_EXPIRED_MESSAGE);
  assert.equal(teacherGradesErrorMessage(coded(409, 'GRADE_WINDOW_EXPIRED')), GRADE_WINDOW_EXPIRED_MESSAGE);
  assert.equal(teacherGradeCorrectionErrorMessage(coded(409, 'GRADE_CHANGED_CONCURRENTLY')), GRADE_CHANGED_CONCURRENTLY_MESSAGE);
  assert.match(teacherGradeCorrectionErrorMessage(coded(400, 'REASON_REQUIRED')), /20 a 1000/);
  assert.match(teacherGradeCorrectionErrorMessage(coded(400, 'VALIDATION_ERROR')), /20 a 1000/);
  assert.match(teacherGradeCorrectionErrorMessage(httpError(403)), /No tienes permiso para corregir/);
  assert.match(teacherGradeCorrectionErrorMessage(httpError(401)), /sesión ha expirado/);
  assert.match(teacherGradeCorrectionErrorMessage(httpError()), /No se pudo conectar/);
  for (const [error, reload] of [[coded(409, 'GRADE_CHANGED_CONCURRENTLY'), true], [coded(409, 'GRADE_WINDOW_EXPIRED'), true], [coded(409, 'BIMESTER_STATE_CONFLICT'), true],
    [coded(404, 'RESOURCE_NOT_FOUND'), true], [httpError(404), true], [coded(400, 'VALIDATION_ERROR'), false], [httpError(403), false], [httpError(), false], [coded(500, 'INTERNAL_ERROR'), false]] as const)
    assert.equal(correctionRequiresReload(error), reload);
});

test('edit is offered only for an existing grade, active MANUAL criterion, ABIERTO and an open known window', () => {
  const parsed = parseCriterionGradesSheetResponse(sheetWire(), context);
  const data = adaptCriterionGradesSheet(parsed);
  const [active, inactive] = data.configuration.criteria;
  const [graded, empty] = data.records;
  assert.equal(canCorrectGrade(parsed.bimester, active, graded, window_()), true);
  assert.equal(canCorrectGrade(parsed.bimester, active, empty, window_()), false);
  assert.equal(canCorrectGrade(parsed.bimester, inactive, graded, window_()), false);
  assert.equal(canCorrectGrade(parsed.bimester, active, graded, window_({ expired: true })), false);
  assert.equal(canCorrectGrade(parsed.bimester, active, graded, null), false);
  assert.equal(canCorrectGrade(parsed.bimester, active, graded, window_({ bimesterId: 41 })), false);
  for (const status of ['EN_REVISION', 'CERRADO', 'PLANIFICADO', 'ANULADO'] as const) assert.equal(canCorrectGrade({ ...parsed.bimester, status }, active, graded, window_()), false);
});

test('reasonCode labels match the backend enum GradeCorrectionReason', () => {
  assert.deepEqual([...GRADE_CORRECTION_REASONS], ['TYPING_ERROR', 'WRONG_STUDENT', 'WRONG_CRITERION', 'REVIEW_REQUESTED', 'LATE_EVALUATION', 'OTHER']);
  assert.deepEqual(Object.values(gradeCorrectionReasonLabels), ['Error de digitación', 'Nota registrada a otro estudiante', 'La nota no corresponde al criterio',
    'Revisión solicitada', 'Evaluación rendida posteriormente', 'Otro']);
});

// ---------- Window panel ----------

test('window panel: registration date and inclusive deadline; unconfigured, extended, expired and absent', async () => {
  const render = async (value: GradeWindow | null) => { let r!: ReactTestRenderer; await act(async () => { r = create(<PlazoRegistroNotas gradeWindow={value} />); }); const shown = text(r.root); r.unmount(); return shown; };
  const open = await render(window_());
  assert.match(open, /Fecha de registro: 10\/12\/2026/); assert.match(open, /Fecha límite: 17\/12\/2026 inclusive, hora de Lima \(fecha de registro \+ 7 días\)/);
  assert.match(open, /Puedes registrar y corregir notas/); assert.doesNotMatch(open, /fin del bimestre/);
  assert.match(await render(window_({ registrationDateConfigured: false })), /\(fin del bimestre; sin fecha configurada por el Director\)/);
  assert.match(await render(window_({ extendedDeadline: '2026-12-22', deadline: '2026-12-22' })), /Fecha límite: 22\/12\/2026 .*\(ampliada por el Director\)/);
  const expired = await render(window_({ expired: true }));
  assert.ok(expired.includes(GRADE_WINDOW_EXPIRED_MESSAGE)); assert.doesNotMatch(expired, /Puedes registrar/);
  assert.equal(await render(null), NO_GRADE_WINDOW_MESSAGE);
  assert.equal(NO_GRADE_WINDOW_MESSAGE, 'Sin fecha límite configurada');
});

// ---------- Correction modal ----------

type Outcome = Awaited<ReturnType<React.ComponentProps<typeof ModalCorreccionNota>['onSubmit']>>;
async function modal(onSubmit: (gradeId: number, r: TeacherCorrectCriterionGradeRequest) => Promise<Outcome>, run: (h: { renderer: ReactTestRenderer; closed: () => number; fill: (grade: string, reason: string, justification: string) => Promise<void>; submit: () => Promise<void>; shown: () => string }) => Promise<void>, busy = false) {
  const restore = withDom();
  let renderer!: ReactTestRenderer, closed = 0;
  try {
    await act(async () => { renderer = create(<ModalCorreccionNota target={{ gradeId: 500, studentName: 'Ana Pérez', criterionName: 'Comprensión', currentGrade: 12 }} busy={busy} onClose={() => { closed++; }} onSubmit={onSubmit} />); });
    const byLabel = (label: string) => renderer.root.findByProps({ 'aria-label': label });
    await run({ renderer, closed: () => closed, shown: () => text(renderer.root),
      fill: async (grade, reason, justification) => { await act(async () => {
        byLabel('Nueva nota').props.onChange({ target: { value: grade } });
        byLabel('Motivo de la corrección').props.onChange({ target: { value: reason } });
        byLabel('Justificación').props.onChange({ target: { value: justification } });
      }); },
      submit: async () => { await act(async () => { byLabel('Corrección de nota').props.onSubmit({ preventDefault() {} }); }); } });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    restore();
  }
}
const justification = 'Se digitó 12 en lugar de 15 por error.';

test('modal: Spanish reason labels, counter and 1000-character limit; invalid input never submits', async () => {
  let sent = 0;
  await modal(async () => { sent++; return { ok: true }; }, async h => {
    const options = h.renderer.root.findByProps({ 'aria-label': 'Motivo de la corrección' }).findAllByType('option').map(text);
    assert.deepEqual(options, ['Selecciona un motivo', ...Object.values(gradeCorrectionReasonLabels)]);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Justificación' }).props.maxLength, 1000);
    assert.match(h.shown(), /Nota actual: 12/);
    for (const [grade, reason, why, expected] of [
      ['', 'TYPING_ERROR', justification, /Ingresa la nueva nota/], ['12', 'TYPING_ERROR', justification, /distinta de la nota actual/],
      ['15,5', 'TYPING_ERROR', justification, /dos decimales/], ['15', '', justification, /Selecciona un motivo/],
      ['15', 'OTHER', 'muy corta', /al menos 20/],
    ] as const) {
      await h.fill(grade, reason, why); await h.submit();
      assert.match(h.shown(), expected);
    }
    assert.equal(sent, 0);
    await h.fill('15', 'OTHER', 'x'.repeat(20));
    assert.match(h.shown(), /20\/1000/);
  });
});

test('modal: sends expectedGrade from the sheet; success and reload-required failures close it; other failures stay open', async () => {
  const received: TeacherCorrectCriterionGradeRequest[] = [];
  await modal(async (gradeId, r) => { assert.equal(gradeId, 500); received.push(r); return { ok: true }; }, async h => {
    await h.fill('15.5', 'REVIEW_REQUESTED', justification); await h.submit();
    assert.deepEqual(received, [{ grade: 15.5, reasonCode: 'REVIEW_REQUESTED', justification, expectedGrade: 12 }]);
    assert.equal(h.closed(), 1);
  });
  await modal(async () => ({ ok: false, error: GRADE_CHANGED_CONCURRENTLY_MESSAGE, reloaded: true }), async h => {
    await h.fill('15', 'TYPING_ERROR', justification); await h.submit(); assert.equal(h.closed(), 1);
  });
  await modal(async () => ({ ok: false, error: 'Revisa la nota', reloaded: false }), async h => {
    await h.fill('15', 'TYPING_ERROR', justification); await h.submit();
    assert.equal(h.closed(), 0); assert.match(h.shown(), /Revisa la nota/);
  });
});

test('modal: while busy every control is disabled', async () => {
  await modal(async () => ({ ok: true }), async h => {
    for (const label of ['Nueva nota', 'Motivo de la corrección', 'Justificación']) assert.equal(h.renderer.root.findByProps({ 'aria-label': label }).props.disabled, true);
    assert.equal(h.renderer.root.findAllByType('button').find(b => text(b) === 'Guardando...')?.props.disabled, true);
  }, true);
});

// ---------- Full notes view ----------

const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;
const course = { sectionCourseId: 10, assignmentId: 1, courseId: 20, code: 'COM', name: 'Comunicación', level: 'PRIMARY', area: 'Comunicación', weeklyHours: 4, sectionId: 5, grade: 3, sectionName: 'A', studentCount: 2 };
const teacher = { id: 300, personId: 1, dni: '00000000', firstNames: 'Docente', paternalLastName: 'Prueba', maternalLastName: null, fullName: 'Docente Prueba', phone: null, specialty: null, active: true };
function viewRoutes(sheet: () => Reply, patch: () => Reply = () => ({ data: saved() })): Route {
  return config => {
    const url = config.url ?? '';
    if (url === '/v1/teacher/me') return { data: teacher };
    if (url === '/v1/teacher/courses') return { data: [course] };
    if (url === '/v1/teacher/courses/10/students') return { data: [{ studentId: 200, studentCode: null, fullName: 'Ana Pérez', enrollmentId: 100 }, { studentId: 201, studentCode: null, fullName: 'Beto Ríos', enrollmentId: 101 }] };
    if (url === '/v1/teacher/courses/10/bimesters') return { data: [bimesterWire()] };
    if (url === '/v1/teacher/courses/10/bimesters/40/criterion-grades' && config.method === 'get') return sheet();
    if (url === '/v1/teacher/courses/10/bimesters/40/criterion-grades/500' && config.method === 'patch') return patch();
    if (url.endsWith('/results')) return { status: 500, data: { message: 'x' } };
    throw new Error(`unexpected ${config.method} ${url}`);
  };
}
async function notesView(run: (h: { renderer: ReactTestRenderer; shown: () => string; edit: () => ReactTestInstance | undefined }) => Promise<void>) {
  const restore = withDom();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AppRouterContext.Provider value={router}><DocenteSessionProvider><VistaNotasDocente /></DocenteSessionProvider></AppRouterContext.Provider>); });
    await act(async () => { renderer.root.findByProps({ 'aria-label': 'Bimestre' }).props.onChange({ target: { value: '40' } }); });
    await run({ renderer, shown: () => text(renderer.root), edit: () => renderer.root.findAllByType('button').find(b => b.props['aria-label'] === 'Editar Comprensión, Ana Pérez') });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    restore();
  }
}
async function correctFromView(h: { renderer: ReactTestRenderer; edit: () => ReactTestInstance | undefined }) {
  const edit = h.edit(); assert.ok(edit, 'Editar');
  await act(async () => { edit.props.onClick(); });
  const byLabel = (label: string) => h.renderer.root.findByProps({ 'aria-label': label });
  await act(async () => {
    byLabel('Nueva nota').props.onChange({ target: { value: '15' } });
    byLabel('Motivo de la corrección').props.onChange({ target: { value: 'TYPING_ERROR' } });
    byLabel('Justificación').props.onChange({ target: { value: justification } });
  });
  await act(async () => { byLabel('Corrección de nota').props.onSubmit({ preventDefault() {} }); });
}

test('notes view: shows the window and «Editar» only on graded active cells; success reloads the sheet', async () => {
  let reads = 0;
  await withAdapter(viewRoutes(() => ({ data: sheetWire({ grade: ++reads === 1 ? 12 : 15 }) })), async calls => {
    await notesView(async h => {
      assert.match(h.shown(), /Fecha de registro: 10\/12\/2026/); assert.match(h.shown(), /Fecha límite: 17\/12\/2026/);
      const edits = h.renderer.root.findAllByType('button').filter(b => text(b) === 'Editar').map(b => b.props['aria-label']);
      assert.deepEqual(edits, ['Editar Comprensión, Ana Pérez']);
      await correctFromView(h);
      const patches = calls.filter(c => c.method === 'patch');
      assert.deepEqual(patches.map(c => c.data), [{ grade: 15, reasonCode: 'TYPING_ERROR', justification, expectedGrade: 12 }]);
      assert.equal(reads, 2);
      assert.match(h.shown(), /Nota corregida\. Se volvió a consultar la planilla\./);
      assert.doesNotMatch(h.shown(), /Corregir nota/);
    });
  });
});

test('notes view: GRADE_CHANGED_CONCURRENTLY reloads the sheet, closes the modal and warns', async () => {
  let reads = 0;
  await withAdapter(viewRoutes(() => ({ data: sheetWire({ grade: ++reads === 1 ? 12 : 13 }) }),
    () => ({ status: 409, data: { error: 'Conflict', message: 'secret', code: 'GRADE_CHANGED_CONCURRENTLY', details: [] } })), async () => {
    await notesView(async h => {
      await correctFromView(h);
      assert.equal(reads, 2);
      assert.ok(h.shown().includes(GRADE_CHANGED_CONCURRENTLY_MESSAGE));
      assert.doesNotMatch(h.shown(), /Corregir nota|secret/);
      assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Comprensión, Ana Pérez, solo lectura' }).props.value, 13);
    });
  });
});

test('notes view: expired window shows GRADE_WINDOW_EXPIRED_MESSAGE and hides «Editar»; no window shows its text and hides it', async () => {
  for (const [wire, expected] of [[sheetWire({ gradeWindow: window_({ expired: true }) }), GRADE_WINDOW_EXPIRED_MESSAGE], [sheetWire({ omitWindow: true }), NO_GRADE_WINDOW_MESSAGE]] as const) {
    await withAdapter(viewRoutes(() => ({ data: wire })), async () => {
      await notesView(async h => {
        assert.ok(h.shown().includes(expected), expected);
        assert.equal(h.edit(), undefined);
      });
    });
  }
});

test('notes view: a bimester not ABIERTO never offers «Editar»', async () => {
  await withAdapter(viewRoutes(() => ({ data: sheetWire({ status: 'EN_REVISION' }) })), async () => {
    await notesView(async h => { assert.equal(h.edit(), undefined); });
  });
});
