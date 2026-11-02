import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import MaterialesGestionDialog from '../feature/admin/vistas/(academico)/secciones/MaterialesGestionDialog';
import DetalleSeccion from '../feature/admin/vistas/(academico)/secciones/detalleSeccion';
import { AuthContext } from '../src/contexts/AuthContext';
import { DOWNLOAD_POPUP_BLOCKED_MESSAGE } from '../src/lib/classMaterialsContract';
import {
  MANAGEMENT_MATERIALS_EMPTY_MESSAGE, managementMaterialsErrorMessage, managementMaterialsRequireReload, managementMaterialsService,
} from '../src/services/admin/managementMaterialsService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import httpClient from '../src/services/httpClient';
import type { SectionCourseResponse } from '../src/types/sectionCourseApi';
import type { ClassMaterial } from '../src/types/teacherMaterialsApi';

// Management class materials: read-only. Synthetic data, no network or Storage.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const BASE = '/v1/management/section-courses/10/materials';
const SIGNED = 'https://storage.example.test/signed/guia-1.pdf?token=secret';
const relation: SectionCourseResponse = { id: 10, sectionId: 7, courseId: 3, courseCode: 'MAT', courseName: 'Matemática', active: true, teacherId: 30, teacherName: 'Docente Ejemplo' };
const material = (id = 1, over: Partial<ClassMaterial> = {}): ClassMaterial => ({
  id, sectionCourseId: 10, authorTeacherId: 30, authorTeacherName: 'Docente Ejemplo', title: `Guía ${id}`, description: null, status: 'PUBLICADO',
  createdAt: '2026-10-28T15:00:00Z', publishedAt: '2026-10-28T15:00:00Z', withdrawnAt: null, withdrawnByUserId: null, withdrawalReason: null,
  file: { originalName: `guia-${id}.pdf`, mimeType: 'application/pdf', sizeBytes: 1024 }, ...over,
});
const withdrawn = (id = 2) => material(id, { status: 'RETIRADO', withdrawnAt: '2026-10-29T15:00:00Z', withdrawnByUserId: 7, withdrawalReason: 'Versión desactualizada' });

type Reply = { status: number; data: unknown } | 'network';
type Call = { method: string; url: string; data: unknown };
async function withHttp(handler: (call: Call) => Reply | Promise<Reply>, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call: Call = { method: String(config.method).toUpperCase(), url: String(config.url), data: config.data };
    calls.push(call);
    const reply = await handler(call);
    if (reply === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, response);
    return response;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}
const httpError = (status: number | undefined, code?: string) => new AxiosError('PRIVATE', 'ERR_TEST', undefined, undefined,
  status === undefined ? undefined : { status, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR', ...(code ? { code } : {}) } } as AxiosResponse);
const coded = (status: number, code: string) => ({ status, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR', code } });

function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

// Fake browser tab: records open/replace/close in order; `blocked` makes window.open return null.
type Tabs = { blocked: boolean; events: unknown[][]; openers: unknown[] };
function withDom(state: Tabs) {
  const globals = ['self', 'window', 'document', 'HTMLElement', 'localStorage'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  const open = (url: string, target: string) => {
    state.events.push(['open', url, target]);
    if (state.blocked) return null;
    const tab = { opener: 'this page' as unknown, location: { replace: (next: string) => { state.events.push(['replace', next]); } }, close: () => { state.events.push(['close']); } };
    queueMicrotask(() => state.openers.push(tab.opener));
    return tab;
  };
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { open, addEventListener() {}, removeEventListener() {} } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null, setItem() {}, removeItem() {} } });
  return { Element, restore: () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } } };
}

type View = { root: ReactTestInstance; body: () => string; button: (label: string) => ReactTestInstance | undefined; tabs: Tabs };
async function renderDialog(run: (view: View) => Promise<void>, options: { blocked?: boolean } = {}) {
  const tabs: Tabs = { blocked: !!options.blocked, events: [], openers: [] };
  const dom = withDom(tabs);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<MaterialesGestionDialog relation={relation} sectionLabel="Sección A • 3° grado" onClose={() => {}} />, { createNodeMock: () => new dom.Element() }); });
    const root = renderer.root;
    await run({ root, body: () => text(root), tabs, button: label => root.findAllByType('button').find(b => b.props['aria-label'] === label || text(b) === label) });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    dom.restore();
  }
}

