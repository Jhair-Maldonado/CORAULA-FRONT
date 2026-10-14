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
  confirm: () => Promise<void>;
}) => Promise<void>, initialQuery = true) {
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
    await act(async () => { renderer = create(<React.StrictMode><VistaBimestres /></React.StrictMode>, { createNodeMock: () => new Element() }); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    const period = async (value: string) => { await act(async () => { renderer.root.findAllByType('input')[0].props.onChange({ target: { value } }); }); };
    const confirm = async () => { await act(async () => { renderer.root.findByProps({ 'aria-label': 'Consulta de bimestres' }).props.onSubmit({ preventDefault() {} }); }); };
    if (initialQuery) { await period('30'); await confirm(); }
    await run({ renderer, button, period, confirm, click: async name => { const node = button(name); assert.ok(node); assert.equal(!!node.props.disabled, false); await act(async () => {
      if (node.props.type === 'submit') renderer.root.findByProps({ 'aria-label': 'Consulta de bimestres' }).props.onSubmit({ preventDefault() {} });
      else node.props.onClick();
    }); } });
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

test('pending opening prevents context changes even through a captured input handler', async () => {
  const pending = deferred<Bimester>();
  await view({ getBimesters: async period => [bimester(period, period === 30 ? 'PLANIFICADO' : 'CERRADO', period)], openBimester: async () => pending.promise }, async h => {
    await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
    await h.period('31');
    assert.equal(h.renderer.root.findAllByType('input')[0].props.value, '30');
    await act(async () => { pending.resolve(bimester(30, 'ABIERTO')); await pending.promise; });
    await h.period('31'); await h.confirm();
    assert.match(text(h.renderer.root), /Bimestre 31/); assert.doesNotMatch(text(h.renderer.root), /Bimestre 30|Estado confirmado mediante recarga/);
  });
});

test('context stays locked through the mandatory reload after opening', async () => {
  const oldReload = deferred<Bimester[]>(); let reads = 0;
  await view({ getBimesters: async period => period === 30 && ++reads === 2 ? oldReload.promise : [bimester(period, 'PLANIFICADO', period)], openBimester: async () => bimester(30, 'ABIERTO') }, async h => {
    await h.click('Abrir bimestre'); await h.click('Confirmar apertura');
    await h.period('31');
    assert.equal(h.renderer.root.findAllByType('input')[0].props.value, '30');
    assert.equal(h.button('Consultar bimestres')?.props.disabled, true);
    await act(async () => { oldReload.resolve([bimester(30, 'ABIERTO')]); await oldReload.promise; });
    await h.period('31'); await h.confirm();
    assert.match(text(h.renderer.root), /Bimestre 31/); assert.doesNotMatch(text(h.renderer.root), /Bimestre 30|Estado confirmado mediante recarga/);
  });
});

test('changing the period input format still invalidates an outstanding read', async () => {
  const oldRead = deferred<Bimester[]>(); let reads = 0;
  await view({ getBimesters: async () => ++reads === 1 ? oldRead.promise : [bimester()] }, async h => {
    await h.period('30.0');
    await act(async () => { oldRead.resolve([bimester(2)]); await oldRead.promise; });
    assert.equal(reads, 1);
    assert.equal(h.button('Actualizar')?.props.disabled, true);
    await h.confirm();
    assert.equal(reads, 1); assert.match(text(h.renderer.root), /entero positivo seguro/);
    assert.doesNotMatch(text(h.renderer.root), /Cargando bimestres|Bimestre 2/);
  });
});

test('typing 5 then 55 sends no GET; button and Enter each confirm exactly one query', async () => {
  const calls: number[] = [];
  await view({ getBimesters: async id => { calls.push(id); return [bimester(1, 'PLANIFICADO', id)]; } }, async h => {
    await h.period('5'); await h.period('55');
    assert.deepEqual(calls, []); assert.equal(h.button('Actualizar')?.props.disabled, true);
    await h.click('Consultar bimestres'); assert.deepEqual(calls, [55]);
    await h.period('56'); assert.deepEqual(calls, [55]);
    await h.confirm(); assert.deepEqual(calls, [55, 56]);
    await h.click('Actualizar'); assert.deepEqual(calls, [55, 56, 56]);
  }, false);
});

test('empty, decimal, negative, unsafe and malformed period IDs never send requests', async () => {
  let reads = 0;
  await view({ getBimesters: async () => { reads++; return []; } }, async h => {
    for (const id of ['', ' ', '0', '-1', '1.5', '30.0', 'NaN', 'Infinity', 'abc', '1e2', '9007199254740992']) {
      await h.period(id); await h.confirm();
      assert.match(text(h.renderer.root), /entero positivo seguro/);
      assert.equal(h.renderer.root.findAllByType('input')[0].props['aria-invalid'], true);
    }
    assert.equal(reads, 0);
  }, false);
});

test('double submission and refresh callbacks do not duplicate the pending read', async () => {
  const pending = deferred<Bimester[]>(); let reads = 0;
  await view({ getBimesters: async () => { reads++; return pending.promise; } }, async h => {
    await h.period('55');
    const submit = h.renderer.root.findByProps({ 'aria-label': 'Consulta de bimestres' }).props.onSubmit;
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
    assert.equal(reads, 1);
    await h.confirm(); assert.equal(reads, 1);
    await act(async () => { pending.resolve([]); });
    const refresh = h.button('Actualizar')!.props.onClick;
    await act(async () => { refresh(); refresh(); });
    assert.equal(reads, 2);
  }, false);
});

test('editing the input hides results, cancels forms and blocks captured actions until confirmation', async () => {
  let reads = 0, writes = 0;
  await view({ getBimesters: async id => { reads++; return [bimester(1, 'PLANIFICADO', id)]; }, createBimester: async () => { writes++; return bimester(); } }, async h => {
    const edit = h.button('Editar')!.props.onClick, refresh = h.button('Actualizar')!.props.onClick;
    await h.click('Crear bimestre');
    const save = h.renderer.root.findAllByType('form')[1].props.onSubmit;
    await h.period('55');
    await act(async () => { refresh(); edit(); await save({ preventDefault() {} }); });
    assert.equal(reads, 1); assert.equal(writes, 0);
    assert.equal(h.renderer.root.findAllByType('form').length, 1);
    assert.doesNotMatch(text(h.renderer.root), /Bimestre 1/);
    assert.equal(h.button('Crear bimestre')?.props.disabled, true);
    assert.equal(h.button('Actualizar')?.props.disabled, true);
    assert.equal(h.button('Editar'), undefined); assert.equal(h.button('Abrir bimestre'), undefined);
    await h.confirm(); assert.equal(reads, 2);
  });
});

test('late reads cannot restore a previous context, including returning to the same period', async () => {
  const first = deferred<Bimester[]>(), second = deferred<Bimester[]>(); let reads = 0;
  await view({ getBimesters: async id => ++reads === 1 ? first.promise : reads === 2 ? second.promise : [bimester(3, 'PLANIFICADO', id)] }, async h => {
    await h.period('31'); await h.confirm();
    await h.period('30'); await h.confirm();
    assert.equal(reads, 3); assert.match(text(h.renderer.root), /Bimestre 3/);
    await act(async () => { second.resolve([bimester(2, 'PLANIFICADO', 31)]); first.resolve([bimester(1)]); });
    assert.match(text(h.renderer.root), /Bimestre 3/);
    assert.doesNotMatch(text(h.renderer.root), /Bimestre 1|Bimestre 2/);
  });
});

test('a confirmed period 404 is shown and allows another explicit query', async () => {
  const calls: number[] = [];
  const missing = httpError(404);
  missing.response!.data = { message: 'Periodo academico no encontrado' };
  await view({ getBimesters: async id => { calls.push(id); if (calls.length === 1) throw missing; return []; } }, async h => {
    assert.ok(h.renderer.root.findAllByProps({ role: 'alert' }).length);
    assert.match(text(h.renderer.root), /Periodo academico no encontrado/);
    assert.equal(h.button('Crear bimestre')?.props.disabled, true);
    await h.click('Consultar bimestres');
    assert.deepEqual(calls, [30, 30]); assert.match(text(h.renderer.root), /No hay bimestres/);
  });
});

test('creation and editing keep the confirmed context locked until the write resolves', async () => {
  for (const editing of [false, true]) {
    const pending = deferred<Bimester>(); const writes: unknown[] = [], reads: number[] = [];
    await view({ getBimesters: async id => { reads.push(id); return [bimester()]; },
      createBimester: async (id, data) => { writes.push([id, data]); return pending.promise; },
      updateBimester: async (id, data) => { writes.push([id, data]); return pending.promise; }
    }, async h => {
      await h.click(editing ? 'Editar' : 'Crear bimestre');
      const name = h.renderer.root.findAllByType('input').find(n => n.props.maxLength === 100)!;
      await act(async () => { name.props.onChange({ target: { value: 'Configuración' } }); });
      const save = h.renderer.root.findAllByType('form')[1].props.onSubmit;
      await act(async () => { void save({ preventDefault() {} }); void save({ preventDefault() {} }); });
      assert.equal(writes.length, 1); assert.equal((writes[0] as unknown[])[0], editing ? 1 : 30);
      assert.equal(h.button('Consultar bimestres')?.props.disabled, true);
      assert.equal(h.button('Actualizar')?.props.disabled, true);
      await h.period('55'); await h.confirm();
      assert.equal(h.renderer.root.findAllByType('input')[0].props.value, '30');
      assert.deepEqual(reads, [30]);
      await act(async () => { pending.resolve(bimester()); });
      assert.deepEqual(reads, [30, 30]); assert.equal(writes.length, 1);
      assert.equal(h.renderer.root.findAllByType('form').length, 1);
    });
  }
});
