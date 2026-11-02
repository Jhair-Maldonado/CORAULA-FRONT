import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import BimesterPublicationPanel from '../feature/admin/vistas/(academico)/bimestres/BimesterPublicationPanel';
import VistaBimestres from '../feature/admin/vistas/(academico)/bimestres/vistaBimestres';
import { AuthContext } from '../src/contexts/AuthContext';
import {
  bimesterPublicationService, hasPublicationPendings, parseBimesterPublicationView, publicationActionErrorMessage, publicationReadErrorMessage,
  publicationReasonLabel, reopenReasonError,
} from '../src/services/admin/bimesterPublicationService';
import { BIMESTER_PUBLICATION_ERROR_CODES, bimesterPublicationErrorCode, bimesterPublicationErrorCodeMessage, bimesterPublicationErrorCodeMessages } from '../src/services/admin/bimesterPublicationErrors';
import { evaluationService } from '../src/services/admin/evaluationService';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';
import type { BimesterPublicationView } from '../src/types/bimesterPublicationApi';

// Unit/component mocks only: no network, browser server or shared database. Synthetic data.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });
const bimester = (status: Bimester['status'] = 'ABIERTO', id = 4): Bimester => ({ id, academicPeriodId: 30, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status });
const prepared = (status: Bimester['status'] = 'ABIERTO', over: Partial<BimesterPublicationView> = {}): BimesterPublicationView => ({
  bimesterId: 4, status, publishedAt: null, revision: 0, preparationRevision: 'hash-1',
  courses: [{ sectionCourseId: 10, applicable: true, registered: true, registeredAt: '2026-04-30T18:00:00Z' }, { sectionCourseId: 11, applicable: false, registered: false, registeredAt: null }],
  details: [], ...over,
});
const published = (revision = 1): BimesterPublicationView => ({ bimesterId: 4, status: 'CERRADO', publishedAt: '2026-05-02T15:00:00Z', revision, preparationRevision: null, courses: [], details: [] });
const withPendings = (status: Bimester['status']) => prepared(status, {
  courses: [{ sectionCourseId: 10, applicable: true, registered: false, registeredAt: null }, { sectionCourseId: 11, applicable: false, registered: false, registeredAt: null }],
  details: [{ sectionCourseId: 10, enrollmentId: 101, reasons: ['MISSING_MANUAL_GRADE:8'] }, { sectionCourseId: null, enrollmentId: null, reasons: ['SECTION_WITHOUT_COURSES:1'] }, { sectionCourseId: 10, enrollmentId: null, reasons: ['SOMETHING_NEW'] }],
});
const httpError = (status?: number, code?: string) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { error: 'X', message: 'secret detail', ...(code ? { code, details: [] } : {}) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

async function withAdapter(run: (h: { calls: { method?: string; url?: string; data: unknown }[]; reply: (data: unknown, status?: number) => void }) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: { method?: string; url?: string; data: unknown }[] = [];
  let data: unknown = null, status = 200;
  httpClient.defaults.adapter = async config => { calls.push({ method: config.method, url: config.url, data: config.data }); return { config, data, status, statusText: 'OK', headers: {} }; };
  try { await run({ calls, reply: (value, code = 200) => { data = value; status = code; } }); } finally { httpClient.defaults.adapter = original; }
}

test('GET publication validates the #51-A view before and after publishing', async () => {
  await withAdapter(async h => {
    h.reply(prepared());
    assert.deepEqual(await bimesterPublicationService.getPublication(4), prepared());
    assert.deepEqual(h.calls[0], { method: 'get', url: '/v1/management/bimesters/4/publication', data: undefined });
    h.reply(published(2)); assert.equal((await bimesterPublicationService.getPublication(4)).revision, 2);
    h.reply(prepared('CERRADO')); assert.equal((await bimesterPublicationService.getPublication(4)).publishedAt, null);
    const bad: unknown[] = [
      { ...prepared(), bimesterId: 5 }, { ...prepared(), status: 'PUBLICADO' }, { ...prepared(), revision: -1 }, { ...prepared(), revision: 1 },
      { ...prepared(), preparationRevision: null }, { ...prepared(), preparationRevision: ' ' }, { ...prepared(), publishedAt: 'not a date' },
      { ...published(), preparationRevision: 'hash' }, { ...published(), revision: 0 }, { ...published(), status: 'EN_REVISION' },
      { ...published(), courses: prepared().courses }, { ...published(), details: [{ sectionCourseId: 10, enrollmentId: null, reasons: ['X'] }] },
      { ...prepared(), courses: [prepared().courses[0], prepared().courses[0]] },
      { ...prepared(), courses: [{ sectionCourseId: 10, applicable: false, registered: true, registeredAt: null }] },
      { ...prepared(), details: [{ sectionCourseId: 10, enrollmentId: null, reasons: [] }] },
      { ...prepared(), details: [{ sectionCourseId: 10, enrollmentId: null, reasons: [8] }] },
      { ...prepared(), details: [{ sectionCourseId: 0, enrollmentId: null, reasons: ['X'] }] },
      { ...prepared(), courses: null }, null, [], 'x',
    ];
    for (const value of bad) { h.reply(value); await assert.rejects(bimesterPublicationService.getPublication(4), Error, JSON.stringify(value)); }
    h.reply(prepared(), 204); await assert.rejects(bimesterPublicationService.getPublication(4));
    const count = h.calls.length;
    for (const id of [0, -1, 1.5, NaN]) await assert.rejects(bimesterPublicationService.getPublication(id), /entero positivo/);
    assert.equal(h.calls.length, count);
  });
  assert.equal(hasPublicationPendings(prepared()), false);
  assert.equal(hasPublicationPendings(withPendings('ABIERTO')), true);
  assert.equal(hasPublicationPendings(prepared('ABIERTO', { courses: [{ sectionCourseId: 10, applicable: true, registered: false, registeredAt: null }] })), true);
  assert.throws(() => parseBimesterPublicationView(prepared(), 5));
});

test('review, publish and reopen send exactly their contract bodies and confirm the resulting state', async () => {
  await withAdapter(async h => {
    h.reply(prepared('EN_REVISION'));
    assert.equal((await bimesterPublicationService.review(4)).status, 'EN_REVISION');
    assert.deepEqual(h.calls.at(-1), { method: 'post', url: '/v1/management/bimesters/4/review', data: undefined });
    for (const value of [prepared('ABIERTO'), published()]) { h.reply(value); await assert.rejects(bimesterPublicationService.review(4)); }

    h.reply(published());
    assert.equal((await bimesterPublicationService.publish(4, 'hash-1')).publishedAt, '2026-05-02T15:00:00Z');
    assert.deepEqual(h.calls.at(-1), { method: 'post', url: '/v1/management/bimesters/4/publish', data: JSON.stringify({ confirmed: true, preparationRevision: 'hash-1' }) });
    for (const value of [prepared('EN_REVISION'), prepared('CERRADO')]) { h.reply(value); await assert.rejects(bimesterPublicationService.publish(4, 'hash-1')); }
    h.reply(published(), 201); await assert.rejects(bimesterPublicationService.publish(4, 'hash-1'));

    h.reply(bimester('ABIERTO'));
    assert.equal((await bimesterPublicationService.reopen(4, '  Completar notas  ')).status, 'ABIERTO');
    assert.deepEqual(h.calls.at(-1), { method: 'post', url: '/v1/management/bimesters/4/reopen', data: JSON.stringify({ reason: 'Completar notas' }) });
    await bimesterPublicationService.reopen(4, 'm'.repeat(255));
    for (const value of [bimester('EN_REVISION'), bimester('ABIERTO', 5), {}]) { h.reply(value); await assert.rejects(bimesterPublicationService.reopen(4, 'Motivo')); }

    const count = h.calls.length;
    for (const revision of ['', '  ', 'x'.repeat(65)]) await assert.rejects(bimesterPublicationService.publish(4, revision), /preparación/);
    for (const reason of ['', '   ', 'm'.repeat(256)]) await assert.rejects(bimesterPublicationService.reopen(4, reason), /motivo/i);
    await assert.rejects(bimesterPublicationService.review(0)); await assert.rejects(bimesterPublicationService.publish(-1, 'hash')); await assert.rejects(bimesterPublicationService.reopen(1.5, 'Motivo'));
    assert.equal(h.calls.length, count);
  });
  assert.equal(reopenReasonError(`  ${'m'.repeat(255)}  `), null);
  assert.match(reopenReasonError('m'.repeat(256))!, /255/);
});

const contract: Record<string, number[]> = {
  VALIDATION_ERROR: [400], REASON_REQUIRED: [400], PUBLICATION_CONFIRMATION_REQUIRED: [400], RESOURCE_NOT_FOUND: [404],
  BIMESTER_STATE_CONFLICT: [409], COURSES_NOT_REGISTERED: [409], RESULTS_PENDING: [409], PUBLICATION_STALE: [409], INTERNAL_ERROR: [500],
};
const generic = ['VALIDATION_ERROR', 'INTERNAL_ERROR'];

test('error catalog: known codes only with their contract status; texts are fixed and sanitized', () => {
  assert.deepEqual([...BIMESTER_PUBLICATION_ERROR_CODES].sort(), Object.keys(contract).sort());
  assert.deepEqual(Object.keys(bimesterPublicationErrorCodeMessages).sort(), Object.keys(contract).filter(c => !generic.includes(c)).sort());
  for (const [code, statuses] of Object.entries(contract)) {
    for (const status of [400, 401, 403, 404, 409, 422, 500, 503]) assert.equal(bimesterPublicationErrorCode(httpError(status, code)), statuses.includes(status) ? code : null, `${code} ${status}`);
    const message = bimesterPublicationErrorCodeMessage(httpError(statuses[0], code));
    if (generic.includes(code)) assert.equal(message, null); else assert.ok(message && !/secret|PRIVATE/.test(message), code);
  }
  for (const code of ['GRADE_CHANGED_CONCURRENTLY', 'STUDENT_STATUS_CONFLICT', 'STRUCTURE_FROZEN', 'toString', '__proto__', 'publication_stale']) assert.equal(bimesterPublicationErrorCode(httpError(409, code)), null, code);
  assert.equal(bimesterPublicationErrorCode(httpError()), null);
});

test('action messages: catalog first, then HTTP; uncertain results never claim success', () => {
  assert.match(publicationActionErrorMessage(httpError(409, 'PUBLICATION_STALE'), 'publish'), /La preparación cambió/);
  assert.match(publicationActionErrorMessage(httpError(409, 'COURSES_NOT_REGISTERED'), 'review'), /cursos sin registro final/);
  assert.match(publicationActionErrorMessage(httpError(409, 'RESULTS_PENDING'), 'publish'), /resultados pendientes/);
  assert.match(publicationActionErrorMessage(httpError(409, 'BIMESTER_STATE_CONFLICT'), 'reopen'), /estado del bimestre cambió/);
  assert.match(publicationActionErrorMessage(httpError(400, 'PUBLICATION_CONFIRMATION_REQUIRED'), 'publish'), /confirmar explícitamente/);
  assert.match(publicationActionErrorMessage(httpError(400, 'REASON_REQUIRED'), 'reopen'), /motivo de la reapertura/);
  assert.match(publicationActionErrorMessage(httpError(400, 'VALIDATION_ERROR'), 'reopen'), /255 caracteres/);
  assert.match(publicationActionErrorMessage(httpError(400), 'publish'), /publicación no es válida/);
  assert.match(publicationActionErrorMessage(httpError(403, 'PUBLICATION_STALE'), 'publish'), /Solo el Director/);
  assert.match(publicationActionErrorMessage(httpError(401), 'review'), /sesión/);
  assert.match(publicationActionErrorMessage(httpError(409), 'review'), /El bimestre cambió/);
  for (const error of [httpError(), httpError(500, 'INTERNAL_ERROR'), httpError(503, 'PUBLICATION_STALE'), new Error('Respuesta incoherente')]) {
    assert.match(publicationActionErrorMessage(error, 'publish'), /No se pudo confirmar la operación\. Se consultó el estado sin repetirla/);
  }
  for (const error of [httpError(403), httpError(404), httpError(), new Error('x')]) assert.doesNotMatch(publicationReadErrorMessage(error), /secret|PRIVATE/);
});

test('pending reasons: #45 labels, institutional reasons with section names and unknown codes', () => {
  assert.equal(publicationReasonLabel('COURSE_NOT_REGISTERED'), 'Curso sin registro final del docente');
  assert.equal(publicationReasonLabel('ACADEMIC_CONTEXT_INACTIVE'), 'La sección o el curso están inactivos');
  assert.equal(publicationReasonLabel('NO_ACTIVE_POPULATION'), 'No hay matrículas activas en el periodo');
  assert.equal(publicationReasonLabel('SECTION_WITHOUT_COURSES:7'), 'Sección #7: tiene alumnos y ningún curso activo');
  assert.equal(publicationReasonLabel('SECTION_WITHOUT_COURSES:7', () => '1° A'), '1° A: tiene alumnos y ningún curso activo');
  assert.equal(publicationReasonLabel('MISSING_MANUAL_GRADE:8'), 'Falta una nota MANUAL (criterio #8)');
  assert.match(publicationReasonLabel('AREA_INCOMPLETE'), /área/);
  for (const unknown of ['SOMETHING_NEW', 'MISSING_MANUAL_GRADE:x', 'SECTION_WITHOUT_COURSES:', '']) assert.equal(publicationReasonLabel(unknown), 'Pendiente no reconocido');
});

function withDom() {
  const globals = ['window', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  return { Element, restore: () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } } };
}
function mockNames(fail = false) {
  const oldSections = sectionsService.list, oldCourses = sectionCoursesService.list;
  sectionsService.list = async () => { if (fail) throw httpError(); return [{ id: 1, academicPeriodId: 30, level: 'PRIMARY', grade: 1, name: 'A', maxCapacity: 30, enrollmentOpen: false, active: true }]; };
  sectionCoursesService.list = async () => [10, 11].map((id, i) => ({ id, sectionId: 1, courseId: 20 + i, courseCode: `C${i}`, courseName: i ? 'Arte' : 'Matemática', active: true, teacherId: null, teacherName: null }));
  return () => { sectionsService.list = oldSections; sectionCoursesService.list = oldCourses; };
}

