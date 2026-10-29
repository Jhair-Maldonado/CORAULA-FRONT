import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import { useTeacherGrades } from '../src/hooks/useTeacherGrades';
import { teacherGradesService, teacherGradesErrorMessage } from '../src/services/teacher/teacherGradesService';
import httpClient from '../src/services/httpClient';
import { canEnterFirstGrade } from '../src/lib/manualGrades';
import type { CriterionGradesSheetResponse, CriterionGradeResponse } from '../src/types/teacherGradesApi';

// Component/unit evidence only. No real HTTP server, user or database is used.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const context = { sectionCourseId: 10, courseId: 20, bimesterId: 40, academicPeriodId: 30 };
function sheet(bimesterId = 40, sectionCourseId = 10): CriterionGradesSheetResponse {
  return {
    ...context, sectionCourseId,
    bimester: { id: bimesterId, academicPeriodId: 30, number: 1, name: 'Prueba', startDate: '2026-01-01', endDate: '2026-03-01', status: 'ABIERTO' },
    criteria: [{ id: 1, courseId: 20, academicPeriodId: 30, name: 'Manual', description: null, order: 1, type: 'MANUAL', active: true }, { id: 2, courseId: 20, academicPeriodId: 30, name: 'PA', description: null, order: 2, type: 'PARTICIPACION_ACADEMICA', active: true }],
    students: [{ enrollmentId: 100, studentId: 200, fullName: 'Alumno de prueba', grades: [{ criterionId: 1, gradeId: null, grade: null, registeredAt: null, updatedAt: null }] }],
  };
}
const registered = (grade = 0): CriterionGradeResponse => ({ id: 500, enrollmentId: 100, sectionCourseId: 10, bimesterId: 40, criterionId: 1, grade, registeredByTeacherId: 300, registeredAt: '2026-10-10T12:00:00Z', updatedAt: null });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
async function harness(sectionId = 10) {
  let latest!: ReturnType<typeof useTeacherGrades>;
  function Host({ id }: { id: number }) { latest = useTeacherGrades(id, 20); return null; }
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<Host key={sectionId} id={sectionId} />); });
  return {
    get current() { return latest; },
    async select(id = '40') { await act(async () => { latest.selectBimester(id); }); },
    async draft(value: string) { await act(async () => { latest.changeDraft(100, 1, value); }); },
    async changeCourse(id: number) { await act(async () => { renderer.update(<Host key={id} id={id} />); }); },
    async unmount() { await act(async () => { renderer.unmount(); }); },
  };
}
async function withService(overrides: Partial<typeof teacherGradesService>, run: () => Promise<void>) {
  const original = { ...teacherGradesService };
  Object.assign(teacherGradesService, {
    getBimesters: async () => [sheet(40).bimester, sheet(41).bimester],
    getSheet: async (c: typeof context) => sheet(c.bimesterId, c.sectionCourseId),
    registerGrade: async () => registered(),
  }, overrides);
  try { await run(); } finally { Object.assign(teacherGradesService, original); }
}

test('real hook prevents repeated clicks, reloads zero, and a fresh mount reads a readonly persisted cell', async () => {
  const stored = sheet(), pending = deferred<CriterionGradeResponse>();
  let posts = 0, reads = 0;
  await withService({ getSheet: async () => { reads++; return structuredClone(stored); }, registerGrade: async () => { posts++; return pending.promise; } }, async () => {
    const h = await harness();
    try {
      await h.select(); await h.draft('0');
      let first!: Promise<void>, second!: Promise<void>;
      await act(async () => { first = h.current.save(); second = h.current.save(); });
      assert.equal(posts, 1); assert.equal(h.current.saving, true);
      assert.equal(h.current.drafts['100:1'], '0');
      await act(async () => { h.current.selectBimester('41'); });
      assert.equal(h.current.selectedBimesterId, '40', 'selection locked during POST');
      stored.students[0].grades[0] = { criterionId: 1, gradeId: 500, grade: 0, registeredAt: registered().registeredAt, updatedAt: null };
      await act(async () => { pending.resolve(registered()); await Promise.all([first, second]); });
      assert.equal(posts, 1); assert.equal(reads, 2);
      assert.equal(h.current.evaluation?.records[0].grades[1], 0);
      assert.deepEqual(h.current.drafts, {}); assert.match(h.current.saveMessage ?? '', /registraron 1/);
      assert.equal(h.current.refreshRequired, false);
    } finally { await h.unmount(); }
    const reloaded = await harness();
    try {
      await reloaded.select();
      const data = reloaded.current.evaluation!;
      assert.equal(data.records[0].grades[1], 0);
      assert.equal(canEnterFirstGrade(reloaded.current.bimester, data.configuration.criteria[0], data.records[0]), false);
    } finally { await reloaded.unmount(); }
  });
});

