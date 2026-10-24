import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaPeriodos from '../feature/admin/vistas/(academico)/periodos/vistaPeriodos';
import { AdminSidebar } from '../layout/admin/adminSidebar';
import { AuthContext } from '../src/contexts/AuthContext';
import { academicPeriodChanges, academicPeriodErrorMessage, academicPeriodsLoadErrorMessage, academicPeriodsService, academicPeriodValidation } from '../src/services/admin/academicPeriodsService';
import httpClient from '../src/services/httpClient';
import type { AcademicPeriod, CreateAcademicPeriodRequest, UpdateAcademicPeriodRequest } from '../src/types/academicPeriodApi';

// Unit/component mocks only: no network, browser server or shared database.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const period = (id = 1, overrides: Partial<AcademicPeriod> = {}): AcademicPeriod => ({
  id, name: `Año escolar ${2025 + id}`, startDate: `${2025 + id}-03-01`, endDate: `${2025 + id}-12-20`, active: true, current: false, ...overrides,
});
const values = (overrides: Partial<CreateAcademicPeriodRequest> = {}): CreateAcademicPeriodRequest => ({ name: 'Año escolar 2027', startDate: '2027-03-01', endDate: '2027-12-20', ...overrides });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
const httpError = (status?: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'Ya existe un periodo académico con ese nombre' } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

async function withAdapter(handler: (config: { method?: string; url?: string; data?: string }) => { status: number; data: unknown }, run: () => Promise<void>) {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => { const reply = handler(config); return { config, statusText: 'OK', headers: {}, ...reply }; };
  try { await run(); } finally { httpClient.defaults.adapter = original; }
}

