import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import axios, { AxiosError, AxiosHeaders, isAxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AuthProvider } from '../src/contexts/AuthContext';
import { AuthGuard } from '../src/components/AuthGuard';
import AlumnoLayout from '../src/app/alumno/layout';
import httpClient from '../src/services/httpClient';
import { createMockAdapter } from '../src/mocks/http/mockAdapter';
import { createMockStore } from '../src/mocks/http/fixtures/shared';
import { SIN_DATO, initialsOf, studentSectionLabel, toStudentProfileView } from '../src/adapters/studentProfileAdapter';
import type { StudentMeResponse } from '../src/types/studentProfileApi';
import type { BackendRole } from '../src/types';

// FRONT #32 / #170: el portal del Alumno exige un JWT ESTUDIANTE (AuthGuard) y su nombre sale de GET /v1/student/me.
// Datos ficticios; ninguna prueba sale a la red.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const ME: StudentMeResponse = {
  studentId: 7, studentCode: 'C26000007', fullName: 'Luz Prueba Demo', academicPeriodId: 1, academicPeriodName: 'Año escolar 2026',
  sectionId: 2, sectionName: 'B', level: 'SECONDARY', grade: 5,
};

const text = (node: ReactTestInstance): string => node.children.map(c => (typeof c === 'string' ? c : text(c))).join('');

