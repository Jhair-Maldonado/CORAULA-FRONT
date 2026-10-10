import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluationColumns, matchesEvaluationContext, participationGrade, isPositiveInteger } from '../src/lib/evaluationPreparation.ts';

const criterion = (id, type = 'MANUAL', active = true) => ({
  id, courseId: 20, academicPeriodId: 30, name: `Criterio ${id}`, description: null, order: id, type, active,
});
const configuration = {
  courseId: 20, academicPeriodId: 30,
  criteria: [criterion(9, 'PARTICIPACION_ACADEMICA'), ...Array.from({ length: 8 }, (_, i) => criterion(8 - i)), criterion(10, 'MANUAL', false)],
  activeManualCriteriaCount: 8, hasActiveParticipationCriterion: true,
};

test('eight manual criteria remain dynamic and PA is separated from input columns', () => {
  const columns = evaluationColumns(configuration);
  assert.deepEqual(columns.manual.map(c => c.id), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(columns.participation.id, 9);
  assert.ok(columns.manual.every(c => c.type === 'MANUAL'));
  assert.equal(configuration.criteria[0].id, 9, 'source response is not reordered');
});

test('missing or inactive PA is pending, without synthesizing a grade', () => {
  assert.equal(evaluationColumns().manual.length, 0);
  const columns = evaluationColumns({ ...configuration, criteria: [criterion(9, 'PARTICIPACION_ACADEMICA', false)] });
  assert.equal(columns.participation, undefined);
  assert.equal(participationGrade({ grades: { 9: 0 }, pa: 0 }, columns.participation), null);
});

test('PA distinguishes null, missing, and a real zero without averaging manual grades', () => {
  const pa = criterion(9, 'PARTICIPACION_ACADEMICA');
  assert.equal(participationGrade(undefined, pa), null);
  assert.equal(participationGrade({ grades: { 1: 20 }, pa: null }, pa), null);
  assert.equal(participationGrade({ grades: { 9: 0 }, pa: 15 }, pa), 0);
  assert.equal(participationGrade({ grades: { 9: null }, pa: 15 }, pa), null);
  assert.equal(participationGrade({ grades: {}, pa: 0 }, pa), 0);
});

test('evaluation records are accepted only for the selected section, course, bimester and academic period', () => {
  const data = { sectionCourseId: 10, bimesterId: 40, configuration, records: [] };
  const bimester = { id: 40, academicPeriodId: 30 };
  assert.equal(matchesEvaluationContext(data, 10, 20, bimester), true);
  assert.equal(matchesEvaluationContext(data, 11, 20, bimester), false);
  assert.equal(matchesEvaluationContext(data, 10, 21, bimester), false);
  assert.equal(matchesEvaluationContext(data, 10, 20, { ...bimester, id: 41 }), false);
  assert.equal(matchesEvaluationContext(data, 10, 20, { ...bimester, academicPeriodId: 31 }), false);
  assert.equal(matchesEvaluationContext(data, 10, 20, undefined), false);
});

test('configuration order and bimester number fit positive backend integers', () => {
  for (const invalid of [0, -1, 1.5, NaN, Infinity, 2147483648]) assert.equal(isPositiveInteger(invalid), false);
  assert.equal(isPositiveInteger(1), true);
  assert.equal(isPositiveInteger(2147483647), true);
});
