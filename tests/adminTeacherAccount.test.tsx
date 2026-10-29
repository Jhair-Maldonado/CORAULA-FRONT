import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PerfilDelDocente from '../feature/admin/vistas/(academico)/docente/perfilDelDocente';
import { AuthContext } from '../src/contexts/AuthContext';
import { accountEmailError, teacherAccountErrorMessage, teachersService } from '../src/services/admin/teachersService';
import httpClient from '../src/services/httpClient';
import { toAdminTeacherDetail } from '../src/adapters/teacherAdapter';
import type { TeacherAccountResponse, TeacherAccountStatusResponse, TeacherDetailResponse } from '../src/types/teacherApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const email = 'docente.prueba@example.com';
const detail = (overrides: Partial<TeacherDetailResponse> = {}): TeacherDetailResponse => ({
  id: 7, dni: '00000007', firstNames: 'Docente', paternalLastName: 'Sintético', maternalLastName: null, fullName: 'Docente Sintético',
  phone: null, specialty: null, active: true, assignments: [], account: null, ...overrides,
});
const status = (active = true): TeacherAccountStatusResponse => ({ userId: 70, email, active });
const account = (created = true): TeacherAccountResponse => ({ userId: 70, teacherId: 7, email, role: 'DOCENTE', created });
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const httpError = (status?: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

type ViewOptions = { role?: Auth['role']; teacher?: TeacherDetailResponse; read?: typeof teachersService.getById;
  createAccount?: typeof teachersService.createAccount; update?: typeof teachersService.update };

// Simulates the backend: a successful POST persists the account, which later GETs return.
async function view(options: ViewOptions,
  run: (h: { text: () => string; button: (label: string) => ReactTestInstance | undefined; click: (label: string) => Promise<void>;
    type: (value: string) => Promise<void>; submit: () => Promise<void>; change: (placeholder: string, value: string) => Promise<void> }) => Promise<void>) {
  const oldRead = teachersService.getById, oldCreate = teachersService.createAccount, oldUpdate = teachersService.update;
  let persisted = options.teacher ?? detail();
  teachersService.getById = options.read ?? (async () => persisted);
  teachersService.createAccount = async (id, payload) => {
    const created = await (options.createAccount ?? (async () => account()))(id, payload);
    persisted = { ...persisted, account: persisted.account ?? { userId: created.userId, email: created.email, active: true } };
    return created;
  };
  if (options.update) teachersService.update = options.update;
  const oldSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  const auth: Auth = { token: 'synthetic', role: options.role ?? 'ADMINISTRADOR', status: 'authenticated', sessionValid: true,
    login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<AuthContext.Provider value={auth}><PathParamsContext.Provider value={{ id: '7' }}><PerfilDelDocente /></PathParamsContext.Provider></AuthContext.Provider>);
    });
    const button = (label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);
    await run({
      text: () => text(renderer.root), button,
      click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false, label); await act(async () => { node.props.onClick(); }); },
      type: async value => { await act(async () => { renderer.root.findByProps({ 'aria-label': 'Correo del docente' }).props.onChange({ target: { value } }); }); },
      submit: async () => { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); },
      change: async (placeholder, value) => { await act(async () => { renderer.root.findByProps({ placeholder }).props.onChange({ target: { value } }); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    teachersService.getById = oldRead; teachersService.createAccount = oldCreate; teachersService.update = oldUpdate;
    if (oldSelf) Object.defineProperty(globalThis, 'self', oldSelf); else Reflect.deleteProperty(globalThis, 'self');
  }
}

test('createAccount posts the email to the teacher account endpoint and rejects mismatched responses', async () => {
  const original = httpClient.defaults.adapter;
  let response: unknown = account(), status = 201, calls = 0;
  httpClient.defaults.adapter = async config => {
    calls++; assert.equal(config.method, 'post'); assert.equal(config.url, '/v1/management/teachers/7/account');
    assert.deepEqual(JSON.parse(config.data), { email });
    return { config, data: response, status, statusText: 'OK', headers: {} };
  };
  try {
    assert.deepEqual(await teachersService.createAccount('7', { email }), account());
    status = 200; response = account(false);
    assert.equal((await teachersService.createAccount('7', { email })).created, false);
    for (const bad of [{ ...account(), teacherId: 8 }, { ...account(), role: 'ESTUDIANTE' }, { ...account(), created: undefined }, null]) {
      response = bad; await assert.rejects(teachersService.createAccount('7', { email }));
    }
    assert.equal(calls, 6);
  } finally { httpClient.defaults.adapter = original; }
});

test('createAccount encodes the teacher id in the path', async () => {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    assert.equal(config.url, '/v1/management/teachers/a%2Fb/account');
    return { config, data: { ...account(), teacherId: 'a/b' }, status: 201, statusText: 'OK', headers: {} };
  };
  try { await teachersService.createAccount('a/b', { email }); } finally { httpClient.defaults.adapter = original; }
});

