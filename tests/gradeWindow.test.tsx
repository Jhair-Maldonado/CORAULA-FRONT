import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import BimesterGradeWindowPanel from '../feature/admin/vistas/(academico)/bimestres/BimesterGradeWindowPanel';
import VistaBimestres from '../feature/admin/vistas/(academico)/bimestres/vistaBimestres';
import { AuthContext } from '../src/contexts/AuthContext';
import { addDays, formatIsoDate, isIsoDate, parseGradeWindow } from '../src/lib/gradeWindowContract';
import {
  extensionDeadlineError, gradeWindowActionErrorMessage, gradeWindowReadErrorMessage, gradeWindowReasonError, gradeWindowService,
  isUncertainGradeWindowAction, minExtensionDate, registrationDateError,
} from '../src/services/admin/gradeWindowService';
import { GRADE_WINDOW_ERROR_CODES, gradeWindowErrorCode, gradeWindowErrorCodeMessage, gradeWindowErrorCodeMessages } from '../src/services/admin/gradeWindowErrors';
import { limaToday } from '../src/services/admin/dailyAttendanceService';
import { evaluationService } from '../src/services/admin/evaluationService';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { bimesterPublicationService } from '../src/services/admin/bimesterPublicationService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import httpClient from '../src/services/httpClient';
import type { Bimester } from '../src/types/evaluationApi';
import type { GradeWindow } from '../src/types/gradeWindowApi';

// Unit/component mocks only: no network, browser server or shared database. Synthetic data.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });
const bimester = (status: Bimester['status'] = 'ABIERTO', id = 4): Bimester => ({ id, academicPeriodId: 30, number: id, name: `Bimestre ${id}`, startDate: '2026-03-01', endDate: '2026-04-30', status });
// Default D = endDate; deadline D+7.
const window_ = (over: Partial<GradeWindow> = {}): GradeWindow => ({ bimesterId: 4, registrationDate: '2026-04-30', registrationDateConfigured: false,
  extendedDeadline: null, deadline: '2026-05-07', expired: false, timeZone: 'America/Lima', ...over });
const configured = (date: string) => window_({ registrationDate: date, registrationDateConfigured: true, deadline: addDays(date, 7) });
const extended = (date: string, base = window_()) => ({ ...base, extendedDeadline: date, deadline: date > base.deadline ? date : base.deadline });
const httpError = (status?: number, code?: string) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data: { error: 'X', message: 'secret detail', ...(code ? { code } : {}) } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

async function withAdapter(run: (h: { calls: { method?: string; url?: string; data: unknown }[]; reply: (data: unknown, status?: number) => void }) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: { method?: string; url?: string; data: unknown }[] = [];
  let data: unknown = null, status = 200;
  httpClient.defaults.adapter = async config => {
    calls.push({ method: config.method, url: config.url, data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data });
    return { config, data, status, statusText: 'OK', headers: {} };
  };
  try { await run({ calls, reply: (value, code = 200) => { data = value; status = code; } }); } finally { httpClient.defaults.adapter = original; }
}

test('dates are calendar days handled as text: validation, shifting across months and display', () => {
  for (const ok of ['2026-02-28', '2028-02-29', '2026-12-31']) assert.equal(isIsoDate(ok), true, ok);
  for (const bad of ['2026-02-29', '2026-13-01', '2026-4-30', '2026-04-30T00:00:00Z', '0050-01-01', '', null, 20260430]) assert.equal(isIsoDate(bad), false, String(bad));
  assert.equal(addDays('2026-04-30', 7), '2026-05-07');
  assert.equal(addDays('2026-12-28', 7), '2027-01-04');
  assert.equal(addDays('2028-02-25', 7), '2028-03-03');
  assert.equal(formatIsoDate('2026-05-07'), '07/05/2026');
  // "Today" is the Lima day even when UTC already moved on (UTC-05:00).
  assert.equal(limaToday(new Date('2026-11-01T03:00:00Z')), '2026-10-31');
  assert.equal(limaToday(new Date('2026-11-01T05:00:00Z')), '2026-11-01');
});

