import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import MaterialesDocente from '../feature/docente/vistas/cursos/MaterialesDocente';
import * as materials from '../src/services/teacher/teacherMaterialsService';
import {
  MATERIAL_ACCEPT, MATERIAL_MAX_BYTES, TEACHER_MATERIALS_ERROR_CODES, isUncertainPublish, materialFileError, materialsRequireReload, openPendingDownloadTab, DOWNLOAD_POPUP_BLOCKED_MESSAGE,
  parseClassMaterial, parseClassMaterials, parseDownloadUrl, teacherMaterialsErrorCode, teacherMaterialsErrorMessage, teacherMaterialsService,
  withdrawalReasonError,
} from '../src/services/teacher/teacherMaterialsService';
import httpClient from '../src/services/httpClient';
import type { ClassMaterial } from '../src/types/teacherMaterialsApi';

// Unit/component mocks only: no network, Storage or shared database. Synthetic data.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const material = (id = 1, over: Partial<ClassMaterial> = {}): ClassMaterial => ({
  id, sectionCourseId: 10, authorTeacherId: 30, authorTeacherName: 'Docente Ejemplo', title: `Guía ${id}`, description: null, status: 'PUBLICADO',
  createdAt: '2026-10-28T15:00:00Z', publishedAt: '2026-10-28T15:00:00Z', withdrawnAt: null, withdrawnByUserId: null, withdrawalReason: null,
  file: { originalName: `guia-${id}.pdf`, mimeType: PDF, sizeBytes: 1024 }, ...over,
});
const withdrawn = (id = 1) => material(id, { status: 'RETIRADO', withdrawnAt: '2026-10-29T15:00:00Z', withdrawnByUserId: 7, withdrawalReason: 'Versión desactualizada' });
const file = (name = 'guia.pdf', size = 1024, type = PDF) => new File([new Uint8Array(size)], name, { type });
const base = '/v1/teacher/courses/10/materials';

const httpError = (status?: number, data: unknown = { error: 'X', message: 'secret detail' }) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data } as AxiosResponse : undefined);
const coded = (status: number, code: string) => httpError(status, { error: 'X', message: 'secret detail', code });

type Reply = { status?: number; data: unknown };
type Call = { method?: string; url?: string; data: unknown; contentType: unknown };
async function withAdapter(route: (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async config => {
    calls.push({ method: config.method, url: config.url, data: config.data, contentType: config.headers.getContentType() });
    const reply = await route(config);
    const status = reply.status ?? 200;
    const response = { config, data: reply.data, status, statusText: String(status), headers: {} } as AxiosResponse;
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, response);
    return response;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
// Fake browser tab: records open/replace/close in order; `blocked` makes window.open return null like a pop-up blocker.
type FakeTab = { opener: unknown; location: { replace(url: string): void }; close(): void };
type Tabs = { blocked: boolean; events: unknown[][]; tabs: FakeTab[] };
function fakeOpen(state: Tabs) {
  return (url: string, target: string): FakeTab | null => {
    state.events.push(['open', url, target]);
    if (state.blocked) return null;
    const tab: FakeTab = { opener: 'this page', location: { replace: next => { state.events.push(['replace', next]); } }, close: () => { state.events.push(['close']); } };
    state.tabs.push(tab);
    return tab;
  };
}
function withDom(state: Tabs) {
  const globals = ['window', 'document', 'localStorage'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { style: {} } } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, open: fakeOpen(state) } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  return () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete (globalThis as Record<string, unknown>)[name]; } };
}

// ---------- Service ----------