test('changing bimester invalidates stale save callbacks before render and ignores late GETs', async () => {
  const oldRead = deferred<CriterionGradesSheetResponse>();
  let reads = 0, posts = 0;
  await withService({ getSheet: async c => ++reads === 2 ? oldRead.promise : sheet(c.bimesterId), registerGrade: async () => { posts++; return registered(); } }, async () => {
    const h = await harness();
    try {
      await h.select(); await h.draft('15');
      const oldSave = h.current.save;
      await act(async () => { h.current.selectBimester('41'); await oldSave(); });
      assert.equal(posts, 0); assert.equal(typeof h.current.evaluation, 'undefined');
      await h.select('40');
      await act(async () => { oldRead.resolve(sheet(41)); await oldRead.promise; });
      assert.equal(h.current.evaluation?.bimesterId, 40);
      assert.deepEqual(h.current.drafts, {});
      await act(async () => { await oldSave(); });
      assert.equal(posts, 0);
    } finally { await h.unmount(); }
  });
});

test('course remount aborts obsolete reads and ignores late results', async () => {
  const oldRead = deferred<CriterionGradesSheetResponse>();
  const pending = deferred<CriterionGradeResponse>();
  let posts = 0;
  let oldSignal: AbortSignal | undefined;
  await withService({
    getSheet: async (c, signal) => { if (c.sectionCourseId === 10) { oldSignal = signal; return oldRead.promise; } return sheet(c.bimesterId, 11); },
    registerGrade: async () => { posts++; return pending.promise; },
  }, async () => {
    const h = await harness();
    try {
      await h.select(); await h.changeCourse(11);
      assert.equal(oldSignal?.aborted, true);
      await h.select();
      await act(async () => { oldRead.resolve(sheet()); await oldRead.promise; });
      assert.equal(h.current.evaluation?.sectionCourseId, 11);
      assert.equal(posts, 0);
    } finally { await h.unmount(); }
  });
});

test('unmount during POST stops the remaining cells and cannot update the next course', async () => {
  const pending = deferred<CriterionGradeResponse>();
  let posts = 0;
  await withService({
    getSheet: async c => {
      const result = sheet(c.bimesterId, c.sectionCourseId);
      result.criteria.push({ ...result.criteria[0], id: 3, name: 'Segundo manual', order: 3 });
      result.students[0].grades.push({ criterionId: 3, gradeId: null, grade: null, registeredAt: null, updatedAt: null });
      return result;
    },
    registerGrade: async () => { posts++; return pending.promise; },
  }, async () => {
    const h = await harness();
    try {
      await h.select(); await h.draft('15');
      await act(async () => { h.current.changeDraft(100, 3, '16'); });
      let saving!: Promise<void>;
      await act(async () => { saving = h.current.save(); });
      await h.changeCourse(11); await h.select();
      await act(async () => { pending.resolve(registered(15)); await saving; });
      assert.equal(posts, 1);
      assert.equal(h.current.evaluation?.sectionCourseId, 11);
      assert.equal(h.current.saveMessage, null); assert.equal(h.current.saveError, null);
    } finally { await h.unmount(); }
  });
});