test('parseGradeWindow validates the #39 object and the deadline rule', () => {
  assert.deepEqual(parseGradeWindow(window_(), 4), window_());
  assert.deepEqual(parseGradeWindow(configured('2026-04-20'), 4), configured('2026-04-20'));
  assert.deepEqual(parseGradeWindow(extended('2026-05-20'), 4), extended('2026-05-20'));
  // An extension earlier than D+7 never shortens the deadline.
  assert.equal(parseGradeWindow(extended('2026-05-03'), 4).deadline, '2026-05-07');
  // Extra fields are dropped.
  assert.equal('extra' in parseGradeWindow({ ...window_(), extra: 1 }, 4), false);
  const bad: unknown[] = [
    { ...window_(), bimesterId: 5 }, { ...window_(), bimesterId: '4' }, { ...window_(), registrationDate: '30/04/2026' },
    { ...window_(), registrationDateConfigured: 'no' }, { ...window_(), extendedDeadline: 'x' }, { ...window_(), expired: null },
    { ...window_(), timeZone: 'UTC' }, { ...window_(), deadline: '2026-05-08' }, { ...window_(), deadline: '2026-04-30' },
    { ...extended('2026-05-20'), deadline: '2026-05-07' }, { ...window_(), deadline: undefined }, null, [], 'x',
  ];
  for (const value of bad) assert.throws(() => parseGradeWindow(value, 4), /contrato/, JSON.stringify(value));
});

test('service: GET, PUT and POST use their contract paths and exact bodies; local validation sends nothing', async () => {
  await withAdapter(async h => {
    h.reply(window_());
    assert.deepEqual(await gradeWindowService.get(4), window_());
    assert.deepEqual(h.calls[0], { method: 'get', url: '/v1/management/bimesters/4/grade-window', data: undefined });
    h.reply(configured('2026-04-20'));
    assert.deepEqual(await gradeWindowService.setRegistrationDate(4, '2026-04-20', '  Feriado  '), configured('2026-04-20'));
    assert.deepEqual(h.calls[1], { method: 'put', url: '/v1/management/bimesters/4/grade-window/registration-date', data: { registrationDate: '2026-04-20', reason: 'Feriado' } });
    h.reply(extended('2026-05-20'));
    assert.deepEqual(await gradeWindowService.extend(4, '2026-05-20', ' Evaluación tardía '), extended('2026-05-20'));
    assert.deepEqual(h.calls[2], { method: 'post', url: '/v1/management/bimesters/4/grade-window/extension', data: { deadline: '2026-05-20', reason: 'Evaluación tardía' } });
    // A 200 that does not reflect the request is not a confirmation.
    h.reply(window_()); await assert.rejects(gradeWindowService.setRegistrationDate(4, '2026-04-20', 'Motivo'), /no confirma la fecha/);
    h.reply(extended('2026-05-03')); await assert.rejects(gradeWindowService.extend(4, '2026-05-03', 'Motivo'), /no confirma la ampliación/);
    h.reply(window_(), 204); await assert.rejects(gradeWindowService.get(4));
    h.reply({ ...window_(), bimesterId: 9 }); await assert.rejects(gradeWindowService.get(4), /contrato/);
    const count = h.calls.length;
    await assert.rejects(gradeWindowService.setRegistrationDate(4, '2026-02-30', 'Motivo'), /fecha de registro válida/);
    await assert.rejects(gradeWindowService.setRegistrationDate(4, '2026-04-20', '   '), /Indica el motivo/);
    await assert.rejects(gradeWindowService.extend(4, '', 'Motivo'), /fecha límite válida/);
    await assert.rejects(gradeWindowService.extend(4, '2026-05-20', 'm'.repeat(256)), /255/);
    for (const id of [0, -1, 1.5, NaN]) await assert.rejects(gradeWindowService.get(id), /entero positivo/);
    assert.equal(h.calls.length, count);
  });
});

