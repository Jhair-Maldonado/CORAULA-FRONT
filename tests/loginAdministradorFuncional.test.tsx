import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import LoginAdministrador from '../feature/login/admin/loginAdministrador';
import { AuthContext } from '../src/contexts/AuthContext';
import { authService, type LoginResponse } from '../src/services/authService';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function renderedText(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : renderedText(child)).join('');
}

interface TestSetup {
  renderer: ReactTestRenderer;
  navigations: { method: 'push' | 'replace'; href: string }[];
  loginContextCalls: [string, LoginResponse['role']][];
}

async function renderLogin(options: {
  loginMock?: (email: string, pass: string) => Promise<LoginResponse>;
} = {}): Promise<TestSetup> {
  const navigations: { method: 'push' | 'replace'; href: string }[] = [];
  const loginContextCalls: [string, LoginResponse['role']][] = [];

  const router: AppRouterInstance = {
    back() {}, forward() {}, refresh() {}, prefetch() {},
    bfcacheId: 'login-funcional-test',
    push: href => navigations.push({ method: 'push', href }),
    replace: href => navigations.push({ method: 'replace', href }),
  };

  const authValue: React.ContextType<typeof AuthContext> = {
    token: null,
    role: null,
    status: 'unauthenticated',
    sessionValid: false,
    passwordChangeRequired: false,
    login: (token, role) => {
      loginContextCalls.push([token, role]);
    },
    logout: () => {},
    validateSession: () => false,
    isSessionPhysicallyValid: () => false,
  };

  if (options.loginMock) {
    authService.login = options.loginMock;
  }

  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <AppRouterContext.Provider value={router}>
        <AuthContext.Provider value={authValue}>
          <LoginAdministrador />
        </AuthContext.Provider>
      </AppRouterContext.Provider>
    );
  });

  return { renderer, navigations, loginContextCalls };
}

// ---------------------------------------------------------------------------
// [F-01] Renderizado de campos y botones
// ---------------------------------------------------------------------------
test('[F-01] Renderizado de campos y botones principales del login administrador', async () => {
  const { renderer } = await renderLogin();
  const root = renderer.root;

  // Campos de texto
  const emailInput = root.findByProps({ placeholder: 'Correo de gestión / docente' });
  const passwordInput = root.findByProps({ placeholder: 'Contraseña de seguridad' });
  assert.ok(emailInput, 'El campo de correo debe estar renderizado');
  assert.ok(passwordInput, 'El campo de contraseña debe estar renderizado');

  // Botones principales
  const toggleBtn = root.findByProps({ 'aria-label': 'Mostrar contraseña' });
  const forgotBtn = root.findAll(n => n.type === 'button' && renderedText(n).includes('¿Olvidaste tu contraseña?'));
  const submitBtn = root.findByProps({ type: 'submit' });

  assert.ok(toggleBtn, 'El botón de visibilidad de contraseña debe estar renderizado');
  assert.equal(forgotBtn.length, 1, 'El botón de recuperación de contraseña debe estar renderizado');
  assert.ok(renderedText(submitBtn).includes('Iniciar Sesión de Control'), 'El botón submit debe existir con su texto');
});

// ---------------------------------------------------------------------------
// [F-02] Validación de campos vacíos
// ---------------------------------------------------------------------------
test('[F-02] Validación de campos vacíos al enviar el formulario', async () => {
  let loginCalled = false;
  const originalLogin = authService.login;
  authService.login = async () => {
    loginCalled = true;
    throw new Error('No debe llamarse');
  };

  try {
    const { renderer } = await renderLogin();
    const form = renderer.root.findByType('form');

    // Envío del formulario sin ingresar datos
    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} });
    });

    const text = renderedText(renderer.root);
    assert.ok(text.includes('El correo es obligatorio.'), 'Debe indicar que el correo es obligatorio');
    assert.ok(text.includes('La contraseña es obligatoria.'), 'Debe indicar que la contraseña es obligatoria');
    assert.equal(loginCalled, false, 'authService.login no debe ser llamado cuando hay campos vacíos');
  } finally {
    authService.login = originalLogin;
  }
});

