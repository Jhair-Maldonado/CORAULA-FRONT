import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import ActividadesDocente from '../feature/docente/vistas/cursos/ActividadesDocente';
import {
  teacherActivitiesService,
  teacherActivitiesErrorMessage,
  isUncertainActivityResult,
  activityGradeEntryError,
  parseAcademicActivity
} from '../src/services/teacher/teacherActivitiesService';
import { teacherGradesService } from '../src/services/teacher/teacherGradesService';
import httpClient from '../src/services/httpClient';
import type { AcademicActivity, ActivityGrade, ActivityGradesSheet, SaveActivityGradeEntry } from '../src/types/teacherActivitiesApi';
import type { Bimester } from '../src/types/evaluationApi';

// DOC-CALIFICAR-PA-UI (#50). Axios adapters and service stubs only; no real writes.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const context = { sectionCourseId: 10, bimesterId: 1 };
const activity = (id = 1, overrides: Partial<AcademicActivity> = {}): AcademicActivity => ({ title: 'Práctica 1', description: null, type: 'PRACTICA', cuentaParaPa: true, ...context, id, createdByTeacherId: 7, status: 'PLANIFICADA', createdAt: '2026-10-10T15:00:00Z', updatedAt: null, publishedAt: null, annulledAt: null, annulledByUserId: null, annulmentReason: null, ...overrides });
const published = (id = 1) => activity(id, { status: 'PUBLICADA', publishedAt: '2026-10-11T15:00:00.123456Z' });
const annulled = (id = 1) => activity(id, { status: 'ANULADA', publishedAt: '2026-10-11T15:00:00Z', annulledAt: '2026-10-12T15:00:00Z', annulledByUserId: 7, annulmentReason: 'Duplicada' });
const bimester = (status: Bimester['status'] = 'ABIERTO'): Bimester => ({ id: 1, academicPeriodId: 30, number: 1, name: 'Bimestre 1', startDate: '2026-03-01', endDate: '2026-04-30', status });
const grade = (enrollmentId: number, value: number, version = 1): ActivityGrade => ({ id: enrollmentId * 10, activityId: 1, enrollmentId, grade: value, registeredByTeacherId: 7, registeredAt: '2026-10-12T15:00:00Z', updatedAt: '2026-10-12T15:00:00Z', version });
const sheet = (overrides: Partial<ActivityGradesSheet> = {}): ActivityGradesSheet => ({
  activity: published(),
  bimester: bimester(),
  students: [
    { enrollmentId: 1, studentId: 101, fullName: 'Ana Pérez', eligibleForPa: true, grade: null, pa: null, assignedActivities: 1, gradedActivities: 0 },
    { enrollmentId: 2, studentId: 102, fullName: 'Bruno Díaz', eligibleForPa: true, grade: grade(2, 0), pa: 0, assignedActivities: 1, gradedActivities: 1 },
    { enrollmentId: 3, studentId: 103, fullName: 'Carla Ruiz', eligibleForPa: false, grade: grade(3, 14.5, 2), pa: 15.3, assignedActivities: 3, gradedActivities: 2 }
  ],
  ...overrides
});
const coded = (status: number, code?: string) => new AxiosError('private', 'ERR', undefined, undefined, { status, data: { error: 'x', message: 'Información sensible', ...(code ? { code } : {}) } } as AxiosResponse);
const noResponse = () => new AxiosError('network', 'ERR_NETWORK');
function text(node: ReactTestInstance): string { return node.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }

