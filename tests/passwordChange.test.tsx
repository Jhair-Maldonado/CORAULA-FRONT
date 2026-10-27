import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import LoginAdministrador from '../feature/login/admin/loginAdministrador';
import CambioContrasena, {
  passwordByteCount,
  passwordChangeErrorMessage,
  passwordCharCount,
} from '../feature/login/password/cambioContrasena';
import { AuthContext, AuthProvider } from '../src/contexts/AuthContext';
import { AuthGuard } from '../src/components/AuthGuard';
import { GuestGuard } from '../src/components/GuestGuard';
import { PasswordChangeGate } from '../src/components/PasswordChangeGate';
import httpClient from '../src/services/httpClient';
import type { BackendRole } from '../src/types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
type Adapter = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
type Navigation = { method: 'push' | 'replace'; href: string };

const currentPassword = 'synthetic-current-password';
const newPassword = 'synthetic-new-password-2026';

function renderedText(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : renderedText(child)).join('');
}

// Synthetic JWT fixture, never used against a real backend.
function jwt(role: BackendRole, passwordChangeRequired: boolean | undefined, version = 0): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const claims: Record<string, unknown> = { sub: `synthetic-${version}`, role, exp: Math.floor(Date.now() / 1000) + 3600, credentialVersion: version };
  if (passwordChangeRequired !== undefined) claims.passwordChangeRequired = passwordChangeRequired;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.test-signature`;
}

function httpError(config: InternalAxiosRequestConfig, status: number, data: unknown, headers: Record<string, string> = {}): AxiosError {
  const response = { status, data, config, statusText: 'Rejected', headers } as AxiosResponse;
  return new AxiosError('Synthetic failure', 'ERR_TEST', config, undefined, response);
}

interface Harness {
  renderer: ReactTestRenderer;
  session: () => Auth;
  navigations: Navigation[];
  storage: Storage;
  requests: InternalAxiosRequestConfig[];
  rerenderAt: (pathname: string) => Promise<void>;
}

async function withApp(options: {
  pathname: string;
  stored?: { token: string; role: BackendRole };
  adapter?: Adapter;
  page: React.ReactNode;
}, run: (h: Harness) => Promise<void>) {
  const globals = ['window', 'localStorage', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  if (options.stored) {
    storage.setItem('token', options.stored.token);
    storage.setItem('role', options.stored.role);
  }
  const browser = Object.assign(new EventTarget(), {
    localStorage: storage,
    location: { href: `http://localhost:3000${options.pathname}`, replace() {}, reload() {} },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });

  const navigations: Navigation[] = [];
  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, prefetch() {}, bfcacheId: 'password-change-test',
    push: href => { navigations.push({ method: 'push', href }); },
    replace: href => { navigations.push({ method: 'replace', href }); },
  };

  const requests: InternalAxiosRequestConfig[] = [];
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    requests.push(config);
    if (!options.adapter) throw new Error(`Unexpected request ${config.url}`);
    return options.adapter(config);
  };

  const captured: { session?: Auth } = {};
  function Observe({ children }: { children: React.ReactNode }) {
    const auth = React.useContext(AuthContext);
    assert.ok(auth);
    React.useLayoutEffect(() => { captured.session = auth; });
    return <>{children}</>;
  }
  const tree = (pathname: string) => (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        <AuthProvider>
          <Observe>
            <PasswordChangeGate>{options.page}</PasswordChangeGate>
          </Observe>
        </AuthProvider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );

  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => { renderer = create(tree(options.pathname)); });
    const mounted = renderer!;
    await run({
      renderer: mounted, session: () => captured.session!, navigations, storage, requests,
      rerenderAt: async pathname => { await act(async () => { mounted.update(tree(pathname)); }); },
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

function Portal() {
  return <p>contenido-del-portal</p>;
}

async function fillAndSubmit(renderer: ReactTestRenderer, values: { current?: string; next?: string; confirm?: string } = {}) {
  await act(async () => {
    renderer.root.findByProps({ id: 'current-password' }).props.onChange({ target: { value: values.current ?? currentPassword } });
    renderer.root.findByProps({ id: 'new-password' }).props.onChange({ target: { value: values.next ?? newPassword } });
    renderer.root.findByProps({ id: 'confirm-password' }).props.onChange({ target: { value: values.confirm ?? values.next ?? newPassword } });
  });
  await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
}

// ── Login ────────────────────────────────────────────────────────────────

for (const required of [true, false]) {
  test(`login ${required ? 'with' : 'without'} pending change routes to ${required ? 'the change screen' : 'the portal'}`, async () => {
    const token = jwt('ADMINISTRADOR', required);
    await withApp({
      pathname: '/login/security/administrador',
      // Un Bearer previo vencido o revocado no debe viajar en el login.
      stored: { token: 'stale.revoked.token', role: 'ADMINISTRADOR' },
      page: <LoginAdministrador />,
      adapter: async config => {
        assert.equal(config.url, '/v1/auth/login');
        assert.equal(config.headers.Authorization, undefined);
        return { config, status: 200, statusText: 'OK', headers: {}, data: { token, tokenType: 'Bearer', role: 'ADMINISTRADOR', passwordChangeRequired: required } };
      },
    }, async h => {
      assert.equal(h.session().status, 'unauthenticated');
      await act(async () => {
        h.renderer.root.findByProps({ type: 'email' }).props.onChange({ target: { value: 'admin.test@coraula.local' } });
        h.renderer.root.findByProps({ placeholder: 'Contraseña de seguridad' }).props.onChange({ target: { value: currentPassword } });
      });
      await act(async () => { await h.renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
      assert.equal(h.requests.length, 1);
      assert.equal(h.session().status, 'authenticated');
      assert.equal(h.session().passwordChangeRequired, required);
      assert.equal(h.storage.getItem('token'), token);
      assert.deepEqual(h.navigations[0], { method: 'push', href: required ? '/cambiar-contrasena' : '/administrador' });
    });
  });
}

test('login response flag wins even if the claim is absent', async () => {
  const token = jwt('DOCENTE', undefined);
  await withApp({
    pathname: '/login/security/administrador',
    page: <LoginAdministrador />,
    adapter: async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { token, tokenType: 'Bearer', role: 'DOCENTE', passwordChangeRequired: true } }),
  }, async h => {
    await act(async () => {
      h.renderer.root.findByProps({ type: 'email' }).props.onChange({ target: { value: 'docente.test@coraula.local' } });
      h.renderer.root.findByProps({ placeholder: 'Contraseña de seguridad' }).props.onChange({ target: { value: currentPassword } });
    });
    await act(async () => { await h.renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assert.equal(h.session().passwordChangeRequired, true);
    assert.deepEqual(h.navigations[0], { method: 'push', href: '/cambiar-contrasena' });
    assert.ok(h.navigations.every(n => n.href === '/cambiar-contrasena'));
  });
});

// ── Recarga con el claim ─────────────────────────────────────────────────

for (const claim of [true, false, undefined]) {
  test(`reload hydrates passwordChangeRequired=${claim === true} from claim ${String(claim)}`, async () => {
    await withApp({ pathname: '/', stored: { token: jwt('APODERADO', claim), role: 'APODERADO' }, page: <Portal /> }, async h => {
      assert.equal(h.session().status, 'authenticated');
      assert.equal(h.session().passwordChangeRequired, claim === true);
    });
  });
}

// ── Guardas y redirección ────────────────────────────────────────────────

const roles: [BackendRole, string][] = [
  ['ADMINISTRADOR', '/administrador'], ['DIRECTIVO', '/administrador'], ['DOCENTE', '/docente'],
  ['ESTUDIANTE', '/alumno'], ['APODERADO', '/padre'],
];

for (const [role, portal] of roles) {
  test(`pending ${role} never renders ${portal} and is sent to /cambiar-contrasena`, async () => {
    await withApp({
      pathname: portal,
      stored: { token: jwt(role, true), role },
      page: <AuthGuard allowedRoles={[role]}><Portal /></AuthGuard>,
    }, async h => {
      assert.ok(!renderedText(h.renderer.root).includes('contenido-del-portal'));
      assert.ok(h.navigations.some(n => n.method === 'replace' && n.href === '/cambiar-contrasena'));
      assert.ok(h.navigations.every(n => n.href === '/cambiar-contrasena'));
      assert.equal(h.requests.length, 0);
    });
  });
}

test('global gate also covers routes without AuthGuard (alumno mock portal)', async () => {
  await withApp({ pathname: '/alumno', stored: { token: jwt('ESTUDIANTE', true), role: 'ESTUDIANTE' }, page: <Portal /> }, async h => {
    assert.ok(!renderedText(h.renderer.root).includes('contenido-del-portal'));
    assert.deepEqual(h.navigations, [{ method: 'replace', href: '/cambiar-contrasena' }]);
  });
});

test('GuestGuard sends a pending session to the change screen, not to the portal', async () => {
  await withApp({ pathname: '/login', stored: { token: jwt('DOCENTE', true), role: 'DOCENTE' }, page: <GuestGuard><p>formulario</p></GuestGuard> }, async h => {
    assert.ok(h.navigations.length > 0);
    assert.ok(h.navigations.every(n => n.href === '/cambiar-contrasena'));
  });
});

test('without obligation the portal renders and nothing redirects', async () => {
  await withApp({
    pathname: '/docente',
    stored: { token: jwt('DOCENTE', false), role: 'DOCENTE' },
    page: <AuthGuard allowedRoles={['DOCENTE']}><Portal /></AuthGuard>,
  }, async h => {
    assert.ok(renderedText(h.renderer.root).includes('contenido-del-portal'));
    assert.deepEqual(h.navigations, []);
  });
});

test('change screen with pending obligation does not redirect anywhere (no loop)', async () => {
  await withApp({ pathname: '/cambiar-contrasena', stored: { token: jwt('DOCENTE', true), role: 'DOCENTE' }, page: <CambioContrasena /> }, async h => {
    assert.ok(renderedText(h.renderer.root).includes('Cambiar contraseña'));
    assert.ok(!renderedText(h.renderer.root).includes('Volver al portal'));
    assert.deepEqual(h.navigations, []);
  });
});

test('change screen is reachable voluntarily without obligation and offers a way back', async () => {
  await withApp({ pathname: '/cambiar-contrasena', stored: { token: jwt('APODERADO', false), role: 'APODERADO' }, page: <CambioContrasena /> }, async h => {
    const back = h.renderer.root.findAll(node => node.type === 'a' && node.props.href === '/padre');
    assert.equal(back.length, 1);
    assert.deepEqual(h.navigations, []);
  });
});

test('change screen without session goes to the home page', async () => {
  await withApp({ pathname: '/cambiar-contrasena', page: <CambioContrasena /> }, async h => {
    assert.deepEqual(h.navigations, [{ method: 'replace', href: '/' }]);
  });
});

test('logout is available from the change screen', async () => {
  await withApp({ pathname: '/cambiar-contrasena', stored: { token: jwt('ESTUDIANTE', true), role: 'ESTUDIANTE' }, page: <CambioContrasena /> }, async h => {
    const button = h.renderer.root.findAll(node => node.type === 'button' && renderedText(node).includes('Cerrar sesión'));
    assert.equal(button.length, 1);
    await act(async () => { button[0].props.onClick(); });
    assert.equal(h.storage.getItem('token'), null);
    assert.equal(h.session().status, 'unauthenticated');
  });
});

// ── 403 global ───────────────────────────────────────────────────────────

test('403 PASSWORD_CHANGE_REQUIRED keeps the session and redirects to the change screen', async () => {
  const token = jwt('DOCENTE', false);
  await withApp({
    pathname: '/docente',
    stored: { token, role: 'DOCENTE' },
    page: <AuthGuard allowedRoles={['DOCENTE']}><Portal /></AuthGuard>,
    adapter: async config => { throw httpError(config, 403, { error: 'Forbidden', message: 'Debe cambiar su contraseña para continuar.', code: 'PASSWORD_CHANGE_REQUIRED' }); },
  }, async h => {
    assert.ok(renderedText(h.renderer.root).includes('contenido-del-portal'));
    await act(async () => { await httpClient.get('/v1/teacher/courses').catch(() => undefined); });
    assert.equal(h.requests[0].headers.Authorization, `Bearer ${token}`);
    assert.equal(h.storage.getItem('token'), token);
    assert.equal(h.session().status, 'authenticated');
    assert.equal(h.session().passwordChangeRequired, true);
    assert.ok(!renderedText(h.renderer.root).includes('contenido-del-portal'));
    assert.ok(h.navigations.some(n => n.href === '/cambiar-contrasena'));
    // Revalidar la misma sesión (cambio de ruta) conserva la obligación señalada por el servidor.
    await act(async () => { h.session().validateSession(); });
    assert.equal(h.session().passwordChangeRequired, true);
  });
});

test('a plain 403 without the code neither logs out nor forces the change', async () => {
  await withApp({
    pathname: '/docente',
    stored: { token: jwt('DOCENTE', false), role: 'DOCENTE' },
    page: <Portal />,
    adapter: async config => { throw httpError(config, 403, { error: 'Forbidden', message: 'Acceso denegado' }); },
  }, async h => {
    await act(async () => { await httpClient.get('/v1/teacher/courses').catch(() => undefined); });
    assert.equal(h.session().status, 'authenticated');
    assert.equal(h.session().passwordChangeRequired, false);
    assert.deepEqual(h.navigations, []);
  });
});

// ── Éxito: reemplazo de token y sincronización ───────────────────────────

for (const [role, portal] of roles) {
  test(`successful change for ${role} replaces the token and goes to ${portal}`, async () => {
    const oldToken = jwt(role, true, 0);
    const newToken = jwt(role, false, 1);
    await withApp({
      pathname: '/cambiar-contrasena',
      stored: { token: oldToken, role },
      page: <CambioContrasena />,
      adapter: async config => {
        assert.equal(config.method, 'post');
        assert.equal(config.url, '/v1/auth/change-password');
        assert.equal(config.headers.Authorization, `Bearer ${oldToken}`);
        assert.deepEqual(JSON.parse(config.data), { currentPassword, newPassword });
        return { config, status: 200, statusText: 'OK', headers: {}, data: { token: newToken, tokenType: 'Bearer', role, passwordChangeRequired: false } };
      },
    }, async h => {
      await fillAndSubmit(h.renderer);
      assert.equal(h.requests.length, 1);
      assert.equal(h.storage.getItem('token'), newToken);
      assert.equal(h.session().token, newToken);
      assert.equal(h.session().passwordChangeRequired, false);
      assert.deepEqual(h.navigations, [{ method: 'replace', href: portal }]);
      // Tras navegar, el portal ya no es bloqueado por el gate.
      await h.rerenderAt(portal);
      assert.equal(h.navigations.length, 1);
    });
  });
}

test('new password is sent without trimming', async () => {
  const spaced = '  frase con espacios  ';
  await withApp({
    pathname: '/cambiar-contrasena',
    stored: { token: jwt('DOCENTE', true), role: 'DOCENTE' },
    page: <CambioContrasena />,
    adapter: async config => {
      assert.equal(JSON.parse(config.data).newPassword, spaced);
      return { config, status: 200, statusText: 'OK', headers: {}, data: { token: jwt('DOCENTE', false, 1), tokenType: 'Bearer', role: 'DOCENTE', passwordChangeRequired: false } };
    },
  }, async h => {
    await fillAndSubmit(h.renderer, { next: spaced });
    assert.equal(h.requests.length, 1);
  });
});

test('another tab picks up the replaced token through the storage event', async () => {
  await withApp({ pathname: '/cambiar-contrasena', stored: { token: jwt('DOCENTE', true, 0), role: 'DOCENTE' }, page: <Portal /> }, async h => {
    assert.equal(h.session().passwordChangeRequired, true);
    const replaced = jwt('DOCENTE', false, 1);
    h.storage.setItem('token', replaced);
    await act(async () => { window.dispatchEvent(Object.assign(new Event('storage'), { key: 'token' })); });
    assert.equal(h.session().token, replaced);
    assert.equal(h.session().passwordChangeRequired, false);
  });
});

// ── Errores por code ─────────────────────────────────────────────────────

const failures: [string, number, Record<string, unknown>, Record<string, string>, string][] = [
  ['PASSWORD_POLICY_VIOLATION', 400, { code: 'PASSWORD_POLICY_VIOLATION', message: 'La contraseña es demasiado común.' }, {}, 'La contraseña es demasiado común.'],
  ['CURRENT_PASSWORD_INVALID', 400, { code: 'CURRENT_PASSWORD_INVALID', message: 'x' }, {}, 'La contraseña actual es incorrecta.'],
  ['ACCOUNT_IDENTITY_INCOMPLETE', 409, { code: 'ACCOUNT_IDENTITY_INCOMPLETE', message: 'x' }, {}, 'Tu cuenta no tiene los datos de identidad completos. Comunícate con la administración del colegio.'],
  ['ACCOUNT_LOCKED', 423, { code: 'ACCOUNT_LOCKED', message: 'x' }, {}, 'Tu cuenta está bloqueada temporalmente. Inténtalo más tarde.'],
  ['RATE_LIMITED seconds', 429, { code: 'RATE_LIMITED', message: 'x' }, { 'retry-after': '42' }, 'Demasiados intentos. Espera 42 segundos antes de volver a intentarlo.'],
  ['RATE_LIMITED minutes', 429, { code: 'RATE_LIMITED', message: 'x' }, { 'retry-after': '90' }, 'Demasiados intentos. Espera 2 minutos antes de volver a intentarlo.'],
  ['RATE_LIMITED without header', 429, { code: 'RATE_LIMITED', message: 'x' }, {}, 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.'],
];

for (const [name, status, data, headers, message] of failures) {
  test(`change error ${name} shows its message and keeps the session`, async () => {
    const token = jwt('APODERADO', true);
    await withApp({
      pathname: '/cambiar-contrasena',
      stored: { token, role: 'APODERADO' },
      page: <CambioContrasena />,
      adapter: async config => { throw httpError(config, status, { error: 'x', ...data }, headers); },
    }, async h => {
      await fillAndSubmit(h.renderer);
      assert.ok(renderedText(h.renderer.root).includes(message), renderedText(h.renderer.root));
      assert.equal(h.storage.getItem('token'), token);
      assert.equal(h.session().status, 'authenticated');
      assert.equal(h.session().passwordChangeRequired, true);
      assert.deepEqual(h.navigations, []);
      assert.equal(h.renderer.root.findByProps({ type: 'submit' }).props.disabled, false);
    });
  });
}

test('change error INVALID_AUTHENTICATION (401) ends the session and leaves the screen', async () => {
  await withApp({
    pathname: '/cambiar-contrasena',
    stored: { token: jwt('DOCENTE', true), role: 'DOCENTE' },
    page: <CambioContrasena />,
    adapter: async config => { throw httpError(config, 401, { error: 'Unauthorized', code: 'INVALID_AUTHENTICATION', message: 'x' }); },
  }, async h => {
    await fillAndSubmit(h.renderer);
    assert.equal(h.storage.getItem('token'), null);
    assert.equal(h.session().status, 'unauthenticated');
    assert.deepEqual(h.navigations, [{ method: 'replace', href: '/' }]);
  });
});

test('error messages map every documented code', () => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  assert.equal(passwordChangeErrorMessage(httpError(config, 401, { code: 'INVALID_AUTHENTICATION' })), 'Tu sesión ya no es válida. Inicia sesión nuevamente.');
  assert.equal(passwordChangeErrorMessage(httpError(config, 400, { code: 'PASSWORD_POLICY_VIOLATION' })), 'La nueva contraseña no cumple la política de seguridad.');
  assert.equal(passwordChangeErrorMessage(new Error('network')), 'Error de red o servidor no disponible. Inténtalo nuevamente.');
});

// ── Validación en el cliente ─────────────────────────────────────────────

const clientRejections: [string, { current?: string; next?: string; confirm?: string }, string][] = [
  ['empty current password', { current: '' }, 'Ingresa tu contraseña actual.'],
  ['11 characters', { next: 'a'.repeat(11) }, 'La nueva contraseña debe tener al menos 12 caracteres.'],
  ['more than 72 UTF-8 bytes', { next: 'ñ'.repeat(37) }, 'La nueva contraseña es demasiado larga. Usa menos caracteres o menos símbolos especiales.'],
  ['confirmation mismatch', { next: newPassword, confirm: `${newPassword}x` }, 'La confirmación no coincide con la nueva contraseña.'],
];

for (const [name, values, message] of clientRejections) {
  test(`client validation rejects ${name} without calling the backend`, async () => {
    await withApp({ pathname: '/cambiar-contrasena', stored: { token: jwt('DOCENTE', true), role: 'DOCENTE' }, page: <CambioContrasena /> }, async h => {
      await fillAndSubmit(h.renderer, values);
      assert.equal(h.requests.length, 0);
      assert.ok(renderedText(h.renderer.root).includes(message));
    });
  });
}

test('counter uses Unicode code points and UTF-8 bytes', () => {
  assert.equal(passwordCharCount('🔒'.repeat(12)), 12);
  assert.equal(passwordByteCount('🔒'.repeat(12)), 48);
  assert.equal(passwordByteCount('a'.repeat(72)), 72);
  assert.equal(passwordByteCount('ñ'.repeat(37)), 74);
});
