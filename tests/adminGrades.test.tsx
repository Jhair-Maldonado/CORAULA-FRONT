import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaNotasAdmin from '../feature/admin/vistas/(academico)/notas/vistaNotasAdmin';
import { AuthContext } from '../src/contexts/AuthContext';
import { adminGradesService, correctionError, adminGradesErrorMessage } from '../src/services/admin/adminGradesService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import { evaluationService } from '../src/services/admin/evaluationService';
import httpClient from '../src/services/httpClient';
import type { CriterionGradesSheetResponse } from '../src/types/teacherGradesApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const context = { sectionCourseId: 10, courseId: 20, academicPeriodId: 30, bimesterId: 1 };
const sheet = (grade: number | null = 0, status: CriterionGradesSheetResponse['bimester']['status'] = 'EN_REVISION'):CriterionGradesSheetResponse => ({ ...context, bimester: { id: 1, academicPeriodId: 30, number: 1, name: 'Primer bimestre', startDate: '2026-03-01', endDate: '2026-04-30', status }, criteria: [{ id: 40, courseId: 20, academicPeriodId: 30, name: 'Criterio manual', description: null, order: 1, type: 'MANUAL', active: true }, { id: 41, courseId: 20, academicPeriodId: 30, name: 'Participación', description: null, order: 2, type: 'PARTICIPACION_ACADEMICA', active: true }], students: [{ enrollmentId: 50, studentId: 60, fullName: 'Estudiante', grades: [{ criterionId: 40, gradeId: grade === null ? null : 70, grade, registeredAt: grade === null ? null : '2026-10-10T12:00:00Z', updatedAt: null }] }] });
const saved = (grade = 15) => ({ id: 70, enrollmentId: 50, sectionCourseId: 10, bimesterId: 1, criterionId: 40, grade, registeredByTeacherId: 80, registeredAt: '2026-10-10T12:00:00Z', updatedAt: '2026-10-10T13:00:00Z' });
const history = { id: 1, criterionGradeId: 70, previousValue: 0, newValue: 15, reason: 'Corrección documentada', changedByUserId: 90, occurredAt: '2026-10-10T13:00:00Z' };
const httpError = (status?: number) => new AxiosError('private', 'ERR_BAD_REQUEST', undefined, undefined, status ? { status, data: { message: 'secret detail' } } as AxiosResponse : undefined);
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function text(n: ReactTestInstance): string { return n.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }

test('administrative HTTP consumer validates sheet context and sends exact PATCH expectedGrade=0', async () => {
  const original = httpClient.defaults.adapter;
  let data: unknown = sheet(), status = 200;
  const calls: { method?: string; url?: string; data: unknown }[] = [];
  httpClient.defaults.adapter = async config => { calls.push({ method: config.method, url: config.url, data: config.data }); return { config, data, status, statusText: 'OK', headers: {} }; };
  try {
    assert.equal((await adminGradesService.getSheet(context)).students[0].grades[0].grade, 0);
    assert.equal(calls[0].url, '/v1/management/section-courses/10/bimesters/1/criterion-grades');
    data = { ...sheet(), sectionCourseId: 11 }; await assert.rejects(adminGradesService.getSheet(context));
    data = saved(); await adminGradesService.correctGrade(70, { grade: 15, expectedGrade: 0, reason: ' Motivo ' });
    assert.deepEqual(calls.at(-1), { method: 'patch', url: '/v1/management/criterion-grades/70', data: JSON.stringify({ grade: 15, reason: 'Motivo', expectedGrade: 0 }) });
    const count = calls.length;
    for (const grade of [-1, 21, 1.234, NaN]) await assert.rejects(adminGradesService.correctGrade(70, { grade, expectedGrade: 0, reason: 'Motivo' }));
    await assert.rejects(adminGradesService.correctGrade(70, { grade: 0, expectedGrade: 0, reason: 'Motivo' }));
    await assert.rejects(adminGradesService.correctGrade(70, { grade: 15, expectedGrade: 0, reason: ' ' }));
    assert.equal(calls.length, count);
    data = { ...saved(), id: 71 }; await assert.rejects(adminGradesService.correctGrade(70, { grade: 15, expectedGrade: 0, reason: 'Motivo' }));
    data = saved(); status = 201; await assert.rejects(adminGradesService.correctGrade(70, { grade: 15, expectedGrade: 0, reason: 'Motivo' }));
  } finally { httpClient.defaults.adapter = original; }
  assert.equal(correctionError('20', 'Motivo', 0), null); assert.equal(correctionError('0', 'Motivo', 20), null); assert.equal(correctionError('12.25', 'Motivo', 0), null);
});

