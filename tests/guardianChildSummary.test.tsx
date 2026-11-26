import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { createMockAdapter } from '../src/mocks/http/mockAdapter';
import { createMockStore } from '../src/mocks/http/fixtures/shared';
import { PadreProvider } from '../src/components/padres/PadreContext';
import HijosMatriculados from '../feature/padre/vistas/verHijos/hijosMatriculados';
import { childGradeSummary, latestPublishedBimester } from '../src/adapters/guardianChildSummaryAdapter';
import type { GuardianBimesterReport, GuardianPublishedBimester } from '../src/types/guardianReportApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const reportWith = (grades: Array<number | null>, number = 3): GuardianBimesterReport => ({
  student: { id: 57, code: 'C26000057', fullName: 'Ana Arias Demo' },
  section: { id: 10, name: 'A', grade: 5, level: 'SECONDARY' },
  period: { id: 1, name: '2026' },
  bimester: { id: 13, number, name: `Bimestre ${number}` },
  courses: grades.map((grade, i) => ({ name: `Curso ${i}`, areaName: 'Área', criteria: [], grade })),
  areas: [],
  publishedAt: '2026-10-09T10:00:00-05:00',
  revision: 1,
});

test('adapter: notas nulas mezcladas no cuentan en el promedio ni en aprobados o en riesgo', () => {
  assert.deepEqual(childGradeSummary(reportWith([10.5, null, 12])), { bimestreLabel: 'Bimestre 3', promedio: '11,3', aprobados: 1, enRiesgo: 1 });
  assert.deepEqual(childGradeSummary(reportWith([14, 16, null, null], 1)), { bimestreLabel: 'Bimestre 1', promedio: '15,0', aprobados: 2, enRiesgo: 0 });
});

test('adapter: todas las notas nulas dan promedio nulo y ceros', () => {
  assert.deepEqual(childGradeSummary(reportWith([null, null])), { bimestreLabel: 'Bimestre 3', promedio: null, aprobados: 0, enRiesgo: 0 });
  assert.deepEqual(childGradeSummary(reportWith([])), { bimestreLabel: 'Bimestre 3', promedio: null, aprobados: 0, enRiesgo: 0 });
});

test('adapter: 10,5 está en riesgo y 11 aprobado; el umbral no se compara tras redondear', () => {
  assert.deepEqual(childGradeSummary(reportWith([10.5])), { bimestreLabel: 'Bimestre 3', promedio: '10,5', aprobados: 0, enRiesgo: 1 });
  assert.deepEqual(childGradeSummary(reportWith([11])), { bimestreLabel: 'Bimestre 3', promedio: '11,0', aprobados: 1, enRiesgo: 0 });
  const justBelow = childGradeSummary(reportWith([10.96]));
  assert.equal(justBelow.promedio, '11,0');
  assert.equal(justBelow.enRiesgo, 1);
});

test('adapter: el último bimestre publicado es el primero de la lista', () => {
  const list = [{ bimesterId: 13, number: 3 }, { bimesterId: 12, number: 2 }] as GuardianPublishedBimester[];
  assert.equal(latestPublishedBimester(list)?.bimesterId, 13);
  assert.equal(latestPublishedBimester([]), null);
});

// ---- render con los fixtures del modo MOCK ----

const NOW = new Date('2026-11-02T15:00:00Z');
const text = (n: ReactTestInstance): string => n.children.map(c => (typeof c === 'string' ? c : text(c))).join('');
const reply = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => {
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse;
  // Como un adaptador real: un estado de error rechaza con AxiosError.
  if (status >= 400) throw new AxiosError('Request failed', String(status), config, null, response);
  return response;
};

async function withMockBackend<T>(override: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse> | null, run: () => Promise<T>): Promise<T> {
  const original = httpClient.defaults.adapter;
  const saved = (['window', 'localStorage', 'self'] as const).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const mock = createMockAdapter({ latencyMs: 0, store: createMockStore(() => NOW), warn: () => {} }) as AxiosAdapter;
  const login = await axios.create({ baseURL: 'http://localhost:8080/api', adapter: mock }).post('/v1/auth/login', { email: 'padre@demo.local', password: 'cualquier-clave' });
  const token = (login.data as { token: string }).token;
  httpClient.defaults.adapter = config => override(config) ?? mock(config);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() { return true; } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => (k === 'token' ? token : null) } });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try {
    return await run();
  } finally {
    httpClient.defaults.adapter = original;
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  }
}

async function settle(): Promise<void> {
  // getPadrePerfil sigue simulado con retardo; PadreContext recarga al cargar la lista (mismo patrón que padreGuardianStudents).
  for (let i = 0; i < 2; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 400)); });
}

async function mountHijos(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<PadreProvider><HijosMatriculados /></PadreProvider>); });
  await settle();
  return renderer;
}

