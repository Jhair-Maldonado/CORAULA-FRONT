import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import AlertasTempranasDocente from '../feature/docente/vistas/cursos/AlertasTempranasDocente';
import ResultadosCursoDocente from '../feature/docente/vistas/cursos/ResultadosCursoDocente';
import {
  EARLY_ALERTS_COURSE_UNAVAILABLE_MESSAGE, EARLY_ALERTS_EMPTY_MESSAGE, TEACHER_EARLY_ALERTS_ERROR_CODES, parseEarlyWarningsPage,
  teacherEarlyAlertsErrorCode, teacherEarlyAlertsErrorMessage, teacherEarlyAlertsService,
} from '../src/services/teacher/teacherEarlyAlertsService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';
import type { EarlyWarning } from '../src/types/teacherEarlyAlertsApi';

// Unit/component mocks only: no network, browser server or shared database. Synthetic data.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const bimester = (status: Bimester['status'] = 'ABIERTO'): Bimester => ({ id: 4, academicPeriodId: 30, number: 1, name: 'Bimestre 4', startDate: '2026-03-01', endDate: '2026-04-30', status });
const alert = (n: number, over: Partial<EarlyWarning> = {}): EarlyWarning => ({
  alertId: 900 + n, enrollmentId: 100 + n, sectionCourseId: 10, bimesterId: 4, studentId: 200 + n, studentCode: `EST-${n}`,
  fullName: `Alumno ${n}`, courseName: 'Comunicación', sectionName: '3° A', paAtDetection: 10.5, activityCount: 3,
  evaluatedOn: '2026-03-15', detectedAt: '2026-03-15T13:00:00Z', ...over,
});
const pageOf = (content: EarlyWarning[], page = 0, size = 20, totalElements = content.length) =>
  ({ content, page, size, totalElements, totalPages: Math.ceil(totalElements / size) });
const expected = { sectionCourseId: 10, bimesterId: 4, page: 0, size: 20 };
const url = '/v1/teacher/courses/10/bimesters/4/early-alerts';

const httpError = (status?: number, data: unknown = { error: 'X', message: 'secret detail' }) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data } as AxiosResponse : undefined);
const coded = (status: number, code: string) => httpError(status, { error: 'X', message: 'secret detail', code });

type Reply = { status?: number; data: unknown };
type Call = { method?: string; url?: string; params: unknown };
async function withAdapter(route: (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async config => {
    calls.push({ method: config.method, url: config.url, params: config.params });
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
  const globals = ['window', 'document', 'localStorage'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { style: {} } } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  return () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete (globalThis as Record<string, unknown>)[name]; } };
}
type View = { renderer: ReactTestRenderer; shown: () => string; button: (name: string) => ReactTestInstance | undefined; click: (name: string) => Promise<void> };
async function render(element: React.ReactElement, run: (v: View) => Promise<void>) {
  const restore = withDom();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(element); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    await run({ renderer, button, shown: () => text(renderer.root),
      click: async name => { const node = button(name); assert.ok(node, name); assert.equal(!!node.props.disabled, false, name); await act(async () => { node.props.onClick(); }); } });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    restore();
  }
}
const panel = () => <AlertasTempranasDocente sectionCourseId={10} bimester={bimester()} />;

// ---------- Service ----------

test('GET uses the #107 route with page and size params and returns the validated page', async () => {
  await withAdapter(() => ({ data: pageOf([alert(1), alert(2, { studentCode: null, paAtDetection: 0 })]) }), async calls => {
    const result = await teacherEarlyAlertsService.list(10, 4);
    assert.deepEqual(result, pageOf([alert(1), alert(2, { studentCode: null, paAtDetection: 0 })]));
    assert.deepEqual(calls, [{ method: 'get', url, params: { page: 0, size: 20 } }]);
  });
  await withAdapter(() => ({ data: pageOf([alert(3)], 2, 5, 11) }), async calls => {
    assert.equal((await teacherEarlyAlertsService.list(10, 4, 2, 5)).totalPages, 3);
    assert.deepEqual(calls[0].params, { page: 2, size: 5 });
  });
});