async function withAdapter(handler: (config: { url?: string; method?: string; data?: unknown }) => { status: number; data: unknown }, run: (calls: { url?: string; method?: string; body: unknown }[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: { url?: string; method?: string; body: unknown }[] = [];
  httpClient.defaults.adapter = async config => {
    calls.push({ url: config.url, method: config.method, body: config.data === undefined ? undefined : JSON.parse(config.data as string) });
    const { status, data } = handler(config);
    return { config, status, statusText: 'OK', headers: {}, data };
  };
  try { await run(calls); } finally { httpClient.defaults.adapter = original; }
}

test('activity parser accepts PLANIFICADA, PUBLICADA and ANULADA with coherent publication/annulment data', () => {
  for (const a of [activity(), published(), annulled(), activity(1, { status: 'ANULADA', annulledAt: '2026-10-12T15:00:00Z', annulledByUserId: 7, annulmentReason: 'Error' })]) assert.equal(parseAcademicActivity(a, context).status, a.status);
  assert.equal(parseAcademicActivity(published(), context).publishedAt, '2026-10-11T15:00:00.123456Z');
  for (const bad of [
    { ...activity(), status: 'ACTIVA' },
    activity(1, { publishedAt: '2026-10-11T15:00:00Z' }),
    activity(1, { status: 'PUBLICADA' }),
    { ...published(), annulmentReason: 'x' },
    { ...annulled(), annulmentReason: null },
    { ...annulled(), annulmentReason: '  ' },
    { ...annulled(), annulledByUserId: 0 },
    { ...annulled(), annulledAt: 'ayer' },
    { ...activity(), publishedAt: undefined }
  ]) assert.throws(() => parseAcademicActivity(bad, context));
});

test('publish and annul call the documented routes once and verify the returned state', async () => {
  let data: unknown = published();
  await withAdapter(() => ({ status: 200, data }), async calls => {
    assert.equal((await teacherActivitiesService.publishActivity(context, 1)).status, 'PUBLICADA');
    assert.equal(calls[0].url, '/v1/teacher/courses/10/bimesters/1/activities/1/publish');
    assert.equal(calls[0].method, 'post');
    assert.deepEqual(calls[0].body, {});
    data = activity(); await assert.rejects(teacherActivitiesService.publishActivity(context, 1));
    for (const reason of ['', '   ', 'x'.repeat(1001)]) await assert.rejects(teacherActivitiesService.annulActivity(context, 1, reason));
    assert.equal(calls.length, 2);
    data = annulled();
    assert.equal((await teacherActivitiesService.annulActivity(context, 1, '  Duplicada ')).status, 'ANULADA');
    assert.equal(calls.at(-1)?.url, '/v1/teacher/courses/10/bimesters/1/activities/1/annul');
    assert.deepEqual(calls.at(-1)?.body, { reason: 'Duplicada' });
    data = published(); await assert.rejects(teacherActivitiesService.annulActivity(context, 1, 'Duplicada'));
  });
});

test('grades sheet keeps null distinct from 0, PA read-only with one decimal and rejects invalid payloads', async () => {
  let data: unknown = sheet();
  await withAdapter(() => ({ status: 200, data }), async calls => {
    const result = await teacherActivitiesService.getGradesSheet(context, 1);
    assert.equal(calls[0].url, '/v1/teacher/courses/10/bimesters/1/activities/1/grades');
    assert.equal(result.students[0].grade, null);
    assert.equal(result.students[1].grade?.grade, 0);
    assert.equal(result.students[2].pa, 15.3);
    data = sheet({ students: [] }); assert.deepEqual((await teacherActivitiesService.getGradesSheet(context, 1)).students, []);
    const base = sheet();
    for (const bad of [
      { ...base, activity: published(2) },
      { ...base, bimester: { ...bimester(), id: 2 } },
      { ...base, students: [base.students[0], base.students[0]] },
      { ...base, students: [{ ...base.students[0], pa: 15.25 }] },
      { ...base, students: [{ ...base.students[0], pa: '15.3' }] },
      { ...base, students: [{ ...base.students[1], grade: { ...grade(2, 0), grade: '0' } }] },
      { ...base, students: [{ ...base.students[1], grade: grade(2, 14.555) }] },
      { ...base, students: [{ ...base.students[1], grade: grade(2, 20.01) }] },
      { ...base, students: [{ ...base.students[1], grade: grade(9, 10) }] },
      { ...base, students: [{ ...base.students[1], gradedActivities: 5 }] },
      { ...base, students: undefined }
    ]) { data = bad; await assert.rejects(teacherActivitiesService.getGradesSheet(context, 1)); }
  });
});

test('individual PUT sends exact DTO with expectedVersion, requires reason on corrections and verifies the version', async () => {
  let data: unknown = grade(1, 14.5);
  await withAdapter(() => ({ status: 200, data }), async calls => {
    await teacherActivitiesService.saveGrade(context, 1, { enrollmentId: 1, grade: 14.5, expectedVersion: null });
    assert.equal(calls[0].url, '/v1/teacher/courses/10/bimesters/1/activities/1/grades/1');
    assert.equal(calls[0].method, 'put');
    assert.deepEqual(calls[0].body, { grade: 14.5, expectedVersion: null });
    data = grade(1, 16, 2);
    await teacherActivitiesService.saveGrade(context, 1, { enrollmentId: 1, grade: 16, expectedVersion: 1, reason: ' Revisión de rúbrica ' });
    assert.deepEqual(calls[1].body, { grade: 16, expectedVersion: 1, reason: 'Revisión de rúbrica' });
    for (const bad of [
      { enrollmentId: 1, grade: 14.555, expectedVersion: null },
      { enrollmentId: 1, grade: 21, expectedVersion: null },
      { enrollmentId: 1, grade: -1, expectedVersion: null },
      { enrollmentId: 1, grade: '14' as unknown as number, expectedVersion: null },
      { enrollmentId: 1, grade: 16, expectedVersion: 1 },
      { enrollmentId: 1, grade: 16, expectedVersion: 1, reason: '  ' },
      { enrollmentId: 1, grade: 16, expectedVersion: null, reason: 'x' },
      { enrollmentId: 0, grade: 16, expectedVersion: null }
    ]) await assert.rejects(teacherActivitiesService.saveGrade(context, 1, bad));
    assert.equal(calls.length, 2);
    data = grade(1, 16, 3); await assert.rejects(teacherActivitiesService.saveGrade(context, 1, { enrollmentId: 1, grade: 16, expectedVersion: 1, reason: 'x' }));
    data = grade(1, 16.01, 2); await assert.rejects(teacherActivitiesService.saveGrade(context, 1, { enrollmentId: 1, grade: 16, expectedVersion: 1, reason: 'x' }));
  });
});

test('batch PUT is one ordered request of 1..100 unique entries and verifies every returned grade', async () => {
  let data: unknown = [grade(1, 0), grade(3, 18, 3)];
  await withAdapter(() => ({ status: 200, data }), async calls => {
    const saved = await teacherActivitiesService.saveGrades(context, 1, [
      { enrollmentId: 3, grade: 18, expectedVersion: 2, reason: 'Revisión' },
      { enrollmentId: 1, grade: 0, expectedVersion: null }
    ]);
    assert.equal(saved.length, 2);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/v1/teacher/courses/10/bimesters/1/activities/1/grades');
    assert.deepEqual(calls[0].body, { grades: [{ enrollmentId: 1, grade: 0, expectedVersion: null }, { enrollmentId: 3, grade: 18, expectedVersion: 2, reason: 'Revisión' }] });
    const many = (n: number) => Array.from({ length: n }, (_, i): SaveActivityGradeEntry => ({ enrollmentId: i + 1, grade: 10, expectedVersion: null }));
    for (const bad of [[], many(101), [many(1)[0], many(1)[0]]]) await assert.rejects(teacherActivitiesService.saveGrades(context, 1, bad));
    assert.equal(calls.length, 1);
    data = [grade(1, 0)]; await assert.rejects(teacherActivitiesService.saveGrades(context, 1, [{ enrollmentId: 1, grade: 0, expectedVersion: null }, { enrollmentId: 3, grade: 18, expectedVersion: 2, reason: 'x' }]));
  });
});

test('client entry rules and error codes: messages by code, 401/403 by status, uncertain without response', () => {
  assert.equal(activityGradeEntryError({ enrollmentId: 1, grade: 0, expectedVersion: null }, null), null);
  assert.match(activityGradeEntryError({ enrollmentId: 1, grade: 14.5, expectedVersion: 1 }, grade(1, 14.5))!, /cambiar/);
  assert.match(activityGradeEntryError({ enrollmentId: 1, grade: 15, expectedVersion: 1 }, grade(1, 14.5))!, /motivo/);
  assert.match(activityGradeEntryError({ enrollmentId: 1, grade: 15, expectedVersion: null, reason: 'x' }, grade(1, 14.5))!, /versión/);
  assert.match(teacherActivitiesErrorMessage(coded(409, 'ACTIVITY_GRADE_STALE')), /Se recargó/);
  assert.match(teacherActivitiesErrorMessage(coded(409, 'BIMESTER_WINDOW_CLOSED')), /no está abierto/);
  assert.match(teacherActivitiesErrorMessage(coded(409, 'ACTIVITY_NOT_GRADEABLE')), /publicadas/);
  assert.match(teacherActivitiesErrorMessage(coded(403, 'ACTIVITY_GRADE_STALE')), /autorización/);
  assert.match(teacherActivitiesErrorMessage(coded(401)), /sesión/);
  assert.match(teacherActivitiesErrorMessage(coded(409, 'DESCONOCIDO')), /contexto académico cambió/);
  assert.doesNotMatch(teacherActivitiesErrorMessage(coded(400, 'ACTIVITY_REQUEST_INVALID')), /sensible/);
  assert.equal(isUncertainActivityResult(noResponse()), true);
  assert.equal(isUncertainActivityResult(coded(502)), true);
  assert.equal(isUncertainActivityResult(new Error('respuesta no verificable')), true);
  assert.equal(isUncertainActivityResult(coded(500, 'ACTIVITY_INTERNAL_ERROR')), false);
  assert.equal(isUncertainActivityResult(coded(409, 'ACTIVITY_GRADE_STALE')), false);
});

type Harness = {
  renderer: ReactTestRenderer;
  root: () => string;
  byLabel: (label: string) => ReactTestInstance;
  button: (name: string) => ReactTestInstance | undefined;
  click: (name: string) => Promise<void>;
  change: (label: string, value: string) => Promise<void>;
};
async function view(overrides: Partial<typeof teacherActivitiesService>, run: (h: Harness) => Promise<void>, bimesterStatus: Bimester['status'] = 'ABIERTO') {
  const original = { ...teacherActivitiesService }, oldBimesters = teacherGradesService.getBimesters;
  Object.assign(teacherActivitiesService, { getActivities: async () => [published()], getActivity: async () => published(), getGradesSheet: async () => sheet() }, overrides);
  teacherGradesService.getBimesters = async () => [bimester(bimesterStatus)];
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<ActividadesDocente sectionCourseId={10} />); });
    const buttons = () => renderer.root.findAllByType('button');
    const button = (name: string) => buttons().find(b => b.props['aria-label'] === name) ?? buttons().find(b => text(b) === name);
    const byLabel = (label: string) => renderer.root.findByProps({ 'aria-label': label });
    const change = async (label: string, value: string) => { await act(async () => { byLabel(label).props.onChange({ target: { value } }); }); };
    const click = async (name: string) => { const node = button(name); assert.ok(node, name); assert.equal(!!node.props.disabled, false, name); await act(async () => { node.props.onClick(); }); };
    await change('Bimestre de actividades', '1');
    await click('Ver detalle #1');
    await run({ renderer, root: () => text(renderer.root), byLabel, button, click, change });
  } finally { if (renderer) await act(async () => { renderer.unmount(); }); Object.assign(teacherActivitiesService, original); teacherGradesService.getBimesters = oldBimesters; }
}