test('file rules come from the backend: PDF/DOCX/PPTX, 1 byte to 15 MiB, names up to 255 characters', () => {
  assert.equal(MATERIAL_MAX_BYTES, 15_728_640);
  assert.equal(MATERIAL_ACCEPT, `.pdf,${PDF},.docx,${DOCX},.pptx,${PPTX}`);
  for (const ok of [file('a.pdf'), file('b.DOCX', 1, DOCX), file('c.pptx', MATERIAL_MAX_BYTES, PPTX), file('d.pdf', 1, ''), file('e.pdf', 1, 'application/octet-stream')])
    assert.equal(materialFileError(ok), null, ok.name);
  const cases: [Pick<File, 'name' | 'size' | 'type'> | null, RegExp][] = [
    [null, /Selecciona un archivo/], [file('a.doc', 1, 'application/msword'), /Formato no permitido/], [file('a.xlsx'), /Formato no permitido/],
    [file('a.zip'), /Formato no permitido/], [file('sin-extension'), /Formato no permitido/], [file('a.pdf', 1, 'image/png'), /no coincide/],
    [file('a.pdf', 0), /vacío/], [{ name: 'a.pdf', size: MATERIAL_MAX_BYTES + 1, type: PDF }, /15 MB/],
    [{ name: `${'x'.repeat(252)}.pdf`, size: 1, type: PDF }, /nombre/], [{ name: 'a\u0001.pdf', size: 1, type: PDF }, /nombre/], [{ name: '  ', size: 1, type: PDF }, /nombre/],
  ];
  for (const [value, expected] of cases) assert.match(materialFileError(value) ?? '', expected, value?.name ?? 'null');
  assert.equal(withdrawalReasonError(' '), 'Indica el motivo del retiro.');
  assert.equal(withdrawalReasonError('x'.repeat(1000)), null);
  assert.match(withdrawalReasonError('x'.repeat(1001)) ?? '', /hasta 1000/);
});

test('publish sends multipart FormData without a manual Content-Type and expects 201 with the published material', async () => {
  await withAdapter(() => ({ status: 201, data: material(5, { title: 'Guía', description: 'Lectura' }) }), async calls => {
    const upload = file('guia.pdf');
    const saved = await teacherMaterialsService.publish(10, { title: '  Guía ', description: ' Lectura ', file: upload });
    assert.equal(saved.id, 5);
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.method, 'post'); assert.equal(call.url, base);
    assert.ok(call.data instanceof FormData);
    const form = call.data as FormData;
    assert.deepEqual([...form.keys()], ['title', 'description', 'file']);
    assert.equal(form.get('title'), 'Guía'); assert.equal(form.get('description'), 'Lectura');
    assert.equal((form.get('file') as File).name, 'guia.pdf');
    assert.ok(!String(call.contentType ?? '').includes('application/json'), 'no JSON default');
    assert.ok(!String(call.contentType ?? '').includes('boundary'), 'no manual boundary');
  });
  await withAdapter(() => ({ status: 201, data: material(6, { title: 'Guía' }) }), async calls => {
    await teacherMaterialsService.publish(10, { title: 'Guía', description: '   ', file: file() });
    assert.deepEqual([...(calls[0].data as FormData).keys()], ['title', 'file']);
  });
  for (const reply of [{ status: 200, data: material(1, { title: 'Guía' }) }, { status: 201, data: withdrawn() }, { status: 201, data: material(1, { title: 'Otro' }) }, { status: 201, data: material(1, { sectionCourseId: 11 }) }]) {
    await withAdapter(() => reply, async () => { await assert.rejects(teacherMaterialsService.publish(10, { title: 'Guía', file: file() }), Error, JSON.stringify(reply).slice(0, 80)); });
  }
});

test('invalid publish, withdraw or ids never reach the network', async () => {
  await withAdapter(() => ({ data: null }), async calls => {
    await assert.rejects(teacherMaterialsService.publish(10, { title: ' ', file: file() }), /título/);
    await assert.rejects(teacherMaterialsService.publish(10, { title: 'x'.repeat(256), file: file() }), /255/);
    await assert.rejects(teacherMaterialsService.publish(10, { title: 'Guía', description: 'x'.repeat(2001), file: file() }), /2000/);
    await assert.rejects(teacherMaterialsService.publish(10, { title: 'Guía', file: file('a.zip') }), /Formato/);
    await assert.rejects(teacherMaterialsService.withdraw(10, 1, ''), /motivo/);
    for (const id of [0, -1, 1.5]) {
      await assert.rejects(teacherMaterialsService.list(id), /no son válidos/);
      await assert.rejects(teacherMaterialsService.withdraw(10, id, 'Motivo'), /no son válidos/);
      await assert.rejects(teacherMaterialsService.downloadUrl(10, id), /no son válidos/);
    }
    assert.equal(calls.length, 0);
  });
});