const article = (r: ReactTestRenderer, name: string) => r.root.find(n => n.type === 'article' && n.props['aria-label'] === name);

test('render con fixtures: Ana con «Bimestre 3» y en riesgo, Sofía sin libreta y sin ceros inventados', async () => {
  await withMockBackend(() => null, async () => {
    const r = await mountHijos();
    try {
      const ana = text(article(r, 'Ana Arias Demo'));
      assert.match(ana, /Bimestre 3/);
      assert.match(ana, /Promedio\s*11,2/);
      assert.match(ana, /Aprobados\s*1 curso(?!s)/);
      assert.match(ana, /En riesgo\s*2 cursos/);
      // El resto de la tarjeta sigue: grado, sección, código y accesos.
      assert.match(ana, /Grado/);
      assert.match(ana, /Sección/);
      assert.match(ana, /C26000057/);
      assert.match(ana, /Asistencia/);
      const sofia = text(article(r, 'Sofía Arias Demo'));
      assert.match(sofia, /Sin libreta publicada/);
      assert.doesNotMatch(sofia, /Promedio|Aprobados|En riesgo|\b0 cursos/);
      assert.equal(r.root.findAll(n => n.props.role === 'alert').length, 0);
    } finally { await act(async () => { r.unmount(); }); }
  });
});

test('varios bimestres: solo se pide la libreta del primero publicado', async () => {
  const urls: string[] = [];
  await withMockBackend(config => { urls.push(String(config.url)); return null; }, async () => {
    const r = await mountHijos();
    try {
      const reports = urls.filter(u => u.endsWith('/report'));
      assert.ok(reports.includes('/v1/guardian/students/57/bimesters/13/report'));
      assert.ok(!reports.some(u => u.includes('/57/bimesters/12/') || u.includes('/57/bimesters/11/')));
      assert.equal(reports.filter(u => u.includes('/students/57/')).length, 1);
      assert.ok(!reports.some(u => u.includes('/students/61/')), 'sin bimestres publicados no se pide libreta');
    } finally { await act(async () => { r.unmount(); }); }
  });
});

test('el error de un solo hijo no afecta a los demás y «Reintentar» lo recupera', async () => {
  let failLuis = true;
  await withMockBackend(config => (failLuis && String(config.url) === '/v1/guardian/students/58/bimesters/published' ? Promise.reject(new AxiosError('x', '500', config, null, { data: { code: 'X' }, status: 500, statusText: '', headers: {}, config } as AxiosResponse)) : null), async () => {
    const r = await mountHijos();
    try {
      const luis = article(r, 'Luis Arias Demo');
      assert.match(text(luis), /No se pudo cargar la libreta/);
      assert.match(text(article(r, 'Ana Arias Demo')), /Bimestre 3/);
      assert.match(text(article(r, 'Sofía Arias Demo')), /Sin libreta publicada/);
      assert.equal(r.root.findAll(n => n.props.role === 'alert').length, 1);
      failLuis = false;
      const retry = luis.find(n => n.type === 'button' && /Reintentar/.test(text(n)));
      await act(async () => { retry.props.onClick(); });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
      assert.match(text(article(r, 'Luis Arias Demo')), /Bimestre/);
      assert.equal(r.root.findAll(n => n.props.role === 'alert').length, 0);
    } finally { await act(async () => { r.unmount(); }); }
  });
});

test('un 409 REPORT_NOT_PUBLISHED al pedir la libreta cuenta como sin libreta', async () => {
  await withMockBackend(config => (String(config.url) === '/v1/guardian/students/57/bimesters/13/report' ? Promise.reject(new AxiosError('x', '409', config, null, { data: { code: 'REPORT_NOT_PUBLISHED' }, status: 409, statusText: '', headers: {}, config } as AxiosResponse)) : null), async () => {
    const r = await mountHijos();
    try {
      assert.match(text(article(r, 'Ana Arias Demo')), /Sin libreta publicada/);
      assert.equal(r.root.findAll(n => n.props.role === 'alert').length, 0);
    } finally { await act(async () => { r.unmount(); }); }
  });
});

test('desmontar cancela las peticiones del resumen con un solo AbortController', async () => {
  const signals = new Map<string, AbortSignal>();
  await withMockBackend(config => {
    const url = String(config.url);
    if (url.includes('/bimesters/published')) {
      signals.set(url, config.signal as AbortSignal);
      return new Promise<AxiosResponse>(() => {});
    }
    return null;
  }, async () => {
    const r = await mountHijos();
    assert.equal(signals.size, 3);
    const all = [...signals.values()];
    assert.ok(all.every(s => !s.aborted));
    assert.ok(all.every(s => s === all[0]), 'un solo controller para todos los hijos');
    await act(async () => { r.unmount(); });
    assert.ok(all.every(s => s.aborted));
  });
});
