import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import ActividadesDocente from '../feature/docente/vistas/cursos/ActividadesDocente';
import { teacherActivitiesService, activityTitleError, teacherActivitiesErrorMessage } from '../src/services/teacher/teacherActivitiesService';
import { teacherGradesService } from '../src/services/teacher/teacherGradesService';
import httpClient from '../src/services/httpClient';
import type { AcademicActivity, CreateAcademicActivityRequest } from '../src/types/teacherActivitiesApi';
import type { Bimester } from '../src/types/evaluationApi';

// Fixtures and Axios adapters are confined to tests; no database or real writes.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const context = { sectionCourseId: 10, bimesterId: 1 };
const request: CreateAcademicActivityRequest = { title: 'Práctica de álgebra', description: null, type: 'PRACTICA', cuentaParaPa: true };
const activity = (id = 1, overrides: Partial<AcademicActivity> = {}): AcademicActivity => ({ ...request, ...context, id, createdByTeacherId: 7, status: 'PLANIFICADA', createdAt: '2026-10-10T15:00:00Z', updatedAt: null, ...overrides });
const bimester = (id = 1): Bimester => ({ id, academicPeriodId: 30, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status: 'PLANIFICADO' });
const httpError = (status?: number) => new AxiosError('private details', 'ERR_BAD_REQUEST', undefined, undefined, status ? { status, data: { message: 'Información sensible' } } as AxiosResponse : undefined);
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }

test('N3 service GET empty, ordered collection, detail and exact POST 201 DTO for all allowed types and PA flags', async () => {
  const original = httpClient.defaults.adapter;
  const calls: { url?: string; method?: string; data: unknown }[] = [];
  let data: unknown = [], status = 200;
  httpClient.defaults.adapter = async config => { calls.push({ url: config.url, method: config.method, data: config.data }); return { config, status, statusText: 'OK', headers: { location: '/api/v1/teacher/courses/10/bimesters/1/activities/1' }, data }; };
  try {
    assert.deepEqual(await teacherActivitiesService.getActivities(context), []);
    data = [activity(2), activity(1)];
    assert.deepEqual((await teacherActivitiesService.getActivities(context)).map(a => a.id), [1, 2]);
    assert.equal(calls[0].url, '/v1/teacher/courses/10/bimesters/1/activities');
    data = activity();
    assert.equal((await teacherActivitiesService.getActivity(context, 1)).id, 1);
    assert.equal(calls.at(-1)?.url, '/v1/teacher/courses/10/bimesters/1/activities/1');
    status = 201;
    for (const type of ['TAREA', 'PRACTICA', 'EXAMEN', 'PROYECTO'] as const) for (const cuentaParaPa of [true, false]) {
      data = activity(1, { type, cuentaParaPa });
      const dto = { ...request, type, cuentaParaPa };
      await teacherActivitiesService.createActivity(context, { ...dto, teacherId: 999, status: 'ACTIVA' } as CreateAcademicActivityRequest);
      assert.deepEqual(JSON.parse(calls.at(-1)!.data as string), dto);
      assert.equal(calls.at(-1)?.method, 'post');
    }
  } finally { httpClient.defaults.adapter = original; }
});