test('history GET accepts empty and complete entries, rejects wrong grade IDs and malformed values', async () => {
  const original = httpClient.defaults.adapter; let data: unknown = [];
  httpClient.defaults.adapter = async config => { assert.equal(config.url, '/v1/management/criterion-grades/70/history'); return { config, data, status: 200, statusText: 'OK', headers: {} }; };
  try {
    assert.deepEqual(await adminGradesService.getHistory(70), []); data = [history]; assert.deepEqual(await adminGradesService.getHistory(70), [history]);
    for (const bad of [{ ...history, criterionGradeId: 71 }, { ...history, previousValue: null }, { ...history, newValue: 21 }, { ...history, occurredAt: 'invalid' }, {}, { ...history, reason: '' }]) { data = [bad]; await assert.rejects(adminGradesService.getHistory(70)); }
  } finally { httpClient.defaults.adapter = original; }
});

async function view(overrides: Partial<typeof adminGradesService>, run: (h: { renderer: ReactTestRenderer; click: (name: string) => Promise<void>; button: (name: string) => ReactTestInstance | undefined; change: (label: string, value: string) => Promise<void>; submit: () => Promise<void> }) => Promise<void>, role: 'ADMINISTRADOR' | 'DIRECTIVO' = 'ADMINISTRADOR') {
  const original = { ...adminGradesService }, oldSections = sectionsService.list, oldCourses = sectionCoursesService.list, oldBimesters = evaluationService.getBimesters;
  Object.assign(adminGradesService, { getSheet: async (c: typeof context) => ({ ...sheet(), ...c, bimester: { ...sheet().bimester, id: c.bimesterId } }), correctGrade: async () => saved(), getHistory: async () => [history], getResults: async (sectionCourseId: number, bimesterId: number) => ({ sectionCourseId, bimesterId, areaId: 2, students: [{ enrollmentId: 50, studentId: 60, fullName: 'Estudiante', pa: 13.5, criteriaIndicator: 14, courseGrade: 14, courseApproved: true, areaGrade: 14, areaApproved: true, reasons: [] }] }) }, overrides);
  sectionsService.list = async () => [1, 2].map(id => ({ id, academicPeriodId: 30, level: 'PRIMARY', grade: 1, name: `Sección ${id}`, maxCapacity: 30, enrollmentOpen: false, active: true }));
  sectionCoursesService.list = async id => [10, 11].map(courseId => ({ id: courseId, sectionId: Number(id), courseId: 20, courseCode: 'MAT', courseName: `Matemática ${courseId}`, active: true, teacherId: null, teacherName: null }));
  evaluationService.getBimesters = async () => [1, 2].map(id => ({ ...sheet().bimester, id }));
  const globals = ['document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element }); Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  let renderer!: ReactTestRenderer;
  const auth: React.ContextType<typeof AuthContext> = { token: null, role, status: 'authenticated', sessionValid: true, login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  try {
    await act(async () => { renderer = create(<AuthContext.Provider value={auth}><VistaNotasAdmin /></AuthContext.Provider>, { createNodeMock: () => new Element() }); });
    const button = (name: string) => renderer.root.findAllByType('button').find(b => text(b) === name);
    const change = async (label: string, value: string) => { await act(async () => { renderer.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }); }); };
    await change('Sección', '1'); await change('Curso-sección', '10'); await change('Bimestre', '1');
    await run({ renderer, button, change, click: async name => { const node = button(name); assert.ok(node); assert.equal(!!node.props.disabled, false); await act(async () => { node.props.onClick(); }); }, submit: async () => { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); } });
  } finally { if (renderer) await act(async () => { renderer.unmount(); }); Object.assign(adminGradesService, original); sectionsService.list = oldSections; sectionCoursesService.list = oldCourses; evaluationService.getBimesters = oldBimesters; for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } }
}

