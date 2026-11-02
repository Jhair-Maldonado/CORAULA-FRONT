import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import AsistenciaContingenciaDialog, { FUTURE_DATE_MESSAGE, NO_SESSIONS_MESSAGE } from '../feature/admin/vistas/(academico)/secciones/AsistenciaContingenciaDialog';
import DetalleSeccion from '../feature/admin/vistas/(academico)/secciones/detalleSeccion';
import { AuthContext } from '../src/contexts/AuthContext';
import {
  CONTINGENCY_CAUSE_REQUIRED_MESSAGE, INVALID_RESPONSE_MESSAGE, MANAGEMENT_ATTENDANCE_ERROR_CODES, MANAGEMENT_REASON_REQUIRED_MESSAGE,
  managementAttendanceErrorMessage, managementAttendanceService,
} from '../src/services/admin/managementAttendanceService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import httpClient from '../src/services/httpClient';
import type { SectionCourseResponse } from '../src/types/sectionCourseApi';
import type { TeacherAttendanceResponse, TeacherAttendanceStatus } from '../src/types/teacherAttendanceApi';

// FRONT #108: synthetic data only, no network. The HTTP adapter is stubbed per test.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const TODAY = '2026-10-30';
const BASE = '/v1/management/section-courses/10/attendance';
const relation: SectionCourseResponse = { id: 10, sectionId: 7, courseId: 3, courseCode: 'CTA', courseName: 'Ciencias', active: true, teacherId: null, teacherName: null };

function attendance(statuses: (TeacherAttendanceStatus | null)[], overrides: Partial<TeacherAttendanceResponse> = {}, scheduleIds = [99]): TeacherAttendanceResponse {
  return {
    sectionCourseId: 10, courseName: 'Ciencias', grade: 3, sectionName: 'A', date: TODAY,
    sessions: scheduleIds.map((scheduleId, n) => ({
      scheduleId, startTime: n === 0 ? '08:00' : '10:00', endTime: n === 0 ? '09:30' : '11:30', classroom: 'Aula 1',
      totalStudents: statuses.length, presentCount: 0, lateCount: 0, absenceCount: 0, pendingCount: statuses.filter(s => s === null).length,
      students: statuses.map((status, i) => ({ enrollmentId: 101 + i, studentId: 1 + i, studentCode: `E${101 + i}`, fullName: `Alumno ${i + 1}`, attendanceId: status ? 500 + i : null, status })),
    })),
    ...overrides,
  };
}
const sessionOf = (data: TeacherAttendanceResponse) => data.sessions[0];

type Call = { method: string; url: string; params?: Record<string, unknown>; data?: unknown };
type Reply = { status: number; data: unknown };
function axiosError(status: number | undefined, data: unknown = { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR' }) {
  return new AxiosError('PRIVATE', 'ERR_TEST', undefined, undefined, status === undefined ? undefined : { status, data } as AxiosResponse);
}

async function withHttp(handler: (call: Call) => Reply, run: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call: Call = { method: String(config.method).toUpperCase(), url: String(config.url), params: config.params, data: config.data ? JSON.parse(String(config.data)) : undefined };
    calls.push(call);
    const reply = handler(call);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, response);
    return response;
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}

function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

async function withDom(run: () => Promise<void>) {
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  try { await run(); } finally {
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

type View = { root: ReactTestInstance; body: () => string; button: (label: string) => ReactTestInstance | undefined; click: (label: string) => Promise<void>; reason: (value: string) => Promise<void> };
async function renderDialog(canManage: boolean, run: (view: View) => Promise<void>) {
  await withDom(async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<AsistenciaContingenciaDialog relation={relation} sectionLabel="Sección A • 3° grado" canManage={canManage} onClose={() => {}} today={() => TODAY} />,
        { createNodeMock: () => ({ focus() {}, querySelectorAll: () => [] }) });
    });
    const root = renderer.root;
    const button = (label: string) => root.findAllByType('button').find(b => text(b) === label);
    try {
      await run({
        root, body: () => text(root), button,
        click: async label => { const b = button(label); assert.ok(b, label); assert.equal(!!b.props.disabled, false, `${label} habilitado`); await act(async () => { await b.props.onClick(); }); },
        reason: async value => { await act(async () => { root.findByProps({ id: 'attendance-reason-input' }).props.onChange({ target: { value } }); }); },
      });
    } finally { await act(async () => { renderer.unmount(); }); }
  });
}
const saveButton = (view: View) => view.button('Guardar asistencia');

