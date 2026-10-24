import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaSecciones from '../feature/admin/vistas/(academico)/secciones/vistaSecciones';
import DetalleSeccion from '../feature/admin/vistas/(academico)/secciones/detalleSeccion';
import { AuthContext } from '../src/contexts/AuthContext';
import { academicPeriodLabel, academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { confirmDeactivation, deactivateSection, sectionChanges, sectionsService, sectionValidation } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import { sectionManagementErrorMessage } from '../src/services/admin/sectionErrors';
import httpClient from '../src/services/httpClient';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';
import type { CreateSectionRequest, SectionResponse, SectionStatusRequest, UpdateSectionRequest } from '../src/types/sectionApi';

// Unit/component mocks only: no network, browser server or shared database.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const section = (overrides: Partial<SectionResponse> = {}): SectionResponse => ({
  id: 7, academicPeriodId: 1, level: 'SECONDARY', grade: 3, name: 'A', maxCapacity: 30, enrollmentOpen: true, active: true, ...overrides,
});
const period = (id: number, overrides: Partial<AcademicPeriod> = {}): AcademicPeriod => ({
  id, name: `Año escolar ${2025 + id}`, startDate: `${2025 + id}-03-01`, endDate: `${2025 + id}-12-20`, active: true, current: false, ...overrides,
});
const request = (overrides: Partial<CreateSectionRequest> = {}): CreateSectionRequest => ({
  academicPeriodId: 1, level: 'SECONDARY', grade: 3, name: 'A', maxCapacity: 30, enrollmentOpen: true, ...overrides,
});
const httpError = (status?: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { error: 'Conflict', message: 'La sección tiene matrículas activas; envíe confirmActiveEnrollments=true' } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

async function withAdapter(handler: (config: { method?: string; url?: string; data?: string }) => { status: number; data: unknown }, run: () => Promise<void>) {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => { const reply = handler(config); return { config, statusText: 'OK', headers: {}, ...reply }; };
  try { await run(); } finally { httpClient.defaults.adapter = original; }
}

async function withMocks(mocks: Partial<typeof sectionsService>, run: () => Promise<void>) {
  const old = { ...sectionsService };
  Object.assign(sectionsService, mocks);
  try { await run(); } finally { Object.assign(sectionsService, old); }
}

type Harness = { renderer: ReactTestRenderer; text: () => string; button: (label: string) => ReactTestInstance | undefined; click: (label: string) => Promise<void>;
  byLabel: (label: string) => ReactTestInstance; change: (label: string, value: string) => Promise<void>; submit: (form: string) => Promise<void> };

async function render(tree: React.ReactElement, options: { periods?: AcademicPeriod[]; services?: Partial<typeof sectionsService> }, run: (h: Harness) => Promise<void>) {
  const oldPeriods = { ...academicPeriodsService }, oldCourses = { ...sectionCoursesService };
  academicPeriodsService.list = async () => options.periods ?? [period(1, { current: true }), period(2, { active: false })];
  sectionCoursesService.list = async () => [];
  const globals = ['self', 'window', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  let renderer!: ReactTestRenderer;
  await withMocks(options.services ?? {}, async () => {
    try {
      await act(async () => { renderer = create(<React.StrictMode>{tree}</React.StrictMode>, { createNodeMock: () => new Element() }); });
      const button = (label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);
      const byLabel = (label: string) => renderer.root.findByProps({ 'aria-label': label });
      await run({
        renderer, text: () => text(renderer.root), button, byLabel,
        click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false, label); await act(async () => { node.props.onClick(); }); },
        change: async (label, value) => { await act(async () => { byLabel(label).props.onChange({ target: { value, checked: value === 'true' } }); }); },
        submit: async form => { await act(async () => { await byLabel(form).props.onSubmit({ preventDefault() {} }); }); },
      });
    } finally {
      if (renderer) await act(async () => { renderer.unmount(); });
      Object.assign(academicPeriodsService, oldPeriods); Object.assign(sectionCoursesService, oldCourses);
      for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
    }
  });
}

