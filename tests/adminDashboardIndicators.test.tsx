import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import IndicadoresPeriodo, { NO_PERIOD_MESSAGE } from '../feature/admin/component/IndicadoresPeriodo';
import PantallaPrincipalAdmin from '../feature/admin/pantallaPrincipalAdmin';
import { AuthContext } from '../src/contexts/AuthContext';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { dailyAttendanceService } from '../src/services/admin/dailyAttendanceService';
import {
  currentBimester, dashboardIndicatorErrorMessage, dashboardIndicatorsService, parsePeriodVacancies, type PeriodVacancies,
} from '../src/services/admin/dashboardIndicatorsService';
import { evaluationService } from '../src/services/admin/evaluationService';
import { managementEarlyAlertsService } from '../src/services/admin/managementEarlyAlertsService';
import { sectionsService } from '../src/services/admin/sectionsService';
import httpClient from '../src/services/httpClient';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';
import type { Bimester } from '../src/types/evaluationApi';
import type { EarlyWarningsPage } from '../src/types/teacherEarlyAlertsApi';

// Dashboard period indicators: synthetic data only, no network (services and the HTTP adapter are stubbed).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const TODAY = '2026-03-10';
const period = (over: Partial<AcademicPeriod> = {}): AcademicPeriod => ({ id: 30, name: 'Periodo 2026', startDate: '2026-03-01', endDate: '2026-12-20', active: true, current: true, ...over });
const bimester = (id: number, over: Partial<Bimester> = {}): Bimester => ({
  id, academicPeriodId: 30, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status: 'ABIERTO', ...over,
});
const page = (totalElements: number): EarlyWarningsPage => ({ content: [], page: 0, size: 1, totalElements, totalPages: totalElements });
const grade = (over: Record<string, unknown> = {}) => ({
  academicPeriodId: 30, level: 'PRIMARY', grade: 1, totalCapacity: 60, activeEnrollmentCount: 50, availableVacancies: 10, sections: [], ...over,
});
const vacancies = (over: Partial<PeriodVacancies> = {}): PeriodVacancies => ({ totalCapacity: 120, activeEnrollmentCount: 95, availableVacancies: 25, grades: 2, ...over });
const httpError = (status?: number) => new AxiosError('PRIVATE', 'ERR_TEST', undefined, undefined,
  status === undefined ? undefined : { status, data: { error: 'X', message: 'DETALLE INTERNO DEL SERVIDOR' } } as AxiosResponse);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }

async function withSelf(run: () => Promise<void>) {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try { await run(); } finally { if (old) Object.defineProperty(globalThis, 'self', old); else Reflect.deleteProperty(globalThis, 'self'); }
}

type Mocks = { bimesters?: typeof evaluationService.getBimesters; alerts?: typeof managementEarlyAlertsService.list; vacancies?: typeof dashboardIndicatorsService.vacancies };
type Calls = { bimesters: number[]; alerts: unknown[][]; vacancies: number[] };
type Harness = { renderer: ReactTestRenderer; text: () => string; calls: Calls; retry: (label: string) => Promise<void> };

async function withMocks(mocks: Mocks, run: (calls: Calls) => Promise<void>) {
  const old = { bimesters: evaluationService.getBimesters, alerts: managementEarlyAlertsService.list, vacancies: dashboardIndicatorsService.vacancies };
  const calls: Calls = { bimesters: [], alerts: [], vacancies: [] };
  evaluationService.getBimesters = async id => { calls.bimesters.push(id); return (mocks.bimesters ?? (async () => [bimester(1)]))(id); };
  managementEarlyAlertsService.list = async (...args) => { calls.alerts.push(args.slice(0, 4)); return (mocks.alerts ?? (async () => page(7)))(...args); };
  dashboardIndicatorsService.vacancies = async id => { calls.vacancies.push(id); return (mocks.vacancies ?? (async () => vacancies()))(id); };
  try { await run(calls); } finally {
    evaluationService.getBimesters = old.bimesters; managementEarlyAlertsService.list = old.alerts; dashboardIndicatorsService.vacancies = old.vacancies;
  }
}

async function view(mocks: Mocks, run: (h: Harness) => Promise<void>, props: { period?: AcademicPeriod | null; today?: string } = {}) {
  await withSelf(() => withMocks(mocks, async calls => {
    let renderer!: ReactTestRenderer;
    const target = props.period === null ? undefined : props.period ?? period();
    await act(async () => { renderer = create(<React.StrictMode><IndicadoresPeriodo period={target} today={props.today ?? TODAY} /></React.StrictMode>); });
    try {
      await run({
        renderer, calls, text: () => text(renderer.root),
        retry: async label => { const node = renderer.root.findByProps({ 'aria-label': label }); await act(async () => { node.props.onClick(); }); },
      });
    } finally { await act(async () => { renderer.unmount(); }); }
  }));
}