test('service: management routes, strict parsing and download URL without body', async () => {
  await withHttp(call => call.method === 'GET' ? { status: 200, data: [material(1), withdrawn(2)] } : { status: 200, data: { url: SIGNED, expiresInSeconds: 300 } }, async calls => {
    assert.deepEqual(await managementMaterialsService.list(10), [material(1), withdrawn(2)]);
    assert.deepEqual(await managementMaterialsService.downloadUrl(10, 1), { url: SIGNED, expiresInSeconds: 300 });
    assert.deepEqual(calls.map(c => [c.method, c.url, c.data]), [['GET', BASE, undefined], ['POST', `${BASE}/1/download-url`, undefined]]);
  });
  for (const body of [[material(1, { sectionCourseId: 11 })], [material(1), material(1)], [material(1, { status: 'RETIRADO' })], { items: [] }]) {
    await withHttp(() => ({ status: 200, data: body }), async () => {
      await assert.rejects(managementMaterialsService.list(10), /no coincide con el contrato/);
    });
  }
  await withHttp(() => ({ status: 200, data: { url: 'javascript:alert(1)', expiresInSeconds: 300 } }), async () => {
    await assert.rejects(managementMaterialsService.downloadUrl(10, 1), /no coincide con el contrato/);
  });
});

test('error messages: codes only with their contract status, sanitized, and which ones reload', () => {
  assert.equal(managementMaterialsErrorMessage(httpError(409, 'MATERIAL_WITHDRAWN'), 'download'), 'El material fue retirado. Se actualizó el listado.');
  assert.equal(managementMaterialsErrorMessage(httpError(503, 'FILE_STORAGE_UNAVAILABLE'), 'download'), 'El almacenamiento de archivos no está disponible. Intenta más tarde.');
  assert.equal(managementMaterialsErrorMessage(httpError(404, 'MATERIAL_CONTEXT_UNAVAILABLE'), 'list'), 'Material o curso no disponible.');
  assert.equal(managementMaterialsErrorMessage(httpError(404, 'FILE_NOT_FOUND'), 'download'), 'El archivo del material ya no está disponible. Se actualizó el listado.');
  // MATERIAL_WITHDRAWN only counts with 409.
  assert.equal(managementMaterialsErrorMessage(httpError(500, 'MATERIAL_WITHDRAWN'), 'download'), 'No se pudo completar la operación. Intenta nuevamente.');
  assert.equal(managementMaterialsRequireReload(httpError(500, 'MATERIAL_WITHDRAWN')), false);
  assert.equal(managementMaterialsRequireReload(httpError(409, 'MATERIAL_WITHDRAWN')), true);
  assert.match(managementMaterialsErrorMessage(httpError(403), 'list'), /No tienes permiso/);
  assert.match(managementMaterialsErrorMessage(httpError(401), 'download'), /sesión ha expirado/);
  assert.match(managementMaterialsErrorMessage(httpError(undefined), 'list'), /conectar con el servidor/);
  for (const status of [400, 401, 403, 404, 409, 500, 503]) for (const action of ['list', 'download'] as const) assert.doesNotMatch(managementMaterialsErrorMessage(httpError(status), action), /DETALLE INTERNO/);
});

test('read-only list: status, withdrawal reason, download only for published, no publish or withdraw', async () => {
  await withHttp(() => ({ status: 200, data: [material(1), withdrawn(2)] }), async () => {
    await renderDialog(async view => {
      const body = view.body();
      assert.match(body, /Guía 1.*Publicado/); assert.match(body, /Guía 2.*Retirado/);
      assert.match(body, /Motivo: Versión desactualizada/);
      assert.ok(view.button('Descargar Guía 1'));
      assert.equal(view.button('Descargar Guía 2'), undefined);
      for (const label of ['Retirar Guía 1', 'Publicar material', 'Retirar']) assert.equal(view.button(label), undefined, label);
      assert.equal(view.root.findAll(n => n.type === 'input' || n.type === 'textarea' || n.type === 'form').length, 0);
    });
  });
  await withHttp(() => ({ status: 200, data: [] }), async () => {
    await renderDialog(async view => { assert.match(view.body(), new RegExp(MANAGEMENT_MATERIALS_EMPTY_MESSAGE.replace('.', '\\.'))); });
  });
});

test('download opens the tab synchronously, then replaces it with the signed URL; the URL is never shown', async () => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await withHttp(async call => {
    if (call.method === 'POST') { await gate; return { status: 200, data: { url: SIGNED, expiresInSeconds: 300 } }; }
    return { status: 200, data: [material(1)] };
  }, async calls => {
    await renderDialog(async view => {
      await act(async () => { view.button('Descargar Guía 1')!.props.onClick(); });
      assert.deepEqual(view.tabs.events, [['open', '', '_blank']], 'la pestaña se abre en el clic, antes de la respuesta');
      assert.equal(view.button('Descargar Guía 1')?.props.disabled, true);
      await act(async () => { release(); });
      assert.deepEqual(view.tabs.events, [['open', '', '_blank'], ['replace', SIGNED]]);
      assert.deepEqual(view.tabs.openers, [null]);
      assert.doesNotMatch(view.body(), /storage\.example|token/);
      assert.equal(calls.filter(c => c.method === 'POST').length, 1);
    });
  });
});

