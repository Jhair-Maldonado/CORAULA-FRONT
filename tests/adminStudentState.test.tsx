import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PerfilDelAlumno from '../feature/admin/vistas/(academico)/alumnos/perfilDelAlumno';
import { TarjetaEstudiante } from '../feature/admin/vistas/(academico)/alumnos/components/TarjetaEstudiante';
import { AuthContext } from '../src/contexts/AuthContext';
import { studentsService } from '../src/services/admin/studentsService';
import {
  availableStudentStateActions, isUncertainStudentStateChange, studentStateChangeReloads, studentStateErrorMessage, studentStateReasons,
  studentStateService, studentStateSuccessMessage, studentStateValidation, toChangeStudentState,
} from '../src/services/admin/studentStateService';
import { studentStatusLabels, toAdminStudent } from '../src/adapters/studentAdapter';
import httpClient from '../src/services/httpClient';
import type { ChangeStudentStateRequest, StudentDetailResponse, StudentStateAction, StudentStateChangeResponse, StudentStatus } from '../src/types/studentApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const statuses: StudentStatus[] = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'WITHDRAWN', 'GRADUATED'];
const roles = ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE', 'APODERADO', 'ESTUDIANTE'] as const;
const buttons: Record<StudentStateAction, string> = { SUSPEND: 'Suspender alumno', REACTIVATE: 'Reactivar alumno', DEACTIVATE: 'Dar de baja' };
const targets: Record<StudentStateAction, StudentStatus> = { SUSPEND: 'SUSPENDED', REACTIVATE: 'ACTIVE', DEACTIVATE: 'DEACTIVATED' };
const detail = (studentStatus: StudentStatus = 'ACTIVE', enrolled = false, id = 1): StudentDetailResponse => ({
  studentId: id, personId: id, studentCode: 'TEST-' + id, dni: null, firstNames: 'Alumno ' + id, paternalLastName: 'Sintético',
  maternalLastName: null, birthDate: null, phone: null, studentStatus, enrollmentId: enrolled ? 10 : null,
  enrollmentStatus: enrolled ? 'ACTIVE' : null, academicPeriodId: enrolled ? 2 : null, academicPeriodName: enrolled ? 'Prueba' : null,
  sectionId: enrolled ? 3 : null, sectionName: enrolled ? 'A' : null, grade: enrolled ? 1 : null, level: enrolled ? 'PRIMARY' : null,
  enrollmentDate: enrolled ? '2020-01-01' : null, guardians: [],
});
const changed = (action: StudentStateAction, accountEnabled: boolean | null = false, previousStatus: StudentStatus = action === 'REACTIVATE' ? 'SUSPENDED' : 'ACTIVE'): StudentStateChangeResponse => ({
  studentId: 1, previousStatus, studentStatus: targets[action], reasonCode: 'OTHER', justification: 'Caso documentado',
  changedBy: 9, changedAt: '2026-10-28T17:00:00Z', accountEnabled,
});
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const httpError = (status?: number, code?: unknown) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL', ...(code === undefined ? {} : { code }) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
type Change = typeof studentStateService.change;