test('list, withdraw and download-url use their routes and bodies; responses are validated', async () => {
  await withAdapter(config => {
    if (config.url === base) return { data: [material(2), withdrawn(1)] };
    if (config.url === `${base}/2/withdraw`) return { data: withdrawn(2) };
    return { data: { url: 'https://storage.example/signed?token=abc', expiresInSeconds: 300 } };
  }, async calls => {
    assert.deepEqual(await teacherMaterialsService.list(10), [material(2), withdrawn(1)]);
    assert.equal((await teacherMaterialsService.withdraw(10, 2, '  Versión desactualizada ')).status, 'RETIRADO');
    assert.deepEqual(await teacherMaterialsService.downloadUrl(10, 2), { url: 'https://storage.example/signed?token=abc', expiresInSeconds: 300 });
    assert.deepEqual(calls.map(c => [c.method, c.url]), [['get', base], ['post', `${base}/2/withdraw`], ['post', `${base}/2/download-url`]]);
    assert.deepEqual(JSON.parse(String(calls[1].data)), { reason: 'Versión desactualizada' });
    assert.equal(calls[2].data, undefined);
  });
  const bad: unknown[] = [
    material(1, { sectionCourseId: 11 }), { ...material(), status: 'BORRADOR' }, { ...material(), withdrawnAt: '2026-10-29T15:00:00Z' },
    { ...withdrawn(), withdrawalReason: null }, { ...withdrawn(), withdrawnByUserId: null }, { ...material(), file: { originalName: 'a.zip', mimeType: 'application/zip', sizeBytes: 1 } },
    { ...material(), file: { originalName: 'a.pdf', mimeType: PDF, sizeBytes: 0 } }, { ...material(), file: { originalName: 'a.pdf', mimeType: PDF, sizeBytes: MATERIAL_MAX_BYTES + 1 } },
    { ...material(), title: ' ' }, { ...material(), description: '' }, { ...material(), publishedAt: 'ayer' }, { ...material(), file: null }, null,
  ];
  for (const value of bad) assert.throws(() => parseClassMaterial(value, 10), Error, JSON.stringify(value).slice(0, 100));
  assert.throws(() => parseClassMaterials([material(1), material(1)], 10));
  assert.throws(() => parseClassMaterials({}, 10));
  for (const value of [{ url: 'javascript:alert(1)', expiresInSeconds: 300 }, { url: 'not a url', expiresInSeconds: 300 }, { url: 'https://x', expiresInSeconds: 0 }, { url: 1 }])
    assert.throws(() => parseDownloadUrl(value), Error, JSON.stringify(value));
});

