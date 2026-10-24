import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PerfilDelAlumno from '../feature/admin/vistas/(academico)/alumnos/perfilDelAlumno';
import { AuthContext } from '../src/contexts/AuthContext';
import { studentsService } from '../src/services/admin/studentsService';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { vacanciesService } from '../src/services/management/vacanciesService';
import { enrollmentCreateErrorMessage, enrollmentCreateReason, enrollmentCreateValidation, enrollmentsService, localToday } from '../src/services/admin/enrollmentsService';
import httpClient from '../src/services/httpClient';
import type { StudentDetailResponse, StudentStatus } from '../src/types/studentApi';
import type { CreateEnrollmentRequest, EnrollmentDetailResponse } from '../src/types/enrollmentApi';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';
import type { SectionResponse } from '../src/types/sectionApi';
import type { VacancyGradeResponse } from '../src/types/vacanciesApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

const period = (id: number, patch: Partial<AcademicPeriod> = {}): AcademicPeriod => ({ id, name: 'Periodo ' + id, startDate: '2000-01-01', endDate: '2999-12-31', active: true, current: false, ...patch });
const section = (id: number, patch: Partial<SectionResponse> = {}): SectionResponse => ({ id, academicPeriodId: 2, level: 'PRIMARY', grade: 1, name: 'A' + id, maxCapacity: 30, enrollmentOpen: true, active: true, ...patch });
const vacancies = (rows: [number, number][]): VacancyGradeResponse[] => [{ academicPeriodId: 2, level: 'PRIMARY', grade: 1, totalCapacity: 60, activeEnrollmentCount: 0, availableVacancies: 0,
  sections: rows.map(([sectionId, availableVacancies]) => ({ sectionId, sectionName: 'A' + sectionId, maxCapacity: 30, activeEnrollmentCount: 30 - availableVacancies, availableVacancies, enrollmentOpen: true, active: true })) }];
const detail = (patch: Partial<StudentDetailResponse> = {}): StudentDetailResponse => ({
  studentId: 1, personId: 1, studentCode: 'TEST-1', dni: '12345678', firstNames: 'Alumno', paternalLastName: 'Sintético', maternalLastName: null,
  birthDate: null, phone: null, studentStatus: 'ACTIVE', enrollmentId: null, enrollmentStatus: null, academicPeriodId: null, academicPeriodName: null,
  sectionId: null, sectionName: null, grade: null, level: null, enrollmentDate: null, guardians: [], ...patch,
});
const activeEnrollment = { enrollmentId: 10, enrollmentStatus: 'ACTIVE' as const, academicPeriodId: 2, academicPeriodName: 'Periodo 2', sectionId: 5, sectionName: 'A5', grade: 1, level: 'PRIMARY' as const, enrollmentDate: '2020-01-01' };
const request = (): CreateEnrollmentRequest => ({ academicPeriodId: 2, sectionId: 5, enrollmentDate: localToday(), reason: 'Matrícula individual' });
const enrolled = (): EnrollmentDetailResponse => ({ enrollmentId: 70, studentId: 1, academicPeriodId: 2, academicPeriodName: 'Periodo 2', sectionId: 5, level: 'PRIMARY', grade: 1, sectionName: 'A5', enrollmentDate: localToday(), status: 'ACTIVE', withdrawalDate: null, withdrawalReason: null });
const httpError = (status?: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
const flush = () => act(async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setTimeout(resolve, 0)); });

type Options = { role?: Auth['role']; read?: typeof studentsService.getById; periods?: AcademicPeriod[]; sections?: SectionResponse[];
  vacancies?: typeof vacanciesService.list; enroll?: typeof enrollmentsService.create };