test('service: GET and PUT use the management routes and parse the contract strictly', async () => {
  const data = attendance([null, 'PRESENTE']);
  await withHttp(call => call.method === 'GET' ? { status: 200, data } : { status: 200, data: sessionOf(data) }, async calls => {
    assert.deepEqual(await managementAttendanceService.getAttendance(10, TODAY), data);
    const request = { records: [{ enrollmentId: 101, status: 'TARDANZA' as const }, { enrollmentId: 102, status: 'PRESENTE' as const }], reason: 'Docente con licencia', contingencyCause: 'CAIDA_SISTEMA' as const };
    assert.deepEqual(await managementAttendanceService.saveAttendance(10, 99, TODAY, request), sessionOf(data));
    assert.deepEqual(calls, [
      { method: 'GET', url: BASE, params: { date: TODAY }, data: undefined },
      { method: 'PUT', url: `${BASE}/99`, params: { date: TODAY }, data: request },
    ]);
  });
  const broken: unknown[] = [
    { ...data, sectionCourseId: 11 }, { ...data, date: '2026-10-29' }, { ...data, sessions: null },
    attendance([null], {}, [99, 99]),
    { ...data, sessions: [{ ...sessionOf(data), startTime: '8:00' }] },
    { ...data, sessions: [{ ...sessionOf(data), students: [{ ...sessionOf(data).students[0], status: 'AUSENTE' }] }] },
    { ...data, sessions: [{ ...sessionOf(data), students: [sessionOf(data).students[0], sessionOf(data).students[0]] }] },
  ];
  for (const body of broken) {
    await withHttp(() => ({ status: 200, data: body }), async () => {
      const error = await managementAttendanceService.getAttendance(10, TODAY).then(() => null, e => e);
      assert.equal(managementAttendanceErrorMessage(error, 'load'), INVALID_RESPONSE_MESSAGE);
    });
  }
  await withHttp(() => ({ status: 200, data: { ...sessionOf(data), scheduleId: 98 } }), async () => {
    const error = await managementAttendanceService.saveAttendance(10, 99, TODAY, { records: [] }).then(() => null, e => e);
    assert.equal(managementAttendanceErrorMessage(error, 'save'), INVALID_RESPONSE_MESSAGE);
  });
});

test('error messages: codes only with their contract status, never the server message', () => {
  assert.deepEqual(MANAGEMENT_ATTENDANCE_ERROR_CODES, ['ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED', 'ATTENDANCE_REASON_REQUIRED']);
  const coded = (status: number, code: string) => axiosError(status, { error: 'Bad Request', message: 'DETALLE INTERNO DEL SERVIDOR', code });
  assert.equal(managementAttendanceErrorMessage(coded(400, 'ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED'), 'save'), CONTINGENCY_CAUSE_REQUIRED_MESSAGE);
  assert.equal(managementAttendanceErrorMessage(coded(400, 'ATTENDANCE_REASON_REQUIRED'), 'save'), MANAGEMENT_REASON_REQUIRED_MESSAGE);
  // A code outside its status, or unknown, is ignored: behaviour falls back to the HTTP status.
  assert.match(managementAttendanceErrorMessage(coded(409, 'ATTENDANCE_REASON_REQUIRED'), 'save'), /Conflicto al guardar/);
  assert.match(managementAttendanceErrorMessage(coded(400, 'OTRO_CODIGO'), 'save'), /revisa la fecha y la lista de estudiantes/);
  assert.match(managementAttendanceErrorMessage(axiosError(400), 'load'), /dentro del periodo/);
  assert.match(managementAttendanceErrorMessage(axiosError(401), 'save'), /sesión expiró/);
  assert.match(managementAttendanceErrorMessage(axiosError(403), 'load'), /autorización para consultar/);
  assert.match(managementAttendanceErrorMessage(axiosError(403), 'save'), /Solo el Director/);
  assert.match(managementAttendanceErrorMessage(axiosError(404), 'save'), /ya no está disponible/);
  assert.match(managementAttendanceErrorMessage(axiosError(500), 'save'), /No se pudo procesar/);
  assert.match(managementAttendanceErrorMessage(axiosError(undefined), 'load'), /conectar con el servidor/);
  for (const status of [400, 401, 403, 404, 409, 500]) {
    for (const op of ['load', 'save'] as const) assert.doesNotMatch(managementAttendanceErrorMessage(axiosError(status), op), /DETALLE INTERNO/);
  }
});