test('hook displays 409 without success or automatic retry; failed reload blocks another save', async () => {
  for (const status of [409, 401, 403, 400]) {
    let posts = 0, reads = 0;
    await withService({ getSheet: async () => { if (++reads === 2) throw new Error('offline'); return sheet(); }, registerGrade: async () => { posts++; throw new AxiosError('HTTP', 'ERR_BAD_REQUEST', undefined, undefined, { status, data: { message: 'Detalle de prueba' } } as AxiosResponse); } }, async () => {
      const h = await harness();
      try {
        await h.select(); await h.draft('15');
        await act(async () => { await h.current.save(); });
        assert.equal(reads, 2); assert.equal(posts, 1); assert.equal(h.current.saveMessage, null);
        assert.equal(h.current.refreshRequired, true);
        assert.match(h.current.saveError ?? '', status === 409 ? /Conflicto/ : status === 401 ? /sesión/ : status === 403 ? /permiso/ : /Detalle/);
        await act(async () => { await h.current.save(); });
        assert.equal(posts, 1);
        await act(async () => { h.current.refreshSheet(); });
        assert.equal(h.current.refreshRequired, false);
      } finally { await h.unmount(); }
    });
  }
});

test('HTTP acceptance without a matching grade in the reload never produces a success message', async () => {
  await withService({}, async () => {
    const h = await harness();
    try {
      await h.select(); await h.draft('15');
      await act(async () => { await h.current.save(); });
      assert.equal(h.current.saveMessage, null);
      assert.equal(h.current.refreshRequired, true);
      assert.match(h.current.saveError ?? '', /confirmar/);
    } finally { await h.unmount(); }
  });
});

test('service POST uses exactly three DTO keys and validates the authoritative response', async () => {
  const adapter = httpClient.defaults.adapter;
  const sent: { url?: string; body: unknown }[] = [];
  httpClient.defaults.adapter = (async config => {
    sent.push({ url: config.url, body: JSON.parse(config.data) });
    return { config, status: 201, statusText: 'Created', headers: {}, data: registered(20) };
  }) satisfies AxiosAdapter;
  try {
    const result = await teacherGradesService.registerGrade(10, 40, { enrollmentId: 100, criterionId: 1, grade: 20 });
    assert.equal(result.grade, 20);
    assert.deepEqual(sent, [{ url: '/v1/teacher/courses/10/bimesters/40/criterion-grades', body: { enrollmentId: 100, criterionId: 1, grade: 20 } }]);
    await assert.rejects(teacherGradesService.registerGrade(10, 40, { enrollmentId: 100, criterionId: 1, grade: 20.001 }));
    assert.equal(sent.length, 1);
    httpClient.defaults.adapter = async config => ({ config, status: 201, statusText: 'Created', headers: {}, data: { ...registered(20), sectionCourseId: 11 } });
    await assert.rejects(teacherGradesService.registerGrade(10, 40, { enrollmentId: 100, criterionId: 1, grade: 20 }), /contexto distinto/);
  } finally { httpClient.defaults.adapter = adapter; }
});