function jwt(role: BackendRole): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'synthetic', role, exp: Math.floor(Date.now() / 1000) + 3600, credentialVersion: 0 })}.test-signature`;
}

const httpError = (config: InternalAxiosRequestConfig, status: number, data: unknown) =>
  new AxiosError('Synthetic failure', 'ERR_TEST', config, undefined, { status, data, config, statusText: 'Rejected', headers: {} } as AxiosResponse);

interface Run { text: string; navigations: string[]; requests: string[]; renderer: ReactTestRenderer; storage: Storage }

/** Monta el layout real del portal (o `page`) con AuthProvider y un backend simulado en memoria. */
async function inPortal(options: {
  pathname?: string;
  token?: BackendRole;
  extraStorage?: Record<string, string>;
  me?: (config: InternalAxiosRequestConfig) => AxiosResponse | AxiosError;
  page?: React.ReactNode;
}, check: (run: Run) => void | Promise<void>) {
  const globals = ['window', 'localStorage', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const values = new Map<string, string>(Object.entries(options.extraStorage ?? {}));
  if (options.token) { values.set('token', jwt(options.token)); values.set('role', options.token); }
  const storage = {
    get length() { return values.size; }, clear: () => values.clear(), getItem: (k: string) => values.get(k) ?? null,
    key: (i: number) => [...values.keys()][i] ?? null, removeItem: (k: string) => { values.delete(k); }, setItem: (k: string, v: string) => { values.set(k, v); },
  } as Storage;
  const pathname = options.pathname ?? '/alumno';
  Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.assign(new EventTarget(), { localStorage: storage, location: { href: `http://localhost:3000${pathname}`, replace() {}, reload() {} } }) });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });

  const navigations: string[] = [];
  const requests: string[] = [];
  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, prefetch() {}, bfcacheId: 'alumno-sesion-test',
    push: href => { navigations.push(href); }, replace: href => { navigations.push(href); },
  };
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    requests.push(`${String(config.method).toUpperCase()} ${config.url}`);
    if (config.url === '/v1/student/me' && options.me) {
      const reply = options.me(config);
      if (reply instanceof Error) throw reply;
      return reply;
    }
    throw new Error(`Unexpected request ${config.url}`);
  };
  const originalError = console.error;
  console.error = () => {};
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <PathnameContext.Provider value={pathname}>
            <AuthProvider>{options.page ?? <AlumnoLayout><p>contenido-del-portal</p></AlumnoLayout>}</AuthProvider>
          </PathnameContext.Provider>
        </AppRouterContext.Provider>,
      );
    });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    await check({ text: text(renderer!.root), navigations, requests, renderer: renderer!, storage });
  } finally {
    if (renderer) await act(async () => { renderer!.unmount(); });
    console.error = originalError;
    httpClient.defaults.adapter = originalAdapter;
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

const meOk = (config: InternalAxiosRequestConfig): AxiosResponse => ({ status: 200, data: ME, config, statusText: 'OK', headers: new AxiosHeaders() });

test('/alumno sin token redirige a /login y no muestra contenido ni pide el perfil', async () => {
  await inPortal({ me: meOk }, run => {
    assert.ok(!run.text.includes('contenido-del-portal'));
    assert.deepEqual(run.navigations, ['/login']);
    assert.deepEqual(run.requests, []);
  });
});

test('la sesión local heredada coraula_alumno_session no abre el portal sin JWT', async () => {
  const legacy = JSON.stringify({ id: 'alu-1', nombre: 'Ana Torres', usuario: 'atorres' });
  await inPortal({ extraStorage: { coraula_alumno_session: legacy }, me: meOk }, run => {
    assert.ok(!run.text.includes('contenido-del-portal'));
    assert.ok(!run.text.includes('Ana Torres'));
    assert.deepEqual(run.navigations, ['/login']);
    assert.deepEqual(run.requests, []);
  });
});

for (const [role, portal] of [['DOCENTE', '/docente'], ['APODERADO', '/padre'], ['ADMINISTRADOR', '/administrador']] as const) {
  test(`${role} en /alumno va a su portal sin ver contenido ni pedir el perfil`, async () => {
    await inPortal({ token: role, me: meOk }, run => {
      assert.ok(!run.text.includes('contenido-del-portal'));
      assert.deepEqual(run.navigations, [portal]);
      assert.deepEqual(run.requests, []);
    });
  });
}

test('ESTUDIANTE ve el contenido y el nombre y la sección salen de GET /v1/student/me', async () => {
  await inPortal({ token: 'ESTUDIANTE', me: meOk }, run => {
    assert.match(run.text, /contenido-del-portal/);
    assert.match(run.text, /Luz Prueba Demo/);
    assert.match(run.text, /5\.° de Secundaria · Sección B/);
    assert.match(run.text, /Cambiar contraseña/);
    assert.match(run.text, /Módulo en construcción.*de demostración/);
    assert.ok(!run.text.includes('Ana Torres'));
    assert.deepEqual(run.navigations, []);
    assert.deepEqual(run.requests, ['GET /v1/student/me']);
  });
});

for (const [name, status, data] of [
  ['404 STUDENT_NOT_FOUND', 404, { error: 'Not Found', message: 'x', code: 'STUDENT_NOT_FOUND' }],
  ['404 STUDENT_NOT_ENROLLED', 404, { error: 'Not Found', message: 'x', code: 'STUDENT_NOT_ENROLLED' }],
  ['403 sin code', 403, { error: 'Forbidden', message: 'x' }],
  ['500', 500, { error: 'Internal Server Error', message: 'x' }],
] as const) {
  test(`si /student/me responde ${name} el encabezado muestra «Sin dato» y nunca Ana Torres`, async () => {
    await inPortal({ token: 'ESTUDIANTE', me: config => httpError(config, status, data) }, run => {
      assert.match(run.text, /contenido-del-portal/);
      assert.match(run.text, new RegExp(SIN_DATO));
      assert.ok(!run.text.includes('Ana Torres'));
      assert.ok(!run.text.includes('5to Secundaria'));
    });
  });
}

test('«Cerrar sesión» del portal Alumno (navbar y sidebar) limpia el JWT y vuelve a /login', async () => {
  for (const title of ['Cerrar sesión del alumno', 'Cerrar sesión']) {
    await inPortal({ token: 'ESTUDIANTE', me: meOk }, async run => {
      assert.ok(run.storage.getItem('token'));
      const button = run.renderer.root.find(n => n.type === 'button' && n.props.title === title);
      await act(async () => { button.props.onClick(); });
      assert.equal(run.storage.getItem('token'), null, title);
      assert.equal(run.storage.getItem('role'), null, title);
      assert.ok(run.navigations.includes('/login'), title);
    });
  }
});

test('sin sesión en /docente se va a /login (ya no existe /docente/login)', async () => {
  await inPortal({ pathname: '/docente', page: <AuthGuard allowedRoles={['DOCENTE']}><p>contenido-del-portal</p></AuthGuard> }, run => {
    assert.ok(!run.text.includes('contenido-del-portal'));
    assert.deepEqual(run.navigations, ['/login']);
  });
});

test('next.config redirige /alumno/login y /docente/login a /login sin ser permanente', async () => {
  const { default: config } = await import('../next.config.mjs');
  const redirects = await config.redirects();
  assert.deepEqual(redirects, [
    { source: '/alumno/login', destination: '/login', permanent: false },
    { source: '/docente/login', destination: '/login', permanent: false },
  ]);
});

const mockClient = (adapter: ReturnType<typeof createMockAdapter>) => axios.create({ baseURL: 'http://localhost:8080/api', adapter });

test('MOCK: alumno@demo.local inicia sesión como ESTUDIANTE y /v1/student/me responde su perfil', async () => {
  const api = mockClient(createMockAdapter({ latencyMs: 0, store: createMockStore(() => new Date('2026-11-02T15:00:00Z')), warn() {} }));
  const { data: login } = await api.post('/v1/auth/login', { email: 'alumno@demo.local', password: 'cualquier-clave' });
  assert.equal(login.role, 'ESTUDIANTE');
  const auth = { headers: { Authorization: `Bearer ${login.token}` } };
  const me = (await api.get('/v1/student/me', auth)).data as StudentMeResponse;
  assert.equal(me.fullName, 'Ana Arias Demo');
  assert.equal(me.level, 'PRIMARY');
  assert.equal(toStudentProfileView(me).sectionLabel, '5.° de Primaria · Sección A');
  // El rol ESTUDIANTE también puede cambiar su contraseña.
  assert.equal((await api.post('/v1/auth/change-password', { newPassword: 'nueva-clave-demo' }, auth)).status, 200);
});

test('MOCK: /v1/student/me responde 401 sin token y 403 sin code a otros roles', async () => {
  const api = mockClient(createMockAdapter({ latencyMs: 0, store: createMockStore(), warn() {} }));
  const statusOf = async (headers?: Record<string, string>) => {
    try { await api.get('/v1/student/me', { headers }); return 200; } catch (error) {
      assert.ok(isAxiosError(error));
      assert.equal((error.response?.data as { code?: string }).code, undefined);
      return error.response?.status;
    }
  };
  assert.equal(await statusOf(), 401);
  for (const email of ['padre@demo.local', 'docente@demo.local', 'admin@demo.local']) {
    const { data } = await api.post('/v1/auth/login', { email, password: 'cualquier-clave' });
    assert.equal(await statusOf({ Authorization: `Bearer ${data.token}` }), 403, email);
  }
});

test('adapter: perfil completo produce nombre, iniciales y «5.° de Secundaria · Sección B»', () => {
  assert.deepEqual(toStudentProfileView(ME), { fullName: 'Luz Prueba Demo', initials: 'LP', sectionLabel: '5.° de Secundaria · Sección B' });
  assert.equal(studentSectionLabel({ ...ME, level: 'PRIMARY', grade: 3, sectionName: 'A' }), '3.° de Primaria · Sección A');
});

test('adapter: sin perfil, con nulos o vacíos usa «Sin dato» y nunca IDs ni enums crudos', () => {
  const empty = { fullName: SIN_DATO, initials: '–', sectionLabel: SIN_DATO };
  assert.deepEqual(toStudentProfileView(null), empty);
  assert.deepEqual(toStudentProfileView(undefined), empty);
  const nulls = { ...ME, fullName: null, sectionName: null, level: null, grade: null } as unknown as StudentMeResponse;
  assert.deepEqual(toStudentProfileView(nulls), empty);
  const blank = { ...ME, fullName: '   ', sectionName: ' ' } as StudentMeResponse;
  assert.equal(toStudentProfileView(blank).fullName, SIN_DATO);
  // Datos parciales: solo lo que existe, sin enum crudo.
  assert.equal(studentSectionLabel({ sectionName: 'C' }), 'Sección C');
  assert.equal(studentSectionLabel({ level: 'SECONDARY', grade: 2 }), '2.° de Secundaria');
  assert.ok(!/SECONDARY|PRIMARY/.test(studentSectionLabel(ME)));
  assert.equal(initialsOf('Marta'), 'MA');
  assert.equal(initialsOf(''), '–');
});