test('error catalog: contract codes only with their status; storage and uncertain publishes never look like success', () => {
  const contract: Record<string, number> = { VALIDATION_ERROR: 400, FILE_EMPTY: 400, FILE_TOO_LARGE: 400, FILE_NAME_INVALID: 400, FILE_TYPE_NOT_ALLOWED: 400,
    FILE_NOT_FOUND: 404, MATERIAL_CONTEXT_UNAVAILABLE: 404, MATERIAL_WITHDRAWN: 409, MATERIAL_METHOD_NOT_ALLOWED: 405, MATERIAL_INTERNAL_ERROR: 500, FILE_STORAGE_UNAVAILABLE: 503 };
  assert.deepEqual([...TEACHER_MATERIALS_ERROR_CODES].sort(), Object.keys(contract).sort());
  for (const [code, status] of Object.entries(contract)) {
    for (const other of [400, 404, 405, 409, 500, 503]) assert.equal(teacherMaterialsErrorCode(coded(other, code)), other === status ? code : null, `${code} ${other}`);
    for (const action of ['list', 'publish', 'withdraw', 'download'] as const) assert.doesNotMatch(teacherMaterialsErrorMessage(coded(status, code), action), /secret|PRIVATE|publicado\./);
  }
  assert.equal(teacherMaterialsErrorCode(httpError(403)), null);
  assert.equal(teacherMaterialsErrorMessage(coded(503, 'FILE_STORAGE_UNAVAILABLE'), 'publish'), 'El almacenamiento de archivos no está disponible. El material no se publicó.');
  assert.match(teacherMaterialsErrorMessage(coded(500, 'MATERIAL_INTERNAL_ERROR'), 'publish'), /no confirmó la publicación/);
  assert.match(teacherMaterialsErrorMessage(coded(400, 'FILE_TOO_LARGE'), 'publish'), /15 MB/);
  assert.match(teacherMaterialsErrorMessage(coded(400, 'FILE_TYPE_NOT_ALLOWED'), 'publish'), /PDF, Word \(\.docx\) o PowerPoint \(\.pptx\)/);
  assert.match(teacherMaterialsErrorMessage(coded(409, 'MATERIAL_WITHDRAWN'), 'download'), /ya fue retirado/);
  assert.match(teacherMaterialsErrorMessage(httpError(403), 'list'), /No tienes permiso/);
  assert.match(teacherMaterialsErrorMessage(httpError(), 'publish'), /Revisa el listado/);
  for (const [error, uncertain] of [[httpError(), true], [coded(500, 'MATERIAL_INTERNAL_ERROR'), true], [httpError(502), true], [coded(503, 'FILE_STORAGE_UNAVAILABLE'), false],
    [coded(400, 'FILE_EMPTY'), false], [httpError(403), false], [new Error('x'), false]] as const) assert.equal(isUncertainPublish(error), uncertain);
  for (const [error, reload] of [[coded(409, 'MATERIAL_WITHDRAWN'), true], [coded(404, 'MATERIAL_CONTEXT_UNAVAILABLE'), true], [coded(404, 'FILE_NOT_FOUND'), true],
    [coded(503, 'FILE_STORAGE_UNAVAILABLE'), false], [httpError(403), false]] as const) assert.equal(materialsRequireReload(error), reload);
});

test('the pending tab opens empty in _blank with its opener cut; a blocked pop-up returns null', () => {
  const state: Tabs = { blocked: false, events: [], tabs: [] };
  const tab = openPendingDownloadTab(fakeOpen(state));
  assert.deepEqual(state.events, [['open', '', '_blank']]);
  assert.ok(tab); assert.equal(tab.opener, null);
  assert.equal(openPendingDownloadTab(fakeOpen({ blocked: true, events: [], tabs: [] })), null);
  assert.equal(DOWNLOAD_POPUP_BLOCKED_MESSAGE, 'Tu navegador bloqueó la descarga; permite ventanas emergentes para este sitio');
});

// ---------- View ----------

type View = { renderer: ReactTestRenderer; shown: () => string; button: (name: string) => ReactTestInstance | undefined; byLabel: (label: string) => ReactTestInstance; tabs: Tabs;
  click: (name: string) => Promise<void>; fill: (title: string, upload: File | null) => Promise<void>; publish: () => Promise<void> };
async function render(run: (v: View) => Promise<void>, blocked = false) {
  const tabs: Tabs = { blocked, events: [], tabs: [] };
  const restore = withDom(tabs);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<MaterialesDocente sectionCourseId={10} />); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name || b.props['aria-label'] === name);
    const byLabel = (label: string) => renderer.root.findByProps({ 'aria-label': label });
    await run({ renderer, button, byLabel, tabs, shown: () => text(renderer.root),
      click: async name => { const node = button(name); assert.ok(node, name); assert.equal(!!node.props.disabled, false, name); await act(async () => { node.props.onClick(); }); },
      fill: async (title, upload) => { await act(async () => {
        byLabel('Título del material').props.onChange({ target: { value: title } });
        byLabel('Archivo del material').props.onChange({ target: { files: upload ? [upload] : [] } });
      }); },
      publish: async () => { await act(async () => { byLabel('Publicar material de clase').props.onSubmit({ preventDefault() {} }); }); } });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    restore();
  }
}

