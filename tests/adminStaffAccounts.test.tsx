import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathnameContext, PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaPersonal from '../feature/admin/vistas/(sistema)/personal/vistaPersonal';
import PerfilDelDocente from '../feature/admin/vistas/(academico)/docente/perfilDelDocente';
import { AdminSidebar } from '../layout/admin/adminSidebar';
import { AuthContext } from '../src/contexts/AuthContext';
import httpClient from '../src/services/httpClient';
import { staffAccountsService, staffCreateErrorMessage, staffFormValidation, staffLoadErrorMessage, toCreateStaffAccount, emptyStaffForm } from '../src/services/admin/staffAccountsService';
import {
  accountStateChangeReloads, accountStateErrorMessage, accountStateReasons, accountStateService, accountStateValidation, isUncertainAccountStateChange, toChangeAccountState,
} from '../src/services/admin/accountStateService';
import { teachersService } from '../src/services/admin/teachersService';
import type { AccountStateAction, AccountStateChangeResponse, CreateStaffAccountResponse, StaffAccountSummary } from '../src/types/staffAccountApi';
import type { TeacherDetailResponse } from '../src/types/teacherApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roles = ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE', 'APODERADO', 'ESTUDIANTE'] as const;
const staff = (overrides: Partial<StaffAccountSummary> = {}): StaffAccountSummary => ({
  userId: 30, personId: 3, dni: '00000030', fullName: 'Secretaria Sintética', email: 'secretaria@example.com', active: true, ...overrides,
});
const legacy = staff({ userId: 31, personId: null, dni: null, fullName: null, email: 'legado@example.com', active: false });
const createdStaff = (overrides: Partial<CreateStaffAccountResponse> = {}): CreateStaffAccountResponse => ({
  personId: 4, userId: 40, dni: '00000040', fullName: 'Nueva Sintética', email: 'nueva@example.com', role: 'DIRECTIVO', active: true, ...overrides,
});
const changed = (action: AccountStateAction, userId = 30): AccountStateChangeResponse => ({
  userId, previousActive: action === 'DEACTIVATE', active: action === 'REACTIVATE', reasonCode: 'OTHER',
  justification: 'Caso documentado', changedBy: 1, changedAt: '2026-10-28T17:00:00Z',
});
const httpError = (status?: number, code?: string) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { error: 'X', message: 'PRIVATE DETAIL', ...(code ? { code } : {}) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role'], status: Auth['status'] = 'authenticated'): Auth => ({ token: 'synthetic', role, status, sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

async function withAdapter(handler: (config: { method?: string; url?: string; data?: string; params?: unknown }) => { status: number; data: unknown },
  run: (calls: { method?: string; url?: string; data?: string; params?: unknown }[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: { method?: string; url?: string; data?: string; params?: unknown }[] = [];
  httpClient.defaults.adapter = async config => { calls.push(config); return { config, statusText: 'OK', headers: {}, ...handler(config) }; };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}

type Harness = {
  renderer: ReactTestRenderer; text: () => string; dialog: () => ReactTestInstance | undefined;
  button: (label: string, root?: ReactTestInstance) => ReactTestInstance | undefined; click: (label: string, root?: ReactTestInstance) => Promise<void>;
  change: (label: string, value: string) => Promise<void>; submitDialog: () => Promise<void>;
};

async function mount(element: React.ReactElement, role: Auth['role'], run: (h: Harness) => Promise<void>, status: Auth['status'] = 'authenticated') {
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<AuthContext.Provider value={auth(role, status)}><PathParamsContext.Provider value={{ id: '7' }}>{element}</PathParamsContext.Provider></AuthContext.Provider>);
    });
    const dialog = () => renderer.root.findAll(node => node.props.role === 'dialog')[0];
    const button = (label: string, root: ReactTestInstance = renderer.root) => root.findAllByType('button').find(node => text(node) === label);
    await run({
      renderer, text: () => text(renderer.root), dialog, button,
      click: async (label, root) => { const node = button(label, root); assert.ok(node, label); assert.equal(!!node.props.disabled, false, label); await act(async () => { node.props.onClick(); }); },
      change: async (label, value) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); },
      submitDialog: async () => { const form = dialog()?.findByType('form'); assert.ok(form, 'dialog form'); await act(async () => { form.props.onSubmit({ preventDefault() {} }); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

async function withStaffMocks(options: { list?: typeof staffAccountsService.list; create?: typeof staffAccountsService.create; change?: typeof accountStateService.change },
  run: (calls: { list: unknown[]; create: unknown[]; change: unknown[][] }) => Promise<void>) {
  const old = { list: staffAccountsService.list, create: staffAccountsService.create, change: accountStateService.change };
  const calls = { list: [] as unknown[], create: [] as unknown[], change: [] as unknown[][] };
  staffAccountsService.list = async params => { calls.list.push(params); return (options.list ?? (async () => [staff(), legacy]))(params); };
  staffAccountsService.create = async payload => { calls.create.push(payload); return (options.create ?? (async () => createdStaff()))(payload); };
  accountStateService.change = async (...args) => { calls.change.push(args); return (options.change ?? (async (id, action) => changed(action, id)))(...args); };
  try { await run(calls); } finally { Object.assign(staffAccountsService, { list: old.list, create: old.create }); accountStateService.change = old.change; }
}

// ---- Services ----

test('list reads the staff endpoint with trimmed filters and rejects malformed responses', async () => {
  let data: unknown = [staff(), legacy];
  await withAdapter(() => ({ status: 200, data }), async calls => {
    assert.deepEqual(await staffAccountsService.list({ status: 'DISABLED', q: '  sec ' }), [staff(), legacy]);
    assert.equal(calls[0].method, 'get');
    assert.equal(calls[0].url, '/v1/management/staff');
    assert.deepEqual(calls[0].params, { status: 'DISABLED', q: 'sec' });
    await staffAccountsService.list({ q: '   ' });
    assert.deepEqual(calls[1].params, {});
    for (const bad of [null, {}, [{ ...staff(), userId: '30' }], [{ ...staff(), active: 'yes' }]]) {
      data = bad; await assert.rejects(staffAccountsService.list());
    }
  });
});

test('create posts only the contract fields and rejects mismatched responses', async () => {
  const payload = toCreateStaffAccount({ dni: ' 00000040 ', firstNames: ' Nueva ', paternalLastName: 'Sintética', maternalLastName: ' ', phone: '', email: ' Nueva@Example.COM ' });
  assert.deepEqual(payload, { dni: '00000040', firstNames: 'Nueva', paternalLastName: 'Sintética', maternalLastName: null, phone: null, email: 'nueva@example.com' });
  let reply: { status: number; data: unknown } = { status: 201, data: createdStaff() };
  await withAdapter(() => reply, async calls => {
    assert.deepEqual(await staffAccountsService.create(payload), createdStaff());
    assert.equal(calls[0].method, 'post');
    assert.equal(calls[0].url, '/v1/management/staff');
    assert.deepEqual(JSON.parse(calls[0].data!), payload);
    for (const bad of [{ status: 200, data: createdStaff() }, { status: 201, data: createdStaff({ role: 'DOCENTE' as 'DIRECTIVO' }) },
      { status: 201, data: createdStaff({ dni: '99999999' }) }, { status: 201, data: createdStaff({ email: 'otra@example.com' }) }, { status: 201, data: null }]) {
      reply = bad; await assert.rejects(staffAccountsService.create(payload));
    }
  });
});

test('staff form validation requires DNI of 8 digits, names and a valid email', () => {
  const valid = { ...emptyStaffForm, dni: '00000040', firstNames: 'Nueva', paternalLastName: 'Sintética', email: 'nueva@example.com' };
  assert.equal(staffFormValidation(valid), null);
  assert.match(staffFormValidation({ ...valid, dni: '1234567' }) ?? '', /8 dígitos/);
  assert.match(staffFormValidation({ ...valid, dni: 'ABCDEFGH' }) ?? '', /8 dígitos/);
  assert.match(staffFormValidation({ ...valid, firstNames: ' ' }) ?? '', /obligatorios/);
  assert.match(staffFormValidation({ ...valid, maternalLastName: 'x'.repeat(121) }) ?? '', /120/);
  assert.match(staffFormValidation({ ...valid, phone: '9'.repeat(31) }) ?? '', /30/);
  assert.match(staffFormValidation({ ...valid, email: '' }) ?? '', /correo de la cuenta/);
  assert.match(staffFormValidation({ ...valid, email: 'a@b' }) ?? '', /formato válido/);
});

test('account state change patches the generic endpoint, whitelists the body and checks the response', async () => {
  let reply: { status: number; data: unknown } = { status: 200, data: changed('DEACTIVATE') };
  await withAdapter(() => reply, async calls => {
    const request = { reasonCode: 'OTHER' as const, justification: 'Caso documentado', extra: 'never sent' };
    assert.deepEqual(await accountStateService.change(30, 'DEACTIVATE', request), changed('DEACTIVATE'));
    assert.equal(calls[0].method, 'patch');
    assert.equal(calls[0].url, '/v1/management/accounts/30/deactivate');
    assert.deepEqual(JSON.parse(calls[0].data!), { reasonCode: 'OTHER', justification: 'Caso documentado' });
    reply = { status: 200, data: changed('REACTIVATE') };
    await accountStateService.change(30, 'REACTIVATE', request);
    assert.equal(calls[1].url, '/v1/management/accounts/30/reactivate');
    for (const bad of [changed('REACTIVATE'), { ...changed('DEACTIVATE'), userId: 31 }, { ...changed('DEACTIVATE'), reasonCode: 'RESIGNATION' }, null]) {
      reply = { status: 200, data: bad }; await assert.rejects(accountStateService.change(30, 'DEACTIVATE', request));
    }
    const before = calls.length;
    for (const id of [0, -1, 1.5, Number.NaN]) await assert.rejects(accountStateService.change(id, 'DEACTIVATE', request));
    assert.equal(calls.length, before);
  });
});

test('account state catalog and validation follow the approved reasons', () => {
  assert.deepEqual(Object.keys(accountStateReasons.DEACTIVATE), ['END_OF_ASSIGNMENT', 'RESIGNATION', 'ADMINISTRATIVE_REVIEW', 'ERRONEOUS_RECORD', 'OTHER']);
  assert.deepEqual(Object.keys(accountStateReasons.REACTIVATE), ['RETURN_TO_POST', 'ADMINISTRATIVE_CORRECTION', 'OTHER']);
  assert.match(accountStateValidation('DEACTIVATE', '', 'texto') ?? '', /motivo/);
  assert.match(accountStateValidation('DEACTIVATE', 'RETURN_TO_POST', 'texto') ?? '', /motivo/);
  assert.match(accountStateValidation('REACTIVATE', 'OTHER', '   ') ?? '', /obligatoria/);
  assert.match(accountStateValidation('REACTIVATE', 'OTHER', 'x'.repeat(1001)) ?? '', /1000/);
  assert.equal(accountStateValidation('DEACTIVATE', 'RESIGNATION', ' ok '), null);
  assert.deepEqual(toChangeAccountState('DEACTIVATE', 'RESIGNATION', ' ok '), { reasonCode: 'RESIGNATION', justification: 'ok' });
  assert.throws(() => toChangeAccountState('REACTIVATE', 'RESIGNATION', 'ok'));
});

test('error messages are fixed texts and classify uncertain outcomes', () => {
  for (const status of [400, 401, 403, 404, 409, 500]) {
    assert.doesNotMatch(accountStateErrorMessage(httpError(status)), /PRIVATE DETAIL/);
    assert.doesNotMatch(staffCreateErrorMessage(httpError(status)), /PRIVATE DETAIL/);
    assert.doesNotMatch(staffLoadErrorMessage(httpError(status)), /PRIVATE DETAIL/);
  }
  assert.match(staffCreateErrorMessage(httpError(409, 'PERSON_DNI_CONFLICT')), /DNI/);
  assert.match(staffCreateErrorMessage(httpError(409)), /correo ya está en uso/);
  assert.match(staffCreateErrorMessage(httpError(400, 'PERSON_DNI_CONFLICT')), /Revisa los datos/);
  assert.match(accountStateErrorMessage(httpError(403)), /Solo el Director/);
  for (const error of [httpError(), httpError(500), new Error('x')]) {
    assert.equal(isUncertainAccountStateChange(error), true);
    assert.equal(accountStateChangeReloads(error), true);
  }
  for (const status of [404, 409]) assert.equal(accountStateChangeReloads(httpError(status)), true);
  for (const status of [400, 401, 403]) assert.equal(accountStateChangeReloads(httpError(status)), false);
});

// ---- Personal view ----

test('sidebar shows Personal only to ADMINISTRADOR', async () => {
  const oldSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try {
    for (const role of roles) {
      let renderer!: ReactTestRenderer;
      await act(async () => { renderer = create(<AuthContext.Provider value={auth(role)}><PathnameContext.Provider value="/administrador"><AdminSidebar /></PathnameContext.Provider></AuthContext.Provider>); });
      const hrefs = renderer.root.findAllByType('a').map(node => node.props.href);
      assert.equal(hrefs.includes('/administrador/personal'), role === 'ADMINISTRADOR', role);
      await act(async () => { renderer.unmount(); });
    }
  } finally {
    if (oldSelf) Object.defineProperty(globalThis, 'self', oldSelf); else Reflect.deleteProperty(globalThis, 'self');
  }
});

test('the page guard blocks every role but ADMINISTRADOR and never reads the list', async () => {
  await withStaffMocks({}, async calls => {
    for (const role of roles.filter(role => role !== 'ADMINISTRADOR')) {
      await mount(<VistaPersonal />, role, async h => {
        assert.match(h.text(), /No tienes acceso a la gestión de personal/);
        assert.equal(h.button('Registrar personal'), undefined);
      });
    }
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => { assert.match(h.text(), /No tienes acceso/); }, 'loading');
    assert.equal(calls.list.length, 0);
  });
});

test('ADMINISTRADOR sees the list, including legacy accounts without a person', async () => {
  await withStaffMocks({}, async calls => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      assert.equal(calls.list.length, 1);
      const page = h.text();
      assert.match(page, /Secretaria Sintética/);
      assert.match(page, /00000030/);
      assert.match(page, /Cuenta sin datos personales/);
      assert.match(page, /legado@example\.com/);
      assert.match(page, /Habilitada/);
      assert.match(page, /Deshabilitada/);
      assert.ok(h.button('Deshabilitar cuenta'));
      assert.ok(h.button('Habilitar cuenta'));
      assert.doesNotMatch(page, /Eliminar/);
    });
  });
});

