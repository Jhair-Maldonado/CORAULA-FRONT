import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PantallaPrincipalAdmin from '../feature/admin/pantallaPrincipalAdmin';
import { AdminSidebar } from '../layout/admin/adminSidebar';
import { AuthContext } from '../src/contexts/AuthContext';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import {
  dailyAttendanceErrorMessage, dailyAttendanceService, defaultAcademicPeriod, defaultAttendanceDate, formatAttendancePercentage, limaToday, parseDailyAttendance,
} from '../src/services/admin/dailyAttendanceService';
import { sectionsService } from '../src/services/admin/sectionsService';
import httpClient from '../src/services/httpClient';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';
import type { DailyAttendanceIndicator, DailyAttendanceParams } from '../src/types/dailyAttendanceApi';
import type { SectionListParams, SectionResponse } from '../src/types/sectionApi';

// Unit/component mocks only: no network, browser server or shared database.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const today = limaToday();
const period = (id = 1, overrides: Partial<AcademicPeriod> = {}): AcademicPeriod => ({
  id, name: `Periodo ${id}`, startDate: '2000-01-01', endDate: '2999-12-31', active: true, current: false, ...overrides,
});
const section = (id: number, overrides: Partial<SectionResponse> = {}): SectionResponse => ({
  id, academicPeriodId: 1, level: 'PRIMARY', grade: 3, name: `S${id}`, maxCapacity: 30, enrollmentOpen: true, active: true, ...overrides,
});
const indicator = (overrides: Partial<DailyAttendanceIndicator> = {}): DailyAttendanceIndicator => ({
  date: today, academicPeriodId: 1, sectionId: null, status: 'PARTIAL', scheduledSections: 4, sectionsWithoutSessions: 1,
  sectionsWithConflictingFirstSession: 0, expectedStudents: 100, present: 80, late: 5, absent: 10, unrecorded: 5, attendancePercentage: 85, ...overrides,
});
const echo = (overrides: Partial<DailyAttendanceIndicator> = {}) => async (params: DailyAttendanceParams) =>
  indicator({ date: params.date, academicPeriodId: params.academicPeriodId, sectionId: params.sectionId ?? null, ...overrides });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
const httpError = (status?: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { message: 'Detalle interno del backend' } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });

async function withAdapter(handler: (config: { url?: string; params?: unknown }) => { status: number; data: unknown }, run: () => Promise<void>) {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => { const reply = handler(config); return { config, statusText: 'OK', headers: {}, ...reply }; };
  try { await run(); } finally { httpClient.defaults.adapter = original; }
}

type Mocks = { role?: Auth['role']; periods?: typeof academicPeriodsService.list; sections?: typeof sectionsService.list; get?: typeof dailyAttendanceService.get };
type Harness = { renderer: ReactTestRenderer; text: () => string; field: (label: string) => ReactTestInstance; change: (label: string, value: string) => Promise<void>;
  click: (label: string) => Promise<void>; gets: DailyAttendanceParams[]; sectionCalls: SectionListParams[] };

async function view(options: Mocks, run: (h: Harness) => Promise<void>) {
  const old = { list: academicPeriodsService.list, sections: sectionsService.list, get: dailyAttendanceService.get };
  const gets: DailyAttendanceParams[] = []; const sectionCalls: SectionListParams[] = [];
  const get = options.get ?? echo();
  academicPeriodsService.list = options.periods ?? (async () => [period(1, { current: true }), period(2)]);
  sectionsService.list = async params => { sectionCalls.push(params ?? {}); return (options.sections ?? (async () => [section(21), section(22)]))(params); };
  dailyAttendanceService.get = async params => { gets.push(params); return get(params); };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<React.StrictMode><AuthContext.Provider value={auth(options.role ?? 'ADMINISTRADOR')}><PantallaPrincipalAdmin /></AuthContext.Provider></React.StrictMode>); });
    const field = (label: string) => renderer.root.findByProps({ 'aria-label': label });
    await run({
      renderer, gets, sectionCalls, field, text: () => text(renderer.root),
      change: async (label, value) => { await act(async () => { field(label).props.onChange({ target: { value } }); }); },
      click: async label => {
        const node = renderer.root.findAllByType('button').find(b => text(b) === label); assert.ok(node, label);
        await act(async () => { node.props.onClick(); });
      },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    academicPeriodsService.list = old.list; sectionsService.list = old.sections; dailyAttendanceService.get = old.get;
  }
}
const last = <T,>(list: T[]) => list[list.length - 1];