test('list shows published and withdrawn materials; withdrawn ones show their reason and no download', async () => {
  await withAdapter(() => ({ data: [material(2, { description: 'Lectura previa', file: { originalName: 'clase.pptx', mimeType: PPTX, sizeBytes: 2 * 1024 * 1024 } }), withdrawn(1)] }), async () => {
    await render(async v => {
      const body = v.shown();
      assert.match(body, /Guía 2/); assert.match(body, /PowerPoint · 2\.0 MB · Docente Ejemplo/); assert.match(body, /Lectura previa/);
      assert.match(body, /Retirado el .*Motivo: Versión desactualizada/);
      assert.ok(v.button('Descargar Guía 2')); assert.ok(v.button('Retirar Guía 2'));
      assert.equal(v.button('Descargar Guía 1'), undefined); assert.equal(v.button('Retirar Guía 1'), undefined);
      assert.doesNotMatch(body, /Módulo en construcción|Simulación/);
    });
  });
});

test('empty list and list errors never show simulated data', async () => {
  await withAdapter(() => ({ data: [] }), async () => { await render(async v => { assert.match(v.shown(), /Este curso aún no tiene materiales publicados/); }); });
  await withAdapter(() => ({ status: 404, data: { error: 'Not Found', message: 'secret', code: 'MATERIAL_CONTEXT_UNAVAILABLE' } }), async () => {
    await render(async v => { assert.match(v.shown(), /Material o curso no disponible para tu cuenta/); assert.doesNotMatch(v.shown(), /secret/); assert.ok(v.button('Reintentar materiales')); });
  });
});

test('upload form: invalid files are shown and never sent; a valid publish adds the server material', async () => {
  let posts = 0;
  await withAdapter(config => {
    if (config.method === 'post') { posts++; return { status: 201, data: material(9, { title: 'Separata 1' }) }; }
    return { data: [] };
  }, async () => {
    await render(async v => {
      assert.equal(v.button('Publicar material')?.props.disabled, true);
      assert.equal(v.byLabel('Archivo del material').props.accept, MATERIAL_ACCEPT);
      await v.fill('Separata 1', file('separata.xlsx'));
      assert.match(v.shown(), /Formato no permitido\. Solo PDF, Word \(\.docx\) o PowerPoint \(\.pptx\)\./);
      assert.equal(v.button('Publicar material')?.props.disabled, true);
      await v.fill('Separata 1', { name: 'grande.pdf', size: MATERIAL_MAX_BYTES + 1, type: PDF } as File);
      assert.match(v.shown(), /El archivo supera el máximo de 15 MB\./);
      await v.publish();
      assert.equal(posts, 0);
      await v.fill('Separata 1', file('separata.pdf'));
      assert.equal(v.button('Publicar material')?.props.disabled, false);
      await v.publish();
      assert.equal(posts, 1);
      assert.match(v.shown(), /Material «Separata 1» publicado/);
      assert.match(v.shown(), /Guía|Separata 1/);
      assert.equal(v.byLabel('Título del material').props.value, '');
    });
  });
});

test('storage unavailable (503) shows the contract error and publishes nothing', async () => {
  await withAdapter(config => config.method === 'post'
    ? { status: 503, data: { error: 'Service Unavailable', message: 'secret', code: 'FILE_STORAGE_UNAVAILABLE' } } : { data: [] }, async () => {
    await render(async v => {
      await v.fill('Separata 1', file()); await v.publish();
      assert.match(v.shown(), /El almacenamiento de archivos no está disponible\. El material no se publicó\./);
      assert.doesNotMatch(v.shown(), /publicado\. Ya está disponible|secret/);
      assert.match(v.shown(), /Este curso aún no tiene materiales publicados/);
      assert.equal(v.button('Publicar material')?.props.disabled, false, 'a definite failure can be retried');
    });
  });
});