test('email validation mirrors the backend policy', () => {
  assert.equal(accountEmailError(email), null);
  assert.equal(accountEmailError('  Docente@Example.COM '), null);
  assert.match(accountEmailError('   ') ?? '', /Ingresa el correo/);
  for (const bad of ['sin-arroba', 'a@b', 'a@-b.com', 'a b@c.com', '@c.com']) assert.match(accountEmailError(bad) ?? '', /formato válido/, bad);
  assert.match(accountEmailError(`${'a'.repeat(250)}@b.com`) ?? '', /255/);
});

test('error messages are fixed Spanish texts and never echo the backend body', () => {
  const expected: Record<number, RegExp> = {
    400: /DNI registrado/, 401: /sesión expiró/, 403: /No tienes autorización/, 404: /Docente no encontrado/,
    409: /en uso por otra cuenta/, 422: /inactivo/, 500: /servidor no pudo/,
  };
  for (const [status, pattern] of Object.entries(expected)) {
    const message = teacherAccountErrorMessage(httpError(Number(status)));
    assert.match(message, pattern); assert.doesNotMatch(message, /PRIVATE/);
  }
  assert.match(teacherAccountErrorMessage(httpError()), /conectar con el servidor/);
  assert.match(teacherAccountErrorMessage(new Error('PRIVATE')), /No se pudo completar/);
});

test('only ADMINISTRADOR sees the create-account action', async () => {
  await view({ role: 'ADMINISTRADOR' }, async h => { assert.ok(h.button('Crear cuenta de acceso')); });
  for (const role of ['DIRECTIVO', 'DOCENTE'] as const) {
    await view({ role }, async h => { assert.equal(h.button('Crear cuenta de acceso'), undefined, role); });
  }
});

test('the action is disabled for inactive teachers or teachers without DNI', async () => {
  for (const teacher of [detail({ active: false }), detail({ dni: '' })]) {
    await view({ teacher }, async h => {
      assert.equal(h.button('Crear cuenta de acceso')?.props.disabled, true);
      assert.match(h.text(), /debe estar activo y tener DNI registrado/);
    });
  }
});

test('invalid emails are blocked before the confirmation step', async () => {
  let calls = 0;
  await view({ createAccount: async () => { calls++; return account(); } }, async h => {
    await h.click('Crear cuenta de acceso');
    await h.type('correo-invalido'); await h.submit();
    assert.match(h.text(), /formato válido/); assert.equal(h.button('Confirmar'), undefined);
    assert.equal(calls, 0);
  });
});

test('confirmation: cancel does not send; confirm sends once and shows the created account', async () => {
  const pending = deferred<TeacherAccountResponse>();
  const requests: [string, { email: string }][] = [];
  await view({ createAccount: async (id, payload) => { requests.push([id, payload]); return pending.promise; } }, async h => {
    await h.click('Crear cuenta de acceso');
    await h.type('  Docente.Prueba@Example.com '); await h.submit();
    assert.match(h.text(), new RegExp(`Se creará la cuenta de acceso para ${email}\\. ¿Confirmar\\?`));
    await h.click('Cancelar');
    assert.equal(requests.length, 0);
    assert.equal(h.button('Confirmar'), undefined);

    await h.submit();
    const confirm = h.button('Confirmar');
    assert.ok(confirm);
    await act(async () => { confirm.props.onClick(); confirm.props.onClick(); });
    assert.equal(h.button('Creando...')?.props.disabled, true);
    assert.deepEqual(requests, [['7', { email }]]);

    await act(async () => { pending.resolve(account(true)); });
    assert.equal(requests.length, 1);
    assert.match(h.text(), /La contraseña inicial es el DNI del docente; pídele que la cambie\./);
    assert.match(h.text(), new RegExp(`Cuenta de acceso: ${email} · Cuenta activa`));
    assert.equal(h.button('Crear cuenta de acceso'), undefined);
  });
});

test('an existing account (200) is shown without claiming the password is the DNI', async () => {
  await view({ createAccount: async () => account(false) }, async h => {
    await h.click('Crear cuenta de acceso'); await h.type(email); await h.submit(); await h.click('Confirmar');
    assert.match(h.text(), /ya tenía una cuenta con .* No se modificó su contraseña/);
    assert.doesNotMatch(h.text(), /contraseña inicial es el DNI/);
    assert.equal(h.button('Crear cuenta de acceso'), undefined);
  });
});

test('backend errors keep the modal open with a Spanish message and allow retrying', async () => {
  for (const status of [400, 403, 404, 409, 422]) {
    let calls = 0;
    await view({ createAccount: async () => { calls++; if (calls === 1) throw httpError(status); return account(); } }, async h => {
      await h.click('Crear cuenta de acceso'); await h.type(email); await h.submit(); await h.click('Confirmar');
      assert.equal(h.text().includes(teacherAccountErrorMessage(httpError(status))), true, String(status));
      assert.doesNotMatch(h.text(), /PRIVATE/);
      assert.ok(h.button('Continuar'), String(status));
      await h.submit(); await h.click('Confirmar');
      assert.equal(calls, 2);
      assert.match(h.text(), /Cuenta activa/);
    });
  }
});

test('toAdminTeacherDetail copies the account state and accepts null', () => {
  assert.equal(toAdminTeacherDetail(detail()).account, null);
  assert.deepEqual(toAdminTeacherDetail(detail({ account: status(true) })).account, status(true));
  assert.deepEqual(toAdminTeacherDetail(detail({ account: status(false) })).account, status(false));
});