test('filters are sent to the list', async () => {
  await withStaffMocks({}, async calls => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      await h.change('Buscar personal', ' sec ');
      await h.change('Estado de la cuenta', 'DISABLED');
      await act(async () => { h.renderer.root.findAllByType('form')[0].props.onSubmit({ preventDefault() {} }); });
      assert.deepEqual(calls.list.at(-1), { status: 'DISABLED', q: 'sec' });
    });
  });
});

test('an empty list and a load failure are reported', async () => {
  await withStaffMocks({ list: async () => [] }, async () => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => { assert.match(h.text(), /Sin cuentas de Secretaría/); });
  });
  await withStaffMocks({ list: async () => { throw httpError(500); } }, async () => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      assert.match(h.text(), /No se pudo cargar el listado/);
      assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
      assert.ok(h.button('Reintentar'));
    });
  });
});

test('deactivating requires reason and justification, then reloads the list', async () => {
  await withStaffMocks({}, async calls => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      await h.click('Deshabilitar cuenta');
      assert.ok(h.dialog());
      assert.match(text(h.dialog()!), /no podrá iniciar sesión/);
      await h.submitDialog();
      assert.match(text(h.dialog()!), /Selecciona un motivo/);
      await h.change('Motivo', 'RESIGNATION');
      await h.submitDialog();
      assert.match(text(h.dialog()!), /obligatoria/);
      assert.equal(calls.change.length, 0);
      await h.change('Justificación', '  Renuncia presentada.  ');
      await h.submitDialog();
      assert.deepEqual(calls.change, [[30, 'DEACTIVATE', { reasonCode: 'RESIGNATION', justification: 'Renuncia presentada.' }]]);
      assert.equal(h.dialog(), undefined);
      assert.match(h.text(), /Cuenta deshabilitada\. No podrá iniciar sesión/);
      assert.equal(calls.list.length, 2);
    });
  });
});