test('service calls the management endpoint, omits empty filters and validates the response', async () => {
  const calls: { url?: string; params?: unknown }[] = [];
  let reply: unknown = indicator({ date: '2026-10-26', academicPeriodId: 15 });
  await withAdapter(config => { calls.push({ url: config.url, params: config.params }); return { status: 200, data: reply }; }, async () => {
    assert.deepEqual(await dailyAttendanceService.get({ academicPeriodId: 15, date: '2026-10-26' }), reply);
    reply = indicator({ date: today, academicPeriodId: 15, sectionId: 21, status: 'PENDING', attendancePercentage: null, present: 0, late: 0, absent: 0, unrecorded: 100 });
    assert.equal((await dailyAttendanceService.get({ academicPeriodId: 15, sectionId: 21 })).attendancePercentage, null);
    assert.deepEqual(calls, [
      { url: '/v1/management/attendance/daily', params: { academicPeriodId: 15, date: '2026-10-26' } },
      { url: '/v1/management/attendance/daily', params: { academicPeriodId: 15, sectionId: 21 } },
    ]);
    // Responses for other filters are rejected.
    await assert.rejects(dailyAttendanceService.get({ academicPeriodId: 16, sectionId: 21 }), /no corresponde/);
    await assert.rejects(dailyAttendanceService.get({ academicPeriodId: 15 }), /no corresponde/);
+   await assert.rejects(dailyAttendanceService.get({ academicPeriodId: 15, date: '2000-01-03', sectionId: 21 }), /no corresponde/);    for (const bad of [{ academicPeriodId: 0 }, { academicPeriodId: 1.5 }, { academicPeriodId: 1, sectionId: -2 }, { academicPeriodId: 1, date: '2026-02-30' }]) {
      await assert.rejects(dailyAttendanceService.get(bad));
    }
    assert.equal(calls.length, 5);
  });
});

test('parser rejects shapes that break the documented contract', () => {
  assert.deepEqual(parseDailyAttendance({ ...indicator(), extra: 'ignored' }), indicator());
  assert.equal(parseDailyAttendance(indicator({ status: 'COMPLETE', present: 0, late: 0, absent: 100, unrecorded: 0, attendancePercentage: 0 })).attendancePercentage, 0);
  for (const bad of [null, [], { ...indicator(), status: 'UNKNOWN' }, { ...indicator(), date: '26/10/2026' }, { ...indicator(), sectionId: undefined },
    { ...indicator(), present: -1 }, { ...indicator(), late: '5' }, { ...indicator(), attendancePercentage: null },
    { ...indicator(), attendancePercentage: 101 }, indicator({ status: 'PENDING' }), indicator({ status: 'NO_SESSIONS', attendancePercentage: 0 }),
    indicator({ unrecorded: 6 })]) {
    assert.throws(() => parseDailyAttendance(bad), /inesperada/);
  }
});

test('error messages are fixed Spanish texts and never echo the backend', () => {
  const expected: Record<number, RegExp> = { 400: /Revisa los filtros/, 401: /sesión expiró/, 403: /asistencia institucional/, 404: /ya no existen/, 500: /servidor no pudo/ };
  for (const [status, pattern] of Object.entries(expected)) {
    const message = dailyAttendanceErrorMessage(httpError(Number(status)));
    assert.match(message, pattern); assert.doesNotMatch(message, /PRIVATE|Detalle interno/);
  }
  assert.match(dailyAttendanceErrorMessage(httpError()), /conectar con el servidor/);
  assert.match(dailyAttendanceErrorMessage(new Error('Respuesta de asistencia diaria inesperada.')), /inesperada/);
  assert.match(dailyAttendanceErrorMessage(new Error('PRIVATE')), /No se pudo obtener el indicador/);
});

test('helpers: Lima date, default period, clamped date and percentage format', () => {
  assert.equal(limaToday(new Date('2026-10-25T03:00:00Z')), '2026-10-24');
  assert.equal(limaToday(new Date('2026-10-25T05:00:00Z')), '2026-10-25');
  assert.equal(defaultAcademicPeriod([period(1), period(2, { current: true })])?.id, 2);
  assert.equal(defaultAcademicPeriod([period(1, { startDate: '2025-03-01' }), period(2, { startDate: '2026-03-01', active: false }), period(3, { startDate: '2024-03-01' })])?.id, 1);
  assert.equal(defaultAcademicPeriod([period(1, { active: false })]), undefined);
  const p = period(1, { startDate: '2026-03-01', endDate: '2026-12-20' });
  assert.equal(defaultAttendanceDate(p, '2026-10-24'), '2026-10-24');
  assert.equal(defaultAttendanceDate(p, '2026-01-10'), '2026-03-01');
  assert.equal(defaultAttendanceDate(p, '2027-01-10'), '2026-12-20');
  assert.equal(formatAttendancePercentage(85), '85.00 %');
  assert.equal(formatAttendancePercentage(33.33), '33.33 %');
});