test('invalid ids or pagination never reach the network (size 1–100, page ≥ 0)', async () => {
  await withAdapter(() => ({ data: pageOf([]) }), async calls => {
    for (const [sc, b, page, size] of [[0, 4, 0, 20], [10, -1, 0, 20], [1.5, 4, 0, 20], [10, 4, -1, 20], [10, 4, 0.5, 20], [10, 4, 0, 0], [10, 4, 0, 101]])
      await assert.rejects(teacherEarlyAlertsService.list(sc, b, page, size), Error, `${sc} ${b} ${page} ${size}`);
    assert.equal(calls.length, 0);
  });
});

test('page validation: echoed page/size, coherent totals, ids of this course and bimester, one alert per enrollment', () => {
  assert.deepEqual(parseEarlyWarningsPage(pageOf([]), expected), pageOf([]));
  assert.equal(parseEarlyWarningsPage(pageOf([alert(1, { paAtDetection: 10.9 })]), expected).content[0].paAtDetection, 10.9);
  const bad: unknown[] = [
    { ...pageOf([]), page: 1 }, { ...pageOf([]), size: 10 }, { ...pageOf([alert(1)]), totalPages: 2 }, { ...pageOf([alert(1)]), totalElements: -1 },
    { ...pageOf([]), content: null }, pageOf(Array.from({ length: 21 }, (_, i) => alert(i)), 0, 20, 21),
    pageOf([alert(1, { sectionCourseId: 11 })]), pageOf([alert(1, { bimesterId: 5 })]), pageOf([alert(1), alert(1)]),
    pageOf([alert(1), alert(2, { enrollmentId: 101 })]), pageOf([alert(1, { alertId: 0 })]), pageOf([alert(1, { paAtDetection: 11 })]),
    pageOf([alert(1, { paAtDetection: 10.55 })]), pageOf([alert(1, { paAtDetection: -0.1 })]), pageOf([alert(1, { activityCount: 0 })]),
    pageOf([alert(1, { evaluatedOn: '2026-02-30' })]), pageOf([alert(1, { detectedAt: 'ayer' })]), pageOf([alert(1, { fullName: ' ' })]),
    pageOf([alert(1, { studentCode: '' })]), null, [], 'x',
  ];
  for (const value of bad) assert.throws(() => parseEarlyWarningsPage(value, expected), Error, JSON.stringify(value).slice(0, 120));
});

test('error catalog: codes only with their contract status; 404 is «Curso no disponible para tu cuenta»; texts sanitized', () => {
  assert.deepEqual(TEACHER_EARLY_ALERTS_ERROR_CODES, ['ALERT_REQUEST_INVALID', 'ALERT_CONTEXT_UNAVAILABLE', 'ALERT_INTERNAL_ERROR']);
  const contract: Record<string, number> = { ALERT_REQUEST_INVALID: 400, ALERT_CONTEXT_UNAVAILABLE: 404, ALERT_INTERNAL_ERROR: 500 };
  for (const [code, status] of Object.entries(contract)) {
    for (const other of [400, 404, 409, 500]) assert.equal(teacherEarlyAlertsErrorCode(coded(other, code)), other === status ? code : null, `${code} ${other}`);
    assert.doesNotMatch(teacherEarlyAlertsErrorMessage(coded(status, code)), /secret|PRIVATE/);
  }
  assert.equal(teacherEarlyAlertsErrorCode(httpError(403)), null);
  assert.equal(teacherEarlyAlertsErrorMessage(coded(404, 'ALERT_CONTEXT_UNAVAILABLE')), EARLY_ALERTS_COURSE_UNAVAILABLE_MESSAGE);
  assert.equal(teacherEarlyAlertsErrorMessage(httpError(404)), EARLY_ALERTS_COURSE_UNAVAILABLE_MESSAGE);
  assert.match(teacherEarlyAlertsErrorMessage(coded(400, 'ALERT_REQUEST_INVALID')), /no son válidos/);
  assert.match(teacherEarlyAlertsErrorMessage(httpError(401)), /sesión ha expirado/);
  assert.match(teacherEarlyAlertsErrorMessage(httpError(403)), /No tienes permiso/);
  assert.match(teacherEarlyAlertsErrorMessage(coded(500, 'ALERT_INTERNAL_ERROR')), /No se pudieron consultar/);
  assert.match(teacherEarlyAlertsErrorMessage(httpError()), /No se pudo conectar/);
});

// ---------- View ----------