// ---------------------------------------------------------------------------
// [F-03] Formato de correo inválido
// ---------------------------------------------------------------------------
test('[F-03] Validación de formato de correo inválido', async () => {
  let loginCalled = false;
  const originalLogin = authService.login;
  authService.login = async () => {
    loginCalled = true;
    throw new Error('No debe llamarse');
  };

  try {
    const { renderer } = await renderLogin();
    const emailInput = renderer.root.findByProps({ placeholder: 'Correo de gestión / docente' });
    const passwordInput = renderer.root.findByProps({ placeholder: 'Contraseña de seguridad' });
    const form = renderer.root.findByType('form');

    // Ingresar correo sin formato válido y contraseña
    await act(async () => {
      emailInput.props.onChange({ target: { value: 'correosinformato' } });
      passwordInput.props.onChange({ target: { value: 'password123' } });
    });

    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} });
    });

    const text = renderedText(renderer.root);
    assert.ok(text.includes('El formato de correo no es válido.'), 'Debe mostrar error de formato de correo inválido');
    assert.equal(loginCalled, false, 'authService.login no debe ser llamado con correo inválido');
  } finally {
    authService.login = originalLogin;
  }
});

// ---------------------------------------------------------------------------
// [F-04] Alternar visibilidad de contraseña
// ---------------------------------------------------------------------------
test('[F-04] Alternar visibilidad de contraseña entre password y text', async () => {
  const { renderer } = await renderLogin();
  const passwordInput = renderer.root.findByProps({ placeholder: 'Contraseña de seguridad' });
  const toggleBtn = renderer.root.findByProps({ 'aria-label': 'Mostrar contraseña' });

  // Estado inicial
  assert.equal(passwordInput.props.type, 'password');
  assert.equal(toggleBtn.props['aria-label'], 'Mostrar contraseña');

  // Primer clic: mostrar contraseña
  await act(async () => {
    toggleBtn.props.onClick();
  });

  const visibleInput = renderer.root.findByProps({ placeholder: 'Contraseña de seguridad' });
  const hideBtn = renderer.root.findByProps({ 'aria-label': 'Ocultar contraseña' });
  assert.equal(visibleInput.props.type, 'text');
  assert.equal(hideBtn.props['aria-label'], 'Ocultar contraseña');

  // Segundo clic: ocultar contraseña
  await act(async () => {
    hideBtn.props.onClick();
  });

  const hiddenInput = renderer.root.findByProps({ placeholder: 'Contraseña de seguridad' });
  assert.equal(hiddenInput.props.type, 'password');
});

// ---------------------------------------------------------------------------
// [F-05] Autenticación exitosa y redirección a /administrador (servicio simulado)
// ---------------------------------------------------------------------------
test('[F-05] Autenticación exitosa y redirección a /administrador con servicio simulado', async () => {
  const originalLogin = authService.login;
  let receivedCredentials: { email: string; pass: string } | null = null;

  authService.login = async (email, pass) => {
    receivedCredentials = { email, pass };
    return {
      token: 'fake-jwt-token-admin',
      tokenType: 'Bearer',
      role: 'ADMINISTRADOR',
      passwordChangeRequired: false,
    };
  };

  try {
    const { renderer, navigations, loginContextCalls } = await renderLogin();
    const emailInput = renderer.root.findByProps({ placeholder: 'Correo de gestión / docente' });
    const passwordInput = renderer.root.findByProps({ placeholder: 'Contraseña de seguridad' });
    const form = renderer.root.findByType('form');

    await act(async () => {
      emailInput.props.onChange({ target: { value: 'admin@coraula.local' } });
      passwordInput.props.onChange({ target: { value: 'admin1234' } });
    });

    await act(async () => {
      await form.props.onSubmit({ preventDefault() {} });
    });

    // Verificación de credenciales pasadas al servicio
    assert.deepEqual(receivedCredentials, { email: 'admin@coraula.local', pass: 'admin1234' });

    // Verificación de sesión guardada en contexto
    assert.deepEqual(loginContextCalls, [['fake-jwt-token-admin', 'ADMINISTRADOR']]);

    // Verificación de redirección al dashboard administrador
    assert.ok(navigations.some(n => n.method === 'push' && n.href === '/administrador'), 'Debe redirigir a /administrador');
  } finally {
    authService.login = originalLogin;
  }
});

