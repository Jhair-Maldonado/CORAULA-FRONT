import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaTotalAlumnado from '../feature/admin/vistas/(academico)/alumnos/vistaTotalAlumnado';
import { AuthContext } from '../src/contexts/AuthContext';
import { emptyStudentCreateValues, studentCreateReason, studentCreateValidation, toCreateStudent } from '../src/adapters/studentAdapter';
import { isUncertainStudentCreate, studentCreateErrorMessage, studentsService } from '../src/services/admin/studentsService';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { vacanciesService } from '../src/services/management/vacanciesService';
import { enrollmentsService, localToday } from '../src/services/admin/enrollmentsService';
import httpClient from '../src/services/httpClient';
import type { CreateStudentRequest, StudentDetailResponse } from '../src/types/studentApi';
import type { EnrollmentDetailResponse } from '../src/types/enrollmentApi';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';
import type { SectionResponse } from '../src/types/sectionApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

const values = { dni: '12345678', firstNames: ' Ana ', paternalLastName: ' Sintética ', maternalLastName: ' ', birthDate: '2015-03-04', phone: '' };
const wire: CreateStudentRequest = { dni: '12345678', firstNames: 'Ana', paternalLastName: 'Sintética', maternalLastName: null, birthDate: '2015-03-04', phone: null, reason: 'Alta individual' };
const created = (): StudentDetailResponse => ({
  studentId: 40, personId: 41, studentCode: null, dni: '12345678', firstNames: 'Ana', paternalLastName: 'Sintética',
  maternalLastName: null, birthDate: '2015-03-04', phone: null, studentStatus: 'ACTIVE', enrollmentId: null, enrollmentStatus: null,
  academicPeriodId: null, academicPeriodName: null, sectionId: null, level: null, grade: null, sectionName: null, enrollmentDate: null, guardians: [],
});
const period: AcademicPeriod = { id: 2, name: 'Periodo prueba', startDate: '2000-01-01', endDate: '2999-12-31', active: true, current: true };
const section = (id: number, patch: Partial<SectionResponse> = {}): SectionResponse => ({ id, academicPeriodId: 2, level: 'PRIMARY', grade: 1, name: 'A' + id, maxCapacity: 30, enrollmentOpen: true, active: true, ...patch });
const enrolled = (): EnrollmentDetailResponse => ({ enrollmentId: 70, studentId: 40, academicPeriodId: 2, academicPeriodName: 'Periodo prueba', sectionId: 5, level: 'PRIMARY', grade: 1, sectionName: 'A5', enrollmentDate: localToday(), status: 'ACTIVE', withdrawalDate: null, withdrawalReason: null });
const httpError = (status?: number, code?: unknown) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL', ...(code === undefined ? {} : { code }) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
const flush = () => act(async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0)); });
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

