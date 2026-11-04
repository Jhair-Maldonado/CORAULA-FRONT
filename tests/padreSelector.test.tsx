import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { PadreProvider, resolverHijoActivo, usePadre } from '../src/components/padres/PadreContext';
import { mapGuardianStudent } from '../src/services/padres/padreService';
import JustificacionesPage from '../src/app/padre/justificacion/page';
import type { GuardianStudentResponse } from '../src/types/guardianApi';

// Selector del hijo compartido del portal del apoderado: datos sintéticos, sin red.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
if (typeof globalThis.self === 'undefined') Object.assign(globalThis, { self: globalThis });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;

const ANA: GuardianStudentResponse = { studentId: 57, studentCode: 'C26000057', fullName: 'Ana Arias Prueba', grade: 5, sectionName: 'A' };
const LUIS: GuardianStudentResponse = { studentId: 58, studentCode: null, fullName: 'Luis Arias Prueba', grade: null, sectionName: null };
function text(n: ReactTestInstance): string { return n.children.map(c => (typeof c === 'string' ? c : text(c))).join(''); }

type Ctx = ReturnType<typeof usePadre>;
function Probe({ onContext }: { onContext: (ctx: Ctx) => void }) {
  const ctx = usePadre();
  onContext(ctx);
  return <p>{ctx.isLoading ? 'cargando' : ctx.error ?? `activo:${ctx.hijoActivo?.nombreCompleto ?? 'ninguno'}|id:${ctx.selectedHijoId}|padre:${ctx.padre ? 'si' : 'no'}`}</p>;
}

// Toda lectura o escritura del almacenamiento del navegador falla el test.
function withForbiddenStorage<T>(run: () => Promise<T>): Promise<T> {
  const names = ['localStorage', 'sessionStorage'] as const;
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const touched: string[] = [];
  for (const name of names) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: new Proxy({}, { get: (_t, key) => { if (key !== 'getItem') touched.push(`${name}.${String(key)}`); return () => null; } }),
    });
  }
  return run().then(result => {
    // httpClient lee el token con getItem; el selector no debe escribir ni borrar nada.
    assert.deepEqual(touched, []);
    return result;
  }).finally(() => {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  });
}

async function withStudents(lists: GuardianStudentResponse[][], run: (h: { calls: () => number; ctx: () => Ctx; renderer: ReactTestRenderer }) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  let calls = 0;
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    assert.equal(config.url, '/v1/guardian/students');
    const data = lists[Math.min(calls, lists.length - 1)];
    calls++;
    return { data, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };
  let latest!: Ctx;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PadreProvider><Probe onContext={ctx => { latest = ctx; }} /></PadreProvider>); });
    await run({ calls: () => calls, ctx: () => latest, renderer });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
}

test('resolverHijoActivo: el seleccionado si sigue vinculado; si no, el primero; null sin hijos', () => {
  const hijos = [ANA, LUIS].map(mapGuardianStudent);
  assert.equal(resolverHijoActivo(hijos, '58')?.id, '58');
  assert.equal(resolverHijoActivo(hijos, '99')?.id, '57');
  assert.equal(resolverHijoActivo(hijos, '')?.id, '57');
  assert.equal(resolverHijoActivo([], '57'), null);
});

test('una sola carga: cambiar de hijo no vuelve a pedir la lista, ids ajenos se ignoran y nada va al almacenamiento', async () => {
  await withForbiddenStorage(() => withStudents([[ANA, LUIS]], async h => {
    assert.match(text(h.renderer.root), /activo:Ana Arias Prueba\|id:57\|padre:no/);
    const loads = h.calls();
    await act(async () => { h.ctx().setSelectedHijoId('58'); });
    assert.match(text(h.renderer.root), /activo:Luis Arias Prueba\|id:58/);
    await act(async () => { h.ctx().setSelectedHijoId('999'); });
    assert.match(text(h.renderer.root), /activo:Luis Arias Prueba\|id:58/);
    assert.equal(h.calls(), loads, 'la selección no recarga la lista');
  }));
});

test('al recargar, un hijo que dejó de estar vinculado se reemplaza por el primero vinculado', async () => {
  await withStudents([[ANA, LUIS], [ANA]], async h => {
    await act(async () => { h.ctx().setSelectedHijoId('58'); });
    assert.match(text(h.renderer.root), /id:58/);
    await act(async () => { await h.ctx().refreshPadreData(); });
    assert.match(text(h.renderer.root), /activo:Ana Arias Prueba\|id:57/);
  });
  await withStudents([[]], async h => {
    assert.match(text(h.renderer.root), /activo:ninguno\|id:\|/);
    assert.equal(h.ctx().hijoActivo, null);
  });
});

test('un error de carga no deja hijos ni datos simulados', async () => {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async () => { throw new Error('network down'); };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PadreProvider><Probe onContext={() => {}} /></PadreProvider>); });
    const out = text(renderer.root);
    assert.ok(!out.includes('activo:'), out);
    assert.ok(out.length > 0 && !/Sofía|Mateo/.test(out), out);
  } finally {
    await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('/padre/justificacion usa la vista conectada; con mocks apagados nunca muestra datos ni formularios simulados', async () => {
  const original = httpClient.defaults.adapter;
  const requests: string[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    requests.push(String(config.url));
    if (config.url === '/v1/guardian/students') {
      return { data: [ANA], status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    if (String(config.url).includes('/justifications')) {
      return {
        data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
        status: 200,
        statusText: '',
        headers: {},
        config,
      } as AxiosResponse;
    }
    throw new Error(`unexpected ${config.url}`);
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <SearchParamsContext.Provider value={new URLSearchParams()}>
            <PadreProvider>
              <JustificacionesPage />
            </PadreProvider>
          </SearchParamsContext.Provider>
        </AppRouterContext.Provider>
      );
    });
    const out = text(renderer.root);
    assert.match(out, /Justificaciones de asistencia/);
    assert.match(out, /Ana Arias Prueba/);
    assert.doesNotMatch(out, /no hay información para mostrar/);
    assert.equal(renderer.root.findAll(n => n.type === 'form' || n.type === 'textarea').length, 0);
    assert.doesNotMatch(out, /Enviar|Justificar inasistencia/);
    assert.doesNotMatch(out, /Sofía|Mateo/);
    assert.ok(requests.some(url => url.includes('/justifications')));
  } finally {
    await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }

  // Sin hijos ni sesión: la vista conectada no realiza consultas falsas de justificaciones
  requests.length = 0;
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    requests.push(String(config.url));
    if (config.url === '/v1/guardian/students') {
      return { data: [], status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    throw new Error(`unexpected ${config.url}`);
  };

  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <SearchParamsContext.Provider value={new URLSearchParams()}>
            <PadreProvider>
              <JustificacionesPage />
            </PadreProvider>
          </SearchParamsContext.Provider>
        </AppRouterContext.Provider>
      );
    });
    const out = text(renderer.root);
    assert.match(out, /No tienes estudiantes vinculados a tu cuenta/);
    assert.equal(renderer.root.findAll(n => n.type === 'form' || n.type === 'textarea').length, 0);
    assert.deepEqual(requests, ['/v1/guardian/students']);
  } finally {
    await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});