test('reactivating a legacy account uses the reactivation catalog', async () => {
  await withStaffMocks({}, async calls => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      await h.click('Habilitar cuenta');
      const options = h.dialog()!.findAllByType('option').map(node => node.props.value).filter(Boolean);
      assert.deepEqual(options, ['RETURN_TO_POST', 'ADMINISTRATIVE_CORRECTION', 'OTHER']);
      await h.change('Motivo', 'RETURN_TO_POST');
      await h.change('Justificación', 'Retorna al puesto.');
      await h.submitDialog();
      assert.deepEqual(calls.change[0].slice(0, 2), [31, 'REACTIVATE']);
    });
  });
});

test('a 400 keeps the dialog; a 409 or an uncertain outcome closes it and reloads without retrying', async () => {
  for (const [error, keeps] of [[httpError(400), true], [httpError(409), false], [httpError(), false], [httpError(503), false]] as const) {
    await withStaffMocks({ change: async () => { throw error; } }, async calls => {
      await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
        await h.click('Deshabilitar cuenta');
        await h.change('Motivo', 'OTHER');
        await h.change('Justificación', 'Caso documentado');
        await h.submitDialog();
        assert.equal(calls.change.length, 1);
        assert.equal(!!h.dialog(), keeps);
        assert.equal(calls.list.length, keeps ? 1 : 2);
        assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
      });
    });
  }
});

