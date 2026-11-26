import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, CanceledError, isCancel, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { PadreProvider } from '../src/components/padres/PadreContext';
import VistaPrincipalJustificacion from '../feature/padre/vistas/justificacion/vistaPrincipalJustificacion';
import { ModalFormularioJustificacion } from '../feature/padre/vistas/justificacion/component/modalFormularioJustificacion';
import { buildMonthCalendar, monthLabel, monthRange, shiftMonth, todayStatus } from '../src/adapters/guardianAttendanceCalendarAdapter';
import { isWithinJustificationDeadline, justificationDeadline } from '../src/lib/justificationDeadline';
import { formatLimaDay, limaToday } from '../src/lib/limaClock';
import { getGuardianAttendance } from '../src/services/padres/guardianAttendanceService';
import type { GuardianAttendanceRecord } from '../src/types/guardianAttendanceApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
if (typeof globalThis.self === 'undefined') Object.assign(globalThis, { self: globalThis });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const TODAY = '2026-11-26'; // jueves
let nextId = 1000;
const record = (over: Partial<GuardianAttendanceRecord> = {}): GuardianAttendanceRecord => ({
  date: '2026-11-25', courseName: 'Matemática', startTime: '08:00', endTime: '09:30', status: 'INASISTENCIA',
  attendanceId: nextId++, justified: false, justification: null, ...over,
});
const cellOf = (records: GuardianAttendanceRecord[], date: string, today = TODAY) => {
  const day = Number(date.slice(8));
  const cell = buildMonthCalendar(records, Number(date.slice(0, 4)), Number(date.slice(5, 7)), today).flat().find(c => c?.day === day);
  assert.ok(cell);
  return cell;
};

test('mes completo: huecos al inicio, fines de semana, futuro y días sin registro', () => {
  const weeks = buildMonthCalendar([record({ date: '2026-11-03', status: 'PRESENTE' })], 2026, 11, TODAY);
  assert.ok(weeks.every(w => w.length === 7));
  // 1 de noviembre de 2026 es domingo: seis huecos antes del día 1.
  assert.deepEqual(weeks[0].map(c => c?.day ?? null), [null, null, null, null, null, null, 1]);
  assert.equal(weeks.flat().filter(c => c !== null).length, 30);
  const kind = (day: number) => weeks.flat().find(c => c?.day === day)?.kind;
  assert.equal(kind(1), 'fin_semana');
  assert.equal(kind(7), 'fin_semana');
  assert.equal(kind(2), 'sin_registro');
  assert.equal(kind(3), 'presente');
  assert.equal(kind(26), 'sin_registro');
  assert.equal(kind(27), 'futuro');
  assert.match(weeks.flat().find(c => c?.day === 3)!.label, /martes, 3 de noviembre: Presente, 1 sesión/);
  assert.equal(monthLabel(2026, 11), 'noviembre de 2026');
});

test('varias sesiones en un día: gana la peor (falta, tardanza, presente) y se ordenan por hora', () => {
  const mixed = cellOf([
    record({ date: '2026-11-10', status: 'PRESENTE', startTime: '10:00', endTime: '11:30', courseName: 'Historia' }),
    record({ date: '2026-11-10', status: 'TARDANZA', startTime: '08:00', endTime: '09:30' }),
  ], '2026-11-10');
  assert.equal(mixed.kind, 'tardanza');
  assert.deepEqual(mixed.sessions.map(s => s.horario), ['08:00–09:30', '10:00–11:30']);
  assert.match(mixed.label, /2 sesiones/);
  const withAbsence = cellOf([
    record({ date: '2026-11-10', status: 'TARDANZA' }),
    record({ date: '2026-11-10', status: 'INASISTENCIA', startTime: '10:00', endTime: '11:30' }),
    record({ date: '2026-11-10', status: 'PRESENTE', startTime: '12:00', endTime: '13:00' }),
  ], '2026-11-10');
  assert.equal(withAbsence.kind, 'falta');
  assert.equal(cellOf([record({ date: '2026-11-10', status: 'PRESENTE' })], '2026-11-10').kind, 'presente');
});