const listTree = (role: Auth['role'] = 'ADMINISTRADOR') => <AuthContext.Provider value={auth(role)}><VistaSecciones /></AuthContext.Provider>;
const detailTree = (role: Auth['role'] = 'ADMINISTRADOR') => <AuthContext.Provider value={auth(role)}><PathParamsContext.Provider value={{ sectionId: '7' }}><DetalleSeccion /></PathParamsContext.Provider></AuthContext.Provider>;

test('service uses the management endpoints and never sends an empty PATCH', async () => {
  const calls: { method?: string; url?: string; data?: unknown }[] = [];
  await withAdapter(config => { calls.push({ method: config.method, url: config.url, data: config.data ? JSON.parse(config.data) : undefined }); return { status: 200, data: section() }; }, async () => {
    await sectionsService.create(request());
    await sectionsService.update(7, { maxCapacity: 35 });
    await sectionsService.changeStatus(7, { active: true });
    await confirmDeactivation(7);
    await assert.rejects(sectionsService.update(7, {}), /No hay cambios/);
    assert.deepEqual(calls, [
      { method: 'post', url: '/v1/management/sections', data: request() },
      { method: 'patch', url: '/v1/management/sections/7', data: { maxCapacity: 35 } },
      { method: 'patch', url: '/v1/management/sections/7', data: { active: true } },
      { method: 'patch', url: '/v1/management/sections/7', data: { active: false, confirmActiveEnrollments: true } },
    ]);
  });
});

test('deactivation tells the 409 causes apart by re-reading the section, never by the backend text', async () => {
  const statuses: SectionStatusRequest[] = [];
  const conflict = async (_: string | number, payload: SectionStatusRequest) => { statuses.push(payload); throw httpError(409); };
  await withMocks({ changeStatus: conflict, getById: async () => section({ active: true }) }, async () => {
    assert.deepEqual(await deactivateSection(7), { kind: 'needsConfirmation' });
  });
  await withMocks({ changeStatus: conflict, getById: async () => section({ active: false }) }, async () => {
    assert.deepEqual(await deactivateSection(7), { kind: 'alreadyInactive', section: section({ active: false }) });
  });
  await withMocks({ changeStatus: conflict, getById: async () => { throw httpError(500); } }, async () => {
    await assert.rejects(deactivateSection(7), (error: AxiosError) => error.response?.status === 409);
  });
  await withMocks({ changeStatus: async () => { throw httpError(403); }, getById: async () => assert.fail('no re-read on non-409') }, async () => {
    await assert.rejects(deactivateSection(7), (error: AxiosError) => error.response?.status === 403);
  });
  await withMocks({ changeStatus: async () => section({ active: false }) }, async () => {
    assert.deepEqual(await deactivateSection(7), { kind: 'deactivated', section: section({ active: false }) });
  });
  assert.deepEqual(statuses, [{ active: false }, { active: false }, { active: false }]);
});

test('validation bounds grade by level and PATCH carries only changed fields', () => {
  assert.equal(sectionValidation(request()), null);
  assert.match(sectionValidation(request({ academicPeriodId: NaN })) ?? '', /periodo/);
  assert.match(sectionValidation(request({ grade: 6 })) ?? '', /entre 1 y 5/);
  assert.equal(sectionValidation(request({ level: 'PRIMARY', grade: 6 })), null);
  assert.match(sectionValidation(request({ name: '   ' })) ?? '', /nombre/);
  assert.match(sectionValidation(request({ name: 'a'.repeat(11) })) ?? '', /10/);
  assert.match(sectionValidation(request({ maxCapacity: 0 })) ?? '', /mayor que 0/);
  assert.deepEqual(sectionChanges(section(), request({ name: ' A ' })), {});
  assert.deepEqual(sectionChanges(section(), request({ maxCapacity: 32, enrollmentOpen: false, name: 'B ' })), { name: 'B', maxCapacity: 32, enrollmentOpen: false });
});