async function fillStaffForm(h: Harness) {
  await h.change('DNI', '00000040');
  await h.change('Nombres', 'Nueva');
  await h.change('Apellido paterno', 'Sintética');
  await h.change('Correo de la cuenta', ' Nueva@Example.com ');
}

test('registering staff validates, asks for confirmation, sends the payload and reloads', async () => {
  await withStaffMocks({}, async calls => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      await h.click('Registrar personal');
      assert.match(text(h.dialog()!), /contraseña inicial será el DNI/);
      await h.submitDialog();
      assert.match(text(h.dialog()!), /8 dígitos/);
      await fillStaffForm(h);
      await h.submitDialog();
      assert.match(text(h.dialog()!), /DNI 00000040/);
      assert.match(text(h.dialog()!), /nueva@example\.com/);
      assert.equal(calls.create.length, 0);
      await h.click('Confirmar alta', h.dialog());
      assert.deepEqual(calls.create, [{ dni: '00000040', firstNames: 'Nueva', paternalLastName: 'Sintética', maternalLastName: null, phone: null, email: 'nueva@example.com' }]);
      assert.equal(h.dialog(), undefined);
      assert.match(h.text(), /Cuenta de Secretaría creada para nueva@example\.com/);
      assert.equal(calls.list.length, 2);
    });
  });
});

