import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaBimestres from '../feature/admin/vistas/(academico)/bimestres/vistaBimestres';
import { evaluationService, bimesterOpeningErrorMessage } from '../src/services/admin/evaluationService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';

// Unit/component mocks only: no network, browser server or shared database.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const bimester = (id = 1, status: Bimester['status'] = 'PLANIFICADO', period = 30): Bimester => ({ id, academicPeriodId: period, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status });
const httpError = (status?: number) => new AxiosError('error', 'ERR_BAD_REQUEST', undefined, undefined, status ? { status, data: { message: 'Información sensible' } } as AxiosResponse : undefined);
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
async function view(overrides: Partial<typeof evaluationService>, run: (h: {
  renderer: ReactTestRenderer;
  button: (name: string) => ReactTestInstance | undefined;
  click: (name: string) => Promise<void>;
  period: (value: string) => Promise<void>;
}) => Promise<void>) {
  const original = { ...evaluationService };
  Object.assign(evaluationService, { getBimesters: async (period: number) => [bimester(1, 'PLANIFICADO', period)], openBimester: async () => bimester(1, 'ABIERTO') }, overrides);
  const globals = ['window', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<VistaBimestres />, { createNodeMock: () => new Element() }); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    const period = async (value: string) => { await act(async () => { renderer.root.findAllByType('input')[0].props.onChange({ target: { value } }); }); };
    await period('30');
    await run({ renderer, button, period, click: async name => { const node = button(name); assert.ok(node); assert.equal(!!node.props.disabled, false); await act(async () => { node.props.onClick(); }); } });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(evaluationService, original);
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

test('openBimester validates ID, sends a bodyless POST and requires 200, matching ID and ABIERTO', async () => {
  const original = httpClient.defaults.adapter;
  const calls: { url?: string; data: unknown; method?: string }[] = [];
  let data: unknown = bimester(1, 'ABIERTO'), status = 200;
  httpClient.defaults.adapter = async config => { calls.push({ url: config.url, data: config.data, method: config.method }); return { config, status, statusText: 'OK', headers: {}, data }; };
  try {
    for (const id of [0, -1, 1.2, NaN, Infinity]) await assert.rejects(evaluationService.openBimester(id), /entero positivo/);
    assert.equal(calls.length, 0);
    assert.equal((await evaluationService.openBimester(1)).status, 'ABIERTO');
    assert.deepEqual(calls, [{ url: '/v1/management/bimesters/1/open', data: undefined, method: 'post' }]);
    status = 201; await assert.rejects(evaluationService.openBimester(1)); status = 200;
    for (const bad of [bimester(2, 'ABIERTO'), bimester(1), {}, { ...bimester(1, 'ABIERTO'), academicPeriodId: null }]) { data = bad; await assert.rejects(evaluationService.openBimester(1)); }
    data = [bimester(1, 'ABIERTO', 31)];
    await assert.rejects(evaluationService.getBimesters(30), /periodo solicitado/);
  } finally { httpClient.defaults.adapter = original; }
});

test('only PLANIFICADO exposes opening; editing disables incompatible actions', async () => {
  await view({ getBimesters: async () => [bimester(1), bimester(2, 'ABIERTO'), bimester(3, 'EN_REVISION'), bimester(4, 'CERRADO')] }, async h => {
    assert.equal(h.renderer.root.findAllByType('button').filter(b => text(b) === 'Abrir bimestre').length, 1);
    await h.click('Editar');
    assert.equal(h.button('Abrir bimestre')?.props.disabled, true);
    await h.click('Cancelar');
    assert.equal(h.button('Abrir bimestre')?.props.disabled, false);
  });
});

test('confirmation names the bimester and period; cancelling invalidates even a stale confirm callback', async () => {
  let posts = 0;
  await view({ openBimester: async () => { posts++; return bimester(1, 'ABIERTO'); } }, async h => {
    await h.click('Abrir bimestre');
    const dialog = h.renderer.root.findByProps({ role: 'dialog' });
    assert.equal(String(dialog.props['aria-modal']), 'true'); assert.ok(dialog.props['aria-labelledby']);
    assert.match(text(dialog), /Bimestre 1/); assert.match(text(dialog), /30/); assert.match(text(dialog), /no permite deshacer/);
    const confirm = h.button('Confirmar apertura')!.props.onClick;
    await act(async () => { h.button('Cancelar')!.props.onClick(); confirm(); });
    assert.equal(posts, 0); assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('double confirmation issues one POST, awaits GET and renders ABIERTO from that GET', async () => {
  const pending = deferred<Bimester>(); let posts = 0, reads = 0, opened = false;
  await view({ getBimesters: async () => { reads++; return [bimester(1, opened ? 'ABIERTO' : 'PLANIFICADO')]; }, openBimester: async () => { posts++; return pending.promise; } }, async h => {
    await h.click('Abrir bimestre'); const confirm = h.button('Confirmar apertura')!.props.onClick;
    await act(async () => { confirm(); confirm(); });
    assert.equal(posts, 1); assert.equal(h.button('Actualizar')?.props.disabled, true); assert.equal(h.button('Crear bimestre')?.props.disabled, true);
    assert.equal(h.button('Abrir bimestre')?.props.disabled, true); assert.equal(h.button('Editar')?.props.disabled, true);
    assert.equal(h.renderer.root.findAllByType('input')[0].props.disabled, true);
    opened = true;
    await act(async () => { pending.resolve(bimester(1, 'ABIERTO')); await pending.promise; });
    assert.equal(reads, 2); assert.equal(posts, 1); assert.equal(h.button('Abrir bimestre'), undefined);
    assert.match(text(h.renderer.root), /Estado confirmado mediante recarga/);
    assert.ok(h.renderer.root.findAllByType('span').some(n => text(n) === 'Abierto'));
  });
});

test('409 reloads concurrent state without retry or claiming this administrator opened it', async () => {
  let posts = 0, reads = 0;
  await view({ getBimesters: async () => [bimester(1, ++reads === 1 ? 'PLANIFICADO' : 'ABIERTO')], openBimester: async () => { posts++; throw httpError(409); } }, async h => {
    await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
    assert.equal(reads, 2); assert.equal(posts, 1); assert.equal(h.button('Abrir bimestre'), undefined);
    assert.match(text(h.renderer.root), /pudo haber cambiado/);
    assert.doesNotMatch(text(h.renderer.root), /Estado confirmado mediante recarga/);
  });
});

test('400/401/403/404 and network loss show sanitized errors and refresh without POST retries', async () => {
  for (const [status, message] of [[400, /identificador/], [401, /sesión/], [403, /autorización/], [404, /disponible/], [undefined, /no está confirmada/]] as const) {
    let posts = 0, reads = 0;
    await view({ getBimesters: async () => { reads++; return [bimester()]; }, openBimester: async () => { posts++; throw httpError(status); } }, async h => {
      await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
      assert.equal(posts, 1); assert.equal(reads, 2); assert.match(text(h.renderer.root), message);
      assert.doesNotMatch(text(h.renderer.root), /Información sensible|Estado confirmado mediante recarga/);
    });
    assert.match(bimesterOpeningErrorMessage(httpError(status)), message);
  }
});

test('successful or ambiguous POST followed by failed GET blocks actions until manual refresh', async () => {
  for (const ambiguous of [false, true]) {
    let reads = 0;
    await view({ getBimesters: async () => { if (++reads === 2) throw new Error('offline'); return [bimester(1, reads > 2 ? 'ABIERTO' : 'PLANIFICADO')]; }, openBimester: async () => { if (ambiguous) throw httpError(); return bimester(1, 'ABIERTO'); } }, async h => {
      await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
      assert.match(text(h.renderer.root), /No se pudo confirmar el estado visual/);
      assert.equal(h.button('Abrir bimestre')?.props.disabled, true); assert.equal(h.button('Editar')?.props.disabled, true);
      await h.click('Actualizar');
      assert.equal(reads, 3); assert.equal(h.button('Abrir bimestre'), undefined);
      assert.doesNotMatch(text(h.renderer.root), /Estado confirmado mediante recarga/);
    });
  }
});

test('a mismatched period or unconfirmed reload never produces a success notification', async () => {
  for (const response of [bimester(1, 'ABIERTO', 31), bimester(1, 'ABIERTO')]) {
    await view({ openBimester: async () => response }, async h => {
      await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
      assert.doesNotMatch(text(h.renderer.root), /Estado confirmado mediante recarga/);
      assert.match(text(h.renderer.root), /no pudo confirmarse|no se confirmó/);
    });
  }
});

test('changing period cancels pending confirmation synchronously', async () => {
  let posts = 0;
  await view({ openBimester: async () => { posts++; return bimester(1, 'ABIERTO'); } }, async h => {
    await h.click('Abrir bimestre'); const oldConfirm = h.button('Confirmar apertura')!.props.onClick;
    await h.period('31'); await act(async () => { oldConfirm(); });
    assert.equal(posts, 0); assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('late POST/GET results never alter a different selected period', async () => {
  const pending = deferred<Bimester>();
  await view({ getBimesters: async period => [bimester(period, period === 30 ? 'PLANIFICADO' : 'CERRADO', period)], openBimester: async () => pending.promise }, async h => {
    await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
    // Simulate an external context change despite the disabled input during POST.
    await h.period('31');
    await act(async () => { pending.resolve(bimester(30, 'ABIERTO')); await pending.promise; });
    assert.match(text(h.renderer.root), /Bimestre 31/); assert.doesNotMatch(text(h.renderer.root), /Bimestre 30|Estado confirmado mediante recarga/);
  });
});

test('a delayed reload after POST cannot replace the list of another period', async () => {
  const oldReload = deferred<Bimester[]>(); let reads = 0;
  await view({ getBimesters: async period => period === 30 && ++reads === 2 ? oldReload.promise : [bimester(period, 'PLANIFICADO', period)], openBimester: async () => bimester(30, 'ABIERTO') }, async h => {
    await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
    await h.period('31');
    await act(async () => { oldReload.resolve([bimester(30, 'ABIERTO')]); await oldReload.promise; });
    assert.match(text(h.renderer.root), /Bimestre 31/); assert.doesNotMatch(text(h.renderer.root), /Bimestre 30|Estado confirmado mediante recarga/);
  });
});

test('changing the period input format still invalidates an outstanding read', async () => {
  const oldRead = deferred<Bimester[]>(); let reads = 0;
  await view({ getBimesters: async () => ++reads === 1 ? oldRead.promise : [bimester()] }, async h => {
    await h.period('30.0');
    await act(async () => { oldRead.resolve([bimester(2)]); await oldRead.promise; });
    assert.equal(reads, 2); assert.match(text(h.renderer.root), /Bimestre 1/);
    assert.doesNotMatch(text(h.renderer.root), /Cargando bimestres|Bimestre 2/);
  });
});