test('management errors are fixed Spanish texts and never echo the backend', () => {
  const expected: Record<number, RegExp> = { 400: /Revisa los datos/, 401: /sesión expiró/, 403: /gestionar secciones/, 404: /no encontrado/, 409: /conflicto con el estado actual/, 500: /servidor no pudo/ };
  for (const [status, pattern] of Object.entries(expected)) {
    const message = sectionManagementErrorMessage(httpError(Number(status)));
    assert.match(message, pattern); assert.doesNotMatch(message, /PRIVATE|confirmActiveEnrollments/);
  }
  assert.match(sectionManagementErrorMessage(httpError()), /conectar con el servidor/);
  assert.match(academicPeriodLabel(period(2, { active: false })), /Año escolar 2027 \(01\/03\/2027 – 20\/12\/2027\) · Inactivo/);
});

test('only ADMINISTRADOR sees the create and management buttons', async () => {
  for (const role of ['DIRECTIVO', 'DOCENTE'] as const) {
    await render(listTree(role), { services: { list: async () => [section()] } }, async h => { assert.equal(h.button('Nueva sección'), undefined); });
    await render(detailTree(role), { services: { getById: async () => section() } }, async h => {
      for (const label of ['Editar', 'Desactivar', 'Reactivar']) assert.equal(h.button(label), undefined, label);
    });
  }
  await render(detailTree(), { services: { getById: async () => section() } }, async h => {
    assert.ok(h.button('Editar')); assert.ok(h.button('Desactivar')); assert.equal(h.button('Reactivar'), undefined);
  });
  await render(detailTree(), { services: { getById: async () => section({ active: false }) } }, async h => {
    assert.ok(h.button('Reactivar')); assert.equal(h.button('Editar'), undefined); assert.equal(h.button('Desactivar'), undefined);
  });
});

test('create modal preselects the current period, disables inactive ones and reloads the list', async () => {
  const posts: CreateSectionRequest[] = []; let lists = 0;
  await render(listTree(), { services: { list: async () => { lists++; return [section()]; }, create: async payload => { posts.push(payload); return section({ id: 9, name: payload.name }); } } }, async h => {
    const before = lists;
    await h.click('Nueva sección');
    assert.equal(h.byLabel('Periodo académico').props.value, '1');
    const options = h.byLabel('Periodo académico').findAllByType('option');
    const inactive = options.find(option => text(option).includes('Inactivo'));
    assert.ok(inactive); assert.equal(inactive.props.disabled, true);
    assert.deepEqual(h.byLabel('Grado').findAllByType('option').map(text), ['1°', '2°', '3°', '4°', '5°']);
    assert.match(h.text(), /Secundaria/); assert.equal(h.byLabel('Matrícula abierta').props.checked, true);
    await h.submit('Sección');
    assert.match(h.text(), /Ingresa el nombre/); assert.equal(posts.length, 0);
    await h.change('Grado', '2'); await h.change('Nombre', ' B '); await h.change('Capacidad máxima', '25');
    await h.submit('Sección');
    assert.deepEqual(posts, [{ academicPeriodId: 1, level: 'SECONDARY', grade: 2, name: 'B', maxCapacity: 25, enrollmentOpen: true }]);
    assert.throws(() => h.byLabel('Sección'));
    assert.match(h.text(), /Sección B de 3° grado creada/); assert.ok(lists > before);
  });
});

test('create shows a fixed message on 409 and keeps the modal open', async () => {
  await render(listTree(), { services: { list: async () => [], create: async () => { throw httpError(409); } } }, async h => {
    await h.click('Nueva sección');
    await h.change('Nombre', 'A'); await h.change('Capacidad máxima', '30');
    await h.submit('Sección');
    assert.match(h.text(), /conflicto con el estado actual/); assert.doesNotMatch(h.text(), /confirmActiveEnrollments/);
    assert.ok(h.byLabel('Sección'));
  });
});