test('a DNI conflict keeps the form; an uncertain outcome closes it and reloads', async () => {
  await withStaffMocks({ create: async () => { throw httpError(409, 'PERSON_DNI_CONFLICT'); } }, async calls => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      await h.click('Registrar personal');
      await fillStaffForm(h);
      await h.submitDialog();
      await h.click('Confirmar alta', h.dialog());
      assert.ok(h.dialog());
      assert.match(text(h.dialog()!), /Ya existe una persona registrada con ese DNI/);
      assert.equal(calls.list.length, 1);
    });
  });
  await withStaffMocks({ create: async () => { throw httpError(); } }, async calls => {
    await mount(<VistaPersonal />, 'ADMINISTRADOR', async h => {
      await h.click('Registrar personal');
      await fillStaffForm(h);
      await h.submitDialog();
      await h.click('Confirmar alta', h.dialog());
      assert.equal(h.dialog(), undefined);
      assert.equal(calls.create.length, 1);
      assert.equal(calls.list.length, 2);
      assert.match(h.text(), /Actualiza el listado/);
    });
  });
});

// ---- Teacher profile ----

const teacher = (account: TeacherDetailResponse['account']): TeacherDetailResponse => ({
  id: 7, dni: '00000007', firstNames: 'Docente', paternalLastName: 'Sintético', maternalLastName: null, fullName: 'Docente Sintético',
  phone: null, specialty: null, active: true, assignments: [], account,
});