async function view(options: { role?: Auth['role']; list?: typeof academicPeriodsService.list; create?: typeof academicPeriodsService.create; update?: typeof academicPeriodsService.update },
  run: (h: { renderer: ReactTestRenderer; text: () => string; button: (label: string) => ReactTestInstance | undefined; click: (label: string) => Promise<void>;
    change: (label: string, value: string) => Promise<void>; submit: () => Promise<void> }) => Promise<void>) {
  const old = { ...academicPeriodsService };
  academicPeriodsService.list = options.list ?? (async () => [period(1, { current: true }), period(2, { active: false })]);
  academicPeriodsService.create = options.create ?? (async payload => period(3, payload));
  academicPeriodsService.update = options.update ?? (async (id, payload) => period(id, payload));
  const globals = ['window', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<React.StrictMode><AuthContext.Provider value={auth(options.role ?? 'ADMINISTRADOR')}><VistaPeriodos /></AuthContext.Provider></React.StrictMode>, { createNodeMock: () => new Element() }); });
    const button = (label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);
    await run({
      renderer, text: () => text(renderer.root), button,
      click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false, label); await act(async () => { node.props.onClick(); }); },
      change: async (label, value) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); },
      submit: async () => { await act(async () => { await renderer.root.findByProps({ 'aria-label': 'Periodo académico' }).props.onSubmit({ preventDefault() {} }); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(academicPeriodsService, old);
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

test('service uses the management endpoints and validates responses', async () => {
  const calls: { method?: string; url?: string; data?: unknown }[] = [];
  let reply: unknown = [period(1)];
  await withAdapter(config => { calls.push({ method: config.method, url: config.url, data: config.data ? JSON.parse(config.data) : undefined }); return { status: 200, data: reply }; }, async () => {
    assert.deepEqual(await academicPeriodsService.list(), [period(1)]);
    reply = period(4); assert.equal((await academicPeriodsService.getById(4)).id, 4);
    reply = period(5); assert.equal((await academicPeriodsService.create(values())).id, 5);
    reply = period(6); assert.equal((await academicPeriodsService.update(6, { endDate: '2027-12-22' })).id, 6);
    assert.deepEqual(calls, [
      { method: 'get', url: '/v1/management/academic-periods', data: undefined },
      { method: 'get', url: '/v1/management/academic-periods/4', data: undefined },
      { method: 'post', url: '/v1/management/academic-periods', data: values() },
      { method: 'patch', url: '/v1/management/academic-periods/6', data: { endDate: '2027-12-22' } },
    ]);
    reply = period(7); await assert.rejects(academicPeriodsService.getById(4), /no corresponde/);
    await assert.rejects(academicPeriodsService.update(4, {}), /No hay cambios/);
    for (const id of [0, -1, 1.5, NaN]) await assert.rejects(academicPeriodsService.getById(id), /entero positivo/);
    for (const bad of [{}, null, [period(1), { ...period(2), current: 'yes' }], [{ ...period(1), startDate: '2027-02-30' }]]) {
      reply = bad; await assert.rejects(academicPeriodsService.list());
    }
    assert.equal(calls.length, 9);
  });
});

test('validation requires a trimmed name up to 100 characters and endDate after startDate', () => {
  assert.equal(academicPeriodValidation(values()), null);
  assert.equal(academicPeriodValidation(values({ name: '  Año 2027  ' })), null);
  assert.match(academicPeriodValidation(values({ name: '   ' })) ?? '', /nombre/);
  assert.match(academicPeriodValidation(values({ name: 'a'.repeat(101) })) ?? '', /100/);
  assert.match(academicPeriodValidation(values({ startDate: '' })) ?? '', /fechas/);
  assert.match(academicPeriodValidation(values({ endDate: '2027-02-30' })) ?? '', /fechas/);
  assert.match(academicPeriodValidation(values({ endDate: '2027-03-01' })) ?? '', /posterior/);
  assert.match(academicPeriodValidation(values({ endDate: '2027-02-28' })) ?? '', /posterior/);
});

test('PATCH payload contains only the changed fields', () => {
  const original = period(2);
  assert.deepEqual(academicPeriodChanges(original, { name: ` ${original.name} `, startDate: original.startDate, endDate: original.endDate }), {});
  assert.deepEqual(academicPeriodChanges(original, { name: original.name, startDate: original.startDate, endDate: '2027-12-22' }), { endDate: '2027-12-22' });
  assert.deepEqual(academicPeriodChanges(original, { name: 'Nuevo', startDate: '2027-03-02', endDate: original.endDate }), { name: 'Nuevo', startDate: '2027-03-02' });
});

test('error messages are fixed Spanish texts; 409 is generic and never echoes the backend', () => {
  const expected: Record<number, RegExp> = { 400: /Revisa los datos/, 401: /sesión expiró/, 403: /gestionar periodos/, 404: /no encontrado/, 409: /nombre.*solapan.*bimestres/, 500: /servidor no pudo/ };
  for (const [status, pattern] of Object.entries(expected)) {
    const message = academicPeriodErrorMessage(httpError(Number(status)));
    assert.match(message, pattern); assert.doesNotMatch(message, /PRIVATE|Ya existe un periodo académico con ese nombre/);
  }
  assert.match(academicPeriodErrorMessage(httpError()), /conectar con el servidor/);
  assert.match(academicPeriodsLoadErrorMessage(httpError(403)), /consultar periodos/);
});

test('only ADMINISTRADOR can use the view; other roles trigger no request', async () => {
  for (const role of ['DIRECTIVO', 'DOCENTE'] as const) {
    let lists = 0;
    await view({ role, list: async () => { lists++; return []; } }, async h => {
      assert.match(h.text(), /No tienes acceso a la gestión de periodos académicos/);
      assert.equal(lists, 0); assert.equal(h.button('Crear periodo'), undefined);
    });
  }
});

test('list shows current, active and inactive states', async () => {
  await view({}, async h => {
    const rows = h.renderer.root.findAllByType('tr').slice(1).map(text);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /Año escolar 2026.*01\/03\/2026.*20\/12\/2026.*Vigente.*Activo/);
    assert.match(rows[1], /Año escolar 2027.*Inactivo/); assert.doesNotMatch(rows[1], /Vigente/);
  });
  await view({ list: async () => [] }, async h => { assert.match(h.text(), /No hay periodos académicos registrados/); });
  await view({ list: async () => { throw httpError(500); } }, async h => {
    assert.match(h.text(), /servidor no pudo/); assert.ok(h.button('Reintentar'));
  });
});

test('creating sends one trimmed POST, closes the modal and reloads the list', async () => {
  const pending = deferred<AcademicPeriod>(); const posts: CreateAcademicPeriodRequest[] = []; let lists = 0;
  await view({ list: async () => { lists++; return [period(1)]; }, create: async payload => { posts.push(payload); return pending.promise; } }, async h => {
    const before = lists;
    await h.click('Crear periodo');
    await h.change('Nombre', '  Año escolar 2027  '); await h.change('Fecha de inicio', '2027-03-01'); await h.change('Fecha de fin', '2027-12-20');
    const submit = h.renderer.root.findByProps({ 'aria-label': 'Periodo académico' }).props.onSubmit;
    await act(async () => { void submit({ preventDefault() {} }); void submit({ preventDefault() {} }); });
    assert.deepEqual(posts, [values()]);
    assert.equal(h.button('Guardando...')?.props.disabled, true);
    await act(async () => { pending.resolve(period(3, values())); });
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.match(h.text(), /Periodo académico «Año escolar 2027» guardado/);
    assert.equal(lists, before + 1);
  });
});

test('client validation blocks equal dates before any request', async () => {
  let posts = 0;
  await view({ create: async () => { posts++; return period(); } }, async h => {
    await h.click('Crear periodo');
    await h.change('Nombre', 'Año'); await h.change('Fecha de inicio', '2027-03-01'); await h.change('Fecha de fin', '2027-03-01');
    await h.submit();
    assert.match(h.text(), /posterior a la fecha de inicio/); assert.equal(posts, 0);
  });
});

test('editing sends only changed fields; no changes shows a notice without a request', async () => {
  const patches: [number, UpdateAcademicPeriodRequest][] = [];
  await view({ update: async (id, payload) => { patches.push([id, payload]); return period(id, payload); } }, async h => {
    const edit = h.renderer.root.findAllByType('button').filter(node => text(node) === 'Editar')[0];
    await act(async () => { edit.props.onClick(); });
    await h.submit();
    assert.match(h.text(), /No hay cambios\./); assert.deepEqual(patches, []);
    await h.change('Fecha de fin', '2026-12-22'); await h.submit();
    assert.deepEqual(patches, [[1, { endDate: '2026-12-22' }]]);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('409 keeps the modal open with the generic message and allows retrying', async () => {
  let posts = 0;
  await view({ create: async payload => { if (++posts === 1) throw httpError(409); return period(3, payload); } }, async h => {
    await h.click('Crear periodo');
    await h.change('Nombre', 'Año escolar 2027'); await h.change('Fecha de inicio', '2027-03-01'); await h.change('Fecha de fin', '2027-12-20');
    await h.submit();
    assert.match(h.text(), /ya existe un periodo con ese nombre, las fechas se solapan/);
    assert.doesNotMatch(h.text(), /Ya existe un periodo académico con ese nombre|PRIVATE/);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 1);
    await h.submit(); assert.equal(posts, 2);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('sidebar shows Periodos only to ADMINISTRADOR and keeps Bimestres for both roles', async () => {
  const oldSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try {
    for (const [role, visible] of [['ADMINISTRADOR', true], ['DIRECTIVO', false]] as const) {
      let renderer!: ReactTestRenderer;
      await act(async () => { renderer = create(<AuthContext.Provider value={auth(role)}><PathnameContext.Provider value="/administrador"><AdminSidebar /></PathnameContext.Provider></AuthContext.Provider>); });
      const hrefs = renderer.root.findAllByType('a').map(node => node.props.href);
      assert.equal(hrefs.includes('/administrador/periodos'), visible, role);
      assert.ok(hrefs.includes('/administrador/bimestres'), role);
      await act(async () => { renderer.unmount(); });
    }
  } finally {
    if (oldSelf) Object.defineProperty(globalThis, 'self', oldSelf); else Reflect.deleteProperty(globalThis, 'self');
  }
});