test('ADMINISTRADOR first capture: requires cause and reason, sends them and reloads before announcing', async () => {
  let saved = false;
  await withHttp(call => {
    if (call.method === 'PUT') { saved = true; return { status: 200, data: sessionOf(attendance(['PRESENTE', 'INASISTENCIA'])) }; }
    return { status: 200, data: attendance(saved ? ['PRESENTE', 'INASISTENCIA'] : [null, null]) };
  }, async calls => {
    await renderDialog(true, async view => {
      assert.equal(view.root.findByProps({ 'aria-label': 'Fecha de asistencia' }).props.max, TODAY);
      assert.equal(view.root.findByProps({ id: 'contingency-cause-select' }).props.value, 'LECTOR_NO_DISPONIBLE');
      assert.equal(saveButton(view)?.props.disabled, true, 'sin motivo no se guarda');
      await view.reason('   ');
      assert.equal(saveButton(view)?.props.disabled, true, 'motivo en blanco no cuenta');
      await act(async () => { view.root.findByProps({ id: 'contingency-cause-select' }).props.onChange({ target: { value: 'CAIDA_SISTEMA' } }); });
      await act(async () => { view.root.findByProps({ 'aria-label': 'Marcar Falta a Alumno 2' }).props.onClick(); });
      await view.reason('  Docente con licencia médica  ');
      await view.click('Guardar asistencia');
      assert.deepEqual(calls.filter(c => c.method === 'PUT').map(c => [c.url, c.params, c.data]), [[`${BASE}/99`, { date: TODAY }, {
        records: [{ enrollmentId: 101, status: 'PRESENTE' }, { enrollmentId: 102, status: 'INASISTENCIA' }],
        reason: 'Docente con licencia médica', contingencyCause: 'CAIDA_SISTEMA',
      }]]);
      assert.deepEqual(calls.map(c => c.method), ['GET', 'PUT', 'GET']);
      assert.match(view.body(), /Asistencia por contingencia registrada\./);
      // After reload the session is a correction: no cause selector and no changes to save.
      assert.equal(view.root.findAll(n => n.props.id === 'contingency-cause-select').length, 0);
      assert.equal(saveButton(view)?.props.disabled, true);
    });
  });
});

test('ADMINISTRADOR correction: Save only with changes and reason, keeps the original cause', async () => {
  await withHttp(call => call.method === 'PUT' ? { status: 200, data: sessionOf(attendance(['PRESENTE', 'TARDANZA'])) } : { status: 200, data: attendance(['INASISTENCIA', 'TARDANZA']) }, async calls => {
    await renderDialog(true, async view => {
      assert.equal(view.root.findAll(n => n.props.id === 'contingency-cause-select').length, 0);
      assert.match(view.body(), /Modo corrección de asistencia/);
      await view.reason('Ingreso justificado');
      assert.equal(saveButton(view)?.props.disabled, true, 'motivo sin cambios no habilita');
      await act(async () => { view.root.findByProps({ 'aria-label': 'Marcar Presente a Alumno 1' }).props.onClick(); });
      assert.equal(saveButton(view)?.props.disabled, false);
      await view.reason('');
      assert.equal(saveButton(view)?.props.disabled, true, 'cambios sin motivo no habilitan');
      await view.reason('Ingreso justificado');
      await view.click('Guardar asistencia');
      assert.deepEqual(calls.find(c => c.method === 'PUT')?.data, {
        records: [{ enrollmentId: 101, status: 'PRESENTE' }, { enrollmentId: 102, status: 'TARDANZA' }], reason: 'Ingreso justificado',
      });
      assert.match(view.body(), /Corrección de asistencia registrada\./);
    });
  });
});