test('UI shows every status and offers publish/annul only with the bimester ABIERTO', async () => {
  await view({ getActivities: async () => [activity(1), published(2), annulled(3)], getActivity: async () => activity(1) }, async h => {
    assert.match(h.root(), /Estado: Planificada/); assert.match(h.root(), /Estado: Publicada/); assert.match(h.root(), /Estado: Anulada/);
    assert.ok(h.button('Publicar actividad')); assert.ok(h.button('Anular actividad'));
    assert.match(h.root(), /Publica la actividad para registrar sus notas/);
  });
  for (const status of ['PLANIFICADO', 'EN_REVISION', 'CERRADO'] as const) await view({ getActivity: async () => activity(1), getActivities: async () => [activity(1)] }, async h => {
    assert.equal(h.button('Publicar actividad'), undefined); assert.equal(h.button('Anular actividad'), undefined);
    assert.match(h.root(), /requiere el bimestre abierto/);
  }, status);
  await view({ getActivity: async () => annulled(1), getActivities: async () => [annulled(1)], getGradesSheet: async () => sheet({ activity: annulled() }) }, async h => {
    assert.equal(h.button('Anular actividad'), undefined);
    assert.match(h.root(), /Motivo de anulación/); assert.match(h.root(), /Duplicada/);
    assert.match(h.root(), /Solo las actividades publicadas admiten notas/);
    assert.equal(h.renderer.root.findAllByProps({ 'aria-label': 'Nueva nota de Ana Pérez' }).length, 0);
  });
});

