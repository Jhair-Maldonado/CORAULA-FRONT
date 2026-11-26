import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { DocenteSessionProvider } from '../../src/app/docente/components/DocenteSessionContext';
import httpClient from '../../src/services/httpClient';

// Ayudas comunes de las pruebas de vistas del docente: sin red, sin servidor, datos ficticios.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

export const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;

export const teacher = { id: 300, personId: 1, dni: '00000000', firstNames: 'Docente', paternalLastName: 'Prueba', maternalLastName: null, fullName: 'Docente Prueba', phone: null, specialty: null, active: true };

export function courseOf(id: number, over: Record<string, unknown> = {}) {
  return { sectionCourseId: id, assignmentId: id, courseId: id, code: `C${id}`, name: `Curso ${id}`, level: 'PRIMARY', area: 'Área', weeklyHours: 4, sectionId: 5, grade: 3, sectionName: 'A', studentCount: 2, ...over };
}

export function text(n: ReactTestInstance): string {
  return n.children.map(c => (typeof c === 'string' ? c : text(c))).join('');
}

export const httpError = (status: number, data: unknown = { message: 'detalle del servidor' }) =>
  new AxiosError('detalle interno', 'ERR_TEST', undefined, undefined, { status, data } as AxiosResponse);

export function withDom() {
  const names = ['window', 'document', 'localStorage', 'self'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { body: { style: {} }, addEventListener() {}, removeEventListener() {} } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  // next/link programa su prefetch con self.setTimeout: un no-op evita temporizadores.
  Object.defineProperty(globalThis, 'self', { configurable: true, value: { setTimeout: () => 0, clearTimeout() {} } });
  return () => { for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete (globalThis as Record<string, unknown>)[name]; } };
}

export type Call = { method?: string; url: string; params?: Record<string, unknown>; body?: unknown };
export type Reply = { status?: number; data?: unknown } | Error;
export type Route = (call: Call) => Reply | Promise<Reply>;

/** Instala un adaptador de Axios con rutas de prueba; un `Error` devuelto se lanza como respuesta fallida. */
export async function withAdapter(route: Route, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call: Call = { method: config.method, url: config.url ?? '', params: config.params, body: config.data ? JSON.parse(config.data as string) : undefined };
    calls.push(call);
    const reply = await route(call);
    if (reply instanceof Error) throw reply;
    return { config, statusText: 'OK', headers: {}, status: reply.status ?? 200, data: reply.data ?? {} };
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}

export const settle = () => act(async () => { await new Promise(res => setTimeout(res, 30)); });

/** Monta la vista dentro del proveedor de sesión del docente y la desmonta al terminar. */
export async function renderWithSession(view: React.ReactElement, run: (renderer: ReactTestRenderer) => Promise<void>) {
  const restore = withDom();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AppRouterContext.Provider value={router}><DocenteSessionProvider>{view}</DocenteSessionProvider></AppRouterContext.Provider>); });
    await settle();
    await run(renderer);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    restore();
  }
}