test('vacancies parser sums the grades of the requested period and rejects contract breaks', () => {
  assert.deepEqual(parsePeriodVacancies([grade(), grade({ level: 'SECONDARY', totalCapacity: 30, activeEnrollmentCount: 30, availableVacancies: 0 })], 30),
    { totalCapacity: 90, activeEnrollmentCount: 80, availableVacancies: 10, grades: 2 });
  assert.deepEqual(parsePeriodVacancies([], 30), { totalCapacity: 0, activeEnrollmentCount: 0, availableVacancies: 0, grades: 0 });
  for (const bad of [null, {}, [grade({ academicPeriodId: 31 })], [grade({ level: 'X' })], [grade({ grade: 0 })], [grade({ totalCapacity: -1 })],
    [grade({ availableVacancies: 61 })], [grade({ activeEnrollmentCount: 1.5 })], [grade({ sections: null })], [grade(), grade()]]) {
    assert.throws(() => parsePeriodVacancies(bad, 30), /no coincide con el contrato/);
  }
});

test('vacancies service calls the management endpoint for the period and validates the answer', async () => {
  const original = httpClient.defaults.adapter;
  const calls: { url?: string; params?: unknown }[] = [];
  let data: unknown = [grade()];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push({ url: config.url, params: config.params });
    return { data, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };
  try {
    assert.equal((await dashboardIndicatorsService.vacancies(30)).availableVacancies, 10);
    assert.deepEqual(calls, [{ url: '/v1/management/vacancies', params: { academicPeriodId: 30 } }]);
    data = [grade({ academicPeriodId: 31 })];
    await assert.rejects(dashboardIndicatorsService.vacancies(30), /no coincide/);
    await assert.rejects(dashboardIndicatorsService.vacancies(0), /entero positivo/);
    assert.equal(calls.length, 2);
  } finally { httpClient.defaults.adapter = original; }
});

test('current bimester: dates include today, annulled ignored, overlaps resolve to the lowest number', () => {
  const list = [bimester(2, { startDate: '2026-05-01', endDate: '2026-06-30' }), bimester(1, { status: 'CERRADO' })];
  assert.equal(currentBimester(list, TODAY)?.id, 1);
  assert.equal(currentBimester(list, '2026-04-30')?.id, 1);
  assert.equal(currentBimester(list, '2026-05-01')?.id, 2);
  assert.equal(currentBimester(list, '2026-07-01'), null);
  assert.equal(currentBimester([bimester(1, { status: 'ANULADO' })], TODAY), null);
  assert.equal(currentBimester([bimester(3, { number: 3 }), bimester(2, { number: 2 })], TODAY)?.id, 2);
});

test('error messages are sanitized and depend only on the HTTP status', () => {
  for (const indicator of ['bimester', 'vacancies'] as const) {
    for (const error of [httpError(), httpError(400), httpError(401), httpError(403), httpError(404), httpError(409), httpError(500), new Error('DETALLE INTERNO')]) {
      assert.doesNotMatch(dashboardIndicatorErrorMessage(error, indicator), /DETALLE INTERNO/);
    }
  }
  assert.match(dashboardIndicatorErrorMessage(httpError(), 'vacancies'), /conectar con el servidor/);
  assert.match(dashboardIndicatorErrorMessage(httpError(401), 'bimester'), /sesión ha expirado/);
  assert.match(dashboardIndicatorErrorMessage(httpError(403), 'vacancies'), /permiso para consultar las vacantes/);
  assert.match(dashboardIndicatorErrorMessage(httpError(409), 'vacancies'), /inactivo/);
});

test('cards show the current bimester, its alert total and the period vacancies with their links', async () => {
  await view({}, async h => {
    const page = h.text();
    assert.match(page, /Bimestre vigenteBimestre 1Estado: AbiertoDel 01\/03\/2026 al 30\/04\/2026/);
    assert.match(page, /Alertas tempranas7alumnos con alerta en Bimestre 1/);
    assert.match(page, /Vacantes del periodo25vacantes disponiblesCapacidad120Matriculados95/);
    assert.ok(h.calls.bimesters.every(id => id === 30));
    assert.ok(h.calls.alerts.length > 0 && h.calls.alerts.every(args => JSON.stringify(args) === JSON.stringify([1, null, 0, 1])));
    assert.ok(h.calls.vacancies.length > 0 && h.calls.vacancies.every(id => id === 30));
    const hrefs = h.renderer.root.findAllByType('a').map(a => a.props.href);
    assert.deepEqual(hrefs, ['/administrador/bimestres', '/administrador/bimestres', '/administrador/vacantes']);
    assert.doesNotMatch(page, /próximamente|Promedio general/);
  });
  await view({ alerts: async () => page(1), vacancies: async () => vacancies({ availableVacancies: 1 }) }, async h => {
    assert.match(h.text(), /1alumno con alerta en Bimestre 1/); assert.match(h.text(), /1vacante disponible/);
  });
});