test('publish requires confirmation, sends once and reloads detail and list before reporting success', async () => {
  let state: AcademicActivity = activity(1), posts = 0, lists = 0;
  await view({
    getActivities: async () => { lists++; return [state]; },
    getActivity: async () => state,
    publishActivity: async () => { posts++; state = published(1); return state; }
  }, async h => {
    await h.click('Publicar actividad');
    assert.equal(posts, 0);
    await h.click('Cancelar'); assert.equal(posts, 0);
    await h.click('Publicar actividad'); await h.click('Confirmar publicación');
    assert.equal(posts, 1); assert.equal(lists, 2);
    assert.match(h.root(), /publicada y confirmada en el listado/);
    assert.match(h.root(), /Estado: Publicada/);
    assert.ok(h.renderer.root.findAllByProps({ 'aria-label': 'Notas de la actividad' }).length);
  });
});

test('annul requires a reason, keeps grades and reports codes or uncertainty after reloading', async () => {
  let reason = '';
  await view({ annulActivity: async (_c, _id, r) => { reason = r; return annulled(1); }, getActivity: async () => (reason ? annulled(1) : published(1)), getActivities: async () => [reason ? annulled(1) : published(1)] }, async h => {
    await h.click('Anular actividad');
    assert.equal(h.button('Confirmar anulación')?.props.disabled, true);
    await h.change('Motivo de anulación', '   '); assert.equal(h.button('Confirmar anulación')?.props.disabled, true);
    await h.change('Motivo de anulación', 'Duplicada'); await h.click('Confirmar anulación');
    assert.equal(reason, 'Duplicada'); assert.match(h.root(), /anulada y confirmada.*conservan/);
  });
  let calls = 0;
  await view({ getActivity: async () => activity(1), getActivities: async () => [activity(1)], publishActivity: async () => { calls++; throw coded(409, 'BIMESTER_WINDOW_CLOSED'); } }, async h => {
    await h.click('Publicar actividad'); await h.click('Confirmar publicación');
    assert.equal(calls, 1); assert.match(h.root(), /no está abierto para esta operación/); assert.doesNotMatch(h.root(), /sensible|confirmada/);
  });
  calls = 0;
  await view({ getActivity: async () => (calls ? published(1) : activity(1)), getActivities: async () => [calls ? published(1) : activity(1)], publishActivity: async () => { calls++; throw noResponse(); } }, async h => {
    await h.click('Publicar actividad'); await h.click('Confirmar publicación');
    assert.equal(calls, 1); assert.match(h.root(), /No se pudo confirmar la publicación.*sí se aplicó/);
  });
});