// ---------------------------------------------------------------------------
// [F-06] Modal de recuperación de contraseña
// ---------------------------------------------------------------------------
test('[F-06] Flujo completo del modal de recuperación de contraseña', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { renderer } = await renderLogin();

  // Abrir modal
  const forgotBtn = renderer.root.find(n => n.type === 'button' && renderedText(n).includes('¿Olvidaste tu contraseña?'));
  await act(async () => {
    forgotBtn.props.onClick();
  });

  // Paso 1: renderizado
  let text = renderedText(renderer.root);
  assert.ok(text.includes('Recuperar acceso'));
  assert.ok(text.includes('Paso 1 de 2: Ingresa tu correo'));

  const modalForm = renderer.root.findAllByType('form')[1];
  const modalEmailInput = renderer.root.findAll(n => n.props.placeholder === 'Correo de gestión / docente')[1];

  // Intento de envío con correo vacío
  await act(async () => {
    modalForm.props.onSubmit({ preventDefault() {} });
  });
  text = renderedText(renderer.root);
  assert.ok(text.includes('El correo es obligatorio.'));

  // Intento de envío con formato inválido
  await act(async () => {
    modalEmailInput.props.onChange({ target: { value: 'correoinvalido' } });
  });
  await act(async () => {
    modalForm.props.onSubmit({ preventDefault() {} });
  });
  text = renderedText(renderer.root);
  assert.ok(text.includes('El formato de correo no es válido.'));

  // Envío exitoso con correo válido
  await act(async () => {
    modalEmailInput.props.onChange({ target: { value: 'valido@coraula.local' } });
  });
  await act(async () => {
    modalForm.props.onSubmit({ preventDefault() {} });
  });

  // Avanzar temporizador para paso 2
  await act(async () => {
    t.mock.timers.tick(1000);
  });

  // Paso 2: Código enviado
  text = renderedText(renderer.root);
  assert.ok(text.includes('Código enviado'));
  assert.ok(text.includes('Paso 2 de 2: Verifica el código'));

  // Verificar código
  const verifyForm = renderer.root.findAllByType('form')[1];
  await act(async () => {
    verifyForm.props.onSubmit({ preventDefault() {} });
  });
  await act(async () => {
    t.mock.timers.tick(1000);
  });

  // Paso 3: Autenticación exitosa
  text = renderedText(renderer.root);
  assert.ok(text.includes('¡Autenticación Exitosa!'));

  // Cerrar modal
  const volverBtn = renderer.root.find(n => n.type === 'button' && renderedText(n).includes('Volver al inicio'));
  await act(async () => {
    volverBtn.props.onClick();
  });

  // Modal cerrado
  assert.equal(renderer.root.findAll(n => renderedText(n).includes('¡Autenticación Exitosa!')).length, 0);
});

// ---------------------------------------------------------------------------
// [F-07] Estado inicial del formulario
// ---------------------------------------------------------------------------
test('[F-07] Estado inicial limpio del formulario de login', async () => {
  const { renderer } = await renderLogin();
  const root = renderer.root;

  const emailInput = root.findByProps({ placeholder: 'Correo de gestión / docente' });
  const passwordInput = root.findByProps({ placeholder: 'Contraseña de seguridad' });
  const submitBtn = root.findByProps({ type: 'submit' });

  assert.equal(emailInput.props.value, '', 'El campo correo debe iniciar vacío');
  assert.equal(passwordInput.props.value, '', 'El campo contraseña debe iniciar vacío');
  assert.equal(passwordInput.props.type, 'password', 'La contraseña debe iniciar oculta (type password)');
  assert.equal(submitBtn.props.disabled, false, 'El botón de envío debe iniciar habilitado');

  // Ausencia de errores y modal cerrado
  assert.equal(root.findAll(n => n.props.role === 'alert').length, 0, 'No debe haber alertas iniciales');
  assert.equal(root.findAll(n => renderedText(n).includes('Recuperar acceso')).length, 0, 'El modal de recuperación debe iniciar cerrado');
});