async function view(options: { role?: Auth['role']; read?: typeof studentsService.getById; change?: Change },
  run: (h: { renderer: ReactTestRenderer; text: () => string; button: (label: string) => ReactTestInstance | undefined;
    click: (label: string) => Promise<void>; change: (label: string, value: string | boolean) => Promise<void>;
    fill: (reason?: string, justification?: string) => Promise<void>; submit: () => Promise<void>; navigate: (id: string) => Promise<void> }) => Promise<void>) {
  const oldRead = studentsService.getById, oldChange = studentStateService.change;
  studentsService.getById = options.read ?? (async id => detail('ACTIVE', false, Number(id)));
  studentStateService.change = options.change ?? (async (_id, action) => changed(action));
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  const role = options.role ?? 'ADMINISTRADOR';
  const auth: Auth = { token: 'synthetic', role, status: 'authenticated', sessionValid: true,
    login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  const tree = (id = '1') => <AuthContext.Provider value={auth}><PathParamsContext.Provider value={{ estudianteId: id }}><PerfilDelAlumno /></PathParamsContext.Provider></AuthContext.Provider>;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(tree(), { createNodeMock: () => new Element() }); });
    const button = (label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);
    const change = async (label: string, value: string | boolean) => { await act(async () => {
      renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value, checked: value } });
    }); };
    await run({
      renderer, text: () => text(renderer.root), button,
      click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false, label); await act(async () => { node.props.onClick(); }); },
      change,
      fill: async (reason = 'OTHER', justification = 'Caso documentado') => { await change('Motivo', reason); await change('Justificación', justification); },
      submit: async () => { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); },
      navigate: async id => { await act(async () => { renderer.update(tree(id)); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    studentsService.getById = oldRead; studentStateService.change = oldChange;
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

test('transitions and reason catalogs follow the contract', () => {
  assert.deepEqual(availableStudentStateActions('ACTIVE'), ['SUSPEND', 'DEACTIVATE']);
  assert.deepEqual(availableStudentStateActions('SUSPENDED'), ['REACTIVATE', 'DEACTIVATE']);
  for (const status of ['DEACTIVATED', 'WITHDRAWN', 'GRADUATED'] as const) assert.deepEqual(availableStudentStateActions(status), []);
  assert.deepEqual(Object.keys(studentStateReasons.SUSPEND), ['ADMINISTRATIVE_REVIEW', 'GUARDIAN_REQUEST', 'OTHER']);
  assert.deepEqual(Object.keys(studentStateReasons.REACTIVATE), ['SUSPENSION_RESOLVED', 'ADMINISTRATIVE_CORRECTION', 'OTHER']);
  assert.deepEqual(Object.keys(studentStateReasons.DEACTIVATE), ['VOLUNTARY_WITHDRAWAL', 'TRANSFER', 'DUPLICATE_RECORD', 'ERRONEOUS_RECORD', 'OTHER']);
});

test('validation: reason of the action, non-blank justification up to 1000 and permanent confirmation for the deactivation', () => {
  assert.match(studentStateValidation('SUSPEND', '', 'x', false)!, /motivo/);
  assert.match(studentStateValidation('SUSPEND', 'TRANSFER', 'x', false)!, /motivo/);
  assert.match(studentStateValidation('REACTIVATE', 'toString', 'x', false)!, /motivo/);
  assert.match(studentStateValidation('SUSPEND', 'OTHER', '   ', false)!, /obligatoria/);
  assert.equal(studentStateValidation('SUSPEND', 'OTHER', 'a'.repeat(1000), false), null);
  assert.equal(studentStateValidation('SUSPEND', 'OTHER', '  ' + 'a'.repeat(1000) + '  ', false), null);
  assert.match(studentStateValidation('SUSPEND', 'OTHER', 'a'.repeat(1001), false)!, /1000/);
  assert.match(studentStateValidation('DEACTIVATE', 'TRANSFER', 'Traslado documentado', false)!, /permanente/);
  assert.equal(studentStateValidation('DEACTIVATE', 'TRANSFER', 'Traslado documentado', true), null);
  assert.deepEqual(toChangeStudentState('DEACTIVATE', 'TRANSFER', '  Traslado  '), { reasonCode: 'TRANSFER', justification: 'Traslado' });
  assert.throws(() => toChangeStudentState('SUSPEND', 'TRANSFER', 'x'));
});

test('HTTP consumer: one PATCH per action with whitelisted body; inconsistent answers are rejected as uncertain', async () => {
  const original = httpClient.defaults.adapter;
  const calls: { method?: string; url?: string; data: unknown }[] = [];
  let response: unknown = null, status = 200;
  httpClient.defaults.adapter = async config => {
    calls.push({ method: config.method, url: config.url, data: JSON.parse(config.data) });
    return { config, data: response, status, statusText: 'OK', headers: {} };
  };
  const request = { reasonCode: 'OTHER', justification: 'Caso documentado', extra: true } as ChangeStudentStateRequest;
  try {
    for (const action of ['SUSPEND', 'REACTIVATE', 'DEACTIVATE'] as const) {
      response = changed(action);
      assert.deepEqual(await studentStateService.change(1, action, request), changed(action));
    }
    assert.deepEqual(calls.map(call => call.url), ['/v1/management/students/1/suspend', '/v1/management/students/1/reactivate', '/v1/management/students/1/deactivate']);
    for (const call of calls) { assert.equal(call.method, 'patch'); assert.deepEqual(call.data, { reasonCode: 'OTHER', justification: 'Caso documentado' }); }
    response = changed('DEACTIVATE', null, 'SUSPENDED');
    assert.equal((await studentStateService.change(1, 'DEACTIVATE', request)).accountEnabled, null);
    const bad = [{ ...changed('SUSPEND'), studentId: 2 }, { ...changed('SUSPEND'), studentStatus: 'ACTIVE' }, { ...changed('SUSPEND'), previousStatus: 'SUSPENDED' },
      { ...changed('SUSPEND'), reasonCode: 'TRANSFER' }, { ...changed('SUSPEND'), accountEnabled: 'no' }, null];
    for (const body of bad) {
      response = body;
      await assert.rejects(studentStateService.change(1, 'SUSPEND', request), (error: unknown) => isUncertainStudentStateChange(error));
    }
    response = changed('SUSPEND'); status = 201;
    await assert.rejects(studentStateService.change(1, 'SUSPEND', request));
    const before = calls.length;
    await assert.rejects(studentStateService.change(0, 'SUSPEND', request));
    assert.equal(calls.length, before);
  } finally { httpClient.defaults.adapter = original; }
});

test('error messages: codes first, HTTP fallback, 401/403 ignore codes, 5xx and network are uncertain', () => {
  assert.match(studentStateErrorMessage(httpError(409, 'STUDENT_HAS_ACTIVE_ENROLLMENT')), /Retírala con «Retirar matrícula»/);
  assert.match(studentStateErrorMessage(httpError(409, 'STUDENT_STATUS_CONFLICT')), /ya no está permitida/);
  assert.match(studentStateErrorMessage(httpError(409)), /ya no está permitida/);
  assert.match(studentStateErrorMessage(httpError(409, 'UNKNOWN')), /ya no está permitida/);
  assert.match(studentStateErrorMessage(httpError(400, 'VALIDATION_ERROR')), /motivo y la justificación/);
  assert.match(studentStateErrorMessage(httpError(400, 'STUDENT_HAS_ACTIVE_ENROLLMENT')), /motivo y la justificación/);
  assert.match(studentStateErrorMessage(httpError(404, 'STUDENT_NOT_FOUND')), /ya no existe/);
  assert.match(studentStateErrorMessage(httpError(403, 'STUDENT_STATUS_CONFLICT')), /Solo el Director/);
  assert.match(studentStateErrorMessage(httpError(401)), /sesión expiró/);
  for (const error of [httpError(), httpError(500, 'INTERNAL_ERROR'), httpError(500, 'INVALID_PARAMETER'), new Error('mismatch')]) {
    assert.equal(isUncertainStudentStateChange(error), true);
    assert.match(studentStateErrorMessage(error), /No se pudo confirmar el cambio de estado/);
    assert.equal(studentStateChangeReloads(error), true);
  }
  for (const status of [400, 401, 403]) assert.equal(studentStateChangeReloads(httpError(status)), false);
  for (const status of [404, 409]) assert.equal(studentStateChangeReloads(httpError(status)), true);
  for (const status of [400, 404, 409, 500]) assert.doesNotMatch(studentStateErrorMessage(httpError(status)), /PRIVATE/);
});

test('success messages describe the account effect', () => {
  assert.equal(studentStateSuccessMessage(changed('SUSPEND', false)), 'Alumno suspendido. Su cuenta quedó deshabilitada.');
  assert.equal(studentStateSuccessMessage(changed('DEACTIVATE', null)), 'Alumno dado de baja. No tiene una cuenta vinculada.');
  assert.equal(studentStateSuccessMessage(changed('REACTIVATE', true)), 'Alumno reactivado. Su cuenta quedó habilitada.');
  assert.match(studentStateSuccessMessage(changed('REACTIVATE', false)), /sigue deshabilitada porque ya lo estaba/);
});

test('labels: new states in list cards, profile and status filter options; unknown state never renders blank', async () => {
  assert.equal(studentStatusLabels.SUSPENDED, 'Suspendido');
  assert.equal(studentStatusLabels.DEACTIVATED, 'De baja');
  assert.deepEqual(Object.keys(studentStatusLabels), statuses);
  assert.equal(toAdminStudent({ ...detail(), studentStatus: 'ARCHIVED' as StudentStatus }).estadoLabel, 'Estado desconocido');
  for (const status of ['SUSPENDED', 'DEACTIVATED'] as const) {
    await view({ role: 'DIRECTIVO', read: async () => detail(status) }, async h => {
      assert.match(h.text(), new RegExp(studentStatusLabels[status]));
      // The list card (next/link needs the globals the harness provides).
      let card!: ReactTestRenderer;
      await act(async () => { card = create(<TarjetaEstudiante student={toAdminStudent(detail(status))} />); });
      try { assert.match(text(card.root), new RegExp(studentStatusLabels[status])); } finally { await act(async () => { card.unmount(); }); }
    });
  }
});

test('role × state matrix: only ADMINISTRADOR sees the allowed actions; DIRECTIVO and others only read the state', async () => {
  for (const role of roles) {
    for (const status of statuses) {
      await view({ role, read: async () => detail(status) }, async h => {
        const allowed = role === 'ADMINISTRADOR' ? availableStudentStateActions(status) : [];
        for (const action of ['SUSPEND', 'REACTIVATE', 'DEACTIVATE'] as const) assert.equal(!!h.button(buttons[action]), allowed.includes(action), `${role} ${status} ${action}`);
        assert.match(h.text(), new RegExp(studentStatusLabels[status]));
      });
    }
  }
});

test('each dialog shows its own reasons; deactivation warns and needs the permanent checkbox before PATCH', async () => {
  const calls: [number, StudentStateAction, ChangeStudentStateRequest][] = [];
  await view({ change: async (id, action, request) => { calls.push([id, action, request]); return changed(action); } }, async h => {
    await h.click('Suspender alumno');
    const options = () => h.renderer.root.findByProps({ 'aria-label': 'Motivo' }).findAllByType('option').map(option => option.props.value).filter(Boolean);
    assert.deepEqual(options(), Object.keys(studentStateReasons.SUSPEND));
    await h.click('Cancelar');
    await h.click('Dar de baja');
    assert.deepEqual(options(), Object.keys(studentStateReasons.DEACTIVATE));
    assert.match(h.text(), /La baja es permanente: no se podrá reactivar/);
    assert.match(h.button('Confirmar baja permanente')!.props.className, /bg-rose-700/);
    await h.submit();
    assert.match(h.text(), /Selecciona un motivo/);
    await h.fill('TRANSFER', '  Traslado documentado  '); await h.submit();
    assert.match(h.text(), /Confirma que entiendes que la baja es permanente/);
    assert.equal(calls.length, 0);
    await h.change('Entiendo que la baja es permanente', true); await h.submit();
    assert.deepEqual(calls, [[1, 'DEACTIVATE', { reasonCode: 'TRANSFER', justification: 'Traslado documentado' }]]);
  });
});

test('success sends one PATCH, locks other actions while pending and reloads the profile', async () => {
  const pending = deferred<StudentStateChangeResponse>();
  let reads = 0, patches = 0;
  await view({ read: async () => { reads++; return reads === 1 ? detail('ACTIVE', true) : detail('SUSPENDED', true); },
    change: async () => { patches++; return pending.promise; } }, async h => {
    await h.click('Suspender alumno'); await h.fill(); await h.submit(); await h.submit();
    assert.equal(patches, 1);
    assert.match(h.text(), /Cambiando el estado del alumno/);
    for (const label of ['Editar alumno', 'Retirar matrícula', 'Agregar apoderado']) assert.equal(h.button(label)?.props.disabled, true, label);
    await act(async () => { pending.resolve(changed('SUSPEND', false)); });
    assert.equal(reads, 2);
    assert.match(h.text(), /Alumno suspendido\. Su cuenta quedó deshabilitada\./);
    assert.match(h.text(), /Suspendido/);
    assert.ok(h.button('Reactivar alumno')); assert.equal(h.button('Suspender alumno'), undefined);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('409 STUDENT_HAS_ACTIVE_ENROLLMENT closes, reloads and leaves «Retirar matrícula» available; no retry', async () => {
  let reads = 0, patches = 0;
  await view({ read: async () => { reads++; return detail('ACTIVE', true); },
    change: async () => { patches++; throw httpError(409, 'STUDENT_HAS_ACTIVE_ENROLLMENT'); } }, async h => {
    await h.click('Dar de baja'); await h.fill('VOLUNTARY_WITHDRAWAL'); await h.change('Entiendo que la baja es permanente', true); await h.submit();
    assert.equal(patches, 1); assert.equal(reads, 2);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
    assert.match(h.text(), /Retírala con «Retirar matrícula» y vuelve a intentar la baja/);
    assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
    assert.equal(h.button('Retirar matrícula')?.props.disabled, false);
  });
});

test('400/401/403 keep the dialog without reload; 404, 409 and uncertain outcomes reload without repeating the PATCH', async () => {
  const cases: [unknown, boolean, RegExp][] = [
    [httpError(400, 'VALIDATION_ERROR'), false, /motivo y la justificación/], [httpError(401), false, /sesión expiró/], [httpError(403), false, /Solo el Director/],
    [httpError(404, 'STUDENT_NOT_FOUND'), true, /Alumno no encontrado|ya no existe/], [httpError(409, 'STUDENT_STATUS_CONFLICT'), true, /ya no está permitida/],
    [httpError(), true, /No se pudo confirmar el cambio de estado/], [httpError(500, 'INTERNAL_ERROR'), true, /No se pudo confirmar el cambio de estado/],
    [new Error('mismatch'), true, /No se pudo confirmar el cambio de estado/],
  ];
  for (const [failure, reloads, message] of cases) {
    let reads = 0, patches = 0;
    const notFound = failure instanceof AxiosError && failure.response?.status === 404;
    await view({ read: async () => { reads++; if (reads > 1 && notFound) throw httpError(404); return detail(); },
      change: async () => { patches++; throw failure; } }, async h => {
      await h.click('Suspender alumno'); await h.fill(); await h.submit();
      assert.equal(patches, 1); assert.equal(reads, reloads ? 2 : 1, String(message));
      assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, reloads ? 0 : 1);
      assert.match(h.text(), message);
      assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
      if (!reloads) assert.equal(h.button('Confirmar suspensión')?.props.disabled, false);
    });
  }
});

test('a late PATCH answer after navigating to another student is ignored', async () => {
  const pending = deferred<StudentStateChangeResponse>();
  let reads = 0;
  await view({ read: async id => { reads++; return detail('ACTIVE', false, Number(id)); }, change: async () => pending.promise }, async h => {
    await h.click('Suspender alumno'); await h.fill(); await h.submit();
    await h.navigate('2');
    const readsAfterNavigation = reads;
    await act(async () => { pending.resolve(changed('SUSPEND')); });
    assert.equal(reads, readsAfterNavigation);
    assert.doesNotMatch(h.text(), /Alumno suspendido/);
    assert.match(h.text(), /Alumno 2/);
    assert.equal(h.button('Suspender alumno')?.props.disabled, false);
  });
});