test('NO_SESSIONS, NO_ENROLLMENTS and PENDING show a message instead of a percentage', async () => {
  const cases = [
    [{ status: 'NO_SESSIONS', scheduledSections: 0, sectionsWithoutSessions: 3, expectedStudents: 0, present: 0, late: 0, absent: 0, unrecorded: 0 }, /No hay clases programadas.*feriados/],
    [{ status: 'NO_ENROLLMENTS', expectedStudents: 0, present: 0, late: 0, absent: 0, unrecorded: 0 }, /ninguna sección consultada tiene estudiantes/],
    [{ status: 'PENDING', present: 0, late: 0, absent: 0, unrecorded: 100 }, /Aún no se registra asistencia/],
  ] as const;
  for (const [overrides, pattern] of cases) {
    await view({ get: echo({ ...overrides, attendancePercentage: null }) }, async h => {
      assert.match(h.text(), pattern); assert.doesNotMatch(h.text(), /%/); assert.doesNotMatch(h.text(), /Provisional/);
    });
  }
});

test('PARTIAL shows the provisional percentage; COMPLETE shows the final one, even 0 %', async () => {
  await view({}, async h => {
    const page = h.text();
    assert.match(page, /85\.00 %/); assert.match(page, /Provisional/); assert.match(page, /Faltan 5 estudiantes por registrar/);
    assert.match(page, new RegExp(`Fecha: ${today.split('-').reverse().join('/')}`));
    assert.match(page, /Ámbito: Todas las secciones/); assert.match(page, /100 estudiantes esperados/); assert.match(page, /4 secciones con clase · 1 sin clase/);
    assert.match(page, /Presentes80Tardanzas5Inasistencias10Sin registro5/);
    assert.match(page, /Promedio general.*Disponible próximamente/); assert.doesNotMatch(page, /Bienvenido Administrador/);
  });
  await view({ get: echo({ status: 'COMPLETE', present: 0, late: 0, absent: 100, unrecorded: 0, attendancePercentage: 0 }) }, async h => {
    assert.match(h.text(), /0\.00 %/); assert.match(h.text(), /registrada para todos/); assert.doesNotMatch(h.text(), /Provisional/);
  });
});

test('conflict warning appears only when sections share the first start time', async () => {
  const warning = /Hay secciones con horarios que empiezan a la misma hora; revisa los horarios\./;
  await view({}, async h => { assert.doesNotMatch(h.text(), warning); });
  await view({ get: echo({ sectionsWithConflictingFirstSession: 2 }) }, async h => { assert.match(h.text(), warning); });
});

test('past-date note appears only for dates before today in Lima', async () => {
  const note = /Para fechas pasadas el indicador es orientativo\./;
  await view({}, async h => {
    assert.equal(last(h.gets).date, today); assert.doesNotMatch(h.text(), note);
    await h.change('Fecha', '2000-01-10'); assert.equal(last(h.gets).date, '2000-01-10'); assert.match(h.text(), note);
    await h.change('Fecha', '2999-01-10'); assert.doesNotMatch(h.text(), note);
  });
});

test('preselects the current period, lists active sections and sends the selected filters', async () => {
  const periods = async () => [period(1, { current: true }), period(2, { startDate: '2001-03-01', endDate: '2001-12-20' })];
  await view({ periods }, async h => {
    assert.equal(h.field('Periodo académico').props.value, 1);
    assert.deepEqual(h.gets, [{ academicPeriodId: 1, date: today, sectionId: undefined }]);
    assert.deepEqual(h.sectionCalls, [{ academicPeriodId: 1, active: true }]);
    assert.deepEqual(h.field('Sección').findAllByType('option').map(text), ['Todas las secciones', '3° S21 · Primaria', '3° S22 · Primaria']);
    await h.change('Sección', '22');
    assert.deepEqual(last(h.gets), { academicPeriodId: 1, date: today, sectionId: 22 }); assert.match(h.text(), /Ámbito: 3° S22 · Primaria/);
    // Changing the period resets the section and clamps the date into the new period.
    await h.change('Periodo académico', '2');
    assert.deepEqual(last(h.gets), { academicPeriodId: 2, date: '2001-12-20', sectionId: undefined });
    assert.equal(h.field('Fecha').props.min, '2001-03-01'); assert.equal(h.field('Fecha').props.max, '2001-12-20');
    assert.deepEqual(last(h.sectionCalls), { academicPeriodId: 2, active: true });
  });
  // Without a current period, the active period that starts last; inactive ones are skipped.
  await view({ periods: async () => [period(1, { startDate: '2000-03-01' }), period(2, { startDate: '2001-03-01' }), period(3, { startDate: '2002-03-01', active: false })] }, async h => {
    assert.equal(h.field('Periodo académico').props.value, 2); assert.equal(h.gets[0].academicPeriodId, 2);
  });
  await view({ periods: async () => [period(1, { active: false })] }, async h => {
    assert.match(h.text(), /Selecciona un periodo académico para ver el indicador/); assert.equal(h.gets.length, 0);
  });
  await view({ periods: async () => [] }, async h => { assert.match(h.text(), /No hay periodos académicos registrados/); assert.equal(h.gets.length, 0); });
});