test('edit keeps the level, shows its inactive period and sends only the changes', async () => {
  const patches: UpdateSectionRequest[] = [];
  const primary = section({ level: 'PRIMARY', grade: 6, academicPeriodId: 2 });
  await render(detailTree(), { services: { getById: async () => primary, update: async (_, payload) => { patches.push(payload); return { ...primary, ...payload }; } } }, async h => {
    await h.click('Editar');
    assert.equal(h.byLabel('Periodo académico').props.value, '2');
    const own = h.byLabel('Periodo académico').findAllByType('option').find(option => option.props.value === '2');
    assert.ok(own); assert.equal(!!own.props.disabled, false); assert.match(text(own), /Inactivo/);
    assert.equal(h.byLabel('Grado').findAllByType('option').length, 6); assert.match(h.text(), /Primaria/);
    await h.submit('Sección');
    assert.match(h.text(), /No hay cambios/); assert.equal(patches.length, 0);
    await h.change('Capacidad máxima', '28');
    await h.submit('Sección');
    assert.deepEqual(patches, [{ maxCapacity: 28 }]);
    assert.match(h.text(), /Sección actualizada/);
  });
});

test('deactivation with active enrollments needs a second explicit confirmation', async () => {
  const statuses: SectionStatusRequest[] = []; let reads = 0;
  await render(detailTree(), { services: {
    getById: async () => { reads++; return section(); },
    changeStatus: async (_, payload) => { statuses.push(payload); if (!('confirmActiveEnrollments' in payload)) throw httpError(409); return section({ active: false }); },
  } }, async h => {
    const readsBefore = reads;
    await h.click('Desactivar');
    await h.submit('Estado de la sección');
    assert.ok(reads > readsBefore, 're-reads the section after the 409');
    assert.match(h.text(), /los estudiantes no se retiran ni se trasladan/);
    assert.doesNotMatch(h.text(), /confirmActiveEnrollments|PRIVATE/);
    assert.ok(h.button('Desactivar con matrículas activas')); assert.equal(h.button('Desactivar sección'), undefined);
    assert.equal(!!h.button('Desactivar con matrículas activas')?.props.disabled, false);
    await h.submit('Estado de la sección');
    assert.deepEqual(statuses, [{ active: false }, { active: false, confirmActiveEnrollments: true }]);
    assert.match(h.text(), /Sección desactivada/); assert.ok(h.button('Reactivar'));
  });
});

test('deactivation that finds the section already inactive does not ask for confirmation', async () => {
  let current = section();
  await render(detailTree(), { services: { getById: async () => current, changeStatus: async () => { current = section({ active: false }); throw httpError(409); } } }, async h => {
    await h.click('Desactivar');
    await h.submit('Estado de la sección');
    assert.match(h.text(), /La sección ya estaba inactiva/);
    assert.equal(h.button('Desactivar con matrículas activas'), undefined); assert.ok(h.button('Reactivar'));
  });
});

test('reactivation sends active=true alone and shows a fixed error on failure', async () => {
  const statuses: SectionStatusRequest[] = []; let fail = true;
  await render(detailTree(), { services: { getById: async () => section({ active: false }), changeStatus: async (_, payload) => { statuses.push(payload); if (fail) throw httpError(409); return section(); } } }, async h => {
    await h.click('Reactivar');
    await h.submit('Estado de la sección');
    assert.match(h.text(), /conflicto con el estado actual/);
    fail = false;
    await h.submit('Estado de la sección');
    assert.deepEqual(statuses, [{ active: true }, { active: true }]);
    assert.match(h.text(), /Sección reactivada/); assert.ok(h.button('Desactivar'));
  });
});