type Mocks = { create?: typeof studentsService.create; enroll?: typeof enrollmentsService.create };
async function view(role: Auth['role'], mocks: Mocks, run: (h: {
  renderer: ReactTestRenderer; text: () => string; lists: () => number; button: (label: string) => ReactTestInstance | undefined;
  click: (label: string) => Promise<void>; change: (label: string, value: string) => Promise<void>; submit: () => Promise<void>; fill: () => Promise<void>;
}) => Promise<void>) {
  const saved = { list: studentsService.list, create: studentsService.create, periods: academicPeriodsService.list, sections: sectionsService.list, vacancies: vacanciesService.list, enroll: enrollmentsService.create };
  let lists = 0;
  studentsService.list = async () => { lists++; return { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }; };
  studentsService.create = mocks.create ?? (async () => created());
  academicPeriodsService.list = async () => [period];
  sectionsService.list = async () => [section(5)];
  vacanciesService.list = async () => [];
  enrollmentsService.create = mocks.enroll ?? (async () => enrolled());
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  const auth: Auth = { token: 'synthetic', role, status: 'authenticated', sessionValid: true, login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AuthContext.Provider value={auth}><VistaTotalAlumnado /></AuthContext.Provider>, { createNodeMock: () => new Element() }); });
    const button = (label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);
    const change = async (label: string, value: string) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); };
    await run({
      renderer, text: () => text(renderer.root), lists: () => lists, button, change,
      click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false); await act(async () => { node.props.onClick(); }); },
      submit: async () => { const form = renderer.root.findByProps({ role: 'dialog' }).findByType('form'); await act(async () => { form.props.onSubmit({ preventDefault() {} }); }); await flush(); },
      fill: async () => { for (const [label, value] of [['DNI', values.dni], ['Nombres', values.firstNames], ['Apellido paterno', values.paternalLastName], ['Fecha de nacimiento', values.birthDate]]) await change(label, value); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(studentsService, { list: saved.list, create: saved.create });
    academicPeriodsService.list = saved.periods; sectionsService.list = saved.sections; vacanciesService.list = saved.vacancies; enrollmentsService.create = saved.enroll;
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

test('create validation: 8-digit DNI, required names, max lengths and non-future birth date', () => {
  assert.equal(studentCreateValidation(values), null);
  assert.equal(studentCreateValidation({ ...values, birthDate: localToday() }), null);
  assert.equal(studentCreateValidation({ ...values, firstNames: 'a'.repeat(120), paternalLastName: 'b'.repeat(120), maternalLastName: 'c'.repeat(120), phone: '9'.repeat(30) }), null);
  for (const bad of [
    { dni: '' }, { dni: '1234567' }, { dni: '123456789' }, { dni: '1234567a' }, { firstNames: '  ' }, { paternalLastName: '' },
    { firstNames: 'a'.repeat(121) }, { paternalLastName: 'a'.repeat(121) }, { maternalLastName: 'a'.repeat(121) }, { phone: '9'.repeat(31) },
    { birthDate: '' }, { birthDate: '2015-02-30' }, { birthDate: '9999-01-01' },
  ]) assert.ok(studentCreateValidation({ ...emptyStudentCreateValues, ...values, ...bad }), JSON.stringify(bad));
});

test('create body trims, nulls empty optionals, fixes the reason and never carries studentCode', () => {
  assert.equal(studentCreateReason, 'Alta individual');
  assert.deepEqual(toCreateStudent(values), wire);
  assert.equal('studentCode' in toCreateStudent(values), false);
  assert.deepEqual(toCreateStudent({ ...values, maternalLastName: ' Ruiz ', phone: ' 999 ' }), { ...wire, maternalLastName: 'Ruiz', phone: '999' });
});

test('HTTP create whitelists the body and rejects responses that do not match a 201 for the same DNI', async () => {
  const original = httpClient.defaults.adapter;
  let response = created(), status = 201;
  httpClient.defaults.adapter = async config => {
    assert.equal(config.method, 'post'); assert.equal(config.url, '/v1/management/students');
    assert.deepEqual(JSON.parse(config.data), wire);
    return { config, data: response, status, statusText: 'Created', headers: {} };
  };
  try {
    assert.deepEqual(await studentsService.create({ ...wire, studentCode: 'X', extra: true } as CreateStudentRequest), created());
    status = 200; await assert.rejects(studentsService.create(wire)); status = 201;
    for (const bad of [{ ...created(), dni: '87654321' }, { ...created(), studentId: 0 }]) { response = bad; await assert.rejects(studentsService.create(wire)); }
  } finally { httpClient.defaults.adapter = original; }
});

test('create messages are own texts per status; no response, 5xx and unexpected bodies are uncertain', () => {
  for (const status of [400, 401, 403, 409]) {
    assert.doesNotMatch(studentCreateErrorMessage(httpError(status)), /PRIVATE/);
    assert.equal(isUncertainStudentCreate(httpError(status)), false);
  }
  assert.match(studentCreateErrorMessage(httpError(409)), /DNI ya está registrado/);
  assert.match(studentCreateErrorMessage(httpError(403)), /Solo el Director/);
  for (const error of [httpError(), httpError(500), httpError(503), new Error('mismatch')]) {
    assert.equal(isUncertainStudentCreate(error), true);
    assert.match(studentCreateErrorMessage(error), /Busca al alumno en el listado/);
  }
});

test('only ADMINISTRADOR sees «Nuevo alumno»', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO', 'DOCENTE', 'APODERADO', 'ESTUDIANTE'] as const) {
    await view(role, {}, async h => { assert.equal(!!h.button('Nuevo alumno'), role === 'ADMINISTRADOR'); });
  }
});