test('sheet renders null vs 0, version, eligibility and read-only PA; validates 0..20 with two decimals', async () => {
  let saves = 0;
  await view({ saveGrade: async () => { saves++; return grade(1, 0); } }, async h => {
    assert.match(h.root(), /Sin nota/); assert.match(h.root(), /0\.00/); assert.match(h.root(), /14\.50/); assert.match(h.root(), /15\.3/);
    assert.equal(h.renderer.root.findAllByProps({ 'aria-label': 'PA de Ana Pérez' }).length, 0);
    for (const bad of ['21', '14.555', '-1', 'abc', '20.01', '1,5']) {
      await h.change('Nueva nota de Ana Pérez', bad);
      assert.equal(h.button('Guardar nota de Ana Pérez')?.props.disabled, true, bad);
    }
    await h.change('Nueva nota de Ana Pérez', '20.00'); assert.equal(h.button('Guardar nota de Ana Pérez')?.props.disabled, false);
    await h.change('Nueva nota de Bruno Díaz', '0');
    assert.equal(h.button('Guardar nota de Bruno Díaz')?.props.disabled, true);
    assert.equal(h.button('Guardar notas en lote')?.props.disabled, true);
    assert.equal(saves, 0);
  });
});

test('individual registration and correction send expectedVersion and reason, then reload the sheet', async () => {
  const sent: SaveActivityGradeEntry[] = []; let reads = 0;
  await view({ getGradesSheet: async () => { reads++; return sheet(); }, saveGrade: async (_c, _a, e) => { sent.push(e); return grade(e.enrollmentId, e.grade, (e.expectedVersion ?? 0) + 1); } }, async h => {
    await h.change('Nueva nota de Ana Pérez', '14.5'); await h.click('Guardar nota de Ana Pérez');
    assert.deepEqual(sent[0], { enrollmentId: 1, grade: 14.5, expectedVersion: null });
    assert.equal(reads, 2); assert.match(h.root(), /Nota guardada/);
    await h.change('Nueva nota de Carla Ruiz', '16');
    assert.equal(h.button('Guardar nota de Carla Ruiz')?.props.disabled, true);
    await h.change('Motivo de corrección de Carla Ruiz', 'Revisión de rúbrica'); await h.click('Guardar nota de Carla Ruiz');
    assert.deepEqual(sent[1], { enrollmentId: 3, grade: 16, expectedVersion: 2, reason: 'Revisión de rúbrica' });
    assert.equal(h.byLabel('Nueva nota de Carla Ruiz').props.value, '');
  });
});