test('toAdminTeacherDetail rejects an invalid account shape', () => {
  const bad: unknown[] = [undefined, 'cuenta', [], {}, { userId: 70, email }, { ...status(), role: 'DOCENTE' }, { ...status(), passwordHash: 'x' },
    { ...status(), userId: '70' }, { ...status(), userId: 1.5 }, { ...status(), email: '' }, { ...status(), email: null }, { ...status(), active: 'true' }];
  for (const account of bad) {
    assert.throws(() => toAdminTeacherDetail({ ...detail(), account } as unknown as TeacherDetailResponse), /Estado de cuenta docente inesperado/, JSON.stringify(account));
  }
});

test('the profile shows the persisted account state to both reader roles', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
    await view({ role }, async h => {
      assert.match(h.text(), /El docente no tiene cuenta de acceso\./, role);
      assert.equal(!!h.button('Crear cuenta de acceso'), role === 'ADMINISTRADOR', role);
    });
    await view({ role, teacher: detail({ account: status(true) }) }, async h => {
      assert.match(h.text(), new RegExp(`Cuenta de acceso: ${email} · Cuenta activa`), role);
      assert.doesNotMatch(h.text(), /Cuenta deshabilitada|no tiene cuenta/, role);
      assert.equal(h.button('Crear cuenta de acceso'), undefined, role);
    });
    await view({ role, teacher: detail({ account: status(false) }) }, async h => {
      assert.match(h.text(), new RegExp(`Cuenta de acceso: ${email} · Cuenta deshabilitada`), role);
      assert.doesNotMatch(h.text(), /Cuenta activa|debe estar activo y tener DNI/, role);
      assert.equal(h.button('Crear cuenta de acceso'), undefined, role);
    });
  }
});

test('an inactive teacher with a disabled account is not offered another account', async () => {
  await view({ teacher: detail({ active: false, account: status(false) }) }, async h => {
    assert.match(h.text(), /Cuenta deshabilitada/);
    assert.equal(h.button('Crear cuenta de acceso'), undefined);
    assert.doesNotMatch(h.text(), /debe estar activo y tener DNI/);
  });
});

test('after creating the account the detail is read again and its state persists on reload', async () => {
  let reads = 0, persisted = detail();
  const read = async () => { reads++; return persisted; };
  const createAccount = async () => { persisted = detail({ account: status(false) }); return account(true); };
  await view({ read, createAccount }, async h => {
    assert.equal(reads, 1);
    await h.click('Crear cuenta de acceso'); await h.type(email); await h.submit(); await h.click('Confirmar');
    assert.equal(reads, 2);
    // The state comes from the GET, not from the POST response (which has no `active`).
    assert.match(h.text(), /Cuenta deshabilitada/);
    assert.equal(h.button('Crear cuenta de acceso'), undefined);
  });
  await view({ read, createAccount: async () => assert.fail('no POST on reload') }, async h => {
    assert.equal(reads, 3);
    assert.match(h.text(), new RegExp(`Cuenta de acceso: ${email} · Cuenta deshabilitada`));
    assert.equal(h.button('Crear cuenta de acceso'), undefined);
  });
});

test('a failed re-read after creating the account can be retried', async () => {
  let reads = 0, persisted = detail();
  const read = async () => { reads++; if (reads === 2) throw httpError(500); return persisted; };
  const createAccount = async () => { persisted = detail({ account: status(true) }); return account(true); };
  await view({ read, createAccount }, async h => {
    await h.click('Crear cuenta de acceso'); await h.type(email); await h.submit(); await h.click('Confirmar');
    assert.match(h.text(), /No se pudo actualizar el estado de la cuenta\./);
    assert.match(h.text(), /La contraseña inicial es el DNI/);
    assert.doesNotMatch(h.text(), /PRIVATE/);
    await h.click('Actualizar estado');
    assert.equal(reads, 3);
    assert.doesNotMatch(h.text(), /No se pudo actualizar el estado/);
    assert.match(h.text(), /Cuenta activa/);
  });
});

test('an invalid account shape in the GET shows the load error instead of the profile', async () => {
  await view({ teacher: { ...detail(), account: { ...status(), role: 'DOCENTE' } } as unknown as TeacherDetailResponse }, async h => {
    assert.match(h.text(), /No se pudo cargar el docente/);
    assert.equal(h.button('Crear cuenta de acceso'), undefined);
  });
});

test('editing the teacher keeps the persisted account state', async () => {
  const teacher = detail({ account: status(false) });
  let updates = 0;
  await view({ teacher, update: async (_, payload) => { updates++; const { account: _a, assignments: _b, ...base } = teacher; return { ...base, phone: payload.phone ?? null }; } }, async h => {
    await h.click('Editar docente');
    await h.change('Ej. 987654321', '987654321');
    await h.submit();
    assert.equal(updates, 1);
    assert.match(h.text(), /Datos del docente actualizados/);
    assert.match(h.text(), /Cuenta deshabilitada/);
  });
});