test('dialog rules: reason 1–255 trimmed, D not before start nor equal to the current one, extension after the deadline and not before today', () => {
  assert.equal(gradeWindowReasonError(' '), 'Indica el motivo.');
  assert.equal(gradeWindowReasonError(`  ${'m'.repeat(255)}  `), null);
  assert.match(gradeWindowReasonError('m'.repeat(256)) ?? '', /255/);
  assert.match(registrationDateError('', '2026-03-01', window_()) ?? '', /válida/);
  assert.match(registrationDateError('2026-02-28', '2026-03-01', window_()) ?? '', /anterior al inicio del bimestre \(01\/03\/2026\)/);
  assert.equal(registrationDateError('2026-03-01', '2026-03-01', window_()), null);
  assert.equal(registrationDateError('2026-04-30', '2026-03-01', window_()), 'Ya es la fecha vigente.');
  assert.match(extensionDeadlineError('2026-05-07', window_(), '2026-05-01') ?? '', /posterior al plazo vigente \(07\/05\/2026\)/);
  assert.equal(extensionDeadlineError('2026-05-08', window_(), '2026-05-01'), null);
  assert.match(extensionDeadlineError('2026-05-08', window_(), '2026-05-10') ?? '', /anterior a hoy \(10\/05\/2026, hora de Lima\)/);
  assert.equal(minExtensionDate(window_(), '2026-05-01'), '2026-05-08');
  assert.equal(minExtensionDate(window_(), '2026-05-10'), '2026-05-10');
});

test('error catalog: known codes only with their contract status; texts are fixed per action', () => {
  assert.deepEqual(GRADE_WINDOW_ERROR_CODES, ['VALIDATION_ERROR', 'REASON_REQUIRED', 'RESOURCE_NOT_FOUND', 'BIMESTER_STATE_CONFLICT', 'INTERNAL_ERROR']);
  assert.equal(gradeWindowErrorCode(httpError(409, 'BIMESTER_STATE_CONFLICT')), 'BIMESTER_STATE_CONFLICT');
  assert.equal(gradeWindowErrorCode(httpError(400, 'BIMESTER_STATE_CONFLICT')), null);
  assert.equal(gradeWindowErrorCode(httpError(409, 'GRADE_WINDOW_EXPIRED')), null);
  assert.equal(gradeWindowErrorCode(new Error('x')), null);
  for (const code of Object.keys(gradeWindowErrorCodeMessages) as (keyof typeof gradeWindowErrorCodeMessages)[]) {
    for (const action of ['registrationDate', 'extension'] as const) assert.doesNotMatch(gradeWindowErrorCodeMessages[code][action], /secret|PRIVATE/);
  }
  assert.match(gradeWindowErrorCodeMessage(httpError(409, 'BIMESTER_STATE_CONFLICT'), 'registrationDate') ?? '', /Planificado o Abierto/);
  assert.match(gradeWindowErrorCodeMessage(httpError(409, 'BIMESTER_STATE_CONFLICT'), 'extension') ?? '', /con el bimestre Abierto/);
  assert.equal(gradeWindowErrorCodeMessage(httpError(400, 'VALIDATION_ERROR'), 'extension'), null);
});

test('action messages: catalog first, then HTTP; uncertain results never claim success', () => {
  const cases: [unknown, 'registrationDate' | 'extension', RegExp][] = [
    [httpError(400, 'REASON_REQUIRED'), 'extension', /motivo de la ampliación/],
    [httpError(400, 'VALIDATION_ERROR'), 'registrationDate', /Revisa la fecha de registro/],
    [httpError(400, 'VALIDATION_ERROR'), 'extension', /posterior al plazo vigente y no anterior a hoy/],
    [httpError(404, 'RESOURCE_NOT_FOUND'), 'extension', /ya no está disponible/],
    [httpError(409), 'extension', /El bimestre cambió/],
    [httpError(401), 'extension', /sesión ha expirado/],
    [httpError(403), 'registrationDate', /Solo el Director/],
    [httpError(), 'extension', /sin repetirla/], [httpError(500, 'INTERNAL_ERROR'), 'extension', /sin repetirla/],
    [httpError(502), 'registrationDate', /sin repetirla/], [new Error('La respuesta no confirma la ampliación.'), 'extension', /sin repetirla/],
  ];
  for (const [error, action, expected] of cases) {
    const message = gradeWindowActionErrorMessage(error, action);
    assert.match(message, expected, message);
    assert.doesNotMatch(message, /secret|PRIVATE|confirmad[ao] mediante recarga/);
  }
  assert.equal(isUncertainGradeWindowAction(httpError(409)), false);
  assert.equal(isUncertainGradeWindowAction(httpError()), true);
  assert.match(gradeWindowReadErrorMessage(httpError(403)), /permiso/);
  assert.match(gradeWindowReadErrorMessage(httpError()), /conectar/);
  assert.match(gradeWindowReadErrorMessage(new Error('contrato')), /no pudo confirmarse/);
});