test('service preserves the global authenticated 401 event and sanitizes 403 messaging', async () => {
  const adapter = httpClient.defaults.adapter;
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let event = '';
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent: (e: Event) => { event = e.type; } } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
  httpClient.defaults.adapter = async config => { throw new AxiosError('401', 'ERR_BAD_REQUEST', config, undefined, { config, status: 401, statusText: 'Unauthorized', headers: {}, data: {} }); };
  // Explicit test header avoids localStorage; the normal browser interceptor is unchanged.
  const previousHeaders = httpClient.defaults.headers.common.Authorization;
  httpClient.defaults.headers.common.Authorization = 'Bearer test-only';
  try {
    await assert.rejects(teacherGradesService.getBimesters(10), error => {
      assert.match(teacherGradesErrorMessage(error), /sesión/); return true;
    });
    assert.equal(event, 'auth:unauthorized');
    assert.doesNotMatch(teacherGradesErrorMessage(new AxiosError('403', 'ERR_BAD_REQUEST', undefined, undefined, { status: 403, data: { message: 'Información interna' } } as AxiosResponse)), /Información interna/);
  } finally {
    httpClient.defaults.adapter = adapter;
    if (previousHeaders === undefined) delete httpClient.defaults.headers.common.Authorization;
    else httpClient.defaults.headers.common.Authorization = previousHeaders;
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

const annulled = (id: number) => ({ ...sheet(id).bimester, status: 'ANULADO' as const });

test('an ANULADO bimester (#43) is listed but cannot be selected', async () => {
  let reads = 0;
  await withService({ getBimesters: async () => [sheet(40).bimester, annulled(41)], getSheet: async c => { reads++; return sheet(c.bimesterId); } }, async () => {
    const h = await harness();
    try {
      assert.deepEqual(h.current.bimesters.map(b => b.status), ['ABIERTO', 'ANULADO']);
      await h.select('41');
      assert.equal(h.current.selectedBimesterId, ''); assert.equal(reads, 0);
      await h.select('40');
      assert.equal(h.current.selectedBimesterId, '40'); assert.equal(reads, 1);
    } finally { await h.unmount(); }
  });
});

test('a sheet reload that finds the selected bimester ANULADO clears selection and drafts with a notice', async () => {
  let status: 'ABIERTO' | 'ANULADO' = 'ABIERTO';
  await withService({ getSheet: async c => ({ ...sheet(c.bimesterId), bimester: { ...sheet(c.bimesterId).bimester, status: c.bimesterId === 40 ? status : 'ABIERTO' } }) }, async () => {
    const h = await harness();
    try {
      await h.select(); await h.draft('15');
      assert.equal(h.current.drafts['100:1'], '15'); assert.ok(h.current.evaluation);
      status = 'ANULADO';
      await act(async () => { h.current.refreshSheet(); });
      assert.equal(h.current.selectedBimesterId, '');
      assert.deepEqual(h.current.drafts, {});
      assert.equal(h.current.evaluation, undefined);
      assert.match(h.current.annulledNotice ?? '', /Prueba fue anulado/);
      assert.equal(h.current.bimesters.find(b => b.id === 40)?.status, 'ANULADO', 'list marks it so the selector disables it');
      await h.select('40');
      assert.equal(h.current.selectedBimesterId, '');
      await h.select('41');
      assert.equal(h.current.selectedBimesterId, '41'); assert.equal(h.current.annulledNotice, null);
    } finally { await h.unmount(); }
  });
});

test('a post-save reload that finds the bimester ANULADO never confirms grades and clears the context', async () => {
  let reads = 0;
  await withService({ getSheet: async c => { reads++; return reads === 1 ? sheet(c.bimesterId) : { ...sheet(c.bimesterId), bimester: annulled(c.bimesterId) }; } }, async () => {
    const h = await harness();
    try {
      await h.select(); await h.draft('15');
      await act(async () => { await h.current.save(); });
      assert.equal(h.current.saving, false); assert.equal(h.current.saveMessage, null);
      assert.match(h.current.saveError ?? '', /no se revierten/);
      assert.equal(h.current.selectedBimesterId, ''); assert.deepEqual(h.current.drafts, {});
      assert.match(h.current.annulledNotice ?? '', /anulado/);
    } finally { await h.unmount(); }
  });
});

test('resultsRevision (#45) advances on sheet reads and after a save with accepted grades', async () => {
  await withService({ getSheet: async () => sheet() }, async () => {
    const h = await harness();
    try {
      const initial = h.current.resultsRevision;
      await h.select();
      const afterRead = h.current.resultsRevision;
      assert.ok(afterRead > initial);
      await h.draft('15');
      await act(async () => { await h.current.save(); });
      assert.equal(h.current.resultsRevision, afterRead + 1, 'accepted grade bumps results even when the reload does not confirm it');
    } finally { await h.unmount(); }
  });
});
