import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import LoginAdministrador from '../feature/login/admin/loginAdministrador';
import { AuthContext, AuthProvider } from '../src/contexts/AuthContext';
import httpClient from '../src/services/httpClient';
import type { LoginResponse } from '../src/services/authService';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const demoEmail = 'docente.test@coraula.local';
const password = 'synthetic-test-password';
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
type Outcome = { error: 'network' | 401 | 423 } | { role: LoginResponse['role'] };

function renderedText(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : renderedText(child)).join('');
}

// Synthetic response fixture, never used to authenticate against a real backend.
function responseToken(role: LoginResponse['role']): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'synthetic-user', role, exp: Math.floor(Date.now() / 1000) + 3600 })}.test-signature`;
}

async function withLogin(outcome: Outcome, run: (h: {
  renderer: ReactTestRenderer;
  submit: (email: string) => Promise<void>;
  session: () => Auth;
  loginCalls: [string, LoginResponse['role']][];
  navigations: { method: 'push' | 'replace'; href: string }[];
  writes: [string, string][];
  storage: Storage;
  token: string | null;
}) => Promise<void>) {
  const globals = ['window', 'localStorage', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const values = new Map<string, string>();
  const writes: [string, string][] = [];
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { writes.push([key, value]); values.set(key, value); },
  };
  const browser = Object.assign(new EventTarget(), {
    localStorage: storage,
    location: { href: 'http://localhost:3000/login/security/administrador' },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });

  const navigations: { method: 'push' | 'replace'; href: string }[] = [];
  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, prefetch() {}, bfcacheId: 'login-test',
    push: href => { navigations.push({ method: 'push', href }); },
    replace: href => { navigations.push({ method: 'replace', href }); },
  };
  const loginCalls: [string, LoginResponse['role']][] = [];
  let session!: Auth;
  function ObserveSession() {
    const auth = React.useContext(AuthContext);
    assert.ok(auth);
    session = auth;
    return <AuthContext.Provider value={{ ...auth, login: (token, role) => {
      loginCalls.push([token, role]);
      auth.login(token, role);
    } }}><LoginAdministrador /></AuthContext.Provider>;
  }

  const originalAdapter = httpClient.defaults.adapter;
  const token = 'role' in outcome ? responseToken(outcome.role) : null;
  let requests = 0;
  let submittedEmail: string | null = null;
  httpClient.defaults.adapter = async config => {
    requests++;
    assert.equal(config.method, 'post');
    assert.equal(config.url, '/v1/auth/login');
    assert.equal(config.headers.Authorization, undefined);
    const body = JSON.parse(config.data);
    assert.equal(body.password, password);
    assert.equal(body.email, submittedEmail);
    if ('error' in outcome) {
      const response = outcome.error === 'network' ? undefined
        : { status: outcome.error, data: {}, config, statusText: 'Rejected', headers: {} } as AxiosResponse;
      throw new AxiosError('Synthetic authentication failure', 'ERR_TEST', config, undefined, response);
    }
    return { config, status: 200, statusText: 'OK', headers: {}, data: { token, tokenType: 'Bearer', role: outcome.role } };
  };

  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => {
      renderer = create(<AppRouterContext.Provider value={router}><AuthProvider><ObserveSession /></AuthProvider></AppRouterContext.Provider>);
    });
    const mounted = renderer!;
    assert.equal(session.status, 'unauthenticated');
    await run({
      renderer: mounted, session: () => session, loginCalls, navigations, writes, storage, token,
      submit: async email => {
        submittedEmail = email;
        await act(async () => {
          mounted.root.findByProps({ type: 'email' }).props.onChange({ target: { value: email } });
          mounted.root.findByProps({ placeholder: 'Contraseña de seguridad' }).props.onChange({ target: { value: password } });
        });
        await act(async () => { await mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
        assert.equal(requests, 1);
      },
    });
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

const failures = [
  ['network', 'Error de red o servidor no disponible.'],
  [401, 'Credenciales inválidas.'],
  [423, 'Cuenta temporalmente bloqueada. Inténtalo más tarde.'],
] as const;

for (const email of [demoEmail, demoEmail.toUpperCase(), `  ${demoEmail}  `]) {
  for (const [error, message] of failures) {
    test(`institutional login rejects ${error} for ${JSON.stringify(email)} without a local session`, async () => {
      await withLogin({ error }, async h => {
        await h.submit(email);
        assert.ok(renderedText(h.renderer.root).includes(message));
        assert.deepEqual(h.loginCalls, []);
        assert.deepEqual(h.writes, []);
        assert.equal(h.storage.getItem('token'), null);
        assert.equal(h.storage.getItem('role'), null);
        assert.equal(h.session().status, 'unauthenticated');
        assert.equal(h.session().sessionValid, false);
        assert.deepEqual(h.navigations, []);
        assert.equal(h.renderer.root.findByProps({ type: 'submit' }).props.disabled, false);
      });
    });
  }
}

for (const role of ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE'] as const) {
  test(`institutional login preserves the backend response and session for ${role}`, async () => {
    await withLogin({ role }, async h => {
      await h.submit(demoEmail);
      assert.deepEqual(h.loginCalls, [[h.token, role]]);
      assert.deepEqual(h.writes, [['token', h.token], ['role', role]]);
      assert.equal(h.storage.getItem('token'), h.token);
      assert.equal(h.storage.getItem('role'), role);
      assert.equal(h.session().status, 'authenticated');
      assert.equal(h.session().sessionValid, true);
      assert.equal(h.session().role, role);
      const destination = role === 'DOCENTE' ? '/docente' : '/administrador';
      assert.ok(h.navigations.some(n => n.method === 'push' && n.href === destination));
      assert.ok(h.navigations.every(n => n.href === destination));
    });
  });
}

for (const role of ['ESTUDIANTE', 'APODERADO'] as const) {
  test(`institutional login rejects the ${role} portal without persisting a session`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    await withLogin({ role }, async h => {
      await h.submit(demoEmail);
      assert.ok(renderedText(h.renderer.root).includes('Esta cuenta corresponde al portal de estudiantes y familias.'));
      assert.deepEqual(h.loginCalls, []);
      assert.deepEqual(h.writes, []);
      assert.equal(h.storage.length, 0);
      assert.equal(h.session().status, 'unauthenticated');
      assert.equal(h.session().sessionValid, false);
      assert.deepEqual(h.navigations, []);
      await act(async () => { t.mock.timers.tick(2000); });
      assert.deepEqual(h.navigations, [{ method: 'push', href: '/login' }]);
    });
  });
}