test('N3 validates inputs, contexts, complete response, status and observable Location; no fabricated fixtures', async () => {
  const original = httpClient.defaults.adapter;
  let data: unknown = activity(), status = 201, location: string | undefined = '/api/v1/teacher/courses/10/bimesters/1/activities/1', calls = 0;
  httpClient.defaults.adapter = async config => { calls++; return { config, status, statusText: 'OK', headers: { location }, data }; };
  try {
    for (const title of ['', '   ', 'x'.repeat(256)]) await assert.rejects(teacherActivitiesService.createActivity(context, { ...request, title }));
    for (const bad of [{ ...request, type: 'OTRO' }, { ...request, cuentaParaPa: null }, { ...request, description: 12 }]) await assert.rejects(teacherActivitiesService.createActivity(context, bad as CreateAcademicActivityRequest));
    for (const id of [0, -1, 1.2, NaN]) await assert.rejects(teacherActivitiesService.getActivities({ ...context, sectionCourseId: id }));
    assert.equal(calls, 0);
    for (const bad of [{}, activity(1, { sectionCourseId: 11 }), activity(1, { bimesterId: 2 }), { ...activity(), updatedAt: undefined }, { ...activity(), status: 'ACTIVA' }, { ...activity(), cuentaParaPa: undefined }, { ...activity(), createdByTeacherId: null }, { ...activity(), createdAt: 'invalid' }, activity(1, { title: 'other' })]) { data = bad; await assert.rejects(teacherActivitiesService.createActivity(context, request)); }
    data = activity(); status = 200; await assert.rejects(teacherActivitiesService.createActivity(context, request)); status = 201;
    location = '/other/2'; await assert.rejects(teacherActivitiesService.createActivity(context, request));
    location = undefined; assert.equal((await teacherActivitiesService.createActivity(context, request)).id, 1);
    status = 200; data = [activity(), activity()]; await assert.rejects(teacherActivitiesService.getActivities(context));
    data = activity(2); await assert.rejects(teacherActivitiesService.getActivity(context, 1));
  } finally { httpClient.defaults.adapter = original; }
  assert.equal(activityTitleError('x'.repeat(255)), null);
});

async function view(overrides: Partial<typeof teacherActivitiesService>, run: (h: {
  renderer: ReactTestRenderer; button: (name: string) => ReactTestInstance | undefined;
  click: (name: string) => Promise<void>; change: (label: string, value: string) => Promise<void>;
  submit: () => Promise<void>; course: (id: number) => Promise<void>; select: (id: string) => Promise<void>;
}) => Promise<void>, bimesters: () => Promise<Bimester[]> = async () => [bimester(1), bimester(2)]) {
  const original = { ...teacherActivitiesService }, oldBimesters = teacherGradesService.getBimesters;
  Object.assign(teacherActivitiesService, { getActivities: async () => [], getActivity: async (c: typeof context, id: number) => activity(id, c), createActivity: async (c: typeof context, r: CreateAcademicActivityRequest) => activity(1, { ...c, ...r }) }, overrides);
  teacherGradesService.getBimesters = bimesters;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<ActividadesDocente sectionCourseId={10} />); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    const change = async (label: string, value: string) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); };
    const select = (id: string) => change('Bimestre de actividades', id);
    await run({ renderer, button, change, select, click: async name => { const node = button(name); assert.ok(node); assert.equal(!!node.props.disabled, false); await act(async () => { node.props.onClick(); }); }, submit: async () => { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); }, course: async id => { await act(async () => { renderer.update(<ActividadesDocente sectionCourseId={id} />); }); } });
  } finally { if (renderer) await act(async () => { renderer.unmount(); }); Object.assign(teacherActivitiesService, original); teacherGradesService.getBimesters = oldBimesters; }
}

test('activities requires selected bimester, displays empty state, validates title and does not calculate grades', async () => {
  let posts = 0;
  await view({ createActivity: async () => { posts++; return activity(); } }, async h => {
    assert.equal(h.renderer.root.findAllByType('form').length, 0);
    await h.select('1'); assert.match(text(h.renderer.root), /No hay actividades registradas/);
    assert.equal(h.button('Crear actividad')?.props.disabled, true);
    await h.change('Título de actividad', '   '); await h.submit();
    await h.change('Título de actividad', 'x'.repeat(256)); await h.submit();
    assert.equal(posts, 0);
    await h.change('Título de actividad', 'Título válido'); assert.equal(h.button('Crear actividad')?.props.disabled, false);
    assert.deepEqual(h.renderer.root.findByProps({ 'aria-label': 'Tipo de actividad' }).findAllByType('option').map(o => o.props.value), ['TAREA', 'PRACTICA', 'EXAMEN', 'PROYECTO']);
    assert.equal(h.renderer.root.findAllByType('input').filter(i => i.props.type === 'number').length, 0);
    assert.match(text(h.renderer.root), /no calcula calificaciones/);
  });
});