test('invalid form never POSTs; double submit creates once; the list refreshes after creation', async () => {
  const pending = deferred<StudentDetailResponse>();
  const bodies: CreateStudentRequest[] = [];
  await view('ADMINISTRADOR', { create: async body => { bodies.push(body); return pending.promise; } }, async h => {
    await h.click('Nuevo alumno');
    await h.submit();
    assert.match(h.text(), /exactamente 8 dígitos/); assert.equal(bodies.length, 0);
    await h.fill(); await h.change('Fecha de nacimiento', '9999-01-01'); await h.submit();
    assert.match(h.text(), /no puede ser futura/); assert.equal(bodies.length, 0);
    await h.change('Fecha de nacimiento', values.birthDate);
    const before = h.lists();
    await h.submit(); await h.submit();
    assert.equal(bodies.length, 1); assert.deepEqual(bodies[0], wire);
    assert.match(h.text(), /Registrando alumno/);
    await act(async () => { pending.resolve(created()); }); await flush();
    assert.match(h.text(), /Alumno registrado: Ana Sintética · DNI 12345678/);
    assert.ok(h.lists() > before);
  });
});

test('failed enrollment after creation retries only the enrollment POST', async () => {
  let creates = 0, enrolls = 0;
  await view('ADMINISTRADOR', {
    create: async () => { creates++; return created(); },
    enroll: async (studentId, body) => {
      enrolls++;
      assert.equal(studentId, 40);
      assert.deepEqual(body, { academicPeriodId: 2, sectionId: 5, enrollmentDate: localToday(), reason: 'Matrícula individual' });
      if (enrolls === 1) throw httpError(409);
      return enrolled();
    },
  }, async h => {
    await h.click('Nuevo alumno'); await h.fill(); await h.submit();
    await h.change('Sección', '5'); await h.submit();
    assert.match(h.text(), /No se pudo matricular: la sección está inactiva o con la matrícula cerrada, no tiene vacantes/);
    assert.doesNotMatch(h.text(), /PRIVATE/);
    await h.submit();
    assert.equal(creates, 1); assert.equal(enrolls, 2);
    assert.match(h.text(), /quedó matriculado en Periodo prueba · Primaria 1° · Sección A5/);
  });
});

test('uncertain creation shows guidance, refreshes the list and never retries automatically', async () => {
  let creates = 0;
  await view('ADMINISTRADOR', { create: async () => { creates++; throw httpError(); } }, async h => {
    await h.click('Nuevo alumno'); await h.fill();
    const before = h.lists();
    await h.submit();
    assert.match(h.text(), /No se pudo confirmar el registro. Busca al alumno en el listado/);
    assert.equal(creates, 1); assert.ok(h.lists() > before);
    assert.ok(h.renderer.root.findByProps({ 'aria-label': 'DNI' }), 'stays on the form');
  });
});

test('create shows the catalog text for a recognized code and keeps HTTP texts and uncertainty otherwise', async () => {
  assert.equal(studentCreateErrorMessage(httpError(409, 'STUDENT_CODE_EXHAUSTED')), 'No hay códigos de alumno disponibles. Contacta al administrador del sistema.');
  assert.equal(studentCreateErrorMessage(httpError(409, 'DNI_ALREADY_EXISTS')), 'El DNI ya está registrado para otra persona.');
  for (const code of ['STUDENT_PERSON_ALREADY_EXISTS', 'STUDENT_CODE_ALREADY_EXISTS']) assert.doesNotMatch(studentCreateErrorMessage(httpError(409, code)), /DNI/);
  for (const [status, code] of [[409, undefined], [409, 'UNKNOWN_CODE'], [409, 7], [409, null], [409, ''], [400, 'VALIDATION_ERROR'], [400, 'INVALID_REQUEST_BODY'], [400, 'DNI_ALREADY_EXISTS']] as const) {
    assert.equal(studentCreateErrorMessage(httpError(status, code)), studentCreateErrorMessage(httpError(status)), String(code));
  }
  for (const code of ['INTERNAL_ERROR', 'INVALID_PARAMETER']) {
    assert.equal(isUncertainStudentCreate(httpError(500, code)), true);
    assert.match(studentCreateErrorMessage(httpError(500, code)), /Busca al alumno en el listado/);
  }
  assert.match(studentCreateErrorMessage(httpError(403, 'DNI_ALREADY_EXISTS')), /Solo el Director/);
  let creates = 0;
  await view('ADMINISTRADOR', { create: async () => { creates++; throw httpError(409, 'STUDENT_CODE_EXHAUSTED'); } }, async h => {
    await h.click('Nuevo alumno'); await h.fill(); await h.submit();
    assert.equal(creates, 1);
    assert.match(h.text(), /No hay códigos de alumno disponibles/);
    assert.doesNotMatch(h.text(), /PRIVATE DETAIL|el DNI ya está registrado para otra persona/);
  });
});
