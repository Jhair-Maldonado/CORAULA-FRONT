import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaPeriodos from '../feature/admin/vistas/(academico)/periodos/vistaPeriodos';
import { AdminSidebar } from '../layout/admin/adminSidebar';
import { AuthContext } from '../src/contexts/AuthContext';
import { academicPeriodChanges, academicPeriodErrorMessage, academicPeriodReasonError, academicPeriodsLoadErrorMessage, academicPeriodsService, academicPeriodValidation } from '../src/services/admin/academicPeriodsService';
import {
  academicPeriodActivationErrorCode, academicPeriodActivationErrorMessage, academicPeriodActivationReloads, academicPeriodDependencies, isUncertainAcademicPeriodActivation,
} from '../src/services/admin/academicPeriodActivationErrors';
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
const codeError = (status: number, code: string, details?: unknown) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  { status, data: { error: 'x', message: 'PRIVATE BACKEND TEXT', code, ...(details === undefined ? {} : { details }) } } as AxiosResponse);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

async function withAdapter(handler: (config: { method?: string; url?: string; data?: string }) => { status: number; data: unknown }, run: () => Promise<void>) {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => { const reply = handler(config); return { config, statusText: 'OK', headers: {}, ...reply }; };
  try { await run(); } finally { httpClient.defaults.adapter = original; }
}

