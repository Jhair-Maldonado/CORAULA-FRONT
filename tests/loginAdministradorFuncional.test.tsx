import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { InternalAxiosRequestConfig } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import LoginAdministrador from '../feature/login/admin/loginAdministrador';
import { RECUPERACION_CONTRASENA_TEXTO } from '../feature/login/component/modalRecuperacionContrasena';
import { AuthContext } from '../src/contexts/AuthContext';
import httpClient from '../src/services/httpClient';
import type { LoginResponse } from '../src/services/authService';

// Pruebas funcionales del login administrador (FRONT #35, F-01 a F-07). Sin red: el adaptador de httpClient
// se sustituye y cuenta cada petición. Datos sintéticos.
// next/link en Node usa el Link del pages router, cuyo useIntersection llama a requestIdleCallback (usa `self`).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const EMAIL = 'Correo de gestión / docente';
const PASSWORD = 'Contraseña de seguridad';
const PALABRAS_DE_ENVIO = /enviad[oa]|código|autenticación exitosa|verificación exitosa/i;

function renderedText(node: ReactTestInstance): string {
  return node.children.map(child => (typeof child === 'string' ? child : renderedText(child))).join('');
}

type Harness = {
  renderer: ReactTestRenderer;
  requests: InternalAxiosRequestConfig[];
  navigations: { method: 'push' | 'replace'; href: string }[];
  loginCalls: [string, LoginResponse['role']][];
  text: () => string;
  type: (placeholder: string, value: string) => Promise<void>;
  submit: () => Promise<void>;
  click: (label: string) => Promise<void>;
};

async function withLogin(reply: ((config: InternalAxiosRequestConfig) => unknown) | null, run: (h: Harness) => Promise<void>) {
  const navigations: Harness['navigations'] = [];
  const loginCalls: Harness['loginCalls'] = [];
  const requests: InternalAxiosRequestConfig[] = [];
  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, prefetch() {}, bfcacheId: 'login-funcional-test',
    push: href => { navigations.push({ method: 'push', href }); },
    replace: href => { navigations.push({ method: 'replace', href }); },
  };
  const auth: Auth = {
    token: null, role: null, status: 'unauthenticated', sessionValid: false, passwordChangeRequired: false,
    login: (token, role) => { loginCalls.push([token, role]); },
    logout() {}, validateSession: () => false, isSessionPhysicallyValid: () => false,
  };
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    requests.push(config);
    if (!reply) throw new Error(`Petición inesperada: ${config.method} ${config.url}`);
    return { config, status: 200, statusText: 'OK', headers: {}, data: reply(config) };
  };
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <AuthContext.Provider value={auth}><LoginAdministrador /></AuthContext.Provider>
        </AppRouterContext.Provider>,
      );
    });
    const mounted = renderer!;
    await run({
      renderer: mounted, requests, navigations, loginCalls,
      text: () => renderedText(mounted.root),
      type: async (placeholder, value) => {
        await act(async () => { mounted.root.findByProps({ placeholder }).props.onChange({ target: { value } }); });
      },
      submit: async () => {
        await act(async () => { await mounted.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
      },
      click: async label => {
        const button = mounted.root.find(n => n.type === 'button' && (renderedText(n) === label || n.props['aria-label'] === label));
        await act(async () => { button.props.onClick(); });
      },
    });
  } finally {
    const mounted = renderer;
    if (mounted) await act(async () => { mounted.unmount(); });
    httpClient.defaults.adapter = originalAdapter;
  }
}

const input = (h: Harness, placeholder: string) => h.renderer.root.findByProps({ placeholder });
const dialogs = (h: Harness) => h.renderer.root.findAll(n => n.type === 'div' && n.props.role === 'dialog');