test('an unconfirmed publish (500/no answer) reloads the list and blocks a new one until the teacher reviews it', async () => {
  let lists = 0;
  await withAdapter(config => {
    if (config.method === 'post') return { status: 500, data: { error: 'X', message: 'secret', code: 'MATERIAL_INTERNAL_ERROR' } };
    lists++; return { data: [] };
  }, async () => {
    await render(async v => {
      await v.fill('Separata 1', file()); await v.publish();
      assert.equal(lists, 2);
      assert.match(v.shown(), /no confirmó la publicación/); assert.match(v.shown(), /La publicación no está confirmada/);
      assert.equal(v.button('Publicar material')?.props.disabled, true);
      await v.click('Revisé el listado; permitir otra publicación');
      assert.equal(v.button('Publicar material')?.props.disabled, false);
    });
  });
});

test('download opens the tab synchronously in the click, then replaces it with the signed URL; the URL is never shown or logged', async () => {
  const logs: unknown[] = [];
  const original = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
  Object.assign(console, { log: (...a: unknown[]) => logs.push(a), info: (...a: unknown[]) => logs.push(a), warn: (...a: unknown[]) => logs.push(a), error: (...a: unknown[]) => logs.push(a), debug: (...a: unknown[]) => logs.push(a) });
  let answer!: (reply: Reply) => void;
  try {
    await withAdapter(config => config.url?.endsWith('/download-url') ? new Promise<Reply>(resolve => { answer = resolve; }) : { data: [material(2)] }, async calls => {
      await render(async v => {
        const node = v.button('Descargar Guía 2'); assert.ok(node);
        // The tab must exist before any await: open it in the same synchronous click handler.
        act(() => { node.props.onClick(); });
        assert.deepEqual(v.tabs.events, [['open', '', '_blank']]);
        assert.equal(v.tabs.tabs[0].opener, null);
        await act(async () => { await Promise.resolve(); });
        await act(async () => { answer({ data: { url: 'https://storage.example/signed?token=abc', expiresInSeconds: 300 } }); });
        assert.deepEqual(v.tabs.events, [['open', '', '_blank'], ['replace', 'https://storage.example/signed?token=abc']]);
        assert.deepEqual(calls.filter(c => c.method === 'post').map(c => c.url), [`${base}/2/download-url`]);
        assert.doesNotMatch(v.shown(), /token=abc/);
        assert.doesNotMatch(JSON.stringify(v.renderer.toJSON()), /token=abc/);
      });
    });
  } finally { Object.assign(console, original); }
  assert.ok(!JSON.stringify(logs).includes('token=abc'));
});

test('a blocked pop-up (window.open null) shows the blocker message and requests no URL', async () => {
  await withAdapter(() => ({ data: [material(2)] }), async calls => {
    await render(async v => {
      await v.click('Descargar Guía 2');
      assert.deepEqual(v.tabs.events, [['open', '', '_blank']]);
      assert.match(v.shown(), /Tu navegador bloqueó la descarga; permite ventanas emergentes para este sitio/);
      assert.equal(calls.filter(c => c.method === 'post').length, 0);
    }, true);
  });
});

test('download of a material withdrawn meanwhile (409) closes the tab, shows the error and reloads', async () => {
  let lists = 0;
  await withAdapter(config => {
    if (config.url?.endsWith('/download-url')) return { status: 409, data: { error: 'Conflict', message: 'secret', code: 'MATERIAL_WITHDRAWN' } };
    lists++; return { data: [lists === 1 ? material(2) : withdrawn(2)] };
  }, async () => {
    await render(async v => {
      await v.click('Descargar Guía 2');
      assert.deepEqual(v.tabs.events, [['open', '', '_blank'], ['close']]);
      assert.match(v.shown(), /El material ya fue retirado\. Se actualizó el listado\./);
      assert.equal(lists, 2); assert.equal(v.button('Descargar Guía 2'), undefined);
    });
  });
});