test('batch saves all modified rows in one atomic request; a failure reports no partial success', async () => {
  let batches: SaveActivityGradeEntry[][] = [], fail = false;
  await view({ saveGrade: async () => { throw new Error('no individual'); }, saveGrades: async (_c, _a, entries) => { batches.push(entries); if (fail) throw coded(409, 'ENROLLMENT_NOT_ELIGIBLE'); return entries.map(e => grade(e.enrollmentId, e.grade, (e.expectedVersion ?? 0) + 1)); } }, async h => {
    await h.change('Nueva nota de Ana Pérez', '11'); await h.change('Nueva nota de Bruno Díaz', '12.25'); await h.change('Motivo de corrección de Bruno Díaz', 'Recalificación');
    assert.match(text(h.button('Guardar notas en lote')!), /Guardar 2 notas en lote/);
    fail = true; await h.click('Guardar notas en lote');
    assert.equal(batches.length, 1); assert.match(h.root(), /no se guardó ninguna nota/);
    assert.equal(h.byLabel('Nueva nota de Ana Pérez').props.value, '11');
    fail = false; await h.click('Guardar notas en lote');
    assert.equal(batches.length, 2);
    assert.deepEqual(batches[1], [{ enrollmentId: 1, grade: 11, expectedVersion: null }, { enrollmentId: 2, grade: 12.25, expectedVersion: 1, reason: 'Recalificación' }]);
    assert.match(h.root(), /Lote de 2 notas guardado completo/);
  });
});

test('version conflict reloads and warns without overwriting; uncertain result never retries', async () => {
  let reads = 0, saves = 0;
  await view({ getGradesSheet: async () => { reads++; return reads === 1 ? sheet() : sheet({ students: [{ ...sheet().students[0], grade: grade(1, 9) }] }); }, saveGrade: async () => { saves++; throw coded(409, 'ACTIVITY_GRADE_STALE'); } }, async h => {
    await h.change('Nueva nota de Ana Pérez', '14'); await h.click('Guardar nota de Ana Pérez');
    assert.equal(saves, 1); assert.equal(reads, 2);
    assert.match(h.root(), /La nota cambió desde que cargaste la planilla/);
    assert.match(h.root(), /9\.00/);
    assert.equal(h.byLabel('Nueva nota de Ana Pérez').props.value, '');
  });
  reads = 0; saves = 0;
  await view({ getGradesSheet: async () => { reads++; return sheet(); }, saveGrade: async () => { saves++; throw noResponse(); } }, async h => {
    await h.change('Nueva nota de Ana Pérez', '14'); await h.click('Guardar nota de Ana Pérez');
    assert.equal(saves, 1); assert.equal(reads, 2);
    assert.match(h.root(), /No se pudo confirmar si las notas se guardaron.*no se reintentó/);
    assert.equal(h.byLabel('Nueva nota de Ana Pérez').props.value, '');
  });
});

test('sheet is read-only when the bimester is not ABIERTO and shows load errors with retry', async () => {
  await view({ getGradesSheet: async () => sheet({ bimester: bimester('EN_REVISION') }) }, async h => {
    assert.match(h.root(), /no está abierto: la planilla es de consulta/);
    assert.equal(h.renderer.root.findAllByProps({ 'aria-label': 'Nueva nota de Ana Pérez' }).length, 0);
    assert.equal(h.button('Guardar notas en lote'), undefined);
  }, 'EN_REVISION');
  let reads = 0;
  await view({ getGradesSheet: async () => { if (++reads === 1) throw coded(404, 'ACTIVITY_CONTEXT_UNAVAILABLE'); return sheet(); } }, async h => {
    assert.match(h.root(), /no está disponible para tu cuenta/);
    await h.click('Reintentar planilla');
    assert.match(h.root(), /Ana Pérez/);
  });
});