test('pending cells cannot correct or view history; persisted zero is correctable and PA readonly once', async () => {
  await view({ getSheet: async () => sheet(null) }, async h => { assert.equal(h.button('Corregir Estudiante · Criterio manual'), undefined); assert.equal(h.button('Historial #70'), undefined); assert.match(text(h.renderer.root), /Pendiente/); });
  await view({}, async h => { assert.ok(h.button('Corregir Estudiante · Criterio manual')); assert.equal(h.renderer.root.findAllByType('th').filter(n => text(n) === 'PA · solo lectura').length, 1); await h.click('Corregir Estudiante · Criterio manual'); assert.match(text(h.renderer.root), /Nota actual: 0/); });
});

test('#51-A window: ADMINISTRADOR corrects only in EN_REVISION/CERRADO; ABIERTO explains that the teacher corrects', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
    for (const status of ['PLANIFICADO', 'ABIERTO', 'EN_REVISION', 'CERRADO', 'ANULADO'] as const) {
      await view({ getSheet: async () => sheet(0, status) }, async h => {
        const correctable = role === 'ADMINISTRADOR' && (status === 'EN_REVISION' || status === 'CERRADO');
        assert.equal(!!h.button('Corregir Estudiante · Criterio manual'), correctable, `${role} ${status}`);
        assert.ok(h.button('Historial #70'));
        assert.equal(/las notas las corrige el docente/.test(text(h.renderer.root)), status === 'ABIERTO', `${role} ${status}`);
        assert.equal(/Bimestre de solo lectura/.test(text(h.renderer.root)), status === 'PLANIFICADO' || status === 'ANULADO', `${role} ${status}`);
      }, role);
    }
  }
});