function withDom() {
  const globals = ['window', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  return { Element, restore: () => { for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } } };
}

type Panel = { renderer: ReactTestRenderer; button: (name: string) => ReactTestInstance | undefined; click: (name: string) => Promise<void>; shown: () => string; changed: () => number; busy: boolean[] };
async function panel(overrides: Partial<typeof gradeWindowService>, run: (h: Panel) => Promise<void>, options: { canManage?: boolean; status?: Bimester['status']; today?: string } = {}) {
  const original = { ...gradeWindowService };
  Object.assign(gradeWindowService, { get: async () => window_() }, overrides);
  const dom = withDom();
  let renderer!: ReactTestRenderer, changed = 0;
  const busy: boolean[] = [];
  try {
    await act(async () => { renderer = create(<BimesterGradeWindowPanel bimester={bimester(options.status ?? 'ABIERTO')} canManage={options.canManage ?? true} locked={false} today={() => options.today ?? '2026-05-05'}
      onClose={() => {}} onChanged={() => { changed++; }} onBusyChange={value => { busy.push(value); }} />, { createNodeMock: () => new dom.Element() }); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    await run({ renderer, button, busy, shown: () => text(renderer.root), changed: () => changed,
      click: async name => { const node = button(name); assert.ok(node, name); assert.equal(!!node.props.disabled, false, name); await act(async () => { node.props.onClick(); }); } });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(gradeWindowService, original); dom.restore();
  }
}
const actions = ['Fijar fecha de registro', 'Ampliar plazo'];
const registrationForm = 'Fecha de registro de notas', extensionForm = 'Ampliación del plazo de registro';
const submit = (h: Panel, form: string) => act(async () => { h.renderer.root.findByProps({ 'aria-label': form }).props.onSubmit({ preventDefault() {} }); });
const type = (h: Panel, label: string, value: string) => act(async () => { h.renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); });

test('summary shows D (configured or default), extension, inclusive deadline and expiry in Lima time', async () => {
  await panel({}, async h => {
    assert.match(h.shown(), /Fecha de registro30\/04\/2026 · por defecto: fin del bimestre/);
    assert.match(h.shown(), /AmpliaciónSin ampliación/);
    assert.match(h.shown(), /Plazo vigenteHasta el 07\/05\/2026 inclusive \(hora de Lima\)/);
    assert.match(h.shown(), /Estado del plazoVigente/);
    assert.match(h.shown(), /la fecha de registro más 7 días/);
    assert.equal(h.renderer.root.findAllByType('time')[0].props.dateTime, '2026-04-30');
  });
  await panel({ get: async () => ({ ...extended('2026-05-20', configured('2026-04-20')), expired: true }) }, async h => {
    assert.match(h.shown(), /Fecha de registro20\/04\/2026 · configurada/);
    assert.match(h.shown(), /AmpliaciónHasta el 20\/05\/2026 inclusive/);
    assert.match(h.shown(), /Estado del plazoVencido/);
    assert.match(h.shown(), /El plazo venció.*Solo una ampliación/);
  });
  await panel({}, async h => assert.match(h.shown(), /El plazo rige cuando el bimestre se abra/), { status: 'PLANIFICADO' });
  await panel({}, async h => assert.match(h.shown(), /El plazo solo rige con el bimestre Abierto/), { status: 'CERRADO' });
  await panel({ get: async () => { throw httpError(403); } }, async h => assert.match(h.shown(), /No tienes permiso para consultar el plazo/));
});

test('state × role matrix: ADMINISTRADOR sets D in PLANIFICADO/ABIERTO and extends only in ABIERTO; DIRECTIVO reads', async () => {
  const expected: Record<Bimester['status'], string[]> = { PLANIFICADO: ['Fijar fecha de registro'], ABIERTO: actions, EN_REVISION: [], CERRADO: [], ANULADO: [] };
  for (const canManage of [true, false]) {
    for (const status of ['PLANIFICADO', 'ABIERTO', 'EN_REVISION', 'CERRADO'] as const) {
      await panel({}, async h => {
        for (const action of actions) {
          const want = canManage && expected[status].includes(action);
          assert.equal(h.button(action) ? !h.button(action)!.props.disabled : false, want, `${canManage} ${status} ${action}`);
          if (!want) assert.equal(h.button(action), undefined);
        }
        assert.equal(/Acceso DIRECTIVO: solo lectura/.test(h.shown()), !canManage);
      }, { canManage, status });
    }
  }
});

test('registration date: starts at the current D, blocks the same date and dates before the start, reason counter; one PUT and a confirmed reload', async () => {
  const sent: [string, string][] = []; let reads = 0;
  const pending = deferred<GradeWindow>();
  await panel({ get: async () => ++reads === 1 ? window_() : configured('2026-04-25'), setRegistrationDate: async (_id, date, reason) => { sent.push([date, reason]); return pending.promise; } }, async h => {
    await h.click('Fijar fecha de registro');
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Fecha de registro' }).props.value, '2026-04-30');
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Fecha de registro' }).props.min, '2026-03-01');
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Motivo de la fecha de registro' }).props.maxLength, 255);
    await type(h, 'Motivo de la fecha de registro', 'Cambio de calendario');
    await submit(h, registrationForm); assert.match(h.shown(), /Ya es la fecha vigente\./);
    await type(h, 'Fecha de registro', '2026-02-27'); await submit(h, registrationForm); assert.match(h.shown(), /anterior al inicio del bimestre/);
    await type(h, 'Fecha de registro', '2026-04-25');
    await type(h, 'Motivo de la fecha de registro', ' '); await submit(h, registrationForm); assert.match(h.shown(), /Indica el motivo\./);
    await type(h, 'Motivo de la fecha de registro', 'm'.repeat(256)); assert.match(h.shown(), /256\/255/);
    await submit(h, registrationForm); assert.match(h.shown(), /no puede superar los 255/);
    assert.deepEqual(sent, []);
    await type(h, 'Motivo de la fecha de registro', '  Cambio de calendario  ');
    const onSubmit = h.renderer.root.findByProps({ 'aria-label': registrationForm }).props.onSubmit;
    await act(async () => { onSubmit({ preventDefault() {} }); onSubmit({ preventDefault() {} }); });
    assert.deepEqual(sent, [['2026-04-25', 'Cambio de calendario']]); assert.deepEqual(h.busy, [true]);
    assert.equal(h.button('Actualizar panel')?.props.disabled, true);
    await act(async () => { pending.resolve(configured('2026-04-25')); });
    assert.equal(reads, 2); assert.equal(h.changed(), 1); assert.deepEqual(h.busy, [true, false]);
    assert.match(h.shown(), /La fecha de registro de Bimestre 4 es el 25\/04\/2026\. Confirmada mediante recarga\./);
    assert.match(h.shown(), /Fecha de registro25\/04\/2026 · configurada/);
  }, { status: 'PLANIFICADO' });
});

test('extension: after the deadline and not before today (Lima); one POST and a confirmed reload', async () => {
  const sent: [string, string][] = []; let reads = 0;
  await panel({ get: async () => ++reads === 1 ? window_({ expired: true }) : extended('2026-05-15'), extend: async (_id, date, reason) => { sent.push([date, reason]); return extended(date); } }, async h => {
    await h.click('Ampliar plazo');
    assert.match(h.shown(), /Plazo vigente: hasta el 07\/05\/2026 inclusive \(vencido\)/);
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Nueva fecha límite' }).props.min, '2026-05-10');
    await type(h, 'Motivo de la ampliación', 'Evaluación rendida posteriormente');
    await submit(h, extensionForm); assert.match(h.shown(), /fecha límite válida/);
    await type(h, 'Nueva fecha límite', '2026-05-07'); await submit(h, extensionForm); assert.match(h.shown(), /posterior al plazo vigente/);
    await type(h, 'Nueva fecha límite', '2026-05-08'); await submit(h, extensionForm); assert.match(h.shown(), /anterior a hoy \(10\/05\/2026/);
    assert.deepEqual(sent, []);
    await type(h, 'Nueva fecha límite', '2026-05-15'); await submit(h, extensionForm);
    assert.deepEqual(sent, [['2026-05-15', 'Evaluación rendida posteriormente']]);
    assert.match(h.shown(), /El plazo de Bimestre 4 se amplió hasta el 15\/05\/2026 inclusive\. Confirmado mediante recarga\./);
    assert.match(h.shown(), /Estado del plazoVigente/);
  }, { today: '2026-05-10' });
});

test('every failure reloads the panel once, shows a fixed message and never retries', async () => {
  const cases: [unknown, RegExp][] = [
    [httpError(409, 'BIMESTER_STATE_CONFLICT'), /solo puede ampliarse con el bimestre Abierto/],
    [httpError(400, 'VALIDATION_ERROR'), /Revisa la nueva fecha límite/], [httpError(400, 'REASON_REQUIRED'), /motivo de la ampliación/],
    [httpError(404, 'RESOURCE_NOT_FOUND'), /ya no está disponible/], [httpError(403), /Solo el Director/],
    [httpError(), /sin repetirla/], [httpError(500, 'INTERNAL_ERROR'), /sin repetirla/], [new Error('La respuesta no confirma la ampliación.'), /sin repetirla/],
  ];
  for (const [failure, expected] of cases) {
    let posts = 0, reads = 0;
    await panel({ get: async () => { reads++; return window_(); }, extend: async () => { posts++; throw failure; } }, async h => {
      await h.click('Ampliar plazo'); await type(h, 'Nueva fecha límite', '2026-05-15'); await type(h, 'Motivo de la ampliación', 'Motivo'); await submit(h, extensionForm);
      assert.equal(posts, 1); assert.equal(reads, 2); assert.equal(h.changed(), 1);
      assert.match(h.shown(), expected); assert.doesNotMatch(h.shown(), /Confirmado mediante recarga|secret|PRIVATE/);
      assert.equal(h.button('Ampliar plazo')?.props.disabled, false);
    });
  }
});

test('an accepted write that the reload does not confirm, or a failed reload, requires refreshing before another action', async () => {
  let reads = 0;
  await panel({ get: async () => { reads++; return window_(); }, extend: async (_id, date) => extended(date) }, async h => {
    await h.click('Ampliar plazo'); await type(h, 'Nueva fecha límite', '2026-05-15'); await type(h, 'Motivo de la ampliación', 'Motivo'); await submit(h, extensionForm);
    assert.match(h.shown(), /la recarga no la confirmó/); assert.match(h.shown(), /Actualiza el panel antes de otra operación/);
    assert.equal(h.button('Ampliar plazo')?.props.disabled, true);
    await h.click('Actualizar panel');
    assert.equal(h.button('Ampliar plazo')?.props.disabled, false);
  });
  reads = 0;
  await panel({ get: async () => { if (++reads > 1) throw httpError(); return window_(); }, extend: async (_id, date) => extended(date) }, async h => {
    await h.click('Ampliar plazo'); await type(h, 'Nueva fecha límite', '2026-05-15'); await type(h, 'Motivo de la ampliación', 'Motivo'); await submit(h, extensionForm);
    assert.match(h.shown(), /El servidor aceptó la operación\. No se pudo recargar el panel/);
    assert.equal(h.button('Ampliar plazo')?.props.disabled, true);
  });
});

test('a dialog opened before a reload cannot be confirmed', async () => {
  let posts = 0;
  await panel({ extend: async (_id, date) => { posts++; return extended(date); } }, async h => {
    await h.click('Ampliar plazo'); await type(h, 'Nueva fecha límite', '2026-05-15'); await type(h, 'Motivo de la ampliación', 'Motivo');
    const stale = h.renderer.root.findByProps({ 'aria-label': extensionForm }).props.onSubmit;
    await h.click('Actualizar panel');
    assert.equal(h.renderer.root.findAllByProps({ 'aria-label': extensionForm }).length, 0);
    await act(async () => { stale({ preventDefault() {} }); });
    assert.equal(posts, 0);
    await h.click('Ampliar plazo'); await h.click('Cancelar');
    assert.equal(h.renderer.root.findAllByProps({ 'aria-label': extensionForm }).length, 0); assert.equal(posts, 0);
  });
});

function mockNames() {
  const oldSections = sectionsService.list, oldCourses = sectionCoursesService.list;
  sectionsService.list = async () => [];
  sectionCoursesService.list = async () => [];
  return () => { sectionsService.list = oldSections; sectionCoursesService.list = oldCourses; };
}

async function bimestersView(role: Auth['role'], run: (h: { renderer: ReactTestRenderer; button: (label: string) => ReactTestInstance | undefined; shown: () => string }) => Promise<void>, overrides: Partial<typeof gradeWindowService> = {}) {
  const original = { ...evaluationService }, originalPeriods = academicPeriodsService.list, originalWindow = { ...gradeWindowService }, originalPublication = { ...bimesterPublicationService };
  Object.assign(evaluationService, { getBimesters: async () => [bimester('ABIERTO', 4), bimester('PLANIFICADO', 5), bimester('ANULADO', 6), bimester('CERRADO', 7)] });
  Object.assign(gradeWindowService, { get: async (id: number) => window_({ bimesterId: id }) }, overrides);
  Object.assign(bimesterPublicationService, { getPublication: async () => new Promise(() => {}) });
  academicPeriodsService.list = async () => [{ id: 30, name: 'Periodo 30', startDate: '2026-03-01', endDate: '2026-12-20', active: true, current: true }];
  const restoreNames = mockNames();
  const dom = withDom();
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AuthContext.Provider value={auth(role)}><VistaBimestres /></AuthContext.Provider>, { createNodeMock: () => new dom.Element() }); });
    const button = (label: string) => renderer.root.findAllByType('button').find(b => b.props['aria-label'] === label || text(b) === label);
    await run({ renderer, button, shown: () => text(renderer.root) });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(evaluationService, original); Object.assign(gradeWindowService, originalWindow); Object.assign(bimesterPublicationService, originalPublication);
    academicPeriodsService.list = originalPeriods; restoreNames(); dom.restore();
  }
}