type Panel = { renderer: ReactTestRenderer; button: (name: string) => ReactTestInstance | undefined; click: (name: string) => Promise<void>; shown: () => string; changed: () => number; busy: boolean[] };
async function panel(overrides: Partial<typeof bimesterPublicationService>, run: (h: Panel) => Promise<void>, options: { canManage?: boolean; status?: Bimester['status']; namesFail?: boolean } = {}) {
  const original = { ...bimesterPublicationService };
  Object.assign(bimesterPublicationService, { getPublication: async () => prepared(options.status ?? 'ABIERTO') }, overrides);
  const restoreNames = mockNames(options.namesFail);
  const dom = withDom();
  let renderer!: ReactTestRenderer, changed = 0;
  const busy: boolean[] = [];
  try {
    await act(async () => { renderer = create(<BimesterPublicationPanel bimester={bimester(options.status ?? 'ABIERTO')} canManage={options.canManage ?? true} locked={false}
      onClose={() => {}} onChanged={() => { changed++; }} onBusyChange={value => { busy.push(value); }} />, { createNodeMock: () => new dom.Element() }); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    await run({ renderer, button, busy, shown: () => text(renderer.root), changed: () => changed,
      click: async name => { const node = button(name); assert.ok(node, name); assert.equal(!!node.props.disabled, false, name); await act(async () => { node.props.onClick(); }); } });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(bimesterPublicationService, original); restoreNames(); dom.restore();
  }
}
const actions = ['Pasar a revisión', 'Publicar', 'Reabrir'];
const submitForm = (h: Panel, label: string) => act(async () => { h.renderer.root.findByProps({ 'aria-label': label }).props.onSubmit({ preventDefault() {} }); });
const check = (h: Panel) => act(async () => { h.renderer.root.findByProps({ 'aria-label': 'Entiendo que la publicación es definitiva' }).props.onChange({ target: { checked: true } }); });
const typeReason = (h: Panel, value: string) => act(async () => { h.renderer.root.findByProps({ 'aria-label': 'Motivo de la reapertura' }).props.onChange({ target: { value } }); });

test('state × role matrix: actions only for ADMINISTRADOR in their state; pendings block review and publish; CERRADO needs publishedAt', async () => {
  const cases: [string, BimesterPublicationView, Record<string, boolean | undefined>, RegExp][] = [
    ['ABIERTO', prepared('ABIERTO'), { 'Pasar a revisión': true }, /Sin publicar/],
    ['ABIERTO pendings', withPendings('ABIERTO'), { 'Pasar a revisión': false }, /Cursos registrados: 0\/1 · Pendientes: 3/],
    ['EN_REVISION', prepared('EN_REVISION'), { Publicar: true, Reabrir: true }, /Cursos registrados: 1\/1 · Pendientes: 0/],
    ['EN_REVISION pendings', withPendings('EN_REVISION'), { Publicar: false, Reabrir: true }, /Cursos registrados: 0\/1 · Pendientes: 3/],
    ['CERRADO published', published(3), {}, /Publicado el .* · revisión 3\. La publicación es definitiva/],
    ['CERRADO unpublished', prepared('CERRADO'), {}, /Cerrado sin publicación/],
  ];
  for (const canManage of [true, false]) {
    for (const [name, view, expected, summary] of cases) {
      await panel({ getPublication: async () => view }, async h => {
        for (const action of actions) {
          const node = h.button(action);
          const want = canManage ? expected[action] : undefined;
          assert.equal(node ? !node.props.disabled : undefined, want, `${canManage} ${name} ${action}`);
        }
        assert.match(h.shown(), summary, name);
        assert.equal(/solo lectura/.test(h.shown()), !canManage, name);
        // The blocking explanation is only for whoever could act.
        assert.equal(/No se puede pasar a revisión mientras haya/.test(h.shown()), canManage && name === 'ABIERTO pendings', name);
        assert.equal(/No se puede publicar mientras haya pendientes/.test(h.shown()), canManage && name === 'EN_REVISION pendings', name);
        if (view.publishedAt === null) assert.doesNotMatch(h.shown(), /Publicado el/);
      }, { canManage, status: view.status });
    }
  }
});

test('courses and pendings are shown per course-section with names; institutional and unknown pendings are kept', async () => {
  await panel({ getPublication: async () => withPendings('ABIERTO') }, async h => {
    const rows = h.renderer.root.findAllByType('tr').slice(1).map(text);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /^Arte · Primaria · 1° ASin alumnos \(no aplica\)Ninguno$/);
    assert.match(rows[1], /^Matemática · Primaria · 1° ASin registro finalMatrícula #101: Falta una nota MANUAL \(criterio #8\)Pendiente no reconocido$/);
    assert.match(h.shown(), /InstituciónPrimaria · 1° A: tiene alumnos y ningún curso activo/);
  });
  await panel({ getPublication: async () => prepared('ABIERTO') }, async h => {
    assert.match(h.shown(), /Curso-sección #10Registrado el/);
    assert.match(h.shown(), /No se pudieron cargar los nombres/);
  }, { namesFail: true });
});

test('publish: explicit confirmation, the shown preparationRevision, one POST and success only after a confirming reload', async () => {
  const sent: string[] = []; let reads = 0;
  const pending = deferred<BimesterPublicationView>();
  await panel({ getPublication: async () => ++reads === 1 ? prepared('EN_REVISION') : published(), publish: async (_id, revision) => { sent.push(revision); return pending.promise; } }, async h => {
    await h.click('Publicar');
    assert.match(h.shown(), /La publicación es definitiva: el bimestre queda Cerrado y no se puede reabrir/);
    await submitForm(h, 'Publicación del bimestre');
    assert.deepEqual(sent, []); assert.match(h.shown(), /Confirma que entiendes que la publicación es definitiva/);
    await check(h);
    const submit = h.renderer.root.findByProps({ 'aria-label': 'Publicación del bimestre' }).props.onSubmit;
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
    assert.deepEqual(sent, ['hash-1']); assert.deepEqual(h.busy, [true]);
    assert.equal(h.button('Actualizar panel')?.props.disabled, true);
    await act(async () => { pending.resolve(published()); });
    assert.equal(reads, 2); assert.equal(h.changed(), 1); assert.deepEqual(h.busy, [true, false]);
    assert.match(h.shown(), /Bimestre 4 quedó publicado\. Publicación confirmada mediante recarga\./);
    assert.match(h.shown(), /Publicado el/);
    for (const action of actions) assert.equal(h.button(action), undefined);
  }, { status: 'EN_REVISION' });
});

test('a dialog opened before a reload cannot publish the stale preparation', async () => {
  let publishes = 0, reads = 0;
  await panel({ getPublication: async () => prepared('EN_REVISION', { preparationRevision: `hash-${++reads}` }), publish: async () => { publishes++; return published(); } }, async h => {
    await h.click('Publicar'); await check(h);
    const stale = h.renderer.root.findByProps({ 'aria-label': 'Publicación del bimestre' }).props.onSubmit;
    await h.click('Actualizar panel');
    assert.equal(h.renderer.root.findAllByProps({ 'aria-label': 'Publicación del bimestre' }).length, 0);
    await act(async () => { stale({ preventDefault() {} }); });
    assert.equal(publishes, 0);
  }, { status: 'EN_REVISION' });
});

test('every publish failure reloads the panel once, shows a fixed message and never retries', async () => {
  const cases: [AxiosError | Error, RegExp][] = [
    [httpError(409, 'PUBLICATION_STALE'), /La preparación cambió/], [httpError(409, 'RESULTS_PENDING'), /resultados pendientes/],
    [httpError(409, 'COURSES_NOT_REGISTERED'), /cursos sin registro final/], [httpError(409, 'BIMESTER_STATE_CONFLICT'), /estado del bimestre cambió/],
    [httpError(400, 'PUBLICATION_CONFIRMATION_REQUIRED'), /confirmar explícitamente/], [httpError(404, 'RESOURCE_NOT_FOUND'), /ya no está disponible/],
    [httpError(403), /Solo el Director/], [httpError(401), /sesión/], [httpError(), /sin repetirla/], [httpError(500, 'INTERNAL_ERROR'), /sin repetirla/],
    [new Error('La respuesta no confirma la publicación.'), /sin repetirla/],
  ];
  for (const [failure, expected] of cases) {
    let publishes = 0, reads = 0;
    await panel({ getPublication: async () => { reads++; return prepared('EN_REVISION'); }, publish: async () => { publishes++; throw failure; } }, async h => {
      await h.click('Publicar'); await check(h); await submitForm(h, 'Publicación del bimestre');
      assert.equal(publishes, 1); assert.equal(reads, 2); assert.equal(h.changed(), 1);
      assert.match(h.shown(), expected); assert.doesNotMatch(h.shown(), /secret|PRIVATE|quedó publicado/);
      assert.equal(h.button('Publicar')?.props.disabled, false, 'the reloaded state allows a new, manual attempt');
    }, { status: 'EN_REVISION' });
  }
});

test('an accepted action the reload does not confirm requires a manual refresh', async () => {
  for (const reloadFails of [false, true]) {
    let reads = 0;
    await panel({ getPublication: async () => { reads++; if (reads === 2 && reloadFails) throw httpError(); return prepared('ABIERTO'); }, review: async () => prepared('EN_REVISION') }, async h => {
      await h.click('Pasar a revisión'); await h.click('Confirmar paso a revisión');
      assert.doesNotMatch(h.shown(), /está En revisión/);
      assert.match(h.shown(), reloadFails ? /No se pudo recargar el panel/ : /la recarga no la confirmó/);
      if (!reloadFails) { assert.match(h.shown(), /Actualiza el panel antes de otra operación/); assert.equal(h.button('Pasar a revisión')?.props.disabled, true); }
      await h.click('Actualizar panel');
      assert.equal(h.button('Pasar a revisión')?.props.disabled, false);
    });
  }
});

test('review: confirmation warns teachers lose editing; one POST and a confirmed reload', async () => {
  let reviews = 0, reads = 0;
  await panel({ getPublication: async () => ++reads === 1 ? prepared('ABIERTO') : prepared('EN_REVISION'), review: async () => { reviews++; return prepared('EN_REVISION'); } }, async h => {
    await h.click('Pasar a revisión');
    assert.match(h.shown(), /Los docentes ya no podrán registrar ni corregir notas/);
    await h.click('Cancelar'); assert.equal(reviews, 0);
    await h.click('Pasar a revisión'); await h.click('Confirmar paso a revisión');
    assert.equal(reviews, 1); assert.match(h.shown(), /Bimestre 4 está En revisión\. Estado confirmado mediante recarga\./);
    assert.ok(h.button('Publicar')); assert.ok(h.button('Reabrir'));
  });
});

test('reopen: reason of 1–255 trimmed characters with a counter; REASON_REQUIRED keeps a fixed text', async () => {
  const sent: string[] = []; let reads = 0; let failure: Error | null = null;
  await panel({ getPublication: async () => ++reads === 1 || failure ? prepared('EN_REVISION') : prepared('ABIERTO'), reopen: async (_id, reason) => { sent.push(reason); if (failure) throw failure; return bimester('ABIERTO'); } }, async h => {
    await h.click('Reabrir');
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Motivo de la reapertura' }).props.maxLength, 255);
    await submitForm(h, 'Reapertura del bimestre'); assert.match(h.shown(), /Indica el motivo de la reapertura\./);
    await typeReason(h, 'm'.repeat(256)); assert.match(h.shown(), /256\/255/);
    await submitForm(h, 'Reapertura del bimestre'); assert.match(h.shown(), /no puede superar los 255/);
    assert.deepEqual(sent, []);
    failure = httpError(400, 'REASON_REQUIRED');
    await typeReason(h, '  Completar notas  '); await submitForm(h, 'Reapertura del bimestre');
    assert.deepEqual(sent, ['Completar notas']); assert.match(h.shown(), /Indica el motivo de la reapertura \(obligatorio, hasta 255 caracteres\)/);
    failure = null;
    await h.click('Reabrir'); await typeReason(h, 'Completar notas'); await submitForm(h, 'Reapertura del bimestre');
    assert.equal(sent.length, 2); assert.match(h.shown(), /volvió a Abierto/); assert.ok(h.button('Pasar a revisión'));
  }, { status: 'EN_REVISION' });
});

test('a late answer after the panel closes is ignored and still releases the list lock', async () => {
  const pending = deferred<BimesterPublicationView>(); let reads = 0;
  const busy: boolean[] = [];
  await panel({ getPublication: async () => { reads++; return prepared('ABIERTO'); }, review: async () => pending.promise }, async h => {
    await h.click('Pasar a revisión'); await h.click('Confirmar paso a revisión');
    busy.push(...h.busy);
    await act(async () => { h.renderer.unmount(); });
    await act(async () => { pending.resolve(prepared('EN_REVISION')); });
    busy.splice(0, busy.length, ...h.busy);
  });
  assert.deepEqual(busy, [true, false]);
  assert.equal(reads, 2);
});

async function bimestersView(role: Auth['role'], run: (h: { renderer: ReactTestRenderer; button: (label: string) => ReactTestInstance | undefined; lists: () => number }) => Promise<void>, overrides: Partial<typeof bimesterPublicationService> = {}) {
  const original = { ...evaluationService }, originalPeriods = academicPeriodsService.list, originalPublication = { ...bimesterPublicationService };
  let lists = 0, status: Bimester['status'] = 'ABIERTO';
  Object.assign(evaluationService, { getBimesters: async () => { lists++; return [bimester(status, 4), bimester('PLANIFICADO', 5), bimester('ANULADO', 6), bimester('CERRADO', 7)]; } });
  Object.assign(bimesterPublicationService, { getPublication: async () => prepared(status), review: async () => { status = 'EN_REVISION'; return prepared('EN_REVISION'); } }, overrides);
  academicPeriodsService.list = async () => [{ id: 30, name: 'Periodo 30', startDate: '2026-03-01', endDate: '2026-12-20', active: true, current: true }];
  const restoreNames = mockNames();
  const dom = withDom();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AuthContext.Provider value={auth(role)}><VistaBimestres /></AuthContext.Provider>, { createNodeMock: () => new dom.Element() }); });
    const button = (label: string) => renderer.root.findAllByType('button').find(b => b.props['aria-label'] === label || text(b) === label);
    await run({ renderer, button, lists: () => lists });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(evaluationService, original); Object.assign(bimesterPublicationService, originalPublication); academicPeriodsService.list = originalPeriods; restoreNames(); dom.restore();
  }
}