test('successful creation sends configured fields once and reloads the actual list before success', async () => {
  const pending = deferred<AcademicActivity>(); let posts = 0, reads = 0; let payload: CreateAcademicActivityRequest | undefined;
  await view({ getActivities: async () => ++reads === 1 ? [] : [activity()], createActivity: async (_c, r) => { posts++; payload = r; return pending.promise; } }, async h => {
    await h.select('1'); await h.change('Título de actividad', request.title); await h.change('Tipo de actividad', 'PRACTICA');
    await act(async () => { h.renderer.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: true } }); });
    const submit = h.renderer.root.findByType('form').props.onSubmit;
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
    assert.equal(posts, 1); assert.deepEqual(payload, request); assert.equal(h.button('Crear actividad')?.props.disabled, true);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Bimestre de actividades' }).props.disabled, true);
    assert.doesNotMatch(text(h.renderer.root), /creada en estado/);
    await act(async () => { pending.resolve(activity()); });
    assert.equal(reads, 2); assert.match(text(h.renderer.root), /creada en estado PLANIFICADA/);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Título de actividad' }).props.value, '');
  });
});

test('detail is read from its endpoint, supports retry and renders every field including null updatedAt', async () => {
  let reads = 0;
  await view({ getActivities: async () => [activity()], getActivity: async () => { if (++reads === 1) throw httpError(404); return activity(1, { description: 'Descripción completa' }); } }, async h => {
    await h.select('1'); await h.click('Ver detalle #1'); assert.match(text(h.renderer.root), /no está disponible/);
    await h.click('Reintentar detalle'); assert.match(text(h.renderer.root), /Descripción completa/); assert.match(text(h.renderer.root), /Sin actualización/);
    await h.click('Cerrar detalle'); assert.equal(h.renderer.root.findAllByProps({ 'aria-label': 'Detalle de actividad' }).length, 0);
  });
});

test('HTTP 400/401/403/404/409 refresh without retry or false success and hide backend details', async () => {
  for (const status of [400, 401, 403, 404, 409]) {
    let posts = 0, reads = 0;
    await view({ getActivities: async () => { reads++; return []; }, createActivity: async () => { posts++; throw httpError(status); } }, async h => {
      await h.select('1'); await h.change('Título de actividad', 'Título'); await h.submit();
      assert.equal(posts, 1); assert.equal(reads, 2);
      assert.ok(text(h.renderer.root).includes(teacherActivitiesErrorMessage(httpError(status))));
      assert.doesNotMatch(text(h.renderer.root), /Información sensible|creada en estado/);
    });
  }
});

test('ambiguous POST consults list, never reports success and blocks retries until explicit review', async () => {
  let posts = 0, reads = 0;
  await view({ getActivities: async () => ++reads === 1 ? [] : [activity()], createActivity: async () => { posts++; throw httpError(); } }, async h => {
    await h.select('1'); await h.change('Título de actividad', 'Título'); await h.submit(); await h.submit();
    assert.equal(posts, 1); assert.equal(reads, 2); assert.equal(h.button('Crear actividad')?.props.disabled, true);
    assert.match(text(h.renderer.root), /podría crear un duplicado/); assert.doesNotMatch(text(h.renderer.root), /creada en estado/);
    await h.click('Revisé el listado; permitir una nueva actividad');
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Título de actividad' }).props.value, '');
  });
});

test('accepted POST with failed or inconsistent reload blocks duplicate creation and offers refresh', async () => {
  for (const fail of [true, false]) {
    let reads = 0, posts = 0;
    await view({ getActivities: async () => { reads++; if (reads === 2 && fail) throw httpError(); return reads > 2 ? [activity()] : []; }, createActivity: async () => { posts++; return activity(); } }, async h => {
      await h.select('1'); await h.change('Título de actividad', 'Título'); await h.submit(); await h.submit();
      assert.equal(posts, 1); assert.equal(h.button('Crear actividad')?.props.disabled, true);
      assert.doesNotMatch(text(h.renderer.root), /creada en estado/);
      await h.click('Actualizar actividades'); assert.equal(reads, 3);
      assert.equal(h.button('Crear actividad')?.props.disabled, true);
      await h.click('Revisé el listado; permitir una nueva actividad');
    });
  }
});