test('panel lists code, name, PA at detection, activity count, evaluation and detection dates', async () => {
  await withAdapter(() => ({ data: pageOf([alert(1), alert(2, { studentCode: null, paAtDetection: 8, activityCount: 5, evaluatedOn: '2026-03-21' })]) }), async () => {
    await render(panel(), async v => {
      const rows = v.renderer.root.findAllByType('tr').slice(1).map(text);
      assert.equal(rows.length, 2);
      assert.match(rows[0], /^EST-1Alumno 110[.,]53/); assert.match(rows[0], /15\/03\/2026/); assert.match(rows[0], /2026/);
      assert.match(rows[1], /^Sin códigoAlumno 28[.,]05/); assert.match(rows[1], /21\/03\/2026/);
      assert.match(v.shown(), /2 alertas · Página 1 de 1/);
      assert.equal(v.button('Anterior')?.props.disabled, true); assert.equal(v.button('Siguiente')?.props.disabled, true);
    });
  });
});

test('empty state uses the agreed text and shows no table', async () => {
  await withAdapter(() => ({ data: pageOf([]) }), async () => {
    await render(panel(), async v => {
      assert.match(v.shown(), new RegExp(EARLY_ALERTS_EMPTY_MESSAGE));
      assert.equal(EARLY_ALERTS_EMPTY_MESSAGE, 'No hay alertas generadas para este curso en el bimestre');
      assert.equal(v.renderer.root.findAllByType('table').length, 0);
    });
  });
});

test('pagination requests the next and previous pages and shows the current one', async () => {
  const pages = [pageOf([alert(1), alert(2)], 0, 20, 45), pageOf([alert(3)], 1, 20, 45), pageOf([alert(4)], 2, 20, 45)];
  await withAdapter(config => ({ data: pages[(config.params as { page: number }).page] }), async calls => {
    await render(panel(), async v => {
      assert.match(v.shown(), /45 alertas · Página 1 de 3/);
      await v.click('Siguiente');
      assert.match(v.shown(), /Página 2 de 3/); assert.match(v.shown(), /Alumno 3/); assert.doesNotMatch(v.shown(), /Alumno 1/);
      await v.click('Siguiente');
      assert.match(v.shown(), /Página 3 de 3/); assert.equal(v.button('Siguiente')?.props.disabled, true);
      await v.click('Anterior');
      assert.match(v.shown(), /Página 2 de 3/);
      assert.deepEqual(calls.map(c => (c.params as { page: number }).page), [0, 1, 2, 1]);
    });
  });
});

test('errors show fixed texts with retry; an invalid response never shows data', async () => {
  for (const [reply, expectedText] of [
    [{ status: 404, data: { error: 'Not Found', message: 'secret', code: 'ALERT_CONTEXT_UNAVAILABLE' } }, /Curso no disponible para tu cuenta/],
    [{ status: 400, data: { error: 'Bad Request', message: 'secret', code: 'ALERT_REQUEST_INVALID' } }, /no son válidos/],
    [{ status: 403, data: { error: 'Forbidden', message: 'secret' } }, /No tienes permiso/],
    [{ status: 500, data: { error: 'X', message: 'secret', code: 'ALERT_INTERNAL_ERROR' } }, /No se pudieron consultar/],
    [{ data: pageOf([alert(1, { sectionCourseId: 99 })]) }, /no coincide con el contrato/],
  ] as [Reply, RegExp][]) {
    let reads = 0;
    await withAdapter(() => { reads++; return reads === 1 ? reply : { data: pageOf([alert(1)]) }; }, async () => {
      await render(panel(), async v => {
        assert.match(v.shown(), expectedText);
        assert.doesNotMatch(v.shown(), /secret|Alumno 1/);
        await v.click('Reintentar');
        assert.match(v.shown(), /Alumno 1/);
      });
    });
  }
});

test('course detail mounts the alerts panel for the selected bimester', async () => {
  await withAdapter(config => {
    if (config.url === '/v1/teacher/courses/10/bimesters') return { data: [bimester()] };
    if (config.url === url) return { data: pageOf([]) };
    return { status: 500, data: { message: 'x' } };
  }, async calls => {
    await render(<ResultadosCursoDocente sectionCourseId={10} />, async v => {
      assert.match(v.shown(), /Alertas tempranas · Bimestre 4/);
      assert.match(v.shown(), new RegExp(EARLY_ALERTS_EMPTY_MESSAGE));
      assert.ok(calls.some(c => c.url === url));
    });
  });
});
