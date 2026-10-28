import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import ResultadosBimestre from '../src/components/evaluation/ResultadosBimestre';
import { parseEvaluationResultsResponse, evaluationResultReasonLabel, evaluationResultsErrorMessage } from '../src/lib/evaluationResultsContract';
import { teacherGradesService } from '../src/services/teacher/teacherGradesService';
import { adminGradesService } from '../src/services/admin/adminGradesService';
import httpClient from '../src/services/httpClient';
import type { EvaluationResultsResponse } from '../src/types/evaluationResultsApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const expected = { sectionCourseId: 10, bimesterId: 4 };
const row = (overrides: Record<string, unknown> = {}) => ({ enrollmentId: 101, studentId: 81, fullName: 'Alumno Ejemplo', pa: 12.9, criteriaIndicator: 12.4, courseGrade: 12, courseApproved: true, areaGrade: 12, areaApproved: true, reasons: [], courseEvidence: {}, areaEvidence: {}, ...overrides });
const pending = (overrides: Record<string, unknown> = {}) => row({ pa: null, criteriaIndicator: null, courseGrade: null, courseApproved: null, areaGrade: null, areaApproved: null, reasons: ['MISSING_MANUAL_GRADE:40', 'PA_UNAVAILABLE', 'AREA_INCOMPLETE'], ...overrides });
const body = (...students: unknown[]) => ({ ...expected, areaId: 2, students });
const httpError = (status?: number) => new AxiosError('private', 'ERR_BAD_REQUEST', undefined, undefined, status ? { status, data: { error: 'x', message: 'secret detail' } } as AxiosResponse : undefined);
function text(n: ReactTestInstance): string { return n.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }

test('parser accepts publishable, pending and zero rows and keeps null distinct from zero', () => {
  const parsed = parseEvaluationResultsResponse(body(row(), pending({ enrollmentId: 102 }), row({ enrollmentId: 103, pa: 0, criteriaIndicator: 0, courseGrade: 0, courseApproved: false, areaGrade: 0, areaApproved: false })), expected);
  assert.equal(parsed.students[0].courseGrade, 12);
  assert.equal(parsed.students[1].courseGrade, null); assert.equal(parsed.students[1].courseApproved, null);
  assert.equal(parsed.students[2].courseGrade, 0); assert.equal(parsed.students[2].courseApproved, false);
  assert.equal('courseEvidence' in parsed.students[0], false);
  assert.deepEqual(parseEvaluationResultsResponse(body(), expected).students, []);
  // A course with grade but incomplete area is valid.
  assert.equal(parseEvaluationResultsResponse(body(row({ areaGrade: null, areaApproved: null, reasons: ['AREA_INCOMPLETE'] })), expected).students[0].areaGrade, null);
});

test('approval must follow the 11 threshold for course and area', () => {
  assert.equal(parseEvaluationResultsResponse(body(row({ courseGrade: 11, courseApproved: true, areaGrade: 11 })), expected).students[0].courseApproved, true);
  assert.equal(parseEvaluationResultsResponse(body(row({ courseGrade: 10, courseApproved: false, areaGrade: 10, areaApproved: false })), expected).students[0].courseApproved, false);
  for (const bad of [row({ courseGrade: 10, courseApproved: true }), row({ courseGrade: 11, courseApproved: false }), row({ areaGrade: 10, areaApproved: true }), row({ courseApproved: null }), pending({ courseApproved: false })])
    assert.throws(() => parseEvaluationResultsResponse(body(bad), expected));
});

test('parser rejects malformed values, broken invariants and foreign context', () => {
  const bad = [
    row({ courseGrade: 12.5 }), row({ courseGrade: 21 }), row({ pa: 12.95 }), row({ pa: -1 }), row({ criteriaIndicator: 12.345 }), row({ courseGrade: '12' }),
    row({ reasons: ['UNKNOWN'] }), row({ reasons: ['MISSING_MANUAL_GRADE:0'] }), pending({ reasons: ['PA_UNAVAILABLE', 'PA_UNAVAILABLE', 'AREA_INCOMPLETE'] }),
    row({ reasons: ['PA_UNAVAILABLE'] }), pending({ reasons: ['AREA_INCOMPLETE'] }), row({ pa: null }), pending({ areaGrade: 12, areaApproved: true, reasons: ['PA_UNAVAILABLE'] }),
    pending({ criteriaIndicator: 12 }), row({ criteriaIndicator: null }), row({ fullName: ' ' }), row({ enrollmentId: 0 }), row({ courseEvidence: undefined }), row({ reasons: undefined }),
  ];
  for (const value of bad) assert.throws(() => parseEvaluationResultsResponse(body(value), expected), /contrato #45/);
  assert.throws(() => parseEvaluationResultsResponse(body(row(), row()), expected));
  assert.throws(() => parseEvaluationResultsResponse({ ...body(row()), sectionCourseId: 11 }, expected));
  assert.throws(() => parseEvaluationResultsResponse({ ...body(row()), bimesterId: 5 }, expected));
  assert.throws(() => parseEvaluationResultsResponse({ ...body(row()), areaId: null }, expected));
  assert.throws(() => parseEvaluationResultsResponse({ ...expected, areaId: 2 }, expected));
  assert.throws(() => parseEvaluationResultsResponse(null, expected));
});

test('teacher and management services call the documented routes and validate the response', async () => {
  const original = httpClient.defaults.adapter;
  const urls: (string | undefined)[] = [];
  let data: unknown = body(row()), status = 200;
  httpClient.defaults.adapter = async config => { urls.push(config.url); return { config, data, status, statusText: 'OK', headers: {} }; };
  try {
    assert.equal((await teacherGradesService.getResults(10, 4)).students.length, 1);
    assert.equal((await adminGradesService.getResults(10, 4)).students.length, 1);
    assert.deepEqual(urls, ['/v1/teacher/courses/10/bimesters/4/results', '/v1/management/section-courses/10/bimesters/4/results']);
    data = { ...body(row()), sectionCourseId: 99 };
    await assert.rejects(teacherGradesService.getResults(10, 4)); await assert.rejects(adminGradesService.getResults(10, 4));
    data = body(row()); status = 204; await assert.rejects(adminGradesService.getResults(10, 4));
    await assert.rejects(adminGradesService.getResults(0, 4)); assert.equal(urls.length, 5);
  } finally { httpClient.defaults.adapter = original; }
});

test('error messages map status codes without echoing server details', () => {
  assert.match(evaluationResultsErrorMessage(httpError(400)), /no es válido/);
  assert.match(evaluationResultsErrorMessage(httpError(401)), /sesión/);
  assert.match(evaluationResultsErrorMessage(httpError(403)), /permiso/);
  assert.match(evaluationResultsErrorMessage(httpError(404)), /no están disponibles/);
  assert.match(evaluationResultsErrorMessage(httpError()), /conectar/);
  for (const status of [400, 403, 404, 500]) assert.doesNotMatch(evaluationResultsErrorMessage(httpError(status)), /secret/);
  assert.match(evaluationResultsErrorMessage(new Error('La respuesta de resultados no coincide')), /no coincide/);
  assert.equal(evaluationResultReasonLabel('MISSING_MANUAL_GRADE:40', id => id === 40 ? 'Expresión oral' : undefined), 'Falta la nota MANUAL de «Expresión oral»');
  assert.match(evaluationResultReasonLabel('MISSING_MANUAL_GRADE:41'), /criterio #41/);
});

async function render(load: (signal: AbortSignal) => Promise<EvaluationResultsResponse>, run: (r: ReactTestRenderer) => Promise<void>, reloadKey: number = 0) {
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<ResultadosBimestre load={load} reloadKey={reloadKey} criterionName={id => id === 40 ? 'Expresión oral' : undefined} />); });
    await run(renderer);
  } finally { if (renderer) await act(async () => { renderer.unmount(); }); }
}