test('a date outside the period or empty is not requested', async () => {
  await view({ periods: async () => [period(1, { current: true, startDate: '2000-03-01', endDate: '2000-12-20' })] }, async h => {
    assert.equal(h.gets[0].date, '2000-12-20');
    const before = h.gets.length;
    await h.change('Fecha', '2001-01-05'); assert.match(h.text(), /La fecha debe estar entre 01\/03\/2000 y 20\/12\/2000/);
    await h.change('Fecha', ''); assert.match(h.text(), /Selecciona una fecha/);
    assert.equal(h.gets.length, before);
  });
});

test('stale responses are discarded when filters change', async () => {
  const first = deferred<DailyAttendanceIndicator>();
  let calls = 0;
  await view({ get: async params => (++calls === 1 ? first.promise : echo({ present: 70, absent: 20 })(params)) }, async h => {
    await h.change('Fecha', '2000-01-10');
    assert.match(h.text(), /Presentes70/);
    await act(async () => { first.resolve(indicator({ present: 1, late: 1, absent: 1, unrecorded: 97 })); });
    assert.match(h.text(), /Presentes70/); assert.doesNotMatch(h.text(), /Presentes1Tardanzas/);
  });
});

test('load errors: periods block with retry, indicator shows its message, sections degrade gracefully', async () => {
  // StrictMode runs effects twice, so failures last until the retry instead of only the first call.
  let failPeriods = true;
  await view({ periods: async () => { if (failPeriods) throw httpError(500); return [period(1, { current: true })]; } }, async h => {
    assert.match(h.text(), /servidor no pudo completar/); assert.equal(h.gets.length, 0);
    failPeriods = false; await h.click('Reintentar'); assert.match(h.text(), /85\.00 %/);
  });
  let failIndicator = true;
  await view({ get: async params => { if (failIndicator) throw httpError(400); return echo()(params); } }, async h => {
    assert.match(h.text(), /Revisa los filtros/); assert.doesNotMatch(h.text(), /Detalle interno|%/);
    failIndicator = false; await h.click('Reintentar'); assert.match(h.text(), /85\.00 %/);
  });
  await view({ sections: async () => { throw httpError(500); } }, async h => {
    assert.match(h.text(), /No se pudieron cargar las secciones/); assert.match(h.text(), /85\.00 %/);
  });
});

test('ADMINISTRADOR and DIRECTIVO see the card and the Dashboard link; other roles get no request', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
    await view({ role }, async h => { assert.match(h.text(), /Asistencia diaria/); assert.equal(h.gets.length, 1); });
  }
  for (const role of ['DOCENTE', 'APODERADO', 'ESTUDIANTE'] as const) {
    await view({ role }, async h => { assert.match(h.text(), /No tienes acceso al panel de gestión/); assert.equal(h.gets.length, 0); assert.equal(h.sectionCalls.length, 0); });
  }
  const oldSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try {
    for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
      let renderer!: ReactTestRenderer;
      await act(async () => { renderer = create(<AuthContext.Provider value={auth(role)}><PathnameContext.Provider value="/administrador"><AdminSidebar /></PathnameContext.Provider></AuthContext.Provider>); });
      assert.ok(renderer.root.findAllByType('a').some(node => node.props.href === '/administrador'), role);
      await act(async () => { renderer.unmount(); });
    }
  } finally {
    if (oldSelf) Object.defineProperty(globalThis, 'self', oldSelf); else Reflect.deleteProperty(globalThis, 'self');
  }
});