test('download failures close the tab; a withdrawn material (409) reloads; a blocked pop-up requests nothing', async () => {
  for (const [reply, expected, gets] of [
    [coded(409, 'MATERIAL_WITHDRAWN'), 'El material fue retirado. Se actualizó el listado.', 2],
    [coded(503, 'FILE_STORAGE_UNAVAILABLE'), 'El almacenamiento de archivos no está disponible. Intenta más tarde.', 1],
    [{ status: 200, data: { url: 'ftp://storage.example.test/x', expiresInSeconds: 300 } }, 'La respuesta de materiales no coincide con el contrato.', 1],
    ['network', 'No se pudo conectar con el servidor. Intenta nuevamente.', 1],
  ] as const) {
    await withHttp(call => call.method === 'POST' ? reply : { status: 200, data: [material(1)] }, async calls => {
      await renderDialog(async view => {
        await act(async () => { view.button('Descargar Guía 1')!.props.onClick(); });
        assert.deepEqual(view.tabs.events, [['open', '', '_blank'], ['close']]);
        assert.ok(view.body().includes(expected), view.body());
        assert.doesNotMatch(view.body(), /DETALLE INTERNO/);
        assert.equal(calls.filter(c => c.method === 'GET').length, gets);
      });
    });
  }
  await withHttp(() => ({ status: 200, data: [material(1)] }), async calls => {
    await renderDialog(async view => {
      await act(async () => { view.button('Descargar Guía 1')!.props.onClick(); });
      assert.match(view.body(), new RegExp(DOWNLOAD_POPUP_BLOCKED_MESSAGE));
      assert.equal(calls.filter(c => c.method === 'POST').length, 0);
    }, { blocked: true });
  });
});

test('list errors are sanitized and retried', async () => {
  let fail = true;
  await withHttp(() => fail ? coded(404, 'MATERIAL_CONTEXT_UNAVAILABLE') : { status: 200, data: [material(1)] }, async () => {
    await renderDialog(async view => {
      assert.match(view.body(), /Material o curso no disponible\./); assert.doesNotMatch(view.body(), /DETALLE INTERNO/);
      fail = false;
      await act(async () => { view.button('Reintentar')!.props.onClick(); });
      assert.match(view.body(), /Guía 1/);
    });
  });
});

test('section detail offers "Materiales" to ADMINISTRADOR and DIRECTIVO on active courses only', async () => {
  const old = { getById: sectionsService.getById, list: sectionCoursesService.list };
  sectionsService.getById = async () => ({ id: 7, academicPeriodId: 1, level: 'SECONDARY', grade: 3, name: 'A', maxCapacity: 30, enrollmentOpen: true, active: true });
  sectionCoursesService.list = async () => [relation, { ...relation, id: 11, courseName: 'Arte', active: false }];
  try {
    for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
      await withHttp(() => ({ status: 200, data: [material(1)] }), async calls => {
        const dom = withDom({ blocked: false, events: [], openers: [] });
        let renderer!: ReactTestRenderer;
        try {
          await act(async () => {
            renderer = create(<AuthContext.Provider value={auth(role)}><PathParamsContext.Provider value={{ sectionId: '7' }}><DetalleSeccion /></PathParamsContext.Provider></AuthContext.Provider>,
              { createNodeMock: () => new dom.Element() });
          });
          const buttons = renderer.root.findAllByType('button').filter(b => text(b) === 'Materiales');
          assert.equal(buttons.length, 1, `${role}: solo el curso activo`);
          assert.equal(buttons[0].props['aria-label'], 'Materiales de Matemática');
          await act(async () => { buttons[0].props.onClick(); });
          assert.deepEqual(calls.map(c => c.url), [BASE]);
          assert.match(text(renderer.root), /Materiales del curso/);
          assert.ok(renderer.root.findAllByType('button').some(b => b.props['aria-label'] === 'Descargar Guía 1'));
        } finally {
          if (renderer) await act(async () => { renderer.unmount(); });
          dom.restore();
        }
      });
    }
  } finally { sectionsService.getById = old.getById; sectionCoursesService.list = old.list; }
});