test('publication note: neutral without data, not published without publishedAt, published with date and revision', async () => {
  const data = parseEvaluationResultsResponse(body(row()), expected);
  const notes: string[] = [];
  for (const publication of [undefined, { publishedAt: null, revision: 0 }, { publishedAt: '2026-04-30T18:00:00Z', revision: 2 }]) {
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<ResultadosBimestre load={async () => data} publication={publication} />); });
    notes.push(text(renderer.root.findByProps({ role: 'note' })));
    await act(async () => { renderer.unmount(); });
  }
  assert.equal(notes[0], 'Calculado desde las notas actuales.');
  assert.match(notes[1], /Calculado, aún no publicado/);
  assert.match(notes[2], /^Publicado el 30 abr\. 2026.* · revisión 2\./);
  assert.doesNotMatch(notes[0] + notes[2], /no publicado/);
});

test('table shows PA with one decimal, integer grade, threshold status and the neutral notice for teacher views', async () => {
  const data = parseEvaluationResultsResponse(body(row(), row({ enrollmentId: 102, fullName: 'Alumno Diez', pa: 10, courseGrade: 10, courseApproved: false, areaGrade: 10, areaApproved: false }), row({ enrollmentId: 103, fullName: 'Alumno Cero', pa: 0, criteriaIndicator: 0, courseGrade: 0, courseApproved: false, areaGrade: 0, areaApproved: false })), expected);
  await render(async () => data, async r => {
    const all = text(r.root);
    assert.match(all, /Calculado desde las notas actuales\./);
    assert.doesNotMatch(all, /no publicado/);
    const rows = r.root.findAllByType('tr').slice(1).map(text);
    assert.match(rows[0], /Alumno Ejemplo12\.912\.4012Aprobado/);
    assert.match(rows[1], /Alumno Diez10\.0.*10Desaprobado/);
    assert.match(rows[2], /Alumno Cero0\.00\.000Desaprobado/);
    assert.equal(r.root.findAllByType('input').length, 0);
    assert.equal(r.root.findAllByType('button').map(text).some(t => /Publicar/.test(t)), false);
  });
});

test('pending rows show reasons instead of zero and hide the area-only reason', async () => {
  const data = parseEvaluationResultsResponse(body(pending()), expected);
  await render(async () => data, async r => {
    const line = text(r.root.findAllByType('tr')[1]);
    assert.match(line, /Sin PA/); assert.match(line, /Sin nota/); assert.match(line, /Pendiente/);
    assert.match(line, /Falta la nota MANUAL de «Expresión oral»/); assert.match(line, /Sin actividades que cuenten para PA/);
    assert.doesNotMatch(line, /área/); assert.doesNotMatch(line, /Desaprobado|Aprobado/);
  });
});

test('errors are shown with retry, and reloadKey or refresh reads again from the backend', async () => {
  let calls = 0, fail = true;
  const load = async () => { calls++; if (fail) throw httpError(403); return parseEvaluationResultsResponse(body(row()), expected); };
  await render(load, async r => {
    assert.match(text(r.root), /No tienes permiso/);
    fail = false;
    await act(async () => { r.root.findAllByType('button').find(b => text(b) === 'Reintentar resultados')!.props.onClick(); });
    assert.match(text(r.root), /Aprobado/); assert.equal(calls, 2);
    await act(async () => { r.update(<ResultadosBimestre load={load} reloadKey={1} />); });
    assert.equal(calls, 3);
    await act(async () => { r.root.findAllByType('button').find(b => text(b) === 'Actualizar resultados')!.props.onClick(); });
    assert.equal(calls, 4);
  });
});
