import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PerfilDelAlumno from '../feature/admin/vistas/(academico)/alumnos/perfilDelAlumno';
import { AuthContext } from '../src/contexts/AuthContext';
import { emptyGuardianCreateValues, guardianCreateReason, guardianCreateValidation, toCreateGuardian } from '../src/adapters/studentAdapter';
import { guardianCreateErrorMessage, isUncertainGuardianCreate, studentsService } from '../src/services/admin/studentsService';
import { enrollmentsService } from '../src/services/admin/enrollmentsService';
import httpClient from '../src/services/httpClient';
import type { CreateStudentGuardianRequest, GuardianSummaryResponse, StudentDetailResponse } from '../src/types/studentApi';
import type { GuardianCreateValues } from '../src/types/adminStudent';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

const values: GuardianCreateValues = { dni: ' 87654321 ', firstNames: ' Rosa ', paternalLastName: ' Sintética ', maternalLastName: ' ', phone: '', relationship: 'MOTHER', primary: false, authorizedPickup: true };
const wire: CreateStudentGuardianRequest = { dni: '87654321', firstNames: 'Rosa', paternalLastName: 'Sintética', maternalLastName: null, phone: null, relationship: 'MOTHER', primary: false, authorizedPickup: true, reason: 'Alta de apoderado' };
const guardian = (patch: Partial<GuardianSummaryResponse> = {}): GuardianSummaryResponse => ({
  guardianId: 90, personId: 91, dni: '87654321', firstNames: 'Rosa', paternalLastName: 'Sintética', maternalLastName: null, phone: null,
  relationship: 'MOTHER', primary: false, authorizedPickup: true, active: true, ...patch,
});
const detail = (guardians: GuardianSummaryResponse[] = [], id = 1, active = true): StudentDetailResponse => ({
  studentId: id, personId: id, studentCode: 'TEST-' + id, dni: null, firstNames: 'Alumno ' + id, paternalLastName: 'Sintético',
  maternalLastName: null, birthDate: null, phone: null, studentStatus: 'ACTIVE', enrollmentId: active ? 10 : null,
  enrollmentStatus: active ? 'ACTIVE' : null, academicPeriodId: active ? 2 : null, academicPeriodName: active ? 'Prueba' : null,
  sectionId: active ? 3 : null, sectionName: active ? 'A' : null, grade: active ? 1 : null, level: active ? 'PRIMARY' : null,
  enrollmentDate: active ? '2020-01-01' : null, guardians,
});
const httpError = (status?: number, code?: unknown) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL', ...(code === undefined ? {} : { code }) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const conflict = 'No se pudo agregar: el DNI ya está registrado (por ejemplo, como apoderado de un hermano), la persona ya es apoderado de este alumno, o ya existe un apoderado principal. Si es el apoderado de un hermano, por ahora no se puede vincular desde aquí.';

type Harness = {
  renderer: ReactTestRenderer; text: () => string; button: (label: string) => ReactTestInstance | undefined;
  click: (label: string) => Promise<void>; change: (label: string, value: string | boolean) => Promise<void>;
  fill: () => Promise<void>; submit: () => Promise<void>; navigate: (id: string, role?: Auth['role']) => Promise<void>;
};