test('estados de justificación: justified, RECHAZADA, PENDIENTE y OBSERVADA', () => {
  const day = '2026-11-25';
  const justified = cellOf([record({ justified: true, justification: { id: 1, status: 'APROBADA' } })], day).sessions[0];
  assert.equal(justified.puedeJustificar, false);
  assert.equal(justified.justificacionLabel, 'Justificación aprobada');
  assert.equal(justified.justificationId, 1);

  const rechazada = cellOf([record({ justification: { id: 2, status: 'RECHAZADA' } })], day);
  assert.equal(rechazada.sessions[0].puedeJustificar, true);
  assert.equal(rechazada.sessions[0].justificacionLabel, 'Justificación rechazada');
  assert.equal(rechazada.tienePendiente, true);

  for (const [status, label] of [['PENDIENTE', 'Justificación pendiente'], ['OBSERVADA', 'Justificación observada']] as const) {
    const cell = cellOf([record({ justification: { id: 3, status } })], day);
    assert.equal(cell.sessions[0].puedeJustificar, false);
    assert.equal(cell.sessions[0].justificacionLabel, label);
    assert.equal(cell.sessions[0].justificationId, 3);
    assert.equal(cell.tienePendiente, false);
  }
  const sin = cellOf([record()], day);
  assert.equal(sin.sessions[0].puedeJustificar, true);
  assert.equal(sin.sessions[0].justificacionLabel, null);
  assert.match(sin.label, /Se puede justificar/);
  // Una sesión presente nunca se justifica.
  assert.equal(cellOf([record({ status: 'PRESENTE' })], day).sessions[0].puedeJustificar, false);
});

test('plazo: de viernes a martes entra; el miércoles queda fuera, también tras un rechazo', () => {
  assert.equal(justificationDeadline('2026-11-20'), '2026-11-24');
  assert.equal(justificationDeadline('2026-11-25'), '2026-11-27');
  // Sesión en fin de semana: los dos días hábiles empiezan a contar el lunes.
  assert.equal(justificationDeadline('2026-11-21'), '2026-11-24');
  assert.equal(justificationDeadline('2026-11-22'), '2026-11-24');
  assert.equal(isWithinJustificationDeadline('2026-11-20', '2026-11-24'), true);
  assert.equal(isWithinJustificationDeadline('2026-11-20', '2026-11-25'), false);
  assert.throws(() => justificationDeadline('2026-02-31'), RangeError);
  assert.equal(isWithinJustificationDeadline('2026-02-31', '2026-03-01'), false);
  const friday = record({ date: '2026-11-20', justification: { id: 4, status: 'RECHAZADA' } });
  assert.equal(cellOf([friday], '2026-11-20', '2026-11-24').sessions[0].puedeJustificar, true);
  const late = cellOf([friday], '2026-11-20', '2026-11-25').sessions[0];
  assert.equal(late.puedeJustificar, false);
  assert.equal(late.justificacionLabel, 'Justificación rechazada · plazo vencido');
  assert.equal(cellOf([record({ date: '2026-11-20' })], '2026-11-20', '2026-11-25').sessions[0].justificacionLabel, 'Plazo para justificar vencido');
});

test('monthRange: mes actual hasta hoy, mes completo pasado, mes futuro nulo y febrero', () => {
  assert.deepEqual(monthRange(2026, 11, TODAY), { from: '2026-11-01', to: '2026-11-26' });
  assert.deepEqual(monthRange(2026, 10, TODAY), { from: '2026-10-01', to: '2026-10-31' });
  assert.equal(monthRange(2026, 12, TODAY), null);
  assert.deepEqual(monthRange(2026, 2, TODAY), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(monthRange(2028, 2, '2028-12-31'), { from: '2028-02-01', to: '2028-02-29' });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
});

test('todayStatus: sin registro, en orden y alerta (registros inyectados)', () => {
  assert.deepEqual(todayStatus([], TODAY), { kind: 'sin_registro', tardanzas: 0, inasistencias: 0, sesionesJustificables: 0 });
  assert.equal(todayStatus([record({ date: '2026-11-25' })], TODAY).kind, 'sin_registro');
  assert.equal(todayStatus([record({ date: TODAY, status: 'PRESENTE' }), record({ date: TODAY, status: 'PRESENTE' })], TODAY).kind, 'en_orden');
  const alerta = todayStatus([
    record({ date: TODAY, status: 'PRESENTE' }),
    record({ date: TODAY, status: 'TARDANZA' }),
    record({ date: TODAY, status: 'INASISTENCIA', justification: { id: 5, status: 'PENDIENTE' } }),
  ], TODAY);
  assert.deepEqual(alerta, { kind: 'alerta', tardanzas: 1, inasistencias: 1, sesionesJustificables: 1 });
});

// ---- render ----

function textOf(n: ReactTestInstance): string {
  return n.children.map(c => (typeof c === 'string' ? c : textOf(c))).join('');
}
const reply = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => {
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse;
  // Como un adaptador real: un estado de error rechaza con AxiosError.
  if (status >= 400) throw new AxiosError('Request failed', String(status), config, null, response);
  return response;
};
const ANA = { studentId: 57, studentCode: 'C26000057', fullName: 'Ana Arias Demo', grade: 5, sectionName: 'A' };
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;

function attendanceBody(config: InternalAxiosRequestConfig, records: GuardianAttendanceRecord[]) {
  const { from, to } = config.params as { from: string; to: string };
  const inRange = records.filter(r => r.date >= from && r.date <= to);
  return {
    studentId: 57, from, to,
    summary: {
      total: inRange.length,
      present: inRange.filter(r => r.status === 'PRESENTE').length,
      late: inRange.filter(r => r.status === 'TARDANZA').length,
      absent: inRange.filter(r => r.status === 'INASISTENCIA').length,
    },
    records: inRange,
  };
}

async function renderVista(adapter: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>, pushed: string[] = []) {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    if (config.url === '/v1/guardian/students') return reply(config, [ANA]);
    if (String(config.url).endsWith('/attendance')) return adapter(config);
    return reply(config, { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  };
  const spyRouter = { ...router, push: (href: string) => { pushed.push(href); } } as unknown as AppRouterInstance;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <AppRouterContext.Provider value={spyRouter}>
        <SearchParamsContext.Provider value={new URLSearchParams('')}>
          <PadreProvider><VistaPrincipalJustificacion /></PadreProvider>
        </SearchParamsContext.Provider>
      </AppRouterContext.Provider>,
    );
  });
  return { renderer, cleanup: async () => { await act(async () => { renderer.unmount(); }); httpClient.defaults.adapter = original; } };
}