test('ADMINISTRADOR save errors: sanitized message, no false success, reload on conflict', async () => {
  for (const [reply, expected, gets] of [
    [{ status: 400, data: { error: 'Bad Request', message: 'DETALLE INTERNO DEL SERVIDOR', code: 'ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED' } }, CONTINGENCY_CAUSE_REQUIRED_MESSAGE, 1],
    [{ status: 400, data: { error: 'Bad Request', message: 'DETALLE INTERNO DEL SERVIDOR', code: 'ATTENDANCE_REASON_REQUIRED' } }, MANAGEMENT_REASON_REQUIRED_MESSAGE, 1],
    [{ status: 400, data: { error: 'Bad Request', message: 'DETALLE INTERNO DEL SERVIDOR' } }, 'revisa la fecha y la lista de estudiantes', 1],
    [{ status: 403, data: { error: 'Forbidden', message: 'DETALLE INTERNO DEL SERVIDOR' } }, 'Solo el Director', 1],
    [{ status: 409, data: { error: 'Conflict', message: 'DETALLE INTERNO DEL SERVIDOR' } }, 'Conflicto al guardar', 2],
  ] as const) {
    await withHttp(call => call.method === 'PUT' ? reply : { status: 200, data: attendance([null]) }, async calls => {
      await renderDialog(true, async view => {
        await view.reason('Lector sin energía');
        await view.click('Guardar asistencia');
        const body = view.body();
        assert.ok(body.includes(expected), body);
        assert.doesNotMatch(body, /registrada\.|DETALLE INTERNO/);
        assert.equal(calls.filter(c => c.method === 'GET').length, gets);
      });
    });
  }
});

test('DIRECTIVO reads only: no cause, no reason, no state buttons and no Save', async () => {
  await withHttp(() => ({ status: 200, data: attendance(['TARDANZA', null]) }), async calls => {
    await renderDialog(false, async view => {
      const body = view.body();
      assert.match(body, /Acceso DIRECTIVO: solo lectura\./);
      assert.match(body, /Alumno 1Tardanza/); assert.match(body, /Alumno 2Sin registro/);
      assert.equal(saveButton(view), undefined);
      assert.equal(view.button('Marcar todos presentes'), undefined);
      assert.equal(view.root.findAll(n => n.props.id === 'contingency-cause-select' || n.props.id === 'attendance-reason-input').length, 0);
      assert.equal(view.root.findAll(n => typeof n.props['aria-label'] === 'string' && n.props['aria-label'].startsWith('Marcar ')).length, 0);
      assert.ok(view.button('Cerrar'));
      assert.deepEqual(calls.map(c => c.method), ['GET']);
    });
  });
});