test('empty states never request what does not exist', async () => {
  await view({ alerts: async () => page(0), vacancies: async () => vacancies({ totalCapacity: 0, activeEnrollmentCount: 0, availableVacancies: 0, grades: 0 }) }, async h => {
    assert.match(h.text(), /Sin alertas en Bimestre 1\./); assert.match(h.text(), /El periodo no tiene secciones activas\./);
  });
  await view({ bimesters: async () => [bimester(1, { status: 'PLANIFICADO' })] }, async h => {
    assert.match(h.text(), /Estado: Planificado/); assert.match(h.text(), /Bimestre 1 aún no se ha abierto\./); assert.equal(h.calls.alerts.length, 0);
  });
  await view({ bimesters: async () => [bimester(1)] }, async h => {
    assert.match(h.text(), /Ningún bimestre en curso hoy\./); assert.match(h.text(), /Sin bimestre en curso hoy\./); assert.equal(h.calls.alerts.length, 0);
  }, { today: '2026-08-01' });
  await view({ bimesters: async () => [] }, async h => {
    assert.match(h.text(), /El periodo no tiene bimestres\./); assert.equal(h.calls.alerts.length, 0);
  });
  await view({}, async h => {
    assert.equal(h.text().split(NO_PERIOD_MESSAGE).length - 1, 3);
    assert.deepEqual(h.calls, { bimesters: [], alerts: [], vacancies: [] });
  }, { period: null });
});

test('each card fails on its own with a sanitized message and its own named retry', async () => {
  // StrictMode runs effects twice, so failures last until the retry.
  let failBimesters = true;
  await view({ bimesters: async () => { if (failBimesters) throw httpError(500); return [bimester(1)]; } }, async h => {
    assert.match(h.text(), /No se pudieron consultar los bimestres/); assert.match(h.text(), /Se mostrarán al conocer el bimestre vigente/);
    assert.match(h.text(), /25vacantes disponibles/); assert.equal(h.calls.alerts.length, 0); assert.doesNotMatch(h.text(), /DETALLE INTERNO/);
    failBimesters = false; await h.retry('Reintentar bimestre');
    assert.match(h.text(), /7alumnos con alerta/);
  });
  let failAlerts = true;
  await view({ alerts: async () => { if (failAlerts) throw httpError(500); return page(3); } }, async h => {
    assert.match(h.text(), /Bimestre vigenteBimestre 1/); assert.match(h.text(), /25vacantes disponibles/); assert.doesNotMatch(h.text(), /DETALLE INTERNO|alumnos con alerta/);
    failAlerts = false; await h.retry('Reintentar alertas');
    assert.match(h.text(), /3alumnos con alerta/);
  });
  let failVacancies = true;
  await view({ vacancies: async () => { if (failVacancies) throw httpError(409); return vacancies(); } }, async h => {
    assert.match(h.text(), /periodo académico está inactivo/); assert.match(h.text(), /7alumnos con alerta/); assert.doesNotMatch(h.text(), /DETALLE INTERNO/);
    failVacancies = false; await h.retry('Reintentar vacantes');
    assert.match(h.text(), /25vacantes disponibles/);
  });
  await view({ vacancies: async () => { throw new Error('La respuesta de vacantes no coincide con el contrato.'); } }, async h => {
    assert.match(h.text(), /No se pudieron consultar las vacantes/); assert.doesNotMatch(h.text(), /\d+vacantes disponibles/);
  });
});

test('dashboard feeds the cards with its default period and drops the general average card', async () => {
  const old = { periods: academicPeriodsService.list, sections: sectionsService.list, attendance: dailyAttendanceService.get };
  academicPeriodsService.list = async () => [period({ id: 31, current: false, startDate: '2025-03-01', endDate: '2025-12-20', name: 'Periodo 2025' }), period({ id: 30 })];
  sectionsService.list = async () => [];
  dailyAttendanceService.get = async () => { throw httpError(500); };
  type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
  const auth: Auth = { token: 'synthetic', role: 'DIRECTIVO', status: 'authenticated', sessionValid: true, login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  try {
    await withSelf(() => withMocks({ bimesters: async () => [bimester(1, { startDate: '2000-01-01', endDate: '2999-12-31' })] }, async calls => {
      let renderer!: ReactTestRenderer;
      await act(async () => { renderer = create(<AuthContext.Provider value={auth}><PantallaPrincipalAdmin /></AuthContext.Provider>); });
      const page = text(renderer.root);
      assert.deepEqual(calls.bimesters, [30]); assert.deepEqual(calls.vacancies, [30]);
      assert.match(page, /Asistencia diaria/); assert.match(page, /Bimestre vigenteBimestre 1/); assert.match(page, /7alumnos con alerta/);
      assert.doesNotMatch(page, /Promedio general|próximamente/);
      await act(async () => { renderer.unmount(); });
    }));
  } finally {
    academicPeriodsService.list = old.periods; sectionsService.list = old.sections; dailyAttendanceService.get = old.attendance;
  }
});
