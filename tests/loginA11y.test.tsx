import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import LoginAdministrador from '../feature/login/admin/loginAdministrador';
import LoginDocente from '../feature/login/docente/loginDocente';
import LoginUsuario from '../feature/login/users/LoginUsuario';
import VistaLoginAlumno from '../feature/alumno/vistas/login/vistaLoginAlumno';
import { AlumnoSessionProvider } from '../src/components/alumno/AlumnoSessionContext';
import { AuthContext } from '../src/contexts/AuthContext';
import httpClient from '../src/services/httpClient';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

function renderedText(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : renderedText(child)).join('');
}

const guest: Auth = {
  token: null, role: null, status: 'unauthenticated', sessionValid: false,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => false,
};

const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, prefetch() {}, bfcacheId: 'login-a11y-test',
  push() {}, replace() {},
};

async function withPage(page: React.ReactElement, pathname: string, run: (renderer: ReactTestRenderer) => Promise<void>) {
  const globals = ['window', 'localStorage', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const values = new Map<string, string>();
  const storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, value); },
  } as Storage;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.assign(new EventTarget(), {
    localStorage: storage,
    location: { href: `http://localhost:3000${pathname}` },
  }) });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });

  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    const response = { status: 401, data: {}, config, statusText: 'Unauthorized', headers: {} } as AxiosResponse;
    throw new AxiosError('Synthetic authentication failure', 'ERR_TEST', config, undefined, response);
  };

  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <PathnameContext.Provider value={pathname}>
            <AuthContext.Provider value={guest}>{page}</AuthContext.Provider>
          </PathnameContext.Provider>
        </AppRouterContext.Provider>,
      );
    });
    await run(renderer!);
  } finally {
    try {
      const mounted = renderer;
      if (mounted) await act(async () => { mounted.unmount(); });
    } finally {
      httpClient.defaults.adapter = originalAdapter;
      for (const [name, descriptor] of globals) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    }
  }
}

function assertAlert(renderer: ReactTestRenderer, message: string) {
  const alerts = renderer.root.findAll(node => typeof node.type === 'string' && node.props.role === 'alert');
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].props['aria-live'], 'assertive');
  assert.equal(renderedText(alerts[0]), message);
}

const institutionalLogins = [
  { name: 'usuarios (/login)', path: '/login', page: <LoginUsuario />, password: 'Contraseña', message: 'Credenciales inválidas.' },
  { name: 'administrador (/login/security/administrador)', path: '/login/security/administrador', page: <LoginAdministrador />, password: 'Contraseña de seguridad', message: 'Credenciales inválidas.' },
  { name: 'docente (/docente/login)', path: '/docente/login', page: <LoginDocente />, password: '••••••••', message: 'Credenciales inválidas en el servidor.' },
];

for (const login of institutionalLogins) {
  test(`login ${login.name} announces the error message as an alert`, async () => {
    await withPage(login.page, login.path, async renderer => {
      assert.equal(renderer.root.findAll(node => node.props.role === 'alert').length, 0);
      await act(async () => {
        renderer.root.findByProps({ type: 'email' }).props.onChange({ target: { value: 'synthetic@coraula.local' } });
        renderer.root.findByProps({ placeholder: login.password }).props.onChange({ target: { value: 'synthetic-password' } });
      });
      await act(async () => { await renderer.root.findAllByType('form')[0].props.onSubmit({ preventDefault() {} }); });
      assertAlert(renderer, login.message);
    });
  });

  test(`login ${login.name} password toggle has a 24x24 px minimum target`, async () => {
    await withPage(login.page, login.path, async renderer => {
      const toggle = () => renderer.root.find(node => node.type === 'button'
        && ['Mostrar contraseña', 'Ocultar contraseña'].includes(node.props['aria-label']));
      const classes = String(toggle().props.className).split(/\s+/);
      for (const cls of ['min-w-6', 'min-h-6', 'p-1', 'inline-flex', 'items-center', 'justify-center']) {
        assert.ok(classes.includes(cls), `missing ${cls}`);
      }
      assert.equal(toggle().props['aria-label'], 'Mostrar contraseña');
      await act(async () => { toggle().props.onClick(); });
      assert.equal(toggle().props['aria-label'], 'Ocultar contraseña');
      assert.equal(renderer.root.findByProps({ placeholder: login.password }).props.type, 'text');
    });
  });
}

test('login alumno (/alumno/login) announces the validation error as an alert', async () => {
  await withPage(<AlumnoSessionProvider><VistaLoginAlumno /></AlumnoSessionProvider>, '/alumno/login', async renderer => {
    await act(async () => {
      renderer.root.findByProps({ placeholder: 'ej. atorres o 74128905' }).props.onChange({ target: { value: '' } });
    });
    await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assertAlert(renderer, 'Por favor ingresa tu nombre de usuario o DNI.');
  });
});