// [F-01] ───────────────────────────────────────────────────────────────────
test('[F-01] renderiza correo, contraseña, mostrar contraseña, «¿Olvidaste tu contraseña?» y el envío; sin inicio de sesión social', async () => {
  await withLogin(null, async h => {
    assert.equal(input(h, EMAIL).props.type, 'email');
    assert.equal(input(h, PASSWORD).props.type, 'password');
    assert.ok(h.renderer.root.findByProps({ 'aria-label': 'Mostrar contraseña' }));
    assert.equal(h.renderer.root.findAll(n => n.type === 'button' && renderedText(n) === '¿Olvidaste tu contraseña?').length, 1);
    const submit = h.renderer.root.findByProps({ type: 'submit' });
    assert.match(renderedText(submit), /Iniciar Sesión de Control/);
    assert.equal(h.renderer.root.findByType('form').props.noValidate, true, 'los mensajes por campo no los tapa la validación nativa');
    // RF-01 solo define correo y contraseña.
    assert.doesNotMatch(h.text(), /Google|Apple|Microsoft|autenticar con|ingresar con/);
    assert.equal(dialogs(h).length, 0);
  });
});

// [F-02] ───────────────────────────────────────────────────────────────────
test('[F-02] campos vacíos: mensaje por campo, sin petición; cada error se limpia al escribir en su campo', async () => {
  await withLogin(null, async h => {
    await h.submit();
    assert.match(h.text(), /El correo es obligatorio\./);
    assert.match(h.text(), /La contraseña es obligatoria\./);
    assert.equal(h.requests.length, 0);
    assert.equal(input(h, EMAIL).props['aria-invalid'], true);
    assert.equal(input(h, EMAIL).props['aria-describedby'], 'login-admin-email-error');
    assert.equal(h.renderer.root.findByProps({ id: 'login-admin-email-error' }).children.join(''), 'El correo es obligatorio.');
    assert.equal(input(h, PASSWORD).props['aria-invalid'], true);
    assert.equal(h.renderer.root.findByProps({ id: 'login-admin-password-error' }).children.join(''), 'La contraseña es obligatoria.');

    await h.type(EMAIL, 'a');
    assert.doesNotMatch(h.text(), /El correo es obligatorio/);
    assert.equal(input(h, EMAIL).props['aria-invalid'], undefined);
    assert.equal(input(h, EMAIL).props['aria-describedby'], undefined);
    assert.match(h.text(), /La contraseña es obligatoria/, 'el otro campo conserva su error');

    await h.type(PASSWORD, 'x');
    assert.doesNotMatch(h.text(), /La contraseña es obligatoria/);
    assert.equal(input(h, PASSWORD).props['aria-invalid'], undefined);
    assert.equal(h.requests.length, 0);
  });
});

// [F-03] ───────────────────────────────────────────────────────────────────
test('[F-03] correo con formato inválido: mensaje propio y sin petición; un correo válido limpia el error', async () => {
  await withLogin(null, async h => {
    for (const value of ['correosinformato', 'a@b', 'con espacio@coraula.local', '   ']) {
      await h.type(EMAIL, value);
      await h.type(PASSWORD, 'synthetic-test-password');
      await h.submit();
      assert.match(h.text(), value.trim() ? /El formato de correo no es válido\./ : /El correo es obligatorio\./, value);
    }
    assert.equal(h.requests.length, 0);
    await h.type(EMAIL, 'admin@coraula.local');
    assert.doesNotMatch(h.text(), /El formato de correo no es válido/);
  });
});

// [F-04] ───────────────────────────────────────────────────────────────────
test('[F-04] mostrar y ocultar la contraseña alterna entre password y text', async () => {
  await withLogin(null, async h => {
    assert.equal(input(h, PASSWORD).props.type, 'password');
    await h.click('Mostrar contraseña');
    assert.equal(input(h, PASSWORD).props.type, 'text');
    assert.ok(h.renderer.root.findByProps({ 'aria-label': 'Ocultar contraseña' }));
    await h.click('Ocultar contraseña');
    assert.equal(input(h, PASSWORD).props.type, 'password');
  });
});