test('bimesters view: «Plazo de notas» for every bimester except ANULADO; one panel at a time', async () => {
  await bimestersView('ADMINISTRADOR', async h => {
    for (const id of [4, 5, 7]) assert.ok(h.button(`Plazo de notas de Bimestre ${id}`), String(id));
    assert.equal(h.button('Plazo de notas de Bimestre 6'), undefined);
    await act(async () => { h.button('Publicación de Bimestre 4')!.props.onClick(); });
    assert.match(h.shown(), /Publicación · Bimestre 4/);
    await act(async () => { h.button('Plazo de notas de Bimestre 5')!.props.onClick(); });
    assert.match(h.shown(), /Plazo de notas · Bimestre 5/); assert.doesNotMatch(h.shown(), /Publicación · Bimestre 4/);
    assert.equal(h.button('Plazo de notas de Bimestre 5')?.props.disabled, true);
    assert.ok(h.button('Fijar fecha de registro')); assert.equal(h.button('Ampliar plazo'), undefined);
    await act(async () => { h.button('Cerrar panel')!.props.onClick(); });
    assert.doesNotMatch(h.shown(), /Plazo de notas · /);
  });
});

test('bimesters view: other actions stay locked while a grade window action runs', async () => {
  const pending = deferred<GradeWindow>();
  await bimestersView('ADMINISTRADOR', async h => {
    await act(async () => { h.button('Plazo de notas de Bimestre 4')!.props.onClick(); });
    await act(async () => { h.button('Ampliar plazo')!.props.onClick(); });
    await act(async () => { h.renderer.root.findByProps({ 'aria-label': 'Nueva fecha límite' }).props.onChange({ target: { value: addDays(limaToday(), 30) } }); });
    await act(async () => { h.renderer.root.findByProps({ 'aria-label': 'Motivo de la ampliación' }).props.onChange({ target: { value: 'Motivo' } }); });
    await act(async () => { h.renderer.root.findByProps({ 'aria-label': extensionForm }).props.onSubmit({ preventDefault() {} }); });
    for (const label of ['Actualizar', 'Crear bimestre', 'Abrir bimestre', 'Anular', 'Publicación de Bimestre 7', 'Plazo de notas de Bimestre 7']) assert.equal(h.button(label)?.props.disabled, true, label);
    await act(async () => { pending.resolve(window_()); });
    assert.equal(h.button('Actualizar')?.props.disabled, false);
  }, { extend: async () => pending.promise });
});

test('bimesters view: DIRECTIVO opens the grade window panel read-only', async () => {
  await bimestersView('DIRECTIVO', async h => {
    await act(async () => { h.button('Plazo de notas de Bimestre 4')!.props.onClick(); });
    assert.match(h.shown(), /Plazo de notas · Bimestre 4/); assert.match(h.shown(), /Acceso DIRECTIVO: solo lectura/);
    for (const action of actions) assert.equal(h.button(action), undefined);
  });
});