test('a URL that is not http/https (or any other failure) closes the tab and is never assigned', async () => {
  for (const reply of [{ data: { url: 'javascript:alert(1)', expiresInSeconds: 300 } }, { status: 503, data: { error: 'X', message: 'secret', code: 'FILE_STORAGE_UNAVAILABLE' } }, { status: 403, data: { error: 'Forbidden', message: 'secret' } }] as Reply[]) {
    await withAdapter(config => config.url?.endsWith('/download-url') ? reply : { data: [material(2)] }, async () => {
      await render(async v => {
        await v.click('Descargar Guía 2');
        assert.deepEqual(v.tabs.events, [['open', '', '_blank'], ['close']], JSON.stringify(reply));
        assert.ok(v.renderer.root.findAll(n => n.props.role === 'alert').length > 0);
        assert.doesNotMatch(v.shown(), /javascript:|secret/);
      });
    });
  }
});

test('withdraw asks for a reason and confirmation, sends it once and shows the withdrawn material', async () => {
  const bodies: unknown[] = [];
  await withAdapter(config => {
    if (config.url?.endsWith('/withdraw')) { bodies.push(JSON.parse(String(config.data))); return { data: { ...withdrawn(2), title: 'Guía 2' } }; }
    return { data: [material(2)] };
  }, async () => {
    await render(async v => {
      await v.click('Retirar Guía 2');
      assert.match(v.shown(), /Retirarás Guía 2\. Los alumnos dejarán de verlo/);
      await act(async () => { v.byLabel('Retiro del material').props.onSubmit({ preventDefault() {} }); });
      assert.match(v.shown(), /Indica el motivo del retiro/); assert.equal(bodies.length, 0);
      await v.click('Cancelar');
      assert.doesNotMatch(v.shown(), /Retirarás/); assert.equal(bodies.length, 0);
      await v.click('Retirar Guía 2');
      await act(async () => { v.byLabel('Motivo del retiro').props.onChange({ target: { value: ' Versión desactualizada ' } }); });
      const submit = v.byLabel('Retiro del material').props.onSubmit;
      await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
      assert.deepEqual(bodies, [{ reason: 'Versión desactualizada' }]);
      assert.match(v.shown(), /Material «Guía 2» retirado/);
      assert.match(v.shown(), /Motivo: Versión desactualizada/);
      assert.equal(v.button('Descargar Guía 2'), undefined);
    });
  });
});

test('withdraw failures: 400 keeps the dialog with the error; 409 closes it and reloads', async () => {
  await withAdapter(config => config.url?.endsWith('/withdraw') ? { status: 400, data: { error: 'Bad Request', message: 'secret', code: 'VALIDATION_ERROR' } } : { data: [material(2)] }, async () => {
    await render(async v => {
      await v.click('Retirar Guía 2');
      await act(async () => { v.byLabel('Motivo del retiro').props.onChange({ target: { value: 'Motivo' } }); });
      await act(async () => { v.byLabel('Retiro del material').props.onSubmit({ preventDefault() {} }); });
      assert.match(v.shown(), /Revisa el motivo del retiro \(1 a 1000 caracteres\)/); assert.match(v.shown(), /Retirarás/);
    });
  });
  let lists = 0;
  await withAdapter(config => {
    if (config.url?.endsWith('/withdraw')) return { status: 409, data: { error: 'Conflict', message: 'secret', code: 'MATERIAL_WITHDRAWN' } };
    lists++; return { data: [lists === 1 ? material(2) : withdrawn(2)] };
  }, async () => {
    await render(async v => {
      await v.click('Retirar Guía 2');
      await act(async () => { v.byLabel('Motivo del retiro').props.onChange({ target: { value: 'Motivo' } }); });
      await act(async () => { v.byLabel('Retiro del material').props.onSubmit({ preventDefault() {} }); });
      assert.doesNotMatch(v.shown(), /Retirarás/); assert.match(v.shown(), /ya fue retirado/); assert.equal(lists, 2);
    });
  });
});

test('the module exports no simulated material helpers', () => {
  assert.equal(Object.keys(materials).some(k => /mock|simulad/i.test(k)), false);
});
