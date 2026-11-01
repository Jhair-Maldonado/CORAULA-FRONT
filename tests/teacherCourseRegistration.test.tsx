import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import RegistroCursoDocente from '../feature/docente/vistas/cursos/RegistroCursoDocente';
import ResultadosCursoDocente from '../feature/docente/vistas/cursos/ResultadosCursoDocente';
import {
  COURSE_UNAVAILABLE_MESSAGE, REGISTRATION_NOT_APPLICABLE_MESSAGE, TEACHER_COURSE_REGISTRATION_ERROR_CODES, parseTeacherCourseRegistration,
  registrationActionErrorMessage, registrationPendingsFromError, registrationPendingsFromResults, registrationReadErrorMessage,
  registrationReasonLabel, teacherCourseRegistrationErrorCode, teacherCourseRegistrationService,
} from '../src/services/teacher/teacherCourseRegistrationService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';
import type { TeacherCourseRegistration } from '../src/types/teacherCourseRegistrationApi';

// Unit/component mocks only: no network, browser server or shared database. Synthetic data.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const bimester = (status: Bimester['status'] = 'ABIERTO', id = 4): Bimester => ({ id, academicPeriodId: 30, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status });
const view = (over: Partial<TeacherCourseRegistration> = {}): TeacherCourseRegistration => ({
  sectionCourseId: 10, bimesterId: 4, status: 'ABIERTO', applicable: true, registered: false, registeredAt: null, publishedAt: null, revision: 0, ...over,
});
const registered = (over: Partial<TeacherCourseRegistration> = {}) => view({ registered: true, registeredAt: '2026-04-30T18:00:00Z', ...over });
const complete = { enrollmentId: 101, studentId: 1, fullName: 'Ana Pérez', pa: 15, criteriaIndicator: 14, courseGrade: 15, courseApproved: true,
  areaGrade: null, areaApproved: null, reasons: ['AREA_INCOMPLETE'], courseEvidence: {}, areaEvidence: {} };
const missing = { enrollmentId: 102, studentId: 2, fullName: 'Beto Ríos', pa: 12, criteriaIndicator: null, courseGrade: null, courseApproved: null,
  areaGrade: null, areaApproved: null, reasons: ['MISSING_MANUAL_GRADE:8', 'AREA_INCOMPLETE'], courseEvidence: {}, areaEvidence: {} };
const results = (students: unknown[] = [complete, missing]) => ({ sectionCourseId: 10, bimesterId: 4, areaId: 3, students });

const httpError = (status?: number, data?: unknown) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: data ?? { error: 'X', message: 'secret detail' } } as AxiosResponse : undefined);
const coded = (status: number, code: string, extra: Record<string, unknown> = {}) => httpError(status, { error: 'X', message: 'secret detail', code, ...extra });

