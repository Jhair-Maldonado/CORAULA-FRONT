import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

// #121 (REL-AVISOS-SIMULADOS): with real data enabled (NEXT_PUBLIC_USE_MOCKS=false) the modules without backend
// keep demo data, show the notice and never call the nonexistent routes of src/lib/api.ts.
// The variable is read when src/lib/api.ts loads: set it before any dynamic import. Synthetic data, no network.
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
if (typeof globalThis.self === 'undefined') Object.assign(globalThis, { self: globalThis });
if (typeof globalThis.document === 'undefined') Object.assign(globalThis, { document: { addEventListener() {}, removeEventListener() {} } });

// In-memory storage: the student session reads localStorage on mount.
const memoryStorage = () => { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, String(v)); }, removeItem: (k: string) => { data.delete(k); }, clear: () => data.clear() }; };
Object.assign(globalThis, { localStorage: memoryStorage(), sessionStorage: memoryStorage() });

const requests: string[] = [];
Object.assign(globalThis, { fetch: async (url: unknown) => { requests.push(`fetch ${String(url)}`); throw new Error('sin red en pruebas'); } });
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;
const ALUMNO = 'Módulo en construcción: la información que ves es de demostración y no corresponde a tu cuenta.';
const CHAT = 'Módulo en construcción: la mensajería no está conectada; los contactos y mensajes son de demostración.';

function text(n: ReactTestInstance): string { return n.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
const notices = (r: ReactTestRenderer) => r.root.findAll(n => n.props.role === 'status' && typeof n.type === 'string' && text(n).startsWith('Módulo en construcción')).map(text);
const wait = (ms: number) => act(async () => { await new Promise(res => setTimeout(res, ms)); });
async function waitFor(check: () => boolean, ms = 3000) { for (let t = 0; t < ms && !check(); t += 50) await wait(50); }
async function recordHttpClient() {
  const httpClient = (await import('../src/services/httpClient')).default;
  httpClient.defaults.adapter = async config => { requests.push(`axios ${config.url}`); throw new Error('sin red en pruebas'); };
}

test('NEXT_PUBLIC_USE_MOCKS=false: student and teacher chat functions return demo data without any request', async () => {
  const { isMockDataEnabled } = await import('../src/lib/mockMode');
  assert.equal(isMockDataEnabled(), false);
  const api = await import('../src/lib/api');
  requests.length = 0;
  assert.ok((await api.getPerfilAlumno()).id);
  assert.ok(await api.getResumenDashboardAlumno());
  assert.ok((await api.getCalificacionesAlumno('2026', 'Todos los cursos')).cursos.length > 0);
  assert.ok(await api.getAsistenciaAlumno('2026-10'));
  assert.ok(await api.getHorarioAlumno());
  assert.ok((await api.getMaterialesAlumno('Todos los cursos', 'Todos los archivos')).materiales.length > 0);
  const docentes = await api.getMensajesDocentesAlumno();
  assert.ok(docentes.length > 0);
  assert.equal(await api.enviarMensajeDocenteAlumno(docentes[0].id, 'Hola'), true);
  const chats = await api.getDocenteChats('alumnos');
  assert.ok(chats.length > 0 && chats.every(c => c.tipo === 'alumno'));
  assert.equal(await api.enviarMensajeDocenteChat(chats[0].id, 'Hola'), true);
  assert.deepEqual(requests, []);
});

test('NEXT_PUBLIC_USE_MOCKS=false: the student portal layout always shows the notice', async () => {
  await recordHttpClient();
  const { default: AlumnoLayout } = await import('../src/app/alumno/layout');
  requests.length = 0;
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/alumno/calificaciones">
      <AlumnoLayout><p>Contenido</p></AlumnoLayout>
    </PathnameContext.Provider></AppRouterContext.Provider>);
  });
  try {
    assert.deepEqual(notices(r), [ALUMNO]);
    assert.match(text(r.root), /Contenido/);
    assert.deepEqual(requests, []);
  } finally { await act(async () => { r.unmount(); }); }
});

test('NEXT_PUBLIC_USE_MOCKS=false: a student view loads demo data without requests', async () => {
  await recordHttpClient();
  const { default: VistaCalificacionesAlumno } = await import('../feature/alumno/vistas/calificaciones/vistaCalificacionesAlumno');
  const { getCalificacionesAlumno } = await import('../src/lib/api');
  const [course] = (await getCalificacionesAlumno()).cursos;
  requests.length = 0;
  let r!: ReactTestRenderer;
  await act(async () => { r = create(<AppRouterContext.Provider value={router}><VistaCalificacionesAlumno /></AppRouterContext.Provider>); });
  try {
    await waitFor(() => text(r.root).includes(course.curso));
    assert.ok(text(r.root).includes(course.curso));
    assert.doesNotMatch(text(r.root), /Error HTTP|No se pudo/);
    assert.deepEqual(requests, []);
  } finally { await act(async () => { r.unmount(); }); }
});

test('NEXT_PUBLIC_USE_MOCKS=false: the teacher chat page shows the notice and demo contacts without requests', async () => {
  await recordHttpClient();
  const { default: DocenteChatPage } = await import('../src/app/docente/chat/page');
  const { getDocenteChats } = await import('../src/lib/api');
  const [first] = await getDocenteChats('alumnos');
  requests.length = 0;
  let r!: ReactTestRenderer;
  await act(async () => { r = create(<AppRouterContext.Provider value={router}><DocenteChatPage /></AppRouterContext.Provider>); });
  try {
    await waitFor(() => text(r.root).includes(first.nombre));
    assert.deepEqual(notices(r), [CHAT]);
    assert.ok(text(r.root).includes(first.nombre));
    assert.deepEqual(requests, []);
  } finally { await act(async () => { r.unmount(); }); }
});

test('GRADE_WINDOW_EXPIRED has its own message only with HTTP 409; other conflicts keep the generic text', async () => {
  const { GRADE_WINDOW_EXPIRED_MESSAGE, teacherGradesErrorMessage } = await import('../src/services/teacher/teacherGradesService');
  const httpError = (status: number, code?: string) => new AxiosError('PRIVATE', 'ERR_TEST', undefined, undefined,
    { status, data: { error: 'Conflict', message: 'detalle interno', ...(code ? { code, details: [] } : {}) } } as AxiosResponse);
  assert.equal(GRADE_WINDOW_EXPIRED_MESSAGE, 'El plazo para registrar o editar notas de este bimestre venció. Pide al Director que lo amplíe.');
  assert.equal(teacherGradesErrorMessage(httpError(409, 'GRADE_WINDOW_EXPIRED')), GRADE_WINDOW_EXPIRED_MESSAGE);
  for (const error of [httpError(400, 'GRADE_WINDOW_EXPIRED'), httpError(500, 'GRADE_WINDOW_EXPIRED'), httpError(409, 'BIMESTER_STATE_CONFLICT'), httpError(409)]) {
    assert.notEqual(teacherGradesErrorMessage(error), GRADE_WINDOW_EXPIRED_MESSAGE);
  }
  assert.match(teacherGradesErrorMessage(httpError(409, 'BIMESTER_STATE_CONFLICT')), /^Conflicto/);
});
