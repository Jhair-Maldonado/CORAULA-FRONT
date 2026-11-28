import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import VistaCatalogoNotasDocente from '../feature/docente/vistas/notas/vistaCatalogoNotasDocente';
import { DocenteSessionProvider } from '../src/app/docente/components/DocenteSessionContext';
import httpClient from '../src/services/httpClient';

// Component evidence only: synthetic data, no network.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;
const teacher = { id: 300, personId: 1, dni: '00000000', firstNames: 'Docente', paternalLastName: 'Prueba', maternalLastName: null, fullName: 'Docente Prueba', phone: null, specialty: null, active: true };
const base = { assignmentId: 1, courseId: 20, weeklyHours: 4, sectionId: 5 };
const courses = [
  { ...base, sectionCourseId: 10, code: 'COM-P3', name: 'Comunicación', level: 'PRIMARY', area: 'Letras', grade: 3, sectionName: 'A', studentCount: 20 },
  { ...base, sectionCourseId: 11, code: 'MAT-S1', name: 'Matemática', level: 'SECONDARY', area: 'Ciencias exactas', grade: 1, sectionName: 'B', studentCount: 15 },
];

type Reply = { status?: number; data: unknown };
async function withCourses(reply: () => Reply, run: (calls: string[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: string[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push(config.url ?? '');
    const r = config.url === '/v1/teacher/me' ? { data: teacher } : reply();
    const status = r.status ?? 200;
    const response = { config, data: r.data, status, statusText: String(status), headers: {} } as AxiosResponse;
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, response);
    return response;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
function withDom() {
  const names = ['window', 'document', 'localStorage', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { style: {} } } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: { setTimeout: () => 0, clearTimeout() {} } });
  return () => { for (const [name, d] of names) { if (d) Object.defineProperty(globalThis, name, d); else delete (globalThis as Record<string, unknown>)[name]; } };
}
async function catalog(bimestre: string | undefined, run: (h: { renderer: ReactTestRenderer; shown: () => string }) => Promise<void>) {
  const restore = withDom();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AppRouterContext.Provider value={router}><DocenteSessionProvider><VistaCatalogoNotasDocente bimestre={bimestre} /></DocenteSessionProvider></AppRouterContext.Provider>); });
    await run({ renderer, shown: () => text(renderer.root) });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    restore();
  }
}
const hrefs = (r: ReactTestRenderer) => r.root.findAllByType('a').map(a => a.props.href);

test('catalog: one card per course linking to the sheet with the bimester, translated level, counters', async () => {
  await withCourses(() => ({ data: courses }), async () => {
    await catalog('12', async h => {
      assert.deepEqual(hrefs(h.renderer), ['/docente/notas/salon/10?bimestre=12', '/docente/notas/salon/11?bimestre=12']);
      assert.match(h.shown(), /2 salones/);
      assert.match(h.shown(), /35 alumnos/);
      assert.match(h.shown(), /Primaria/); assert.match(h.shown(), /Secundaria/);
      assert.doesNotMatch(h.shown(), /PRIMARY|SECONDARY/);
    });
  });
});

test('catalog: without a bimester the link carries no query', async () => {
  await withCourses(() => ({ data: courses }), async () => {
    await catalog(undefined, async h => { assert.deepEqual(hrefs(h.renderer), ['/docente/notas/salon/10', '/docente/notas/salon/11']); });
  });
});

test('catalog: the local search filters by name, code, area, grade and section; no match shows the empty text', async () => {
  await withCourses(() => ({ data: courses }), async () => {
    await catalog(undefined, async h => {
      const search = h.renderer.root.findByProps({ 'aria-label': 'Buscar salones' });
      for (const [q, expected] of [['mate', 1], ['COM-P3', 1], ['exactas', 1], ['3', 1], ['b', 1]] as const) {
        await act(async () => { search.props.onChange({ target: { value: q } }); });
        assert.equal(hrefs(h.renderer).length, expected, q);
      }
      await act(async () => { search.props.onChange({ target: { value: 'zzz' } }); });
      assert.match(h.shown(), /No se encontraron salones con ese criterio/);
      assert.equal(hrefs(h.renderer).length, 0);
    });
  });
});

test('catalog: no courses shows the empty state and no search box', async () => {
  await withCourses(() => ({ data: [] }), async () => {
    await catalog(undefined, async h => {
      assert.match(h.shown(), /No tienes cursos ni secciones asignadas/);
      assert.equal(h.renderer.root.findAllByProps({ 'aria-label': 'Buscar salones' }).length, 0);
    });
  });
});

test('catalog: a failed read shows the error with «Reintentar» that reads again', async () => {
  let reads = 0;
  await withCourses(() => { reads++; return reads === 1 ? { status: 500, data: { message: 'x' } } : { data: courses }; }, async () => {
    await catalog(undefined, async h => {
      assert.match(h.shown(), /No pudimos cargar tus cursos asignados/);
      const retry = h.renderer.root.findAllByType('button').find(b => text(b).includes('Reintentar'));
      assert.ok(retry, 'Reintentar');
      await act(async () => { retry.props.onClick(); });
      assert.equal(hrefs(h.renderer).length, 2);
    });
  });
});