async function view(options: Options, run: (h: {
  renderer: ReactTestRenderer; text: () => string; button: (label: string) => ReactTestInstance | undefined; options: (label: string) => ReactTestInstance[];
  click: (label: string) => Promise<void>; change: (label: string, value: string) => Promise<void>; submit: () => Promise<void>;
}) => Promise<void>) {
  const saved = { read: studentsService.getById, periods: academicPeriodsService.list, sections: sectionsService.list, vacancies: vacanciesService.list, enroll: enrollmentsService.create };
  studentsService.getById = options.read ?? (async () => detail());
  academicPeriodsService.list = async () => options.periods ?? [period(2, { current: true })];
  sectionsService.list = async () => options.sections ?? [section(5)];
  vacanciesService.list = options.vacancies ?? (async () => vacancies([[5, 3]]));
  enrollmentsService.create = options.enroll ?? (async () => enrolled());
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  const auth: Auth = { token: 'synthetic', role: options.role ?? 'ADMINISTRADOR', status: 'authenticated', sessionValid: true, login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AuthContext.Provider value={auth}><PathParamsContext.Provider value={{ estudianteId: '1' }}><PerfilDelAlumno /></PathParamsContext.Provider></AuthContext.Provider>, { createNodeMock: () => new Element() }); });
    await flush();
    const button = (label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);
    await run({
      renderer, text: () => text(renderer.root), button,
      options: label => renderer.root.findByProps({ 'aria-label': label }).findAllByType('option'),
      change: async (label, value) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); await flush(); },
      click: async label => { const node = button(label); assert.ok(node, label); assert.equal(!!node.props.disabled, false); await act(async () => { node.props.onClick(); }); await flush(); },
      submit: async () => { const form = renderer.root.findByProps({ role: 'dialog' }).findByType('form'); await act(async () => { form.props.onSubmit({ preventDefault() {} }); }); await flush(); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    studentsService.getById = saved.read; academicPeriodsService.list = saved.periods; sectionsService.list = saved.sections;
    vacanciesService.list = saved.vacancies; enrollmentsService.create = saved.enroll;
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

test('enrollment validation covers student, active period, open section, vacancies and period dates', () => {
  const base = { studentStatus: 'ACTIVE' as StudentStatus, hasActiveEnrollment: false, period: period(2), section: section(5), availableVacancies: 3, enrollmentDate: '2026-05-01' };
  assert.equal(enrollmentCreateReason, 'Matrícula individual');
  assert.equal(enrollmentCreateValidation(base), null);
  assert.equal(enrollmentCreateValidation({ ...base, availableVacancies: null }), null);
  const bounded = period(2, { startDate: '2026-03-01', endDate: '2026-12-15' });
  assert.equal(enrollmentCreateValidation({ ...base, period: bounded, enrollmentDate: '2026-03-01' }), null);
  assert.equal(enrollmentCreateValidation({ ...base, period: bounded, enrollmentDate: '2026-12-15' }), null);
  for (const bad of [
    { studentStatus: 'WITHDRAWN' as StudentStatus }, { studentStatus: 'GRADUATED' as StudentStatus }, { hasActiveEnrollment: true },
    { period: undefined }, { period: period(2, { active: false }) }, { section: undefined }, { section: section(5, { academicPeriodId: 3 }) },
    { section: section(5, { active: false }) }, { section: section(5, { enrollmentOpen: false }) }, { availableVacancies: 0 },
    { enrollmentDate: '' }, { enrollmentDate: '2026-02-30' }, { period: bounded, enrollmentDate: '2026-02-28' }, { period: bounded, enrollmentDate: '2026-12-16' },
  ]) assert.ok(enrollmentCreateValidation({ ...base, ...bad }), JSON.stringify(bad));
});

test('HTTP enrollment whitelists the body and rejects responses that do not match the request', async () => {
  const original = httpClient.defaults.adapter;
  let response = enrolled(), status = 201, calls = 0;
  httpClient.defaults.adapter = async config => {
    calls++; assert.equal(config.method, 'post'); assert.equal(config.url, '/v1/management/students/1/enrollments');
    assert.deepEqual(JSON.parse(config.data), request());
    return { config, data: response, status, statusText: 'Created', headers: {} };
  };
  try {
    assert.deepEqual(await enrollmentsService.create(1, { ...request(), studentId: 9 } as CreateEnrollmentRequest), enrolled());
    for (const bad of [{ ...enrolled(), studentId: 2 }, { ...enrolled(), sectionId: 6 }, { ...enrolled(), academicPeriodId: 3 }, { ...enrolled(), status: 'WITHDRAWN' as const }]) {
      response = bad; await assert.rejects(enrollmentsService.create(1, request()));
    }
    response = enrolled(); status = 200; await assert.rejects(enrollmentsService.create(1, request()));
    const count = calls;
    await assert.rejects(enrollmentsService.create(0, request()));
    await assert.rejects(enrollmentsService.create(1, { ...request(), sectionId: 0 }));
    assert.equal(calls, count);
  } finally { httpClient.defaults.adapter = original; }
});

test('enrollment messages are own texts; 409 lists every possible cause without reading the backend text', () => {
  for (const status of [400, 401, 403, 404, 409, 500, undefined]) assert.doesNotMatch(enrollmentCreateErrorMessage(httpError(status)), /PRIVATE/);
  assert.equal(enrollmentCreateErrorMessage(httpError(409)), 'No se pudo matricular: la sección está inactiva o con la matrícula cerrada, no tiene vacantes, el alumno ya tiene una matrícula activa en el periodo o la sección pertenece a otro periodo.');
  assert.match(enrollmentCreateErrorMessage(httpError(403)), /Solo el Director/);
  assert.match(enrollmentCreateErrorMessage(httpError()), /Revisa el perfil del alumno/);
});

test('«Matricular en sección» only for ADMINISTRADOR and ACTIVE students without an active enrollment', async () => {
  const cases: [Options, boolean][] = [
    [{}, true],
    [{ role: 'DIRECTIVO' }, false],
    [{ read: async () => detail(activeEnrollment) }, false],
    [{ read: async () => detail({ studentStatus: 'WITHDRAWN' }) }, false],
    [{ read: async () => detail({ studentStatus: 'GRADUATED' }) }, false],
    [{ read: async () => detail({ ...activeEnrollment, enrollmentStatus: 'WITHDRAWN' }) }, true],
  ];
  for (const [options, visible] of cases) await view(options, async h => { assert.equal(!!h.button('Matricular en sección'), visible, JSON.stringify(options)); });
});

test('«Matricular en sección» is disabled while editing the student', async () => {
  await view({}, async h => {
    await h.click('Editar alumno');
    assert.equal(h.button('Matricular en sección')?.props.disabled, true);
  });
});

test('selector lists active periods only and open sections of the period with their vacancies', async () => {
  const vacancyCalls: (number | undefined)[] = [];
  await view({
    periods: [period(1), period(2, { current: true }), period(3, { active: false })],
    sections: [section(5), section(6, { enrollmentOpen: false }), section(7, { active: false }), section(8), section(9, { academicPeriodId: 4 })],
    vacancies: async id => { vacancyCalls.push(id); return vacancies([[5, 1], [8, 0]]); },
  }, async h => {
    await h.click('Matricular en sección');
    assert.deepEqual(h.options('Periodo académico').map(node => node.props.value), [1, 2]);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Periodo académico' }).props.value, 2);
    assert.equal(vacancyCalls.at(-1), 2);
    const sections = h.options('Sección').slice(1);
    assert.deepEqual(sections.map(node => node.props.value), [5, 8]);
    assert.match(text(sections[0]), /Primaria · 1° · Sección A5 · 1 vacante$/);
    assert.match(text(sections[1]), /Sin vacantes/); assert.equal(sections[1].props.disabled, true);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Fecha de matrícula' }).props.value, localToday());
  });
});

test('vacancies failure falls back to the backend capacity check', async () => {
  let enrolls = 0;
  await view({ vacancies: async () => { throw httpError(500); }, enroll: async () => { enrolls++; return enrolled(); } }, async h => {
    await h.click('Matricular en sección');
    assert.match(h.text(), /No se pudieron consultar las vacantes/);
    assert.equal(text(h.options('Sección')[1]), 'Primaria · 1° · Sección A5');
    await h.change('Sección', '5'); await h.submit();
    assert.equal(enrolls, 1);
  });
});

test('date outside the period never POSTs; success refreshes the profile and hides the action', async () => {
  const bodies: CreateEnrollmentRequest[] = [];
  let reads = 0;
  await view({
    periods: [period(2, { current: true, startDate: '2000-01-01', endDate: '2999-12-31' })],
    read: async () => ++reads === 1 ? detail() : detail(activeEnrollment),
    enroll: async (_, body) => { bodies.push(body); return enrolled(); },
  }, async h => {
    await h.click('Matricular en sección');
    await h.submit();
    assert.match(h.text(), /Selecciona una sección/); assert.equal(bodies.length, 0);
    await h.change('Sección', '5'); await h.change('Fecha de matrícula', '1999-12-31'); await h.submit();
    assert.match(h.text(), /dentro del periodo/); assert.equal(bodies.length, 0);
    await h.change('Fecha de matrícula', localToday()); await h.submit();
    assert.deepEqual(bodies, [request()]);
    assert.equal(reads, 2);
    assert.match(h.text(), /Matrícula registrada en Periodo 2 · 1° A5/);
    assert.equal(h.button('Matricular en sección'), undefined);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 0);
  });
});

test('a rejected enrollment keeps the dialog for a manual retry with the generic message', async () => {
  let enrolls = 0;
  await view({ enroll: async () => { enrolls++; throw httpError(409); } }, async h => {
    await h.click('Matricular en sección');
    await h.change('Sección', '5'); await h.submit();
    assert.equal(enrolls, 1);
    assert.match(h.text(), /No se pudo matricular: la sección está inactiva/);
    assert.equal(h.renderer.root.findAllByProps({ role: 'dialog' }).length, 1);
  });
});

test('without active periods or open sections the action explains why and cannot submit', async () => {
  await view({ periods: [period(3, { active: false })] }, async h => {
    await h.click('Matricular en sección');
    assert.match(h.text(), /No hay periodos académicos activos/);
    assert.equal(h.button('Matricular')?.props.disabled, true);
  });
  await view({ sections: [section(6, { enrollmentOpen: false })] }, async h => {
    await h.click('Matricular en sección');
    assert.match(h.text(), /No hay secciones activas con matrícula abierta/);
    assert.equal(h.button('Matricular')?.props.disabled, true);
  });
});
