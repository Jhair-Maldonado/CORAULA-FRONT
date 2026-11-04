import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { InternalAxiosRequestConfig } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import StudentLoginPage from '../src/app/login/page';
import LoginUsuario from '../feature/login/users/LoginUsuario';
import { RECUPERACION_CONTRASENA_TEXTO } from '../feature/login/component/modalRecuperacionContrasena';
import { AuthContext } from '../src/contexts/AuthContext';
import httpClient from '../src/services/httpClient';

// Login de estudiantes y familias (/login) y su copia LoginUsuario (FRONT #35): recuperación honesta (F-06) y sin
// inicio de sesión social. Sin red: el adaptador de httpClient se sustituye y cuenta cada petición.
// next/link en Node usa el Link del pages router, cuyo useIntersection llama a requestIdleCallback (usa `self`).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const PALABRAS_DE_ENVIO = /enviad[oa]|código|autenticación exitosa|verificación exitosa/i;

function renderedText(node: ReactTestInstance): string {
  return node.children.map(child => (typeof child === 'string' ? child : renderedText(child))).join('');
}

const guest: Auth = {
  token: null, role: null, status: 'unauthenticated', sessionValid: false, passwordChangeRequired: false,
  login() {}, logout() {}, validateSession: () => false, isSessionPhysicallyValid: () => false,
};
const router: AppRouterInstance = {
  back() {}, forward() {}, refresh() {}, prefetch() {}, bfcacheId: 'login-usuario-test', push() {}, replace() {},
};

async function withPage(page: React.ReactElement, run: (renderer: ReactTestRenderer, requests: InternalAxiosRequestConfig[]) => Promise<void>) {
  const requests: InternalAxiosRequestConfig[] = [];
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => { requests.push(config); throw new Error(`Petición inesperada: ${config.url}`); };
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <AuthContext.Provider value={guest}>{page}</AuthContext.Provider>
        </AppRouterContext.Provider>,
      );
    });
    await run(renderer!, requests);
  } finally {
    const mounted = renderer;
    if (mounted) await act(async () => { mounted.unmount(); });
    httpClient.defaults.adapter = originalAdapter;
  }
}

const pages = [
  { name: '/login (src/app/login/page.tsx)', page: () => <StudentLoginPage /> },
  { name: 'LoginUsuario', page: () => <LoginUsuario /> },
];

for (const { name, page } of pages) {
  test(`[F-06] ${name}: «¿Olvidaste tu contraseña?» abre el modal honesto, sin campos, sin peticiones y sin «enviado»`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
    await withPage(page(), async (renderer, requests) => {
      const text = () => renderedText(renderer.root);
      const dialogs = () => renderer.root.findAll(n => n.type === 'div' && n.props.role === 'dialog');
      const click = async (label: string) => {
        const button = renderer.root.find(n => n.type === 'button' && (renderedText(n) === label || n.props['aria-label'] === label));
        await act(async () => { button.props.onClick(); });
      };

      assert.equal(dialogs().length, 0);
      assert.doesNotMatch(text(), PALABRAS_DE_ENVIO);
      await click('¿Olvidaste tu contraseña?');

      const [dialog] = dialogs();
      assert.ok(dialog, 'se abre un diálogo');
      const dialogText = renderedText(dialog);
      assert.equal(dialog.props['aria-modal'], 'true');
      assert.equal(renderedText(renderer.root.findByProps({ id: dialog.props['aria-labelledby'] })), 'Recuperar acceso');
      assert.equal(renderedText(renderer.root.findByProps({ id: dialog.props['aria-describedby'] })), RECUPERACION_CONTRASENA_TEXTO);
      assert.equal(dialog.findAll(n => n.type === 'input' || n.type === 'form' || n.type === 'textarea').length, 0, 'no pide correo ni código');
      assert.deepEqual(dialog.findAll(n => n.type === 'button').map(b => b.props['aria-label'] ?? renderedText(b)), ['Cerrar', 'Entendido']);
      assert.doesNotMatch(text(), PALABRAS_DE_ENVIO);

      await act(async () => { t.mock.timers.tick(10_000); });
      assert.equal(renderedText(dialogs()[0]), dialogText, 'el paso del tiempo no cambia nada');
      assert.doesNotMatch(text(), PALABRAS_DE_ENVIO);

      await click('Entendido');
      assert.equal(dialogs().length, 0);
      await click('¿Olvidaste tu contraseña?');
      await click('Cerrar');
      assert.equal(dialogs().length, 0);
      assert.doesNotMatch(text(), PALABRAS_DE_ENVIO);
      assert.equal(requests.length, 0, 'ninguna petición');
    });
  });

  test(`${name}: sin botones de inicio de sesión social (RF-01 solo define correo y contraseña)`, async () => {
    await withPage(page(), async renderer => {
      assert.doesNotMatch(renderedText(renderer.root), /Google|Apple|Microsoft|ingresar con|autenticar con|continúa con/);
      const buttons = renderer.root.findAll(n => n.type === 'button').map(b => b.props['aria-label'] ?? renderedText(b));
      assert.deepEqual(buttons, ['Mostrar contraseña', '¿Olvidaste tu contraseña?', 'Acceder a la Plataforma']);
    });
  });
}