const buttonByLabel = (root: ReactTestInstance, re: RegExp) => root.find(n => n.type === 'button' && typeof n.props['aria-label'] === 'string' && re.test(n.props['aria-label']));
const buttonByText = (root: ReactTestInstance, text: string) => root.findAll(n => n.type === 'button' && textOf(n).trim() === text);

test('render: cambiar de mes pide el nuevo from/to y la respuesta tardía no pisa la nueva', async () => {
  const today = limaToday();
  const current = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const prev = shiftMonth(current.year, current.month, -1);
  const prefix = today.slice(0, 7);
  const prevDay = `${prev.year}-${String(prev.month).padStart(2, '0')}-10`;
  const params: Array<{ from: string; to: string }> = [];
  const monthSignals: AbortSignal[] = [];
  let releaseCurrent!: () => void;
  const view = await renderVista(async config => {
    params.push(config.params);
    if (config.params.from === `${prefix}-01`) monthSignals.push(config.signal as AbortSignal);
    if ((config.params.from as string).startsWith(prefix)) {
      await new Promise<void>(resolve => { releaseCurrent = resolve; });
      return reply(config, attendanceBody(config, [record({ date: today, status: 'PRESENTE' })]));
    }
    return reply(config, attendanceBody(config, [record({ date: prevDay, status: 'TARDANZA' })]));
  });
  try {
    assert.equal(buttonByLabel(view.renderer.root, /Mes siguiente/).props.disabled, true);
    assert.equal(monthSignals[0].aborted, false);
    await act(async () => { buttonByLabel(view.renderer.root, /Mes anterior/).props.onClick(); });
    assert.equal(monthSignals[0].aborted, true, 'cambiar de mes cancela la petición del mes anterior');
    const range = monthRange(prev.year, prev.month, today)!;
    assert.ok(params.some(p => p.from === range.from && p.to === range.to));
    await act(async () => { releaseCurrent(); });
    const out = textOf(view.renderer.root);
    assert.match(out, new RegExp(monthLabel(prev.year, prev.month), 'i'));
    assert.ok(view.renderer.root.findAll(n => n.type === 'button' && /Tardanza, 1 sesión/.test(String(n.props['aria-label']))).length === 1);
    assert.equal(view.renderer.root.findAll(n => n.type === 'button' && String(n.props['aria-label']).includes(formatLimaDay(today))).length, 0);
    assert.equal(buttonByLabel(view.renderer.root, /Mes siguiente/).props.disabled, false);
  } finally { await view.cleanup(); }
});

test('render: el error del calendario muestra «Reintentar» y reintenta', async () => {
  let fail = true;
  let calls = 0;
  const view = await renderVista(async config => {
    calls++;
    if (fail) return reply(config, { code: 'X' }, 500);
    return reply(config, attendanceBody(config, []));
  });
  try {
    const alerts = view.renderer.root.findAll(n => n.props.role === 'alert');
    assert.ok(alerts.length >= 1);
    assert.match(textOf(alerts[0]), /No se pudo cargar la asistencia/);
    const before = calls;
    fail = false;
    const retry = buttonByText(view.renderer.root, 'Reintentar');
    await act(async () => { retry.forEach(b => b.props.onClick()); });
    assert.ok(calls > before);
    assert.equal(view.renderer.root.findAll(n => n.props.role === 'alert').length, 0);
    assert.match(textOf(view.renderer.root), /No hay asistencia registrada en este mes/);
    assert.match(textOf(view.renderer.root), /Aún no hay asistencia registrada hoy/);
  } finally { await view.cleanup(); }
});