test('late collection and detail responses cannot populate another bimester', async () => {
  const pending = deferred<AcademicActivity[]>(), detail = deferred<AcademicActivity>();
  await view({ getActivities: async c => c.bimesterId === 1 ? pending.promise : [activity(2, c)], getActivity: async c => c.bimesterId === 2 ? detail.promise : activity(1, c) }, async h => {
    await h.select('1'); await h.select('2');
    await act(async () => { pending.resolve([activity(1, { title: 'OLD LIST' })]); });
    assert.doesNotMatch(text(h.renderer.root), /OLD LIST/);
    await h.click('Ver detalle #2'); await h.select('1');
    await act(async () => { detail.resolve(activity(2, { title: 'OLD DETAIL', bimesterId: 2 })); });
    assert.doesNotMatch(text(h.renderer.root), /OLD DETAIL/);
  });
});

test('late POST and reload cannot alter a changed course or bimester; no repeated POST', async () => {
  for (const courseChange of [true, false]) {
    const pending = deferred<AcademicActivity>(); let posts = 0;
    await view({ createActivity: async () => { posts++; return pending.promise; }, getActivities: async c => c.sectionCourseId === 10 && c.bimesterId === 1 ? [] : [activity(2, { ...c, title: 'NEW CONTEXT' })] }, async h => {
      await h.select('1'); await h.change('Título de actividad', 'Título'); await h.submit();
      if (courseChange) { await h.course(11); await h.select('2'); } else { await h.select('2'); await h.change('Título de actividad', 'Other'); await h.submit(); }
      await act(async () => { pending.resolve(activity()); });
      assert.equal(posts, 1); assert.match(text(h.renderer.root), /NEW CONTEXT/); assert.doesNotMatch(text(h.renderer.root), /creada en estado/);
    });
  }
});

test('no bimesters and failed collection expose empty/retry states without creation', async () => {
  await view({}, async h => { assert.match(text(h.renderer.root), /No hay bimestres disponibles/); assert.equal(h.renderer.root.findAllByType('form').length, 0); }, async () => []);
  let reads = 0;
  await view({ getActivities: async () => { if (++reads === 1) throw httpError(403); return []; } }, async h => {
    await h.select('1'); assert.equal(h.button('Crear actividad')?.props.disabled, true);
    await h.click('Reintentar actividades'); assert.equal(reads, 2); assert.match(text(h.renderer.root), /No hay actividades registradas/);
  });
});

test('changing bimester invalidates a captured submit synchronously, including before React renders', async () => {
  let posts = 0;
  await view({ createActivity: async () => { posts++; return activity(); } }, async h => {
    await h.select('1'); await h.change('Título de actividad', 'Title');
    const oldSubmit = h.renderer.root.findByType('form').props.onSubmit;
    const select = h.renderer.root.findByProps({ 'aria-label': 'Bimestre de actividades' }).props.onChange;
    await act(async () => { select({ target: { value: '2' } }); oldSubmit({ preventDefault() {} }); });
    assert.equal(posts, 0);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Título de actividad' }).props.value, '');
    await h.course(11);
    await act(async () => { oldSubmit({ preventDefault() {} }); });
    assert.equal(posts, 0);
  });
});

test('optional description and unchecked PA are submitted explicitly; bimester authorization can retry', async () => {
  let bimesters = 0; let payload: CreateAcademicActivityRequest | undefined;
  await view({ createActivity: async (_c, r) => { payload = r; throw httpError(400); } }, async h => {
    assert.match(text(h.renderer.root), /No tienes permiso/);
    await h.click('Reintentar bimestres'); await h.select('1');
    await h.change('Título de actividad', 'Tarea'); await h.change('Descripción de actividad', 'Instrucciones'); await h.submit();
    assert.deepEqual(payload, { title: 'Tarea', description: 'Instrucciones', type: 'TAREA', cuentaParaPa: false });
  }, async () => { if (++bimesters === 1) throw httpError(403); return [bimester()]; });
  await view({}, async h => { await h.course(0); assert.equal(h.renderer.root.findAllByType('form').length, 0); assert.match(text(h.renderer.root), /curso asignado válido/); });
});