type Reply = { status?: number; data: unknown };
type Route = (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>;
async function withAdapter(route: Route, run: (calls: { method?: string; url?: string; data: unknown }[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: { method?: string; url?: string; data: unknown }[] = [];
  httpClient.defaults.adapter = async config => {
    calls.push({ method: config.method, url: config.url, data: config.data });
    const reply = await route(config);
    const status = reply.status ?? 200;
    const response = { config, data: reply.data, status, statusText: String(status), headers: {} } as AxiosResponse;
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, response);
    return response;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}

function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
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
const panel = (status: Bimester['status'] = 'ABIERTO') => <RegistroCursoDocente sectionCourseId={10} bimester={bimester(status)} />;
const regUrl = '/v1/teacher/courses/10/bimesters/4/registration', resultsUrl = '/v1/teacher/courses/10/bimesters/4/results';
function routes(handlers: { get?: () => Reply | Promise<Reply>; post?: () => Reply | Promise<Reply>; results?: () => Reply | Promise<Reply> }): Route {
  return config => {
    if (config.url === regUrl && config.method === 'get') return handlers.get?.() ?? { data: view() };
    if (config.url === regUrl && config.method === 'post') return handlers.post?.() ?? { data: registered() };
    if (config.url === resultsUrl) return handlers.results?.() ?? { data: results() };
    throw new Error(`unexpected ${config.method} ${config.url}`);
  };
}

// ---------- Service ----------

test('GET and POST use the #106 route, send no body and validate the view', async () => {
  await withAdapter(config => ({ data: config.method === 'post' ? registered() : view() }), async calls => {
    assert.deepEqual(await teacherCourseRegistrationService.get(10, 4), view());
    assert.deepEqual(await teacherCourseRegistrationService.register(10, 4), registered());
    assert.deepEqual(calls.map(c => [c.method, c.url, c.data]), [['get', regUrl, undefined], ['post', regUrl, undefined]]);
    for (const bad of [0, -1, 1.5, NaN]) {
      await assert.rejects(teacherCourseRegistrationService.get(bad, 4), /enteros positivos/);
      await assert.rejects(teacherCourseRegistrationService.register(10, bad), /enteros positivos/);
    }
    assert.equal(calls.length, 2);
  });
  const published = registered({ status: 'CERRADO', publishedAt: '2026-05-02T15:00:00Z', revision: 1 });
  assert.deepEqual(parseTeacherCourseRegistration(published, { sectionCourseId: 10, bimesterId: 4 }), published);
  assert.equal(parseTeacherCourseRegistration(view({ applicable: false, registeredAt: '2026-04-30T18:00:00Z' }), { sectionCourseId: 10, bimesterId: 4 }).registered, false);
  const bad: unknown[] = [
    { ...view(), sectionCourseId: 11 }, { ...view(), bimesterId: 5 }, { ...view(), status: 'PUBLICADO' }, { ...view(), applicable: 'yes' },
    { ...view(), registered: null }, { ...view(), registered: true, registeredAt: null }, { ...registered(), applicable: false },
    { ...view(), registeredAt: 'not a date' }, { ...view(), revision: -1 }, { ...view(), revision: 1 }, { ...view(), publishedAt: '2026-05-02T15:00:00Z' },
    { ...view(), revision: 1.5 }, null, [], 'x',
  ];
  for (const value of bad) assert.throws(() => parseTeacherCourseRegistration(value, { sectionCourseId: 10, bimesterId: 4 }), Error, JSON.stringify(value));
});

test('pre-check ignores AREA_INCOMPLETE like the backend; reasons get #45 labels', () => {
  assert.deepEqual(registrationPendingsFromResults(results() as never), [{ sectionCourseId: 10, enrollmentId: 102, reasons: ['MISSING_MANUAL_GRADE:8'] }]);
  assert.deepEqual(registrationPendingsFromResults(results([complete]) as never), []);
  assert.equal(registrationReasonLabel('MISSING_MANUAL_GRADE:8'), 'Falta una nota MANUAL (criterio #8)');
  assert.equal(registrationReasonLabel('PA_UNAVAILABLE'), 'Sin actividades que cuenten para PA');
  assert.equal(registrationReasonLabel('SOMETHING_NEW'), 'Pendiente no reconocido');
});

test('error catalog: a code counts only with its contract status; 401/403 and messages stay sanitized', () => {
  assert.deepEqual(TEACHER_COURSE_REGISTRATION_ERROR_CODES, ['VALIDATION_ERROR', 'RESOURCE_NOT_FOUND', 'BIMESTER_STATE_CONFLICT', 'RESULTS_PENDING', 'INTERNAL_ERROR']);
  assert.equal(teacherCourseRegistrationErrorCode(coded(409, 'RESULTS_PENDING')), 'RESULTS_PENDING');
  assert.equal(teacherCourseRegistrationErrorCode(coded(400, 'RESULTS_PENDING')), null);
  assert.equal(teacherCourseRegistrationErrorCode(coded(404, 'BIMESTER_STATE_CONFLICT')), null);
  assert.equal(teacherCourseRegistrationErrorCode(coded(409, 'UNKNOWN')), null);
  assert.equal(teacherCourseRegistrationErrorCode(httpError(403)), null);
  assert.equal(registrationReadErrorMessage(coded(404, 'RESOURCE_NOT_FOUND')), COURSE_UNAVAILABLE_MESSAGE);
  assert.equal(registrationReadErrorMessage(httpError(404)), COURSE_UNAVAILABLE_MESSAGE);
  assert.equal(registrationActionErrorMessage(coded(404, 'RESOURCE_NOT_FOUND')), COURSE_UNAVAILABLE_MESSAGE);
  assert.match(registrationActionErrorMessage(coded(409, 'RESULTS_PENDING')), /resultados pendientes/);
  assert.match(registrationActionErrorMessage(coded(409, 'BIMESTER_STATE_CONFLICT')), /ya no está Abierto/);
  assert.match(registrationActionErrorMessage(httpError(401)), /sesión ha expirado/);
  assert.match(registrationActionErrorMessage(httpError(403)), /No tienes permiso para registrar/);
  assert.match(registrationActionErrorMessage(coded(500, 'INTERNAL_ERROR')), /No se pudo confirmar el registro/);
  assert.match(registrationActionErrorMessage(httpError()), /No se pudo confirmar el registro/);
  assert.match(registrationReadErrorMessage(httpError()), /No se pudo conectar/);
  for (const error of [coded(409, 'RESULTS_PENDING'), coded(500, 'INTERNAL_ERROR'), httpError(400), httpError(403)]) {
    assert.doesNotMatch(registrationActionErrorMessage(error), /secret|PRIVATE/);
    assert.doesNotMatch(registrationReadErrorMessage(error), /secret|PRIVATE/);
  }
});

test('authoritative pendings come only from 409 RESULTS_PENDING details with a valid shape', () => {
  const details = [{ sectionCourseId: 10, enrollmentId: 102, reasons: ['MISSING_MANUAL_GRADE:9'] }, { sectionCourseId: 10, enrollmentId: null, reasons: ['PA_UNAVAILABLE'] }];
  assert.deepEqual(registrationPendingsFromError(coded(409, 'RESULTS_PENDING', { details })), details);
  assert.deepEqual(registrationPendingsFromError(coded(409, 'RESULTS_PENDING', { details: [] })), []);
  assert.equal(registrationPendingsFromError(coded(409, 'BIMESTER_STATE_CONFLICT', { details })), null);
  assert.equal(registrationPendingsFromError(coded(400, 'RESULTS_PENDING', { details })), null);
  for (const bad of [null, 'x', [{ sectionCourseId: 10, enrollmentId: 1, reasons: [] }], [{ sectionCourseId: 0, enrollmentId: 1, reasons: ['X'] }], [{ reasons: [8] }]])
    assert.equal(registrationPendingsFromError(coded(409, 'RESULTS_PENDING', { details: bad })), null, JSON.stringify(bad));
});

// ---------- View ----------

test('unregistered ABIERTO course: shows pre-check pendings and the «Registrar curso» button', async () => {
  await withAdapter(routes({}), async () => {
    await render(panel(), async v => {
      assert.match(v.shown(), /Curso sin registrar\. Sin este registro el Director no puede publicar el bimestre\./);
      assert.match(v.shown(), /Pendientes detectados en los resultados:/);
      assert.match(v.shown(), /Beto Ríos: Falta una nota MANUAL \(criterio #8\)/);
      assert.doesNotMatch(v.shown(), /Ana Pérez/);
      assert.ok(v.button('Registrar curso'));
    });
  });
});

test('the button appears only with the bimester ABIERTO and the course applicable and unregistered', async () => {
  const cases: [TeacherCourseRegistration, RegExp][] = [
    [view({ status: 'EN_REVISION' }), /Curso sin registrar/],
    [view({ status: 'CERRADO', publishedAt: '2026-05-02T15:00:00Z', revision: 1 }), /Publicado el/],
    [registered(), /Curso registrado el/],
    [view({ applicable: false }), /Este curso no requiere registro \(sin alumnos matriculados\)/],
  ];
  for (const [value, expected] of cases) {
    await withAdapter(routes({ get: () => ({ data: value }) }), async () => {
      await render(panel(value.status), async v => {
        assert.match(v.shown(), expected);
        assert.equal(v.button('Registrar curso'), undefined, JSON.stringify(value));
      });
    });
  }
});

test('applicable=false never claims «registrado» and hides pendings', async () => {
  await withAdapter(routes({ get: () => ({ data: view({ applicable: false }) }), results: () => ({ data: results([]) }) }), async () => {
    await render(panel(), async v => {
      assert.match(v.shown(), new RegExp(REGISTRATION_NOT_APPLICABLE_MESSAGE.replace(/[()]/g, '\\$&')));
      assert.doesNotMatch(v.shown(), /registrado el|Curso registrado/i);
      assert.doesNotMatch(v.shown(), /Pendientes/);
    });
  });
});

test('404 shows «Curso no disponible para tu cuenta» without echoing the server message', async () => {
  await withAdapter(routes({ get: () => ({ status: 404, data: { error: 'Not Found', message: 'secret detail', code: 'RESOURCE_NOT_FOUND' } }) }), async () => {
    await render(panel(), async v => {
      assert.match(v.shown(), /Curso no disponible para tu cuenta/);
      assert.doesNotMatch(v.shown(), /secret/);
      assert.equal(v.button('Registrar curso'), undefined);
    });
  });
});

test('register: confirmation first, one POST while sending, success only when the answer says registered', async () => {
  const pending = deferred<Reply>();
  let posts = 0;
  await withAdapter(routes({ post: () => { posts++; return pending.promise; } }), async calls => {
    await render(panel(), async v => {
      await v.click('Registrar curso');
      assert.equal(posts, 0);
      assert.match(v.shown(), /Registrarás este curso para la publicación de Bimestre 4/);
      await v.click('Cancelar');
      assert.doesNotMatch(v.shown(), /Registrarás este curso/);
      await v.click('Registrar curso');
      const confirm = v.button('Confirmar registro'); assert.ok(confirm);
      await act(async () => { confirm.props.onClick(); confirm.props.onClick(); });
      assert.equal(posts, 1);
      assert.equal(v.button('Registrando...')?.props.disabled, true);
      assert.equal(v.renderer.root.findAllByType('button').find(b => text(b) === 'Actualizar estado')?.props.disabled, true);
      await act(async () => { pending.resolve({ data: registered() }); });
      assert.match(v.shown(), /Curso registrado\. Ya puede incluirse en la publicación del bimestre\./);
      assert.match(v.shown(), /Curso registrado el/);
      assert.equal(v.button('Registrar curso'), undefined);
      assert.equal(calls.filter(c => c.method === 'post').length, 1);
    });
  });
});

test('register answered with applicable=false shows the no-registration text, not success', async () => {
  await withAdapter(routes({ post: () => ({ data: view({ applicable: false }) }) }), async () => {
    await render(panel(), async v => {
      await v.click('Registrar curso'); await v.click('Confirmar registro');
      assert.match(v.shown(), /Este curso no requiere registro/);
      assert.doesNotMatch(v.shown(), /Curso registrado/);
    });
  });
});

test('409 RESULTS_PENDING: its details replace the pre-check until the teacher refreshes', async () => {
  const details = [{ sectionCourseId: 10, enrollmentId: 101, reasons: ['MISSING_MANUAL_GRADE:9'] }];
  let gets = 0;
  await withAdapter(routes({
    get: () => { gets++; return { data: view() }; },
    post: () => ({ status: 409, data: { error: 'Conflict', message: 'secret detail', code: 'RESULTS_PENDING', details } }),
  }), async () => {
    await render(panel(), async v => {
      await v.click('Registrar curso'); await v.click('Confirmar registro');
      assert.equal(gets, 2);
      assert.match(v.shown(), /El curso tiene resultados pendientes\. Complétalos antes de registrarlo\./);
      assert.match(v.shown(), /Pendientes que impiden el registro:/);
      assert.match(v.shown(), /Ana Pérez: Falta una nota MANUAL \(criterio #9\)/);
      assert.doesNotMatch(v.shown(), /Beto Ríos/);
      assert.doesNotMatch(v.shown(), /secret/);
      await v.click('Actualizar estado');
      assert.equal(gets, 3);
      assert.match(v.shown(), /Pendientes detectados en los resultados:/);
      assert.match(v.shown(), /Beto Ríos/);
    });
  });
});

test('other POST failures show a fixed message, reload the state and never claim success', async () => {
  for (const [reply, expected] of [
    [{ status: 409, data: { error: 'Conflict', message: 'secret', code: 'BIMESTER_STATE_CONFLICT', details: [] } }, /ya no está Abierto/],
    [{ status: 404, data: { error: 'Not Found', message: 'secret', code: 'RESOURCE_NOT_FOUND' } }, /Curso no disponible para tu cuenta/],
    [{ status: 403, data: { error: 'Forbidden', message: 'secret' } }, /No tienes permiso para registrar/],
    [{ status: 500, data: { error: 'X', message: 'secret', code: 'INTERNAL_ERROR' } }, /No se pudo confirmar el registro/],
  ] as [Reply, RegExp][]) {
    let gets = 0;
    await withAdapter(routes({ get: () => { gets++; return { data: gets > 1 && reply.status === 409 ? view({ status: 'EN_REVISION' }) : view() }; }, post: () => reply }), async () => {
      await render(panel(), async v => {
        await v.click('Registrar curso'); await v.click('Confirmar registro');
        assert.match(v.shown(), expected);
        assert.equal(gets, 2);
        assert.doesNotMatch(v.shown(), /secret|Curso registrado/);
      });
    });
  }
});

test('a results failure does not block the registration status', async () => {
  await withAdapter(routes({ results: () => ({ status: 500, data: { error: 'X', message: 'secret' } }) }), async () => {
    await render(panel(), async v => {
      assert.match(v.shown(), /No se pudieron revisar los pendientes; el registro los validará igualmente\./);
      assert.ok(v.button('Registrar curso'));
    });
  });
});

test('course detail results section mounts the registration panel for the selected bimester', async () => {
  await withAdapter(config => {
    if (config.url === '/v1/teacher/courses/10/bimesters') return { data: [bimester('ABIERTO')] };
    return routes({})(config);
  }, async calls => {
    await render(<ResultadosCursoDocente sectionCourseId={10} />, async v => {
      assert.match(v.shown(), /Registro del curso · Bimestre 4/);
      assert.ok(calls.some(c => c.method === 'get' && c.url === regUrl));
    });
  });
});