async function withTeacher(initial: TeacherDetailResponse['account'], change: typeof accountStateService.change | undefined,
  run: (calls: { change: unknown[][]; update: number }) => Promise<void>) {
  const old = { getById: teachersService.getById, update: teachersService.update, change: accountStateService.change };
  const calls = { change: [] as unknown[][], update: 0 };
  let persisted = teacher(initial);
  teachersService.getById = async () => persisted;
  teachersService.update = async () => { calls.update++; throw new Error('teacher.active must not change'); };
  accountStateService.change = async (...args) => {
    calls.change.push(args);
    const result = await (change ?? (async (id, action) => changed(action, id)))(...args);
    persisted = teacher(persisted.account && { ...persisted.account, active: result.active });
    return result;
  };
  try { await run(calls); } finally { Object.assign(teachersService, { getById: old.getById, update: old.update }); accountStateService.change = old.change; }
}

test('teacher profile: the teacher toggle states that it does not affect the account', async () => {
  await withTeacher(null, undefined, async () => {
    for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
      await mount(<PerfilDelDocente />, role, async h => { assert.ok(h.button('Desactivar docente (no afecta su cuenta de acceso)'), role); });
    }
  });
});

test('teacher profile: only ADMINISTRADOR sees the account state action, and only with an account', async () => {
  const status = { userId: 70, email: 'docente@example.com', active: true };
  await withTeacher(status, undefined, async () => {
    await mount(<PerfilDelDocente />, 'ADMINISTRADOR', async h => { assert.ok(h.button('Deshabilitar cuenta')); });
    await mount(<PerfilDelDocente />, 'DIRECTIVO', async h => {
      assert.equal(h.button('Deshabilitar cuenta'), undefined);
      assert.equal(h.button('Habilitar cuenta'), undefined);
      assert.match(h.text(), /Cuenta activa/);
    });
  });
  await withTeacher(null, undefined, async () => {
    await mount(<PerfilDelDocente />, 'ADMINISTRADOR', async h => {
      assert.equal(h.button('Deshabilitar cuenta'), undefined);
      assert.equal(h.button('Habilitar cuenta'), undefined);
    });
  });
  await withTeacher({ ...status, active: false }, undefined, async () => {
    await mount(<PerfilDelDocente />, 'ADMINISTRADOR', async h => { assert.ok(h.button('Habilitar cuenta')); });
  });
});

test('teacher profile: disabling the account uses the generic endpoint and re-reads the detail', async () => {
  await withTeacher({ userId: 70, email: 'docente@example.com', active: true }, undefined, async calls => {
    await mount(<PerfilDelDocente />, 'ADMINISTRADOR', async h => {
      await h.click('Deshabilitar cuenta');
      assert.match(text(h.dialog()!), /docente@example\.com/);
      await h.change('Motivo', 'END_OF_ASSIGNMENT');
      await h.change('Justificación', 'Fin de contrato.');
      await h.submitDialog();
      assert.deepEqual(calls.change, [[70, 'DEACTIVATE', { reasonCode: 'END_OF_ASSIGNMENT', justification: 'Fin de contrato.' }]]);
      assert.equal(calls.update, 0);
      assert.equal(h.dialog(), undefined);
      assert.match(h.text(), /Cuenta deshabilitada\. No podrá iniciar sesión/);
      assert.match(h.text(), /Cuenta deshabilitada/);
      assert.ok(h.button('Habilitar cuenta'));
      assert.match(h.text(), /Activo/);
    });
  });
});

test('teacher profile: a 409 closes the dialog, reports it and re-reads the detail', async () => {
  await withTeacher({ userId: 70, email: 'docente@example.com', active: true }, async () => { throw httpError(409); }, async calls => {
    await mount(<PerfilDelDocente />, 'ADMINISTRADOR', async h => {
      await h.click('Deshabilitar cuenta');
      await h.change('Motivo', 'OTHER');
      await h.change('Justificación', 'Caso documentado');
      await h.submitDialog();
      assert.equal(calls.change.length, 1);
      assert.equal(h.dialog(), undefined);
      assert.match(h.text(), /El estado de la cuenta cambió/);
      assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
    });
  });
});
