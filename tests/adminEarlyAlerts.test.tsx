import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import BimesterEarlyAlertsPanel, { EVALUATION_CONFIRM_MESSAGE, FILTER_SECTIONS_ERROR } from '../feature/admin/vistas/(academico)/bimestres/BimesterEarlyAlertsPanel';
import VistaBimestres from '../feature/admin/vistas/(academico)/bimestres/vistaBimestres';
import { AuthContext } from '../src/contexts/AuthContext';
import { parseEarlyWarningsPage } from '../src/lib/earlyWarningsContract';
import {
  EVALUATION_UNCONFIRMED_MESSAGE, MANAGEMENT_EARLY_ALERTS_EMPTY_MESSAGE, MANAGEMENT_EARLY_ALERTS_ERROR_CODES, evaluationNotice,
  managementEarlyAlertsErrorMessage, managementEarlyAlertsService,
} from '../src/services/admin/managementEarlyAlertsService';
import { EARLY_ALERTS_EMPTY_MESSAGE } from '../src/services/teacher/teacherEarlyAlertsService';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { evaluationService } from '../src/services/admin/evaluationService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';
import type { EarlyWarning, EarlyWarningsPage } from '../src/types/teacherEarlyAlertsApi';

// Management early alerts: synthetic data only, no network (the HTTP adapter and services are stubbed).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const BASE = '/v1/management/bimesters/4/early-alerts';
const bimester = (status: Bimester['status'] = 'ABIERTO', id = 4): Bimester => ({ id, academicPeriodId: 30, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status });
const alert = (n: number, over: Partial<EarlyWarning> = {}): EarlyWarning => ({
  alertId: 900 + n, enrollmentId: 100 + n, sectionCourseId: 10, bimesterId: 4, studentId: 50 + n, studentCode: `E${n}`, fullName: `Alumno ${n}`,
  courseName: 'Matemática', sectionName: 'A', paAtDetection: 9.5, activityCount: 3, evaluatedOn: '2026-03-15', detectedAt: '2026-03-15T13:00:00Z', ...over,
});
const pageOf = (content: EarlyWarning[], page = 0, totalElements = content.length): EarlyWarningsPage => ({ content, page, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) });

type Call = { method: string; url: string; params?: Record<string, unknown>; data?: unknown };
type Reply = { status: number; data: unknown } | 'network';
async function withHttp(handler: (call: Call) => Reply | Promise<Reply>, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call: Call = { method: String(config.method).toUpperCase(), url: String(config.url), params: config.params, data: config.data };
    calls.push(call);
    const reply = await handler(call);
    if (reply === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, response);
    return response;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}