test('bimesters view: «Publicación» only for ABIERTO/EN_REVISION/CERRADO; a panel action reloads the list', async () => {
  await bimestersView('ADMINISTRADOR', async h => {
    assert.ok(h.button('Publicación de Bimestre 4')); assert.ok(h.button('Publicación de Bimestre 7'));
    assert.equal(h.button('Publicación de Bimestre 5'), undefined); assert.equal(h.button('Publicación de Bimestre 6'), undefined);
    await act(async () => { h.button('Publicación de Bimestre 4')!.props.onClick(); });
    assert.match(text(h.renderer.root), /Publicación · Bimestre 4/);
    const before = h.lists();
    await act(async () => { h.button('Pasar a revisión')!.props.onClick(); });
    await act(async () => { h.button('Confirmar paso a revisión')!.props.onClick(); });
    assert.equal(h.lists(), before + 1);
    assert.match(text(h.renderer.root), /Bimestre 4 está En revisión/);
    assert.match(text(h.renderer.root.findAllByType('tbody')[0]), /Bimestre 4.*En revisión/);
  });
});

test('bimesters view: other actions stay locked while a publication action runs', async () => {
  const pending = deferred<BimesterPublicationView>();
  await bimestersView('ADMINISTRADOR', async h => {
    await act(async () => { h.button('Publicación de Bimestre 4')!.props.onClick(); });
    await act(async () => { h.button('Pasar a revisión')!.props.onClick(); });
    await act(async () => { h.button('Confirmar paso a revisión')!.props.onClick(); });
    for (const label of ['Actualizar', 'Crear bimestre', 'Abrir bimestre', 'Anular', 'Publicación de Bimestre 7']) assert.equal(h.button(label)?.props.disabled, true, label);
    await act(async () => { pending.resolve(prepared('EN_REVISION')); });
    assert.equal(h.button('Actualizar')?.props.disabled, false);
  }, { review: async () => pending.promise });
});

test('bimesters view: DIRECTIVO opens the panel read-only', async () => {
  await bimestersView('DIRECTIVO', async h => {
    await act(async () => { h.button('Publicación de Bimestre 4')!.props.onClick(); });
    assert.match(text(h.renderer.root), /Acceso DIRECTIVO: solo lectura/);
    for (const action of actions) assert.equal(h.button(action), undefined);
  });
});