async function view(options: { role?: Auth['role']; list?: typeof academicPeriodsService.list; create?: typeof academicPeriodsService.create; update?: typeof academicPeriodsService.update;
  deactivate?: typeof academicPeriodsService.deactivate; reactivate?: typeof academicPeriodsService.reactivate },
  run: (h: { renderer: ReactTestRenderer; text: () => string; button: (label: string) => ReactTestInstance | undefined; click: (label: string) => Promise<void>;
    change: (label: string, value: string) => Promise<void>; submit: () => Promise<void> }) => Promise<void>) {
  const old = { ...academicPeriodsService };
  academicPeriodsService.list = options.list ?? (async () => [period(1, { current: true }), period(2, { active: false })]);
  academicPeriodsService.create = options.create ?? (async payload => period(3, payload));
  academicPeriodsService.update = options.update ?? (async (id, payload) => period(id, payload));
  academicPeriodsService.deactivate = options.deactivate ?? (async () => { throw new Error('unexpected deactivate'); });
  academicPeriodsService.reactivate = options.reactivate ?? (async () => { throw new Error('unexpected reactivate'); });
  const globals = ['window', 'document', 'HTMLElement', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  // next/link (dependency guidance) reads `self`.
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
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

test('DIRECTIVO reads the list without actions; other roles trigger no request (#104)', async () => {
  let lists = 0;
  await view({ role: 'DIRECTIVO', list: async () => { lists++; return [period(1), period(2, { active: false })]; } }, async h => {
    assert.ok(lists > 0); assert.match(h.text(), /Año escolar 2026.*Año escolar 2027/); assert.match(h.text(), /solo lectura/);
    for (const label of ['Crear periodo', 'Editar', 'Desactivar', 'Reactivar']) assert.equal(h.button(label), undefined, label);
    assert.doesNotMatch(h.text(), /Acciones/);
  });
  lists = 0;
  await view({ role: 'DOCENTE', list: async () => { lists++; return []; } }, async h => {
    assert.match(h.text(), /No tienes acceso a la gestión de periodos académicos/);
    assert.equal(lists, 0); assert.equal(h.button('Crear periodo'), undefined);
  });
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

test('sidebar shows Periodos and Bimestres to ADMINISTRADOR and DIRECTIVO (#104)', async () => {
  const oldSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try {
    for (const [role, visible] of [['ADMINISTRADOR', true], ['DIRECTIVO', true]] as const) {
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

// #104 activation (BACK #88, docs/academic-period-activation.md).
const dependencyDetails = [
  { type: 'REVIEW_BIMESTERS', count: 1, ids: [9], truncated: false },
  { type: 'FUTURE_TYPE', count: 3, ids: [1], truncated: false },
  { type: 'ACTIVE_ENROLLMENTS', count: 25, ids: Array.from({ length: 20 }, (_, i) => i + 1), truncated: true },
  { type: 'ACTIVE_SECTIONS', count: 2, ids: [4, 7], truncated: false },
];

test('activation service posts only the trimmed reason and validates the resulting state', async () => {
  const calls: { method?: string; url?: string; data?: unknown }[] = [];
  let reply: unknown = period(3, { active: false });
  await withAdapter(config => { calls.push({ method: config.method, url: config.url, data: config.data ? JSON.parse(config.data) : undefined }); return { status: 200, data: reply }; }, async () => {
    assert.equal((await academicPeriodsService.deactivate(3, '  Cierre del año  ')).active, false);
    reply = period(3, { active: true }); assert.equal((await academicPeriodsService.reactivate(3, 'Reapertura')).active, true);
    assert.deepEqual(calls, [
      { method: 'post', url: '/v1/management/academic-periods/3/deactivate', data: { reason: 'Cierre del año' } },
      { method: 'post', url: '/v1/management/academic-periods/3/reactivate', data: { reason: 'Reapertura' } },
    ]);
    reply = period(3, { active: true }); await assert.rejects(academicPeriodsService.deactivate(3, 'x'), /no refleja/);
    reply = period(4, { active: false }); await assert.rejects(academicPeriodsService.deactivate(3, 'x'), /no corresponde/);
    reply = { id: 3 }; await assert.rejects(academicPeriodsService.reactivate(3, 'x'), /inesperada/);
    assert.equal(calls.length, 5);
    await assert.rejects(academicPeriodsService.deactivate(3, '   '), /motivo/);
    await assert.rejects(academicPeriodsService.deactivate(3, 'a'.repeat(256)), /motivo/);
    await assert.rejects(academicPeriodsService.reactivate(0, 'x'), /entero positivo/);
    assert.equal(calls.length, 5);
  });
});

test('reason is trimmed and must have 1 to 255 characters', () => {
  assert.equal(academicPeriodReasonError('a'), null);
  assert.equal(academicPeriodReasonError(`  ${'a'.repeat(255)}  `), null);
  assert.match(academicPeriodReasonError('') ?? '', /Indica el motivo/);
  assert.match(academicPeriodReasonError(' \n ') ?? '', /Indica el motivo/);
  assert.match(academicPeriodReasonError('a'.repeat(256)) ?? '', /255/);
});

test('activation codes count only with their contract status; texts never echo the backend', () => {
  const expected: [number, string, RegExp][] = [
    [400, 'REASON_REQUIRED', /Indica el motivo/], [400, 'VALIDATION_ERROR', /Revisa el motivo/],
    [404, 'ACADEMIC_PERIOD_NOT_FOUND', /ya no existe/], [409, 'ACADEMIC_PERIOD_STATE_CONFLICT', /estado del periodo cambió/],
    [409, 'ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES', /registros activos/], [409, 'ACADEMIC_PERIOD_OVERLAP', /solapan con otro periodo activo.*inclusivas/],
  ];
  for (const [status, code, pattern] of expected) {
    const error = codeError(status, code);
    assert.equal(academicPeriodActivationErrorCode(error), code);
    assert.match(academicPeriodActivationErrorMessage(error), pattern, code); assert.doesNotMatch(academicPeriodActivationErrorMessage(error), /PRIVATE/);
  }
  assert.equal(academicPeriodActivationErrorCode(codeError(400, 'ACADEMIC_PERIOD_OVERLAP')), null);
  assert.match(academicPeriodActivationErrorMessage(codeError(400, 'ACADEMIC_PERIOD_OVERLAP')), /Revisa el motivo/);
  assert.match(academicPeriodActivationErrorMessage(codeError(409, 'SOMETHING_ELSE')), /El periodo cambió/);
  assert.match(academicPeriodActivationErrorMessage(httpError(401)), /sesión expiró/);
  assert.match(academicPeriodActivationErrorMessage(httpError(403)), /Solo el Administrador/);
  for (const uncertain of [httpError(), httpError(500), codeError(500, 'INTERNAL_ERROR'), new Error('La respuesta no refleja el cambio')]) {
    assert.equal(isUncertainAcademicPeriodActivation(uncertain), true);
    assert.match(academicPeriodActivationErrorMessage(uncertain), /sin repetir la solicitud/);
    assert.equal(academicPeriodActivationReloads(uncertain), true);
  }
  for (const status of [404, 409]) assert.equal(academicPeriodActivationReloads(httpError(status)), true);
  for (const status of [400, 401, 403]) assert.equal(academicPeriodActivationReloads(httpError(status)), false);
});

test('dependency details are parsed in display order; unknown types are ignored and malformed ones discarded', () => {
  assert.deepEqual(academicPeriodDependencies(codeError(409, 'ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES', dependencyDetails))?.map(d => [d.type, d.count, d.ids.length, d.truncated]), [
    ['ACTIVE_ENROLLMENTS', 25, 20, true], ['ACTIVE_SECTIONS', 2, 2, false], ['REVIEW_BIMESTERS', 1, 1, false],
  ]);
  const one = { type: 'OPEN_BIMESTERS', count: 2, ids: [5, 6], truncated: false };
  for (const bad of [undefined, {}, [], [{ type: 'FUTURE_TYPE', count: 1, ids: [], truncated: false }], [{ ...one, count: 0 }], [{ ...one, ids: [5, 0] }],
    [{ ...one, ids: Array.from({ length: 21 }, (_, i) => i + 1), count: 30 }], [{ ...one, count: 1 }], [{ ...one, truncated: 'no' }], [one, one], [null]]) {
    assert.equal(academicPeriodDependencies(codeError(409, 'ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES', bad)), null, JSON.stringify(bad));
  }
  assert.equal(academicPeriodDependencies(codeError(409, 'ACADEMIC_PERIOD_OVERLAP', [one])), null);
  assert.equal(academicPeriodDependencies(codeError(400, 'ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES', [one])), null);
});

const reasonForm = (h: { renderer: ReactTestRenderer }) => h.renderer.root.findByProps({ 'aria-label': 'Cambio de estado del periodo' });
const dialogs = (h: { renderer: ReactTestRenderer }) => h.renderer.root.findAllByProps({ role: 'dialog' }).length;

test('active rows offer Desactivar and inactive rows Reactivar; the dialog explains the effect and counts the reason', async () => {
  await view({}, async h => {
    const rows = h.renderer.root.findAllByType('tr').slice(1);
    assert.match(text(rows[0]), /Editar.*Desactivar/); assert.doesNotMatch(text(rows[0]), /Reactivar/);
    assert.match(text(rows[1]), /Editar.*Reactivar/); assert.doesNotMatch(text(rows[1]), /Desactivar/);
    await h.click('Desactivar');
    assert.match(h.text(), /Desactivar periodo académico.*Año escolar 2026.*no se podrán registrar matrículas.*se conservan.*bimestres Abiertos o En revisión.*auditoría/);
    assert.match(h.text(), /\(0\/255\)/);
    await h.change('Motivo', '  Cierre  '); assert.match(h.text(), /\(6\/255\)/);
    assert.equal(h.button('Editar')?.props.disabled, true);
    await h.click('Cancelar'); assert.equal(dialogs(h), 0);
    await h.click('Reactivar'); assert.match(h.text(), /Reactivar periodo académico.*solapan con otro periodo activo/);
  });
});

test('deactivation sends one trimmed request, blocks a blank reason and confirms the state by reloading', async () => {
  const pending = deferred<AcademicPeriod>(); const posts: [number, string][] = []; let lists = 0; let deactivated = false;
  await view({
    list: async () => { lists++; return [period(1, { active: !deactivated })]; },
    deactivate: async (id, reason) => { posts.push([id, reason]); return pending.promise; },
  }, async h => {
    await h.click('Desactivar');
    await act(async () => { reasonForm(h).props.onSubmit({ preventDefault() {} }); });
    assert.match(h.text(), /Indica el motivo/); assert.equal(posts.length, 0);
    await h.change('Motivo', '  Fin del año escolar  ');
    const before = lists;
    const submit = reasonForm(h).props.onSubmit;
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
    assert.deepEqual(posts, [[1, 'Fin del año escolar']]);
    assert.match(h.text(), /Desactivando el periodo/); assert.equal(h.button('Confirmar desactivación')?.props.disabled, true);
    deactivated = true;
    await act(async () => { pending.resolve(period(1, { active: false })); });
    assert.equal(dialogs(h), 0); assert.equal(lists, before + 1);
    assert.match(h.text(), /«Año escolar 2026» desactivado\. Estado confirmado mediante recarga/);
    assert.equal(posts.length, 1);
  });
});

test('a reload that does not reflect an accepted change asks to refresh instead of confirming', async () => {
  await view({ list: async () => [period(1)], deactivate: async id => period(id, { active: false }) }, async h => {
    await h.click('Desactivar'); await h.change('Motivo', 'Cierre');
    await act(async () => { await reasonForm(h).props.onSubmit({ preventDefault() {} }); });
    assert.match(h.text(), /lista recargada no lo refleja/); assert.doesNotMatch(h.text(), /Estado confirmado/);
  });
});

test('active dependencies close the dialog, reload once and show each blocking type with its count and where to resolve it', async () => {
  let lists = 0, posts = 0;
  await view({ list: async () => { lists++; return [period(1)]; }, deactivate: async () => { posts++; throw codeError(409, 'ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES', dependencyDetails); } }, async h => {
    await h.click('Desactivar'); await h.change('Motivo', 'Cierre');
    const before = lists;
    await act(async () => { await reasonForm(h).props.onSubmit({ preventDefault() {} }); });
    assert.equal(dialogs(h), 0); assert.equal(lists, before + 1); assert.equal(posts, 1);
    const page = h.text();
    assert.match(page, /No se puede desactivar el periodo.*Registros activos que impiden desactivar «Año escolar 2026»/);
    assert.match(page, /Matrículas activas: 25.*IDs: 1, 2, .*20 y 5 más.*perfil del alumno.*Secciones activas: 2.*IDs: 4, 7.*Bimestres en revisión: 1.*Cerrados o Anulados/);
    assert.doesNotMatch(page, /FUTURE_TYPE|PRIVATE/);
    const hrefs = h.renderer.root.findAllByType('a').map(node => node.props.href);
    assert.deepEqual(hrefs, ['/administrador/alumnos', '/administrador/secciones', '/administrador/bimestres']);
  });
  await view({ list: async () => [period(1)], deactivate: async () => { throw codeError(409, 'ACADEMIC_PERIOD_HAS_ACTIVE_DEPENDENCIES', 'bad'); } }, async h => {
    await h.click('Desactivar'); await h.change('Motivo', 'Cierre');
    await act(async () => { await reasonForm(h).props.onSubmit({ preventDefault() {} }); });
    assert.match(h.text(), /todavía tiene registros activos/); assert.doesNotMatch(h.text(), /Registros activos que impiden/);
  });
});

test('overlap on reactivation explains the inclusive dates and reloads the list', async () => {
  let lists = 0;
  await view({ list: async () => { lists++; return [period(2, { active: false })]; }, reactivate: async () => { throw codeError(409, 'ACADEMIC_PERIOD_OVERLAP'); } }, async h => {
    await h.click('Reactivar'); await h.change('Motivo', 'Reapertura');
    const before = lists;
    await act(async () => { await reasonForm(h).props.onSubmit({ preventDefault() {} }); });
    assert.equal(dialogs(h), 0); assert.equal(lists, before + 1);
    assert.match(h.text(), /No se puede reactivar el periodo: sus fechas se solapan.*inclusivas.*Desactiva o ajusta/);
  });
});

test('an uncertain outcome reloads once without retrying; 400 keeps the dialog for correction', async () => {
  let lists = 0, posts = 0;
  await view({ list: async () => { lists++; return [period(1)]; }, deactivate: async () => { posts++; throw httpError(500); } }, async h => {
    await h.click('Desactivar'); await h.change('Motivo', 'Cierre');
    const before = lists;
    await act(async () => { await reasonForm(h).props.onSubmit({ preventDefault() {} }); });
    assert.equal(dialogs(h), 0); assert.equal(lists, before + 1); assert.equal(posts, 1);
    assert.match(h.text(), /No se pudo confirmar el cambio de estado.*sin repetir la solicitud/);
  });
  posts = 0;
  await view({ deactivate: async () => { posts++; throw codeError(400, 'REASON_REQUIRED'); } }, async h => {
    await h.click('Desactivar'); await h.change('Motivo', 'Cierre');
    await act(async () => { await reasonForm(h).props.onSubmit({ preventDefault() {} }); });
    assert.equal(dialogs(h), 1); assert.equal(posts, 1); assert.match(h.text(), /Indica el motivo \(obligatorio/);
  });
});
