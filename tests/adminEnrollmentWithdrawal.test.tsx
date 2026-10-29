import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PerfilDelAlumno from '../feature/admin/vistas/(academico)/alumnos/perfilDelAlumno';
import { AuthContext } from '../src/contexts/AuthContext';
import { studentsService } from '../src/services/admin/studentsService';
import { enrollmentErrorMessage, enrollmentsService, formatWithdrawalReason, localToday, maxWithdrawalReasonLength, withdrawalReasons, withdrawalValidation } from '../src/services/admin/enrollmentsService';
import httpClient from '../src/services/httpClient';
import type { StudentDetailResponse } from '../src/types/studentApi';
import type { EnrollmentDetailResponse } from '../src/types/enrollmentApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const reason = 'Traslado a otra institución', justification = 'Solicitud documentada del apoderado';
const request = () => ({ withdrawalDate: localToday(), withdrawalReason: formatWithdrawalReason(reason, justification) });
const detail = (active = true, id = 1): StudentDetailResponse => ({
  studentId: id, personId: id, studentCode: 'TEST-' + id, dni: null, firstNames: 'Alumno ' + id, paternalLastName: 'Sintético',
  maternalLastName: null, birthDate: null, phone: null, studentStatus: 'ACTIVE', enrollmentId: active ? 10 : null,
  enrollmentStatus: active ? 'ACTIVE' : null, academicPeriodId: active ? 2 : null, academicPeriodName: active ? 'Prueba' : null,
  sectionId: active ? 3 : null, sectionName: active ? 'A' : null, grade: active ? 1 : null, level: active ? 'PRIMARY' : null,
  enrollmentDate: active ? '2020-01-01' : null, guardians: [],
});
const withdrawn = (): EnrollmentDetailResponse => ({
  enrollmentId: 10, studentId: 1, academicPeriodId: 2, academicPeriodName: 'Prueba', sectionId: 3, level: 'PRIMARY',
  grade: 1, sectionName: 'A', enrollmentDate: '2020-01-01', status: 'WITHDRAWN', ...request(),
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

async function view(options: { role?: Auth['role']; active?: boolean; read?: typeof studentsService.getById; withdraw?: typeof enrollmentsService.withdraw },
  run: (h: { renderer: ReactTestRenderer; text: () => string; button: (label: string) => ReactTestInstance | undefined;
    click: (label: string) => Promise<void>; change: (label: string, value: string | boolean) => Promise<void>; fill: () => Promise<void>;
    submit: () => Promise<void>; navigate: (id: string, role?: Auth['role']) => Promise<void> }) => Promise<void>) {
  const oldRead = studentsService.getById, oldWithdraw = enrollmentsService.withdraw;
  studentsService.getById = options.read ?? (async id => detail(options.active ?? true, Number(id)));
  enrollmentsService.withdraw = options.withdraw ?? (async () => withdrawn());
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
      renderer, text: () => text(renderer.root), button,
      click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false); await act(async () => { node.props.onClick(); }); },
      change, fill: async () => { await change('Motivo del retiro', reason); await change('Justificación', justification); await change('Confirmar retiro', true); },
      submit: async () => { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); },
      navigate: async (id, role = options.role ?? 'ADMINISTRADOR') => { await act(async () => { renderer.update(tree(id, role)); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    studentsService.getById = oldRead; enrollmentsService.withdraw = oldWithdraw;
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

test('date/reason/justification boundaries and exact serialization fit the TEXT consumer bound', () => {
  const today = localToday();
  const d = new Date(); assert.equal(today, [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'));
  assert.equal(maxWithdrawalReasonLength, 353);
  assert.equal(withdrawalValidation(today, today, reason, 'a'.repeat(300)), null);
  assert.equal(withdrawalValidation(today, '2020-01-01', 'Otro', '  explicación detallada  '), null);
  assert.equal(formatWithdrawalReason(' Otro ', ' explicación detallada '), 'Motivo: Otro | Justificación: explicación detallada');
  for (const [date, start, why, explanation] of [
    ['', '2020-01-01', reason, justification], ['2026-02-30', '2020-01-01', reason, justification],
    ['2019-12-31', '2020-01-01', reason, justification], ['9999-01-01', '2020-01-01', reason, justification],
    [today, null, reason, justification], [today, '2020-01-01', '', justification],
    [today, '2020-01-01', 'inventado', justification], [today, '2020-01-01', reason, '         '],
    [today, '2020-01-01', reason, 'a b c d e f g h i'], [today, '2020-01-01', reason, 'a'.repeat(301)],
  ] as const) assert.ok(withdrawalValidation(date, start, why, explanation));
  assert.equal(withdrawalValidation(today, '2020-01-01', reason, 'a b c d e f g h i j'), null);
});

test('only ADMINISTRADOR with active enrollment sees the action', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE', 'APODERADO', 'ESTUDIANTE'] as const) {
    await view({ role }, async h => { assert.equal(!!h.button('Retirar matrícula'), role === 'ADMINISTRADOR'); });
  }
  await view({ active: false }, async h => { assert.equal(h.button('Retirar matrícula'), undefined); assert.match(h.text(), /Sin matrícula activa/); });
});

test('modal defaults to today, fixed reasons, Otro help, explicit confirmation and cancel never PATCH', async () => {
  let patches = 0;
  await view({ withdraw: async () => { patches++; return withdrawn(); } }, async h => {
    await h.click('Retirar matrícula');
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Fecha de retiro' }).props.value, localToday());
    assert.deepEqual(h.renderer.root.findAllByType('option').slice(1).map(node => text(node)), [...withdrawalReasons]);
    await h.submit(); assert.equal(patches, 0);
    await h.change('Motivo del retiro', 'Otro'); assert.match(h.text(), /Explica el motivo/);
    await h.change('Justificación', justification); await h.submit();
    assert.match(h.text(), /Confirma que deseas/); assert.equal(patches, 0);
    const oldSubmit = h.renderer.root.findByType('form').props.onSubmit;
    await h.click('Cancelar');
    await act(async () => { oldSubmit({ preventDefault() {} }); });
    assert.equal(patches, 0); assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('success locks double submits and only confirms after authoritative profile refresh', async () => {
  let patches = 0, reads = 0;
  const pending = deferred<EnrollmentDetailResponse>(), refreshed = deferred<StudentDetailResponse>();
  await view({ read: async () => ++reads === 1 ? detail() : refreshed.promise, withdraw: async (studentId, enrollmentId, body) => {
    patches++; assert.equal(studentId, 1); assert.equal(enrollmentId, 10); assert.deepEqual(body, request()); return pending.promise;
  } }, async h => {
    await h.click('Retirar matrícula'); await h.fill();
    const submit = h.renderer.root.findByType('form').props.onSubmit;
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); });
    assert.equal(patches, 1); assert.equal(h.button('Cancelar')?.props.disabled, true);
    assert.equal(h.button('Confirmar retiro de matrícula')?.props.disabled, true);
    await act(async () => { pending.resolve(withdrawn()); });
    assert.equal(reads, 2); assert.doesNotMatch(h.text(), /Matrícula retirada y perfil actualizado/);
    await act(async () => { refreshed.resolve(detail(false)); });
    assert.match(h.text(), /Matrícula retirada y perfil actualizado/); assert.match(h.text(), /Sin matrícula activa/);
    assert.equal(h.button('Retirar matrícula'), undefined); assert.match(h.text(), /Activo/);
  });
});

test('400 keeps form editable; 401/403/404/409 and ambiguous network failures refresh without repeating PATCH', async () => {
  for (const status of [400, 401, 403, 404, 409, undefined]) {
    let reads = 0, patches = 0;
    await view({ read: async () => { reads++; return detail(); }, withdraw: async () => { patches++; throw httpError(status); } }, async h => {
      await h.click('Retirar matrícula'); await h.fill(); await h.submit();
      assert.equal(patches, 1); assert.doesNotMatch(h.text(), /PRIVATE DETAIL|Matrícula retirada y perfil actualizado/);
      assert.equal(reads, status === 400 ? 1 : 2);
      if (status === 400) { assert.ok(h.button('Cancelar')); assert.equal(h.button('Confirmar retiro de matrícula')?.props.disabled, false); }
      else {
        assert.equal(h.button('Retirar matrícula')?.props.disabled, true);
        await h.click('Actualizar matrícula'); assert.equal(reads, 3); assert.equal(patches, 1);
      }
      const messages = new Map<number | undefined, RegExp>([[400, /Revisa la fecha/], [401, /Tu sesión/], [403, /No tienes autorización/], [404, /ya no están disponibles/], [409, /no pertenece.*no está activa/], [undefined, /sin repetir la solicitud/]]);
      assert.match(h.text(), messages.get(status)!);
    });
  }
});

test('accepted PATCH with failed or inconsistent GET never fabricates success and retry only GETs', async () => {
  for (const failed of [false, true]) {
    let reads = 0, patches = 0;
    await view({ read: async () => { reads++; if (reads === 2 && failed) throw httpError(500); return reads < 3 ? detail() : detail(false); },
      withdraw: async () => { patches++; return withdrawn(); } }, async h => {
      await h.click('Retirar matrícula'); await h.fill(); await h.submit();
      assert.match(h.text(), /servidor aceptó el retiro/); assert.doesNotMatch(h.text(), /Matrícula retirada y perfil actualizado/);
      await h.click('Actualizar matrícula');
      assert.match(h.text(), /Matrícula retirada y perfil actualizado/); assert.equal(patches, 1);
    });
  }
});

test('ambiguous PATCH with inactive refreshed enrollment reports verification rather than own success', async () => {
  let reads = 0, patches = 0;
  await view({ read: async () => ++reads === 1 ? detail() : detail(false), withdraw: async () => { patches++; throw httpError(); } }, async h => {
    await h.click('Retirar matrícula'); await h.fill(); await h.submit();
    assert.equal(patches, 1); assert.match(h.text(), /verifica su retiro en auditoría/);
    assert.doesNotMatch(h.text(), /Matrícula retirada y perfil actualizado/); assert.equal(h.button('Retirar matrícula'), undefined);
  });
});

test('student or role changes invalidate captured submit and late PATCH success/failure', async () => {
  for (const changeRole of [false, true]) {
    for (const fail of [false, true]) {
      let patches = 0, reads = 0;
      const pending = deferred<EnrollmentDetailResponse>();
      await view({ read: async id => { reads++; return detail(true, Number(id)); }, withdraw: async () => { patches++; return pending.promise; } }, async h => {
        await h.click('Retirar matrícula'); await h.fill();
        const submit = h.renderer.root.findByType('form').props.onSubmit;
        await h.submit();
        await h.navigate(changeRole ? '1' : '2', changeRole ? 'DIRECTIVO' : 'ADMINISTRADOR');
        const afterNavigation = reads;
        await act(async () => { submit({ preventDefault() {} }); if (fail) pending.reject(httpError(500)); else pending.resolve(withdrawn()); });
        assert.equal(patches, 1); assert.equal(reads, afterNavigation);
        assert.doesNotMatch(h.text(), /Matrícula retirada y perfil actualizado|sin repetir la solicitud/);
        if (changeRole) assert.equal(h.button('Retirar matrícula'), undefined);
        else assert.match(h.text(), /Alumno 2/);
      });
    }
  }
});

test('late verification GET cannot overwrite the next student and unmount invalidates pending reads', async () => {
  const pending = deferred<StudentDetailResponse>(); let reads = 0;
  await view({ read: async id => ++reads === 2 ? pending.promise : detail(true, Number(id)) }, async h => {
    await h.click('Retirar matrícula'); await h.fill(); await h.submit();
    await h.navigate('2');
    await act(async () => { pending.resolve(detail(false)); });
    assert.match(h.text(), /Alumno 2/); assert.doesNotMatch(h.text(), /Sin matrícula activa|Matrícula retirada y perfil actualizado/);
  });
  const patch = deferred<EnrollmentDetailResponse>(); reads = 0;
  await view({ read: async () => { reads++; return detail(); }, withdraw: () => patch.promise }, async h => {
    await h.click('Retirar matrícula'); await h.fill(); await h.submit();
    await act(async () => { h.renderer.unmount(); });
    await act(async () => { patch.resolve(withdrawn()); });
    assert.equal(reads, 1);
  });
});

test('HTTP consumer sends exact existing fields and rejects inconsistent accepted responses', async () => {
  const original = httpClient.defaults.adapter;
  let response = withdrawn(), status = 200, calls = 0;
  httpClient.defaults.adapter = async config => {
    calls++; assert.equal(config.method, 'patch'); assert.equal(config.url, '/v1/management/students/1/enrollments/10/withdraw');
    assert.deepEqual(JSON.parse(config.data), request());
    return { config, data: response, status, statusText: 'OK', headers: {} };
  };
  try {
    assert.deepEqual(await enrollmentsService.withdraw(1, 10, request()), withdrawn());
    for (const bad of [{ ...withdrawn(), enrollmentId: 11 }, { ...withdrawn(), studentId: 2 }, { ...withdrawn(), status: 'ACTIVE' as const }, { ...withdrawn(), withdrawalReason: null }]) {
      response = bad; await assert.rejects(enrollmentsService.withdraw(1, 10, request()));
    }
    response = withdrawn(); status = 201; await assert.rejects(enrollmentsService.withdraw(1, 10, request()));
    const count = calls;
    await assert.rejects(enrollmentsService.withdraw(0, 10, request())); assert.equal(calls, count);
  } finally { httpClient.defaults.adapter = original; }
});

test('withdrawal codes name the cause while the flow keeps branching on HTTP', async () => {
  assert.equal(enrollmentErrorMessage(httpError(409, 'ENROLLMENT_STATUS_CONFLICT')), 'La matrícula ya no está activa. Se consultará su estado actual.');
  assert.equal(enrollmentErrorMessage(httpError(409, 'ENROLLMENT_NOT_OF_STUDENT')), 'La matrícula no pertenece a este alumno. Se consultará su estado actual.');
  assert.equal(enrollmentErrorMessage(httpError(404, 'ENROLLMENT_NOT_FOUND')), 'La matrícula ya no existe.');
  assert.equal(enrollmentErrorMessage(httpError(400, 'WITHDRAWAL_DATE_REQUIRED')), 'Ingresa la fecha de retiro.');
  for (const code of [undefined, 'UNKNOWN_CODE', 409, 'VALIDATION_ERROR', 'WITHDRAWAL_DATE_REQUIRED']) assert.equal(enrollmentErrorMessage(httpError(409, code)), enrollmentErrorMessage(httpError(409)), String(code));
  assert.match(enrollmentErrorMessage(httpError(500, 'INTERNAL_ERROR')), /sin repetir la solicitud/);
  for (const [status, code, message] of [[400, 'WITHDRAWAL_DATE_BEFORE_ENROLLMENT', /no puede ser anterior a la fecha de matrícula/], [409, 'ENROLLMENT_STATUS_CONFLICT', /ya no está activa\. Se consultará/]] as const) {
    let reads = 0, patches = 0;
    await view({ read: async () => { reads++; return detail(); }, withdraw: async () => { patches++; throw httpError(status, code); } }, async h => {
      await h.click('Retirar matrícula'); await h.fill(); await h.submit();
      assert.equal(patches, 1); assert.equal(reads, status === 400 ? 1 : 2);
      assert.match(h.text(), message); assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
      if (status === 400) assert.equal(h.button('Confirmar retiro de matrícula')?.props.disabled, false);
    });
  }
});