// [F-05] ───────────────────────────────────────────────────────────────────
test('[F-05] credenciales válidas: un POST /v1/auth/login, sesión en el contexto y redirección a /administrador', async () => {
  const reply = () => ({ token: 'synthetic-admin-token', tokenType: 'Bearer', role: 'ADMINISTRADOR', passwordChangeRequired: false });
  await withLogin(reply, async h => {
    await h.type(EMAIL, 'admin@coraula.local');
    await h.type(PASSWORD, 'synthetic-test-password');
    await h.submit();
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].method, 'post');
    assert.equal(h.requests[0].url, '/v1/auth/login');
    assert.deepEqual(JSON.parse(String(h.requests[0].data)), { email: 'admin@coraula.local', password: 'synthetic-test-password' });
    assert.deepEqual(h.loginCalls, [['synthetic-admin-token', 'ADMINISTRADOR']]);
    assert.deepEqual(h.navigations, [{ method: 'push', href: '/administrador' }]);
    assert.equal(h.renderer.root.findAll(n => n.props.role === 'alert').length, 0);
  });
});

// [F-06] ───────────────────────────────────────────────────────────────────
test('[F-06] «¿Olvidaste tu contraseña?»: modal honesto con texto fijo, sin campos, sin peticiones y sin «enviado»', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  await withLogin(null, async h => {
    assert.doesNotMatch(h.text(), PALABRAS_DE_ENVIO);
    await h.click('¿Olvidaste tu contraseña?');

    const [dialog] = dialogs(h);
    assert.ok(dialog, 'se abre un diálogo');
    const dialogText = renderedText(dialog);
    assert.equal(dialog.props['aria-modal'], 'true');
    assert.equal(renderedText(h.renderer.root.findByProps({ id: dialog.props['aria-labelledby'] })), 'Recuperar acceso');
    assert.equal(renderedText(h.renderer.root.findByProps({ id: dialog.props['aria-describedby'] })), RECUPERACION_CONTRASENA_TEXTO);
    assert.equal(RECUPERACION_CONTRASENA_TEXTO, 'Para restablecer tu contraseña, comunícate con Secretaría o la Dirección del colegio. Te entregarán una contraseña temporal que deberás cambiar al ingresar.');
    assert.equal(dialog.findAll(n => n.type === 'input' || n.type === 'form' || n.type === 'textarea').length, 0, 'no pide correo ni código');
    assert.deepEqual(dialog.findAll(n => n.type === 'button').map(b => b.props['aria-label'] ?? renderedText(b)), ['Cerrar', 'Entendido']);
    assert.doesNotMatch(h.text(), PALABRAS_DE_ENVIO);

    // El paso del tiempo no cambia nada: no hay envíos simulados.
    await act(async () => { t.mock.timers.tick(10_000); });
    assert.equal(renderedText(dialogs(h)[0]), dialogText);
    assert.doesNotMatch(h.text(), PALABRAS_DE_ENVIO);

    await h.click('Entendido');
    assert.equal(dialogs(h).length, 0);
    assert.doesNotMatch(h.text(), PALABRAS_DE_ENVIO);

    // La X también cierra, y al reabrir se ve lo mismo.
    await h.click('¿Olvidaste tu contraseña?');
    assert.equal(renderedText(dialogs(h)[0]), dialogText);
    await h.click('Cerrar');
    assert.equal(dialogs(h).length, 0);

    assert.equal(h.requests.length, 0, 'ninguna petición');
  });
});

// [F-07] ───────────────────────────────────────────────────────────────────
test('[F-07] estado inicial limpio: campos vacíos, contraseña oculta, envío habilitado, sin errores ni diálogo', async () => {
  await withLogin(null, async h => {
    assert.equal(input(h, EMAIL).props.value, '');
    assert.equal(input(h, PASSWORD).props.value, '');
    assert.equal(input(h, PASSWORD).props.type, 'password');
    assert.equal(input(h, EMAIL).props['aria-invalid'], undefined);
    assert.equal(h.renderer.root.findByProps({ type: 'submit' }).props.disabled, false);
    assert.equal(h.renderer.root.findAll(n => n.props.role === 'alert').length, 0);
    assert.doesNotMatch(h.text(), /obligatori|no es válido/);
    assert.equal(dialogs(h).length, 0);
    assert.equal(h.requests.length, 0);
  });
});
