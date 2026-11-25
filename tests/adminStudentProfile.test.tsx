import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PerfilDelAlumno from '../feature/admin/vistas/(academico)/alumnos/perfilDelAlumno';
import { AuthContext } from '../src/contexts/AuthContext';
import { formatStudentDate, studentClassroomLabel, toAdminStudentDetail } from '../src/adapters/studentAdapter';
import { studentStatusToneClass } from '../src/adapters/studentUi';
import { studentsService } from '../src/services/admin/studentsService';
import type { GuardianSummaryResponse, StudentDetailResponse } from '../src/types/studentApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

const guardian = (patch: Partial<GuardianSummaryResponse> = {}): GuardianSummaryResponse => ({
  guardianId: 90, personId: 91, dni: '41000099', firstNames: 'Rosa', paternalLastName: 'Sintética', maternalLastName: null, phone: '900000199',
  relationship: 'MOTHER', primary: true, authorizedPickup: true, active: true, ...patch,
});
const detail = (patch: Partial<StudentDetailResponse> = {}): StudentDetailResponse => ({
  studentId: 1, personId: 1, studentCode: 'TEST-1', dni: '70000001', firstNames: 'Alumno', paternalLastName: 'Sintético',
  maternalLastName: null, birthDate: '2016-01-01', phone: '900000001', studentStatus: 'ACTIVE', enrollmentId: 10,
  enrollmentStatus: 'ACTIVE', academicPeriodId: 2, academicPeriodName: 'Periodo de prueba', sectionId: 3, sectionName: 'A', grade: 3,
  level: 'PRIMARY', enrollmentDate: '2026-02-20', guardians: [guardian()], ...patch,
});
const httpError = (status?: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }

async function view(options: { read: typeof studentsService.getById; params?: Record<string, string>; role?: Auth['role'] },
  run: (h: { root: ReactTestInstance; text: () => string; button: (label: string) => ReactTestInstance | undefined; rerender: () => Promise<void> }) => Promise<void>) {
  const oldRead = studentsService.getById;
  studentsService.getById = options.read;
  // next/link usa requestIdleCallback, que lee `self`.
  const selfDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  const auth: Auth = { token: 'synthetic', role: options.role ?? 'ADMINISTRADOR', status: 'authenticated', sessionValid: true,
    login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  const tree = <AuthContext.Provider value={auth}><PathParamsContext.Provider value={{ estudianteId: '1', ...options.params }}><PerfilDelAlumno /></PathParamsContext.Provider></AuthContext.Provider>;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(tree); });
    await run({
      root: renderer.root, text: () => text(renderer.root),
      button: label => renderer.root.findAllByType('button').find(node => text(node) === label),
      rerender: async () => { await act(async () => { renderer.update(tree); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    studentsService.getById = oldRead;
    if (selfDescriptor) Object.defineProperty(globalThis, 'self', selfDescriptor); else Reflect.deleteProperty(globalThis, 'self');
  }
}

const noIsoDate = /\d{4}-\d{2}-\d{2}/;
const hiddenFields = [/Contraseña/, /Correo/, /Dirección/];

test('adapter: fechas legibles en es-PE sin desfase de zona horaria', () => {
  assert.equal(formatStudentDate('2016-01-01'), '1 ene. 2016');
  assert.equal(formatStudentDate('2026-02-20'), '20 feb. 2026');
  assert.equal(formatStudentDate(null), null);
  assert.equal(formatStudentDate(''), null);
  assert.equal(formatStudentDate('2026-02-30'), null);
  assert.equal(formatStudentDate('20/02/2026'), null);
  const full = toAdminStudentDetail(detail());
  assert.equal(full.birthDateLabel, '1 ene. 2016');
  assert.equal(full.enrollmentDateLabel, '20 feb. 2026');
  // Las fechas crudas se conservan para el retiro y la edición.
  assert.equal(full.birthDate, '2016-01-01');
  assert.equal(full.enrollmentDate, '2026-02-20');
  const empty = toAdminStudentDetail(detail({ birthDate: null, enrollmentDate: null }));
  assert.equal(empty.birthDateLabel, null);
  assert.equal(empty.enrollmentDateLabel, null);
});

test('adapter: aulaLabel combina grado, sección normalizada y nivel solo con matrícula activa', () => {
  assert.equal(toAdminStudentDetail(detail()).aulaLabel, '3.° A · Primaria');
  assert.equal(toAdminStudentDetail(detail({ sectionName: 'Sección B', grade: 1, level: 'SECONDARY' })).aulaLabel, '1.° B · Secundaria');
  assert.equal(toAdminStudentDetail(detail({ sectionName: null })).aulaLabel, '3.° · Primaria');
  assert.equal(toAdminStudentDetail(detail({ enrollmentId: null, enrollmentStatus: null })).aulaLabel, null);
  assert.equal(toAdminStudentDetail(detail({ enrollmentStatus: 'WITHDRAWN' })).aulaLabel, null);
  assert.equal(studentClassroomLabel({ tieneMatriculaActiva: true, grade: null, sectionName: null, nivelLabel: null }), null);
});

test('adapter: cada tono de estado tiene clases con tokens y sin colores crudos', () => {
  for (const classes of Object.values(studentStatusToneClass)) assert.doesNotMatch(classes, /#|rose-|emerald-|blue-/);
  assert.match(studentStatusToneClass.success, /bg-success/);
});

test('perfil con apoderado: relación traducida, teléfono, autorización y fechas legibles', async () => {
  await view({ read: async () => detail({ guardians: [guardian({ primary: false, firstNames: 'Luis', relationship: 'FATHER', phone: '900000200' }), guardian()] }) }, async h => {
    const content = h.text();
    assert.match(content, /Familiar \/ Apoderado/);
    assert.match(content, /Madre/);
    assert.match(content, /Padre/);
    assert.match(content, /900000199/);
    assert.match(content, /Autorizado para recoger/);
    assert.match(content, /3\.° A · Primaria/);
    assert.match(content, /1 ene\. 2016/);
    assert.match(content, /20 feb\. 2026/);
    assert.match(content, /3\.° grado/);
    assert.doesNotMatch(content, /Contacto de emergencia/);
    assert.doesNotMatch(content, noIsoDate);
    for (const field of hiddenFields) assert.doesNotMatch(content, field);
    // La principal se muestra primero aunque el servidor la envíe después.
    assert.ok(content.indexOf('Rosa') < content.indexOf('Luis'));
    assert.ok(h.button('Editar alumno'));
    assert.ok(h.button('Agregar apoderado'));
    assert.ok(h.button('Retirar matrícula'));
  });
});

test('perfil sin apoderados', async () => {
  await view({ read: async () => detail({ guardians: [] }) }, async h => {
    assert.match(h.text(), /Sin apoderados registrados/);
    assert.doesNotMatch(h.text(), noIsoDate);
  });
});

test('perfil sin matrícula activa: sin chip de aula y con acción de matricular', async () => {
  await view({ read: async () => detail({ enrollmentId: null, enrollmentStatus: null, academicPeriodId: null, academicPeriodName: null, sectionId: null, sectionName: null, grade: null, level: null, enrollmentDate: null }) }, async h => {
    const content = h.text();
    assert.match(content, /Sin matrícula activa/);
    assert.doesNotMatch(content, /Primaria/);
    assert.doesNotMatch(content, noIsoDate);
    assert.ok(h.button('Matricular en sección'));
    assert.equal(h.button('Retirar matrícula'), undefined);
  });
});

test('perfil con campos nulos muestra «No registrado»', async () => {
  await view({ read: async () => detail({ dni: null, studentCode: null, birthDate: null, phone: null, guardians: [guardian({ dni: null, phone: null, authorizedPickup: false, active: false })] }) }, async h => {
    const content = h.text();
    assert.match(content, /DNI: No registrado/);
    assert.ok((content.match(/No registrado/g) ?? []).length >= 6);
    assert.match(content, /No autorizado para recoger/);
    assert.match(content, /Inactivo/);
    assert.doesNotMatch(content, noIsoDate);
    for (const field of hiddenFields) assert.doesNotMatch(content, field);
  });
});

test('perfil: error con «Reintentar» recarga y 404 se distingue', async () => {
  let calls = 0;
  await view({ read: async () => { calls += 1; throw httpError(500); } }, async h => {
    assert.match(h.text(), /No se pudo cargar el alumno/);
    assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
    const retry = h.button('Reintentar');
    assert.ok(retry);
    await act(async () => { retry.props.onClick(); });
    assert.equal(calls, 2);
  });
  await view({ read: async () => { throw httpError(404); } }, async h => {
    assert.match(h.text(), /Alumno no encontrado/);
    assert.ok(h.button('Reintentar'));
  });
});

test('enlace de vuelta: «Volver al aula» con id de sección y «Todos los alumnos» sin él', async () => {
  const href = (h: { root: ReactTestInstance }) => h.root.findAll(node => typeof node.props.href === 'string').map(node => node.props.href as string);
  await view({ read: async () => detail(), params: { id: '10' } }, async h => {
    assert.match(h.text(), /Volver al aula/);
    assert.ok(href(h).includes('/administrador/alumnos/grado/10'));
  });
  await view({ read: async () => detail() }, async h => {
    assert.match(h.text(), /Todos los alumnos/);
    assert.ok(href(h).includes('/administrador/alumnos'));
  });
  await view({ read: async () => detail(), params: { id: '../x' } }, async h => {
    assert.match(h.text(), /Todos los alumnos/);
  });
});

test('perfil de DIRECTIVO no ofrece acciones de escritura de matrícula ni apoderados', async () => {
  await view({ role: 'DIRECTIVO', read: async () => detail() }, async h => {
    assert.equal(h.button('Retirar matrícula'), undefined);
    assert.equal(h.button('Agregar apoderado'), undefined);
  });
});
