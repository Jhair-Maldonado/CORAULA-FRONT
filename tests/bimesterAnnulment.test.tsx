import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaBimestres from '../feature/admin/vistas/(academico)/bimestres/vistaBimestres';
import AcademicPeriodForm from '../feature/admin/vistas/(academico)/periodos/AcademicPeriodForm';
import { AuthContext } from '../src/contexts/AuthContext';
import { evaluationService, bimesterAnnulmentErrorMessage } from '../src/services/admin/evaluationService';
import { academicPeriodErrorMessage, academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';

// Unit/component mocks only: no network, browser server or shared database.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });
const academicPeriod = (id: number, current = false): AcademicPeriod => ({ id, name: `Periodo ${id}`, startDate: '2026-03-01', endDate: '2026-12-20', active: true, current });
const bimester = (id = 1, status: Bimester['status'] = 'PLANIFICADO', period = 30): Bimester => ({ id, academicPeriodId: period, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status });
const httpError = (status?: number, code?: string) => new AxiosError('error', 'ERR_BAD_REQUEST', undefined, undefined,
  status ? { status, data: { error: 'Conflict', message: 'Información sensible', ...(code ? { code } : {}) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }

function withDom() {
  const globals = ['window', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  return { Element, restore: () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } } };
}

async function view(overrides: Partial<typeof evaluationService>, run: (h: {
  renderer: ReactTestRenderer;
  buttons: (name: string) => ReactTestInstance[];
  button: (name: string) => ReactTestInstance | undefined;
  click: (name: string) => Promise<void>;
  reason: (value: string) => Promise<void>;
  submitReason: () => Promise<void>;
}) => Promise<void>, role: Auth['role'] | null = 'ADMINISTRADOR') {
  const original = { ...evaluationService }, originalList = academicPeriodsService.list;
  Object.assign(evaluationService, { getBimesters: async (period: number) => [bimester(1, 'PLANIFICADO', period)], annulBimester: async (id: number) => bimester(id, 'ANULADO') }, overrides);
  academicPeriodsService.list = async () => [academicPeriod(30, true), academicPeriod(31)];
  const dom = withDom();
  let renderer!: ReactTestRenderer;
  try {
    const page = <VistaBimestres />;
    await act(async () => { renderer = create(<React.StrictMode>{role ? <AuthContext.Provider value={auth(role)}>{page}</AuthContext.Provider> : page}</React.StrictMode>, { createNodeMock: () => new dom.Element() }); });
    const buttons = (name: string) => renderer.root.findAllByType('button').filter(b => text(b) === name);
    const button = (name: string) => buttons(name)[0];
    await run({
      renderer, buttons, button,
      click: async name => { const node = button(name); assert.ok(node, name); assert.equal(!!node.props.disabled, false, name); await act(async () => { node.props.onClick(); }); },
      reason: async value => { await act(async () => { renderer.root.findByProps({ 'aria-label': 'Motivo de la anulación' }).props.onChange({ target: { value } }); }); },
      submitReason: async () => { await act(async () => { renderer.root.findByProps({ 'aria-label': 'Anulación del bimestre' }).props.onSubmit({ preventDefault() {} }); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(evaluationService, original); academicPeriodsService.list = originalList;
    dom.restore();
  }
}

test('annulBimester validates ID and reason, sends one trimmed POST and requires 200, matching ID and ANULADO', async () => {
  const original = httpClient.defaults.adapter;
  const calls: { url?: string; data: unknown; method?: string }[] = [];
  let data: unknown = bimester(1, 'ANULADO'), status = 200;
  httpClient.defaults.adapter = async config => { calls.push({ url: config.url, data: config.data, method: config.method }); return { config, status, statusText: 'OK', headers: {}, data }; };
  try {
    for (const id of [0, -1, 1.2, NaN, Infinity]) await assert.rejects(evaluationService.annulBimester(id, 'Motivo'), /entero positivo/);
    for (const reason of ['', '   ']) await assert.rejects(evaluationService.annulBimester(1, reason), /motivo/i);
    assert.equal(calls.length, 0);
    assert.equal((await evaluationService.annulBimester(1, '  Creado por error  ')).status, 'ANULADO');
    assert.deepEqual(calls, [{ url: '/v1/management/bimesters/1/annul', data: JSON.stringify({ reason: 'Creado por error' }), method: 'post' }]);
    status = 201; await assert.rejects(evaluationService.annulBimester(1, 'Motivo')); status = 200;
    for (const bad of [bimester(2, 'ANULADO'), bimester(1, 'PLANIFICADO'), bimester(1, 'ABIERTO'), {}]) { data = bad; await assert.rejects(evaluationService.annulBimester(1, 'Motivo')); }
  } finally { httpClient.defaults.adapter = original; }
});

test('only ADMINISTRADOR sees Anular, and only on PLANIFICADO or ABIERTO rows', async () => {
  const rows = [bimester(1), bimester(2, 'ABIERTO'), bimester(3, 'EN_REVISION'), bimester(4, 'CERRADO'), bimester(5, 'ANULADO')];
  await view({ getBimesters: async () => rows }, async h => {
    const annul = h.buttons('Anular');
    assert.equal(annul.length, 2);
    const rowOf = (node: ReactTestInstance) => { let n: ReactTestInstance | null = node; while (n && n.type !== 'tr') n = n.parent; return n!; };
    assert.deepEqual(annul.map(b => text(rowOf(b).findByType('th'))), ['Bimestre 1', 'Bimestre 2']);
    assert.ok(h.renderer.root.findAllByType('span').some(n => text(n) === 'Anulado'));
  });
  for (const role of ['DIRECTIVO', 'DOCENTE', null] as const) {
    let annuls = 0;
    await view({ getBimesters: async () => rows, annulBimester: async () => { annuls++; return bimester(1, 'ANULADO'); } }, async h => {
      assert.equal(h.buttons('Anular').length, 0, String(role));
      assert.ok(h.button('Abrir bimestre'));
      assert.equal(annuls, 0);
    }, role);
  }
});

test('the dialog names the bimester and period, requires a reason and cancelling sends nothing', async () => {
  let posts = 0;
  await view({ annulBimester: async () => { posts++; return bimester(1, 'ANULADO'); } }, async h => {
    await h.click('Anular');
    const dialog = h.renderer.root.findByProps({ role: 'dialog' });
    assert.equal(String(dialog.props['aria-modal']), 'true');
    assert.match(text(dialog), /Bimestre 1/); assert.match(text(dialog), /Periodo 30/); assert.match(text(dialog), /no se puede editar, abrir ni reactivar/);
    assert.equal(h.button('Abrir bimestre')?.props.disabled, true); assert.equal(h.button('Crear bimestre')?.props.disabled, true);
    await h.submitReason();
    assert.match(text(dialog), /Ingresa el motivo de la anulación/);
    await h.reason('    '); await h.submitReason();
    assert.equal(posts, 0);
    await h.click('Cancelar');
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.equal(posts, 0);
    assert.equal(h.button('Anular')?.props.disabled, false);
  });
});

test('confirming sends one POST with the trimmed reason, reloads and confirms ANULADO from the GET', async () => {
  const sent: [number, string][] = []; let reads = 0, annulled = false;
  await view({
    getBimesters: async () => { reads++; return [bimester(1, annulled ? 'ANULADO' : 'PLANIFICADO'), bimester(2, 'ABIERTO')]; },
    annulBimester: async (id, reason) => { sent.push([id, reason]); annulled = true; return bimester(id, 'ANULADO'); },
  }, async h => {
    await h.click('Anular');
    await h.reason('  Bimestre creado por error  ');
    await h.submitReason();
    assert.deepEqual(sent, [[1, 'Bimestre creado por error']]);
    assert.equal(reads, 2);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.match(text(h.renderer.root), /Bimestre 1 está ANULADO\. Estado confirmado mediante recarga/);
    assert.equal(h.buttons('Anular').length, 1);
    assert.ok(h.renderer.root.findAllByType('span').some(n => text(n) === 'Anulado'));
  });
});

const codeCases = [
  [409, 'BIMESTER_HAS_DEPENDENCIES', /información académica registrada/],
  [409, 'BIMESTER_STATE_CONFLICT', /solo se anulan bimestres Planificados o Abiertos/],
  [400, 'REASON_REQUIRED', /Ingresa el motivo/],
  [400, 'INVALID_REQUEST', /no es válida/],
  [404, 'RESOURCE_NOT_FOUND', /ya no está disponible/],
  [409, 'ACADEMIC_CATALOG_CONFLICT', /configuración académica/],
  [500, 'INTERNAL_ERROR', /servidor no pudo completar la anulación/],
  [401, undefined, /sesión ha expirado/],
  [403, undefined, /autorización para anular/],
  [409, undefined, /cambió o entra en conflicto/],
] as const;

test('each error code shows its Spanish message after one POST and a reload, never the backend text', async () => {
  for (const [status, code, message] of codeCases) {
    let posts = 0, reads = 0;
    await view({ getBimesters: async () => { reads++; return [bimester()]; }, annulBimester: async () => { posts++; throw httpError(status, code); } }, async h => {
      await h.click('Anular'); await h.reason('Motivo'); await h.submitReason();
      assert.equal(posts, 1, String(code)); assert.equal(reads, 2, String(code));
      assert.match(text(h.renderer.root), message);
      assert.doesNotMatch(text(h.renderer.root), /Información sensible|Estado confirmado mediante recarga/);
      assert.equal(h.button('Anular')?.props.disabled, false);
    });
    assert.match(bimesterAnnulmentErrorMessage(httpError(status, code)), message);
  }
});

test('a POST without response is uncertain: reloads, warns and does not retry', async () => {
  let posts = 0, reads = 0;
  await view({ getBimesters: async () => [bimester(1, ++reads === 1 ? 'PLANIFICADO' : 'ANULADO')], annulBimester: async () => { posts++; throw httpError(); } }, async h => {
    await h.click('Anular'); await h.reason('Motivo'); await h.submitReason();
    assert.equal(posts, 1); assert.equal(reads, 2);
    assert.match(text(h.renderer.root), /resultado de la anulación es incierto/);
    assert.doesNotMatch(text(h.renderer.root), /Estado confirmado mediante recarga/);
    assert.ok(h.renderer.root.findAllByType('span').some(n => text(n) === 'Anulado'));
    assert.equal(h.buttons('Anular').length, 0);
  });
  assert.match(bimesterAnnulmentErrorMessage(new Error('parse')), /no pudo confirmarse/);
});

test('ACADEMIC_PERIOD_OVERLAP gets its own message; other 409 stay generic', () => {
  assert.match(academicPeriodErrorMessage(httpError(409, 'ACADEMIC_PERIOD_OVERLAP')), /se solapan con otro periodo académico activo.*día siguiente/);
  for (const code of [undefined, 'ACADEMIC_CATALOG_CONFLICT']) {
    assert.match(academicPeriodErrorMessage(httpError(409, code)), /ya existe un periodo con ese nombre, las fechas se solapan/);
  }
  assert.doesNotMatch(academicPeriodErrorMessage(httpError(409, 'ACADEMIC_PERIOD_OVERLAP')), /Información sensible/);
});

test('creating or editing an overlapping period shows the overlap message in the form', async () => {
  const old = { ...academicPeriodsService };
  academicPeriodsService.create = async () => { throw httpError(409, 'ACADEMIC_PERIOD_OVERLAP'); };
  academicPeriodsService.update = async () => { throw httpError(409, 'ACADEMIC_PERIOD_OVERLAP'); };
  const dom = withDom();
  try {
    for (const original of [undefined, academicPeriod(31)]) {
      let saved = 0, renderer!: ReactTestRenderer;
      await act(async () => { renderer = create(<AcademicPeriodForm original={original} onCancel={() => {}} onSaved={() => { saved++; }} />, { createNodeMock: () => new dom.Element() }); });
      const change = async (label: string, value: string) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); };
      await change('Nombre', 'Año escolar 2027'); await change('Fecha de inicio', '2026-12-20'); await change('Fecha de fin', '2027-12-20');
      await act(async () => { await renderer.root.findByProps({ 'aria-label': 'Periodo académico' }).props.onSubmit({ preventDefault() {} }); });
      const alert = renderer.root.findAll(n => n.type === 'p' && n.props.role === 'alert');
      assert.equal(alert.length, 1); assert.match(text(alert[0]), /se solapan con otro periodo académico activo/);
      assert.equal(saved, 0);
      await act(async () => { renderer.unmount(); });
    }
  } finally { Object.assign(academicPeriodsService, old); dom.restore(); }
});