test('DIRECTIVO and inactive criterion remain readonly while history is available', async () => {
  await view({}, async h => { assert.equal(h.button('Corregir Estudiante · Criterio manual'), undefined); assert.match(text(h.renderer.root), /solo lectura/); await h.click('Historial #70'); assert.match(text(h.renderer.root), /0 → 15/); assert.match(text(h.renderer.root), /Usuario #90/); }, 'DIRECTIVO');
  await view({ getSheet: async () => { const s = sheet(); s.criteria[0].active = false; return s; } }, async h => { assert.equal(h.button('Corregir Estudiante · Criterio manual'), undefined); assert.match(text(h.renderer.root), /inactivo/); });
});

test('reason, change and precision validation; cancel invalidates captured submit without PATCH', async () => {
  let patches = 0;
  await view({ correctGrade: async () => { patches++; return saved(); } }, async h => {
    await h.click('Corregir Estudiante · Criterio manual'); await h.change('Nueva nota', '15'); await h.submit(); assert.equal(patches, 0);
    await h.change('Motivo', 'Motivo');
    for (const value of ['0', '-1', '21', '12.345', '']) { await h.change('Nueva nota', value); await h.submit(); }
    assert.equal(patches, 0); await h.change('Nueva nota', '15');
    const oldSubmit = h.renderer.root.findByType('form').props.onSubmit;
    await h.click('Cancelar'); await act(async () => { oldSubmit({ preventDefault() {} }); }); assert.equal(patches, 0);
  });
});

test('correction locks synchronously, uses persisted expectedGrade and confirms only a matching reload', async () => {
  const pending = deferred<ReturnType<typeof saved>>(); let patches = 0, reads = 0;
  await view({ getSheet: async () => ++reads === 1 ? sheet() : sheet(15), correctGrade: async (id, dto) => { patches++; assert.equal(id, 70); assert.deepEqual(dto, { grade: 15, reason: 'Motivo', expectedGrade: 0 }); return pending.promise; } }, async h => {
    await h.click('Corregir Estudiante · Criterio manual'); await h.change('Nueva nota', '15'); await h.change('Motivo', 'Motivo');
    const submit = h.renderer.root.findByType('form').props.onSubmit;
    await act(async () => { submit({ preventDefault() {} }); submit({ preventDefault() {} }); }); assert.equal(patches, 1); assert.equal(h.button('Actualizar planilla')?.props.disabled, true);
    assert.doesNotMatch(text(h.renderer.root), /Corrección confirmada/);
    await act(async () => { pending.resolve(saved()); }); assert.equal(reads, 2); assert.match(text(h.renderer.root), /Corrección confirmada/);
    await h.click('Corregir Estudiante · Criterio manual'); assert.match(text(h.renderer.root), /Nota actual: 15/);
  });
});

test('409 invalidates the form, reloads concurrent grade and never retries or fabricates success', async () => {
  let patches = 0, reads = 0;
  await view({ getSheet: async () => ++reads === 1 ? sheet() : sheet(17), correctGrade: async () => { patches++; throw httpError(409); } }, async h => {
    await h.click('Corregir Estudiante · Criterio manual'); await h.change('Nueva nota', '15'); await h.change('Motivo', 'Motivo'); await h.submit();
    assert.equal(patches, 1); assert.equal(reads, 2); assert.equal(h.renderer.root.findAllByType('form').length, 0); assert.match(text(h.renderer.root), /Conflicto/); assert.doesNotMatch(text(h.renderer.root), /Corrección confirmada/);
    await h.click('Corregir Estudiante · Criterio manual'); assert.match(text(h.renderer.root), /Nota actual: 17/);
  });
});

test('400/401/403/404 and network failure are sanitized and reload without automatic PATCH retry', async () => {
  for (const status of [400, 401, 403, 404, undefined]) {
    let reads = 0, patches = 0;
    await view({ getSheet: async () => { reads++; return sheet(); }, correctGrade: async () => { patches++; throw httpError(status); } }, async h => {
      await h.click('Corregir Estudiante · Criterio manual'); await h.change('Nueva nota', '15'); await h.change('Motivo', 'Motivo'); await h.submit();
      assert.equal(patches, 1); assert.equal(reads, 2); assert.ok(text(h.renderer.root).includes(adminGradesErrorMessage(httpError(status)))); assert.doesNotMatch(text(h.renderer.root), /secret detail|Corrección confirmada/);
    });
  }
});

test('accepted or ambiguous PATCH with failed/inconsistent reload requires refresh and never reports success', async () => {
  for (const fail of [true, false]) {
    let reads = 0;
    await view({ getSheet: async () => { reads++; if (reads === 2 && fail) throw httpError(); return reads > 2 ? sheet(15) : sheet(); } }, async h => {
      await h.click('Corregir Estudiante · Criterio manual'); await h.change('Nueva nota', '15'); await h.change('Motivo', 'Motivo'); await h.submit();
      assert.equal(h.button('Corregir Estudiante · Criterio manual')?.props.disabled, true); assert.doesNotMatch(text(h.renderer.root), /Corrección confirmada/);
      await h.click('Actualizar planilla'); assert.equal(h.button('Corregir Estudiante · Criterio manual')?.props.disabled, false);
    });
  }
});

test('context changes invalidate stale submits and ignore late PATCH and GET responses', async () => {
  for (const selector of ['Sección', 'Curso-sección', 'Bimestre']) {
    let patches = 0; const pending = deferred<ReturnType<typeof saved>>();
    await view({ correctGrade: async () => { patches++; return pending.promise; } }, async h => {
      await h.click('Corregir Estudiante · Criterio manual'); await h.change('Nueva nota', '15'); await h.change('Motivo', 'Motivo');
      const submit = h.renderer.root.findByType('form').props.onSubmit;
      if (selector === 'Bimestre') {
        const change = h.renderer.root.findByProps({ 'aria-label': selector }).props.onChange;
        await act(async () => { change({ target: { value: '2' } }); submit({ preventDefault() {} }); }); assert.equal(patches, 0);
      } else {
        await h.submit(); await h.change(selector, selector === 'Sección' ? '2' : '11');
        await act(async () => { pending.resolve(saved()); }); assert.equal(patches, 1); assert.doesNotMatch(text(h.renderer.root), /Corrección confirmada/);
      }
    });
  }
});

test('empty and failed history support retry without fabricated entries', async () => {
  let reads = 0;
  await view({ getHistory: async () => { if (++reads === 1) throw httpError(404); return []; } }, async h => { await h.click('Historial #70'); assert.match(text(h.renderer.root), /no está disponible/); await h.click('Reintentar'); assert.match(text(h.renderer.root), /No hay correcciones registradas/); });
  await view({ getSheet: async () => ({ ...sheet(), students: [], criteria: [] }) }, async h => { assert.match(text(h.renderer.root), /No hay matrículas activas/); assert.match(text(h.renderer.root), /No hay criterios MANUAL/); });
});

test('selectors use real section period/course IDs and discard delayed reads from another context', async () => {
  const pending = deferred<CriterionGradesSheetResponse>();
  const contexts: typeof context[] = [];
  await view({ getSheet: async c => {
    contexts.push(c);
    if (c.sectionCourseId === 10 && c.bimesterId === 1) return pending.promise;
    return { ...sheet(18), ...c, bimester: { ...sheet().bimester, id: c.bimesterId } };
  } }, async h => {
    assert.deepEqual(contexts[0], context);
    await h.change('Curso-sección', '11'); assert.equal(contexts.at(-1)?.sectionCourseId, 11);
    await h.change('Bimestre', '2'); assert.equal(contexts.at(-1)?.bimesterId, 2);
    const stale = sheet(); stale.students[0].fullName = 'OBSOLETE STUDENT';
    await act(async () => { pending.resolve(stale); }); assert.doesNotMatch(text(h.renderer.root), /OBSOLETE STUDENT/);
    await h.change('Sección', '2'); assert.equal(h.renderer.root.findAllByType('table').length, 0);
  });
});

test('manual columns are dynamic beyond five and stale history cannot appear in another bimester', async () => {
  const pending = deferred<typeof history[]>();
  await view({ getHistory: async () => pending.promise, getSheet: async c => {
    const s = sheet(); s.bimester.id = c.bimesterId;
    for (let i = 1; i < 8; i++) {
      s.criteria.push({ ...s.criteria[0], id: 100 + i, name: `Manual ${i}`, order: 2 + i });
      s.students[0].grades.push({ criterionId: 100 + i, gradeId: null, grade: null, registeredAt: null, updatedAt: null });
    }
    return s;
  } }, async h => {
    assert.equal(h.renderer.root.findAllByType('thead')[0].findAllByType('th').length, 10);
    await h.click('Historial #70'); await h.change('Bimestre', '2');
    await act(async () => { pending.resolve([{ ...history, reason: 'OBSOLETE HISTORY' }]); });
    assert.doesNotMatch(text(h.renderer.root), /OBSOLETE HISTORY/);
  });
});

test('ADMINISTRADOR and DIRECTIVO see #45 results read-only, reloaded after an accepted correction', async () => {
  for (const role of ['ADMINISTRADOR', 'DIRECTIVO'] as const) {
    const calls: number[][] = [];
    await view({ getResults: async (sectionCourseId: number, bimesterId: number) => { calls.push([sectionCourseId, bimesterId]); return { sectionCourseId, bimesterId, areaId: 2, students: [] }; } }, async h => {
      assert.match(text(h.renderer.root), /Resultados del bimestre/);
      assert.match(text(h.renderer.root), /Calculado, aún no publicado/);
      assert.deepEqual(calls, [[10, 1]]);
      await h.click('Actualizar resultados'); assert.equal(calls.length, 2);
      if (role === 'ADMINISTRADOR') {
        await h.click('Corregir Estudiante · Criterio manual');
        await h.change('Nueva nota', '15'); await h.change('Motivo', 'Corrección documentada');
        await h.submit();
        assert.equal(calls.length, 3);
      }
    }, role);
  }
  await view({ getResults: async () => { throw new AxiosError('x', 'ERR', undefined, undefined, { status: 403, data: {} } as AxiosResponse); } }, async h => {
    assert.match(text(h.renderer.root), /No tienes permiso para consultar los resultados/);
    assert.ok(h.button('Reintentar resultados'));
  }, 'DIRECTIVO');
});

test('reason: trimmed 1000 characters accepted, 1001 rejected in the UI without PATCH, with a visible counter', async () => {
  assert.equal(correctionError('15', 'm'.repeat(1000), 0), null);
  assert.equal(correctionError('15', `  ${'m'.repeat(1000)}  `, 0), null);
  assert.match(correctionError('15', 'm'.repeat(1001), 0)!, /1000 caracteres/);
  await assert.rejects(adminGradesService.correctGrade(70, { grade: 15, expectedGrade: 0, reason: 'm'.repeat(1001) }), /1000 caracteres/);
  const sent: string[] = [];
  await view({ correctGrade: async (_id, dto) => { sent.push(dto.reason); return saved(); } }, async h => {
    await h.click('Corregir Estudiante · Criterio manual');
    assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Motivo' }).props.maxLength, 1000);
    await h.change('Nueva nota', '15'); await h.change('Motivo', 'm'.repeat(1001)); await h.submit();
    assert.deepEqual(sent, []); assert.match(text(h.renderer.root), /1001\/1000/);
    await h.change('Motivo', 'm'.repeat(1000)); await h.submit();
    assert.equal(sent.length, 1);
  });
});

test('coded PATCH errors show the catalog text only with their contract status; one PATCH, sheet reload, no results reload', async () => {
  const coded = (status: number, code: string) => new AxiosError('private', 'ERR', undefined, undefined, { status, data: { error: 'X', message: 'secret detail', code } } as AxiosResponse);
  const cases: [number, string, RegExp | string][] = [
    [409, 'BIMESTER_STATE_CONFLICT', /El bimestre o la nota cambiaron\. Se recargó la planilla/],
    [409, 'GRADE_CHANGED_CONCURRENTLY', /Otra persona cambió esta nota/],
    [409, 'STRUCTURE_FROZEN', /congelada por una publicación/],
    [400, 'REASON_REQUIRED', /Indica el motivo de la corrección \(obligatorio/],
    [404, 'RESOURCE_NOT_FOUND', /La nota o su contexto ya no está disponible\. Se recargó/],
    [400, 'VALIDATION_ERROR', adminGradesErrorMessage(httpError(400))],
    [409, 'UNKNOWN_CODE', adminGradesErrorMessage(httpError(409))],
    [400, 'GRADE_CHANGED_CONCURRENTLY', adminGradesErrorMessage(httpError(400))],
    [500, 'INTERNAL_ERROR', adminGradesErrorMessage(httpError(500))],
  ];
  for (const [status, code, expected] of cases) {
    let patches = 0, reads = 0, results = 0;
    await view({ getSheet: async () => { reads++; return sheet(); }, getResults: async (sectionCourseId: number, bimesterId: number) => { results++; return { sectionCourseId, bimesterId, areaId: 2, students: [] }; }, correctGrade: async () => { patches++; throw coded(status, code); } }, async h => {
      await h.click('Corregir Estudiante · Criterio manual'); await h.change('Nueva nota', '15'); await h.change('Motivo', 'Motivo'); await h.submit();
      const shown = text(h.renderer.root);
      assert.equal(patches, 1, code); assert.equal(reads, 2, code); assert.equal(results, 1, code);
      if (typeof expected === 'string') assert.ok(shown.includes(expected), `${status} ${code}`); else assert.match(shown, expected, `${status} ${code}`);
      assert.doesNotMatch(shown, /secret detail|Corrección confirmada/);
    });
  }
});