test('render: «Justificar ahora» del detalle abre el modal con ese attendanceId y «Ver justificación» usa el enlace existente', async () => {
  const today = limaToday();
  const justifiable = record({ date: today, status: 'INASISTENCIA', courseName: 'Historia', attendanceId: 7771 });
  const observed = record({ date: today, status: 'TARDANZA', startTime: '10:00', endTime: '11:00', justification: { id: 88, status: 'OBSERVADA' }, attendanceId: 7772 });
  const pushed: string[] = [];
  const view = await renderVista(async config => reply(config, attendanceBody(config, [justifiable, observed])), pushed);
  try {
    assert.match(textOf(view.renderer.root), /Hoy registra 1 tardanza y 1 inasistencia/);
    await act(async () => { buttonByLabel(view.renderer.root, new RegExp(formatLimaDay(today))).props.onClick(); });
    const detail = view.renderer.root.find(n => n.type === 'section' && /^Detalle de/.test(String(n.props['aria-label'])));
    assert.match(textOf(detail), /Historia/);
    assert.match(textOf(detail), /Justificación observada/);
    const justify = buttonByText(detail, 'Justificar ahora');
    assert.equal(justify.length, 1, 'solo la sesión que se puede justificar');
    await act(async () => { justify[0].props.onClick(); });
    assert.equal(view.renderer.root.findByType(ModalFormularioJustificacion).props.attendanceId, 7771);
    assert.doesNotMatch(textOf(view.renderer.root.findByType(ModalFormularioJustificacion)), /\d{4}-\d{2}-\d{2}/);
    await act(async () => { buttonByText(detail, 'Ver justificación')[0].props.onClick(); });
    assert.deepEqual(pushed, ['/padre/justificacion?studentId=57&justificationId=88']);
  } finally { await view.cleanup(); }
});

test('render: la tarjeta «Justificar ahora» abre el detalle de hoy', async () => {
  const today = limaToday();
  const view = await renderVista(async config => reply(config, attendanceBody(config, [record({ date: today, status: 'INASISTENCIA' })])));
  try {
    assert.equal(view.renderer.root.findAll(n => n.type === 'section' && /^Detalle de/.test(String(n.props['aria-label']))).length, 0);
    const card = buttonByText(view.renderer.root, 'Justificar ahora');
    assert.equal(card.length, 1);
    await act(async () => { card[0].props.onClick(); });
    assert.equal(view.renderer.root.findAll(n => n.type === 'section' && /^Detalle de/.test(String(n.props['aria-label']))).length, 1);
  } finally { await view.cleanup(); }
});

test('el signal llega a httpClient, cancelar relanza el error original y desmontar cancela', async () => {
  const original = httpClient.defaults.adapter;
  const signals: AbortSignal[] = [];
  httpClient.defaults.adapter = async config => {
    const signal = config.signal as AbortSignal;
    signals.push(signal);
    return new Promise<AxiosResponse>((_, reject) => { signal.addEventListener('abort', () => reject(new CanceledError('canceled', config))); });
  };
  try {
    const controller = new AbortController();
    const pending = getGuardianAttendance('57', '2026-10-01', '2026-10-31', controller.signal);
    await new Promise(resolve => setTimeout(resolve, 0));
    controller.abort();
    await assert.rejects(pending, (error: unknown) => isCancel(error));
    assert.equal(signals[0], controller.signal);
    // Compatible con el uso sin signal: un error normal sigue envuelto con el mensaje del contrato.
    httpClient.defaults.adapter = async () => { throw new Error('boom'); };
    await assert.rejects(getGuardianAttendance('57', '2026-10-01', '2026-10-31'), /No se pudo cargar la asistencia/);
  } finally { httpClient.defaults.adapter = original; }

  const seen: AbortSignal[] = [];
  const view = await renderVista(async config => {
    seen.push(config.signal as AbortSignal);
    return new Promise<AxiosResponse>(() => {});
  });
  assert.ok(seen.length >= 2 && seen.every(s => s instanceof AbortSignal && !s.aborted));
  await view.cleanup();
  assert.ok(seen.every(s => s.aborted));
});