test('date: future dates are rejected without requests; changing the date reloads the sessions', async () => {
  await withHttp(call => call.params?.date === '2026-10-28'
    ? { status: 200, data: attendance([], { date: '2026-10-28', sessions: [] }) }
    : { status: 200, data: attendance([null], { date: String(call.params?.date) }, [99, 77]) }, async calls => {
    await renderDialog(true, async view => {
      const date = () => view.root.findByProps({ 'aria-label': 'Fecha de asistencia' });
      assert.deepEqual(view.root.findByProps({ 'aria-label': 'Sesión del día' }).findAllByType('option').map(text), ['08:00–09:30 · Aula 1', '10:00–11:30 · Aula 1']);
      await act(async () => { view.root.findByProps({ 'aria-label': 'Sesión del día' }).props.onChange({ target: { value: '77' } }); });
      await view.reason('Lector sin energía');
      await act(async () => { date().props.onChange({ target: { value: '2026-10-31' } }); });
      assert.match(view.body(), new RegExp(FUTURE_DATE_MESSAGE.replace(/[.:]/g, '\\$&')));
      assert.equal(saveButton(view)?.props.disabled, true);
      assert.equal(calls.length, 1);
      await act(async () => { date().props.onChange({ target: { value: '2026-10-29' } }); });
      assert.deepEqual(calls.map(c => c.params?.date), [TODAY, '2026-10-29']);
      // The chosen session is kept when it still exists, and the reason is cleared on date change.
      assert.equal(view.root.findByProps({ 'aria-label': 'Sesión del día' }).props.value, 77);
      assert.equal(view.root.findByProps({ id: 'attendance-reason-input' }).props.value, '');
      await act(async () => { date().props.onChange({ target: { value: '2026-10-28' } }); });
      assert.match(view.body(), new RegExp(NO_SESSIONS_MESSAGE.replace(/\./g, '\\.')));
      assert.equal(saveButton(view)?.props.disabled, true);
      assert.equal(calls.filter(c => c.method === 'PUT').length, 0);
    });
  });
});

test('load errors are sanitized and offer retry', async () => {
  let fail = true;
  await withHttp(() => fail ? { status: 404, data: { error: 'Not Found', message: 'DETALLE INTERNO DEL SERVIDOR' } } : { status: 200, data: attendance([null]) }, async calls => {
    await renderDialog(true, async view => {
      assert.match(view.body(), /ya no está disponible/); assert.doesNotMatch(view.body(), /DETALLE INTERNO/);
      assert.equal(saveButton(view)?.props.disabled, true);
      fail = false;
      await view.click('Reintentar');
      assert.equal(calls.length, 2);
      assert.ok(view.root.findByProps({ id: 'contingency-cause-select' }));
    });
  });
});

test('section detail offers "Asistencia" to ADMINISTRADOR and "Ver asistencia" to DIRECTIVO on active courses', async () => {
  const old = { getById: sectionsService.getById, list: sectionCoursesService.list };
  sectionsService.getById = async () => ({ id: 7, academicPeriodId: 1, level: 'SECONDARY', grade: 3, name: 'A', maxCapacity: 30, enrollmentOpen: true, active: true });
  sectionCoursesService.list = async () => [relation, { ...relation, id: 11, courseName: 'Arte', active: false }];
  try {
    for (const [role, label] of [['ADMINISTRADOR', 'Asistencia'], ['DIRECTIVO', 'Ver asistencia']] as const) {
      await withHttp(() => ({ status: 200, data: attendance([null]) }), async calls => {
        await withDom(async () => {
          let renderer!: ReactTestRenderer;
          await act(async () => {
            renderer = create(<AuthContext.Provider value={auth(role)}><PathParamsContext.Provider value={{ sectionId: '7' }}><DetalleSeccion /></PathParamsContext.Provider></AuthContext.Provider>,
              { createNodeMock: () => ({ focus() {}, querySelectorAll: () => [] }) });
          });
          try {
            const buttons = renderer.root.findAllByType('button').filter(b => text(b) === label);
            assert.equal(buttons.length, 1, `${role}: solo el curso activo`);
            assert.equal(buttons[0].props['aria-label'], `${label} de Ciencias`);
            await act(async () => { buttons[0].props.onClick(); });
            assert.deepEqual(calls.map(c => c.url), [BASE]);
            const hasSave = renderer.root.findAllByType('button').some(b => text(b) === 'Guardar asistencia');
            assert.equal(hasSave, role === 'ADMINISTRADOR');
          } finally { await act(async () => { renderer.unmount(); }); }
        });
      });
    }
  } finally { sectionsService.getById = old.getById; sectionCoursesService.list = old.list; }
});