async function view(options: { role?: Auth['role']; read?: typeof studentsService.getById; add?: typeof studentsService.addGuardian; withdraw?: typeof enrollmentsService.withdraw },
  run: (h: Harness) => Promise<void>) {
  const oldRead = studentsService.getById, oldAdd = studentsService.addGuardian, oldWithdraw = enrollmentsService.withdraw;
  studentsService.getById = options.read ?? (async id => detail([], Number(id)));
  studentsService.addGuardian = options.add ?? (async () => guardian());
  enrollmentsService.withdraw = options.withdraw ?? (async () => { throw httpError(); });
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
    login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });
  const tree = (id = '1', role: Auth['role'] = options.role ?? 'ADMINISTRADOR') => <AuthContext.Provider value={auth(role)}><PathParamsContext.Provider value={{ estudianteId: id }}><PerfilDelAlumno /></PathParamsContext.Provider></AuthContext.Provider>;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(tree(), { createNodeMock: () => new Element() }); });
    const button = (label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);
    const change = async (label: string, value: string | boolean) => { await act(async () => {
      renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value, checked: value } });
    }); };
    await run({
      renderer, text: () => text(renderer.root), button, change,
      click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false); await act(async () => { node.props.onClick(); }); },
      fill: async () => {
        await change('DNI', values.dni); await change('Nombres', values.firstNames); await change('Apellido paterno', values.paternalLastName);
        await change('Relación', 'MOTHER'); await change('Autorizado a recoger al alumno', true);
      },
      submit: async () => { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); },
      navigate: async (id, role = options.role ?? 'ADMINISTRADOR') => { await act(async () => { renderer.update(tree(id, role)); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    studentsService.getById = oldRead; studentsService.addGuardian = oldAdd; enrollmentsService.withdraw = oldWithdraw;
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

test('guardian validation: 8-digit DNI, listed DNI, required names, max lengths, relationship and active primary', () => {
  const ok = { ...values };
  assert.equal(guardianCreateValidation(ok, []), null);
  assert.equal(guardianCreateValidation({ ...ok, firstNames: 'a'.repeat(120), paternalLastName: 'b'.repeat(120), maternalLastName: 'c'.repeat(120), phone: '9'.repeat(30) }, []), null);
  for (const dni of ['', '1234567', '123456789', '1234567a', '12 345678']) assert.match(guardianCreateValidation({ ...ok, dni }, []) ?? '', /8 dígitos/);
  for (const listed of [guardian(), guardian({ active: false })]) assert.match(guardianCreateValidation(ok, [listed]) ?? '', /ya figura como apoderado/);
  assert.equal(guardianCreateValidation(ok, [guardian({ dni: null }), guardian({ dni: '11111111' })]), null);
  for (const patch of [{ firstNames: '   ' }, { paternalLastName: '' }]) assert.match(guardianCreateValidation({ ...ok, ...patch }, []) ?? '', /obligatorios/);
  for (const patch of [{ firstNames: 'a'.repeat(121) }, { paternalLastName: 'a'.repeat(121) }, { maternalLastName: 'a'.repeat(121) }, { phone: '9'.repeat(31) }]) {
    assert.match(guardianCreateValidation({ ...ok, ...patch }, []) ?? '', /hasta 120/);
  }
  for (const relationship of ['', 'COUSIN']) assert.match(guardianCreateValidation({ ...ok, relationship } as GuardianCreateValues, []) ?? '', /relación/);
  const primary = guardian({ dni: '11111111', primary: true });
  assert.match(guardianCreateValidation({ ...ok, primary: true }, [primary]) ?? '', /principal activo/);
  assert.equal(guardianCreateValidation({ ...ok, primary: true }, [{ ...primary, active: false }]), null);
  assert.equal(guardianCreateValidation(ok, [primary]), null);
});

test('guardian body trims, nulls empty optionals, fixes the reason and never carries personId', () => {
  assert.deepEqual(toCreateGuardian(values), wire);
  assert.equal(guardianCreateReason, 'Alta de apoderado');
  assert.equal('personId' in toCreateGuardian(values), false);
  assert.throws(() => toCreateGuardian(emptyGuardianCreateValues));
});

test('HTTP guardian create whitelists the body and rejects responses that do not match a 201 for the same request', async () => {
  const original = httpClient.defaults.adapter;
  let response: unknown = guardian(), status = 201;
  httpClient.defaults.adapter = async config => {
    assert.equal(config.method, 'post'); assert.equal(config.url, '/v1/management/students/7/guardians');
    assert.deepEqual(JSON.parse(config.data), wire);
    return { config, data: response, status, statusText: 'Created', headers: {} };
  };
  try {
    assert.deepEqual(await studentsService.addGuardian(7, { ...wire, personId: 3, extra: true } as CreateStudentGuardianRequest), guardian());
    status = 200; await assert.rejects(studentsService.addGuardian(7, wire)); status = 201;
    for (const bad of [null, guardian({ guardianId: 0 }), guardian({ guardianId: 1.5 }), guardian({ dni: '11111111' }), guardian({ relationship: 'FATHER' }),
      guardian({ primary: true }), guardian({ authorizedPickup: false }), guardian({ active: false })]) {
      response = bad;
      await assert.rejects(studentsService.addGuardian(7, wire), (error: unknown) => isUncertainGuardianCreate(error));
    }
  } finally { httpClient.defaults.adapter = original; }
});

test('guardian messages are own texts per status; no response, 5xx and unexpected bodies are uncertain', () => {
  const expected = new Map<number, RegExp>([[400, /DNI de 8 dígitos, nombres, apellido paterno y relación/], [401, /sesión expiró/], [403, /Solo el Director/], [404, /ya no existe/], [422, /Intenta nuevamente/]]);
  for (const [status, message] of expected) {
    assert.match(guardianCreateErrorMessage(httpError(status)), message);
    assert.doesNotMatch(guardianCreateErrorMessage(httpError(status)), /PRIVATE/);
    assert.equal(isUncertainGuardianCreate(httpError(status)), false);
  }
  assert.equal(guardianCreateErrorMessage(httpError(409)), conflict);
  assert.equal(isUncertainGuardianCreate(httpError(409)), false);
  for (const error of [httpError(), httpError(500), httpError(503), new Error('mismatch')]) {
    assert.equal(isUncertainGuardianCreate(error), true);
    assert.match(guardianCreateErrorMessage(error), /No se pudo confirmar el alta del apoderado/);
  }
});

test('only ADMINISTRADOR sees «Agregar apoderado»', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE', 'APODERADO', 'ESTUDIANTE'] as const) {
    await view({ role }, async h => { assert.equal(!!h.button('Agregar apoderado'), role === 'ADMINISTRADOR'); });
  }
});

test('«Apoderado principal» is disabled with an active primary and always explains it creates no account', async () => {
  for (const guardians of [[], [guardian({ dni: '11111111', primary: true, active: false })], [guardian({ dni: '11111111', primary: true })]]) {
    const taken = guardians.some(item => item.active && item.primary);
    await view({ read: async () => detail(guardians) }, async h => {
      await h.click('Agregar apoderado');
      const box = h.renderer.root.findByProps({ 'aria-label': 'Apoderado principal' });
      assert.equal(!!box.props.disabled, taken);
      assert.match(h.text(), /Marcarlo no crea una cuenta de acceso\./);
      assert.equal(/ya tiene un apoderado principal activo/.test(h.text()), taken);
    });
  }
});

test('invalid form and a DNI already listed never POST; cancel closes without POST', async () => {
  let posts = 0;
  await view({ read: async () => detail([guardian({ active: false })]), add: async () => { posts++; return guardian(); } }, async h => {
    await h.click('Agregar apoderado');
    await h.submit(); assert.match(h.text(), /8 dígitos/);
    await h.fill(); await h.submit(); assert.match(h.text(), /ya figura como apoderado de este alumno/);
    await h.click('Cancelar');
    assert.equal(posts, 0); assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('double submit POSTs once, locks the profile and reloads it after success', async () => {
  let posts = 0, reads = 0;
  const pending = deferred<GuardianSummaryResponse>();
  await view({ read: async () => ++reads === 1 ? detail() : detail([guardian()]), add: async (studentId, body) => {
    posts++; assert.equal(studentId, 1); assert.deepEqual(body, wire); return pending.promise;
  } }, async h => {
    await h.click('Agregar apoderado'); await h.fill();
    const submit = h.renderer.root.findByType('form').props.onSubmit;
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
    assert.equal(posts, 1);
    for (const label of ['Cancelar', 'Guardar apoderado', 'Agregar apoderado', 'Editar alumno', 'Retirar matrícula']) assert.equal(h.button(label)?.props.disabled, true, label);
    await act(async () => { pending.resolve(guardian()); });
    assert.equal(reads, 2); assert.equal(posts, 1);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.match(h.text(), /Apoderado agregado: Rosa Sintética · DNI 87654321\./);
    assert.match(h.text(), /Madre/); assert.doesNotMatch(h.text(), /Sin apoderados registrados/);
    assert.equal(h.button('Retirar matrícula')?.props.disabled, false);
  });
});

test('409 and other definite errors keep the dialog open with own texts, without reload or retry', async () => {
  for (const status of [400, 401, 403, 404, 409]) {
    let posts = 0, reads = 0;
    await view({ read: async () => { reads++; return detail(); }, add: async () => { posts++; throw httpError(status); } }, async h => {
      await h.click('Agregar apoderado'); await h.fill(); await h.submit();
      assert.equal(posts, 1); assert.equal(reads, 1);
      assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 1);
      assert.equal(h.button('Guardar apoderado')?.props.disabled, false);
      assert.ok(h.text().includes(guardianCreateErrorMessage(httpError(status))), String(status));
      if (status === 409) assert.ok(h.text().includes(conflict));
      assert.doesNotMatch(h.text(), /PRIVATE DETAIL|Apoderado agregado/);
      await h.click('Cancelar');
      assert.equal(h.text().includes(guardianCreateErrorMessage(httpError(status))), false);
    });
  }
});

test('uncertain outcome closes the dialog, reloads the profile and never retries automatically', async () => {
  for (const failure of [httpError(), httpError(500), new Error('mismatch')]) {
    let posts = 0, reads = 0;
    await view({ read: async () => { reads++; return detail(); }, add: async () => { posts++; throw failure; } }, async h => {
      await h.click('Agregar apoderado'); await h.fill(); await h.submit();
      assert.equal(posts, 1); assert.equal(reads, 2);
      assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
      assert.match(h.text(), /No se pudo confirmar el alta del apoderado/);
      await h.click('Agregar apoderado');
      assert.doesNotMatch(h.text(), /No se pudo confirmar el alta del apoderado/); assert.equal(posts, 1);
    });
  }
});

test('pending withdrawal verification blocks the guardian flow', async () => {
  await view({ withdraw: async () => { throw httpError(); } }, async h => {
    await h.click('Retirar matrícula');
    assert.equal(h.button('Agregar apoderado')?.props.disabled, true);
    await h.change('Motivo del retiro', 'Traslado a otra institución'); await h.change('Justificación', 'Solicitud documentada del apoderado');
    await h.change('Confirmar retiro', true); await h.submit();
    assert.ok(h.button('Actualizar matrícula'));
    assert.equal(h.button('Agregar apoderado')?.props.disabled, true);
  });
});

test('student or role changes invalidate a late guardian response', async () => {
  for (const changeRole of [false, true]) {
    for (const fail of [false, true]) {
      let posts = 0, reads = 0;
      const pending = deferred<GuardianSummaryResponse>();
      await view({ read: async id => { reads++; return detail([], Number(id)); }, add: async () => { posts++; return pending.promise; } }, async h => {
        await h.click('Agregar apoderado'); await h.fill();
        const submit = h.renderer.root.findByType('form').props.onSubmit;
        await h.submit();
        await h.navigate(changeRole ? '1' : '2', changeRole ? 'DIRECTIVO' : 'ADMINISTRADOR');
        const afterNavigation = reads;
        await act(async () => { submit({ preventDefault() {} }); if (fail) pending.reject(httpError(500)); else pending.resolve(guardian()); });
        assert.equal(posts, 1); assert.equal(reads, afterNavigation);
        assert.doesNotMatch(h.text(), /Apoderado agregado|No se pudo confirmar el alta del apoderado/);
        if (changeRole) assert.equal(h.button('Agregar apoderado'), undefined);
        else assert.match(h.text(), /Alumno 2/);
      });
    }
  }
});

test('guardian 409 codes name each cause; without a valid code the grouped text stays', async () => {
  assert.equal(guardianCreateErrorMessage(httpError(409, 'GUARDIAN_ALREADY_LINKED')), 'Esta persona ya es apoderado de este alumno.');
  assert.match(guardianCreateErrorMessage(httpError(409, 'PRIMARY_GUARDIAN_ALREADY_EXISTS')), /ya tiene un apoderado principal activo/);
  assert.match(guardianCreateErrorMessage(httpError(409, 'GUARDIAN_REGISTRATION_CONFLICT')), /Revisa la lista de apoderados/);
  assert.equal(guardianCreateErrorMessage(httpError(409, 'DNI_ALREADY_EXISTS')),
    'El DNI ya está registrado para otra persona. Si es el apoderado de un hermano, por ahora no se puede vincular desde aquí.');
  assert.doesNotMatch(guardianCreateErrorMessage(httpError(409, 'DNI_ALREADY_EXISTS')), /ya es apoderado de este alumno/);
  assert.match(guardianCreateErrorMessage(httpError(404, 'STUDENT_NOT_FOUND')), /ya no existe/);
  for (const code of [undefined, 'UNKNOWN_CODE', 409, '', 'VALIDATION_ERROR', 'STUDENT_NOT_FOUND']) assert.equal(guardianCreateErrorMessage(httpError(409, code)), conflict, String(code));
  // INVALID_PARAMETER is 400 for guardians: generic, so the HTTP text stays.
  assert.equal(guardianCreateErrorMessage(httpError(400, 'INVALID_PARAMETER')), guardianCreateErrorMessage(httpError(400)));
  assert.equal(isUncertainGuardianCreate(httpError(500, 'INTERNAL_ERROR')), true);
  let posts = 0, reads = 0;
  await view({ read: async () => { reads++; return detail(); }, add: async () => { posts++; throw httpError(409, 'PRIMARY_GUARDIAN_ALREADY_EXISTS'); } }, async h => {
    await h.click('Agregar apoderado'); await h.fill(); await h.submit();
    assert.equal(posts, 1); assert.equal(reads, 1);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 1);
    assert.match(h.text(), /ya tiene un apoderado principal activo/);
    assert.doesNotMatch(h.text(), /PRIVATE DETAIL/); assert.equal(h.text().includes(conflict), false);
  });
});