const httpError = (status: number | undefined, code?: string) => new AxiosError('PRIVATE', 'ERR_TEST', undefined, undefined,
  status === undefined ? undefined : { status, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR', ...(code ? { code } : {}) } } as AxiosResponse);

function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

function withDom() {
  const globals = ['self', 'window', 'document', 'HTMLElement', 'localStorage'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
  return { Element, restore: () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } } };
}
function mockFilter(options: { sectionsFail?: boolean } = {}) {
  const old = { sections: sectionsService.list, courses: sectionCoursesService.list };
  sectionsService.list = async () => { if (options.sectionsFail) throw httpError(500); return [{ id: 1, academicPeriodId: 30, level: 'PRIMARY', grade: 1, name: 'A', maxCapacity: 30, enrollmentOpen: false, active: true }]; };
  sectionCoursesService.list = async () => [10, 11].map((id, i) => ({ id, sectionId: 1, courseId: 20 + i, courseCode: `C${i}`, courseName: i ? 'Arte' : 'Matemática', active: i === 0, teacherId: null, teacherName: null }));
  return () => { sectionsService.list = old.sections; sectionCoursesService.list = old.courses; };
}

type Panel = { root: ReactTestInstance; body: () => string; button: (label: string) => ReactTestInstance | undefined; click: (label: string) => Promise<void>; select: (label: string, value: string) => Promise<void>; busy: boolean[] };
async function renderPanel(options: { status?: Bimester['status']; canManage?: boolean; sectionsFail?: boolean }, run: (p: Panel) => Promise<void>) {
  const restore = mockFilter(options);
  const dom = withDom();
  const busy: boolean[] = [];
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<BimesterEarlyAlertsPanel bimester={bimester(options.status ?? 'ABIERTO')} periodId={30} canManage={options.canManage ?? true} locked={false}
        onClose={() => {}} onBusyChange={value => { busy.push(value); }} />, { createNodeMock: () => new dom.Element() });
    });
    const root = renderer.root;
    const button = (label: string) => root.findAllByType('button').find(b => text(b) === label);
    await run({
      root, body: () => text(root), button, busy,
      click: async label => { const b = button(label); assert.ok(b, label); assert.equal(!!b.props.disabled, false, `${label} habilitado`); await act(async () => { b.props.onClick(); }); },
      select: async (label, value) => { await act(async () => { root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    restore(); dom.restore();
  }
}

test('service: GET with and without course filter, POST evaluate without body, strict parsing', async () => {
  const all = pageOf([alert(1), alert(1, { alertId: 950, sectionCourseId: 11, courseName: 'Arte' })]);
  await withHttp(call => call.method === 'POST' ? { status: 200, data: { bimesterId: 4, createdCount: 2 } } : { status: 200, data: call.params?.sectionCourseId ? pageOf([alert(1)]) : all }, async calls => {
    assert.deepEqual(await managementEarlyAlertsService.list(4, null), all);
    assert.equal((await managementEarlyAlertsService.list(4, 10, 0, 20)).content.length, 1);
    assert.deepEqual(await managementEarlyAlertsService.evaluate(4), { bimesterId: 4, createdCount: 2 });
    assert.deepEqual(calls.map(c => [c.method, c.url, c.params, c.data]), [
      ['GET', BASE, { page: 0, size: 20 }, undefined],
      ['GET', BASE, { sectionCourseId: 10, page: 0, size: 20 }, undefined],
      ['POST', `${BASE}/evaluate`, undefined, undefined],
    ]);
  });
  // Without filter the same enrollment may appear in two courses; never twice in the same course or another bimester.
  const expected = { bimesterId: 4, sectionCourseId: null, page: 0, size: 20 };
  assert.throws(() => parseEarlyWarningsPage(pageOf([alert(1), alert(1, { alertId: 951 })]), expected), /contrato/);
  assert.throws(() => parseEarlyWarningsPage(pageOf([alert(1, { bimesterId: 5 })]), expected), /contrato/);
  assert.throws(() => parseEarlyWarningsPage(pageOf([alert(1, { sectionCourseId: 11 })]), { ...expected, sectionCourseId: 10 }), /contrato/);
  for (const body of [{ bimesterId: 5, createdCount: 1 }, { bimesterId: 4, createdCount: -1 }, { bimesterId: 4, createdCount: 1.5 }, { bimesterId: 4 }, null]) {
    await withHttp(() => ({ status: 200, data: body }), async () => {
      const error = await managementEarlyAlertsService.evaluate(4).then(() => null, e => e);
      assert.equal(managementEarlyAlertsErrorMessage(error, 'evaluate'), EVALUATION_UNCONFIRMED_MESSAGE);
    });
  }
});

test('error messages: codes only with their contract status, never the server message', () => {
  assert.deepEqual(MANAGEMENT_EARLY_ALERTS_ERROR_CODES, ['ALERT_REQUEST_INVALID', 'ALERT_CONTEXT_UNAVAILABLE', 'ALERT_INTERNAL_ERROR']);
  assert.equal(managementEarlyAlertsErrorMessage(httpError(400, 'ALERT_REQUEST_INVALID'), 'list'), 'El bimestre, el curso o la página no son válidos.');
  assert.equal(managementEarlyAlertsErrorMessage(httpError(404, 'ALERT_CONTEXT_UNAVAILABLE'), 'list'), 'El bimestre o el curso ya no está disponible. Actualiza la información.');
  assert.equal(managementEarlyAlertsErrorMessage(httpError(409, 'ALERT_CONTEXT_UNAVAILABLE'), 'list'), 'No se pudieron consultar las alertas tempranas. Intenta nuevamente.');
  assert.equal(managementEarlyAlertsErrorMessage(httpError(403), 'list'), 'No tienes autorización para consultar las alertas.');
  assert.equal(managementEarlyAlertsErrorMessage(httpError(403), 'evaluate'), 'Solo el Director puede evaluar alertas.');
  assert.match(managementEarlyAlertsErrorMessage(httpError(401), 'evaluate'), /sesión ha expirado/);
  assert.match(managementEarlyAlertsErrorMessage(httpError(undefined), 'list'), /conectar con el servidor/);
  for (const error of [httpError(500, 'ALERT_INTERNAL_ERROR'), httpError(502), httpError(undefined)]) assert.equal(managementEarlyAlertsErrorMessage(error, 'evaluate'), EVALUATION_UNCONFIRMED_MESSAGE);
  for (const status of [400, 401, 403, 404, 409, 500]) for (const action of ['list', 'evaluate'] as const) assert.doesNotMatch(managementEarlyAlertsErrorMessage(httpError(status), action), /DETALLE INTERNO/);
  assert.equal(evaluationNotice(0), 'Se generaron 0 alertas nuevas');
  assert.equal(evaluationNotice(1), 'Se generó 1 alerta nueva');
  assert.equal(evaluationNotice(3), 'Se generaron 3 alertas nuevas');
});

test('ADMINISTRADOR evaluates an ABIERTO bimester after confirming: one POST, reload and the created count (0 included)', async () => {
  for (const createdCount of [3, 0]) {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await withHttp(async call => {
      if (call.method === 'POST') { await gate; return { status: 200, data: { bimesterId: 4, createdCount } }; }
      return { status: 200, data: pageOf([alert(1)]) };
    }, async calls => {
      await renderPanel({}, async p => {
        assert.match(p.body(), /Alumno 1.*Matemática.*A/);
        await p.click('Evaluar ahora');
        assert.match(p.body(), new RegExp(EVALUATION_CONFIRM_MESSAGE.slice(0, 40)));
        const confirm = p.button('Confirmar evaluación')!;
        await act(async () => { confirm.props.onClick(); confirm.props.onClick(); });
        assert.equal(p.button('Evaluando...')?.props.disabled, true);
        assert.equal(p.button('Actualizar alertas')?.props.disabled, true);
        await act(async () => { release(); });
        assert.equal(calls.filter(c => c.method === 'POST').length, 1, 'un único POST');
        assert.deepEqual(calls.map(c => c.method), ['GET', 'POST', 'GET']);
        assert.match(p.body(), new RegExp(evaluationNotice(createdCount)));
        assert.deepEqual(p.busy, [true, false]);
      });
    });
  }
});

test('evaluation failures: unconfirmed results reload without success; a 403 does not reload', async () => {
  for (const [reply, expected, gets] of [
    [{ status: 500, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR', code: 'ALERT_INTERNAL_ERROR' } }, EVALUATION_UNCONFIRMED_MESSAGE, 2],
    ['network', EVALUATION_UNCONFIRMED_MESSAGE, 2],
    [{ status: 404, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR', code: 'ALERT_CONTEXT_UNAVAILABLE' } }, 'El bimestre o el curso ya no está disponible', 2],
    [{ status: 403, data: { error: 'Forbidden', message: 'DETALLE INTERNO DEL SERVIDOR' } }, 'Solo el Director puede evaluar alertas.', 1],
  ] as const) {
    await withHttp(call => call.method === 'POST' ? reply : { status: 200, data: pageOf([]) }, async calls => {
      await renderPanel({}, async p => {
        await p.click('Evaluar ahora');
        await p.click('Confirmar evaluación');
        const body = p.body();
        assert.ok(body.includes(expected), body);
        assert.doesNotMatch(body, /Se generaron|Se generó|DETALLE INTERNO/);
        assert.equal(calls.filter(c => c.method === 'GET').length, gets);
      });
    });
  }
});

test('"Evaluar ahora" only for ADMINISTRADOR on ABIERTO; DIRECTIVO reads', async () => {
  await withHttp(() => ({ status: 200, data: pageOf([alert(1)]) }), async () => {
    for (const status of ['EN_REVISION', 'CERRADO', 'ANULADO'] as const) {
      await renderPanel({ status }, async p => { assert.equal(p.button('Evaluar ahora'), undefined, status); assert.match(p.body(), /Alumno 1/); });
    }
    await renderPanel({ canManage: false }, async p => {
      assert.equal(p.button('Evaluar ahora'), undefined);
      assert.match(p.body(), /Acceso DIRECTIVO: solo lectura\./);
      assert.match(p.body(), /Alumno 1/);
    });
  });
});

test('filter by section and course, pagination and empty messages', async () => {
  await withHttp(call => {
    if (call.params?.sectionCourseId === 11) return { status: 200, data: pageOf([]) };
    if (call.params?.sectionCourseId === 10) return { status: 200, data: pageOf([alert(1)]) };
    return { status: 200, data: call.params?.page === 1 ? pageOf([alert(21)], 1, 21) : pageOf([alert(1)], 0, 21) };
  }, async calls => {
    await renderPanel({}, async p => {
      assert.equal(p.root.findByProps({ 'aria-label': 'Filtrar por curso' }).props.disabled, true, 'sin sección no hay cursos');
      await p.click('Siguiente');
      assert.match(p.body(), /Alumno 21/);
      await p.select('Filtrar por sección', '1');
      assert.deepEqual(p.root.findByProps({ 'aria-label': 'Filtrar por curso' }).findAllByType('option').map(text), ['Todos los cursos', 'Matemática', 'Arte (inactivo)']);
      await p.select('Filtrar por curso', '10');
      assert.deepEqual(calls.at(-1)?.params, { sectionCourseId: 10, page: 0, size: 20 });
      await p.select('Filtrar por curso', '11');
      assert.match(p.body(), new RegExp(EARLY_ALERTS_EMPTY_MESSAGE));
      await p.select('Filtrar por sección', '');
      assert.deepEqual(calls.at(-1)?.params, { page: 0, size: 20 });
    });
  });
  await withHttp(() => ({ status: 200, data: pageOf([]) }), async () => {
    await renderPanel({}, async p => { assert.match(p.body(), new RegExp(MANAGEMENT_EARLY_ALERTS_EMPTY_MESSAGE)); });
  });
});

test('degraded filter: sections failing keeps "Todos los cursos" with the filter error and the alerts', async () => {
  await withHttp(() => ({ status: 200, data: pageOf([alert(1)]) }), async calls => {
    await renderPanel({ sectionsFail: true }, async p => {
      assert.match(p.body(), new RegExp(FILTER_SECTIONS_ERROR.replace(/[;.]/g, '\\$&')));
      assert.equal(p.root.findByProps({ 'aria-label': 'Filtrar por sección' }).props.disabled, true);
      assert.equal(p.root.findByProps({ 'aria-label': 'Filtrar por curso' }).props.value, '');
      assert.match(p.body(), /Alumno 1/);
      assert.deepEqual(calls.map(c => c.params), [{ page: 0, size: 20 }]);
    });
  });
});

test('load errors are sanitized and retried', async () => {
  let fail = true;
  await withHttp(() => fail ? { status: 404, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR', code: 'ALERT_CONTEXT_UNAVAILABLE' } } : { status: 200, data: pageOf([alert(1)]) }, async () => {
    await renderPanel({}, async p => {
      assert.match(p.body(), /ya no está disponible/); assert.doesNotMatch(p.body(), /DETALLE INTERNO/);
      fail = false;
      await p.click('Reintentar');
      assert.match(p.body(), /Alumno 1/);
    });
  });
});

test('bimesters view: "Alertas tempranas" for every bimester except PLANIFICADO, opening the panel', async () => {
  const original = { getBimesters: evaluationService.getBimesters, periods: academicPeriodsService.list };
  evaluationService.getBimesters = async () => [bimester('ABIERTO', 4), bimester('PLANIFICADO', 5), bimester('ANULADO', 6), bimester('CERRADO', 7)];
  academicPeriodsService.list = async () => [{ id: 30, name: 'Periodo 30', startDate: '2026-03-01', endDate: '2026-12-20', active: true, current: true }];
  const restore = mockFilter();
  const dom = withDom();
  try {
    for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
      await withHttp(() => ({ status: 200, data: pageOf([alert(1)]) }), async calls => {
        let renderer!: ReactTestRenderer;
        await act(async () => { renderer = create(<AuthContext.Provider value={auth(role)}><VistaBimestres /></AuthContext.Provider>, { createNodeMock: () => new dom.Element() }); });
        try {
          const button = (label: string) => renderer.root.findAllByType('button').find(b => b.props['aria-label'] === label || text(b) === label);
          for (const id of [4, 6, 7]) assert.ok(button(`Alertas tempranas de Bimestre ${id}`), `${role} ${id}`);
          assert.equal(button('Alertas tempranas de Bimestre 5'), undefined);
          assert.equal(calls.length, 0, 'sin consultas hasta abrir el panel');
          await act(async () => { button('Alertas tempranas de Bimestre 4')!.props.onClick(); });
          assert.match(text(renderer.root), /Alertas tempranas · Bimestre 4/);
          assert.equal(calls[0]?.url, BASE);
          assert.equal(!!button('Evaluar ahora'), role === 'ADMINISTRADOR');
        } finally { await act(async () => { renderer.unmount(); }); }
      });
    }
  } finally {
    evaluationService.getBimesters = original.getBimesters; academicPeriodsService.list = original.periods; restore(); dom.restore();
  }
});
