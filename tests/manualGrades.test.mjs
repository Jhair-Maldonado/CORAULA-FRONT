import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeInputError, canEnterFirstGrade, manualSheetColumns, adaptCriterionGradesSheet, prepareFirstGrades, registerFirstGrades } from '../src/lib/manualGrades.ts';
import { parseBimestersResponse, parseCriterionGradesSheetResponse, manualGradesErrorMessage } from '../src/lib/manualGradesContract.ts';
import { MANUAL_GRADES_CONTRACT_VERIFIED } from '../src/types/teacherGradesApi.ts';
import { participationGrade } from '../src/lib/evaluationPreparation.ts';

// Fixtures and injected transports are confined to tests; never production data.
const expected = { sectionCourseId: 10, courseId: 20, bimesterId: 40, academicPeriodId: 30 };
const makeSheet = () => ({
  courseId: 20, sectionCourseId: 10, academicPeriodId: 30,
  bimester: { id: 40, academicPeriodId: 30, number: 1, name: 'Bimestre de prueba', startDate: '2026-01-01', endDate: '2026-03-01', status: 'ABIERTO' },
  criteria: [...Array.from({ length: 8 }, (_, i) => ({ id: i + 1, courseId: 20, academicPeriodId: 30, name: `Manual ${i + 1}`, description: null, order: i + 1, type: 'MANUAL', active: true })), { id: 9, courseId: 20, academicPeriodId: 30, name: 'PA', description: null, order: 9, type: 'PARTICIPACION_ACADEMICA', active: true }],
  students: [{ enrollmentId: 100, studentId: 200, fullName: 'Estudiante de prueba', grades: [{ criterionId: 1, gradeId: 500, grade: 0, registeredAt: '2026-10-10T12:00:00Z', updatedAt: null }] }],
});
const evaluation = () => adaptCriterionGradesSheet(parseCriterionGradesSheetResponse(makeSheet(), expected));

test('real writes remain blocked while proposal is unverified', () => {
  assert.equal(MANUAL_GRADES_CONTRACT_VERIFIED, false);
});

test('grade validation accepts boundaries and two decimals without rounding or treating blank as zero', () => {
  for (const value of ['0', '0.00', '20', '20.00', '14.50', '0.01']) assert.equal(gradeInputError(value), null);
  for (const value of ['', ' ', '-1', '20.01', '1.234', 'NaN', 'Infinity', '1e1', '14,50']) assert.ok(gradeInputError(value));
});

test('PLANIFICADO is readonly and ABIERTO allows only first active manual grades', () => {
  const data = evaluation(), row = data.records[0], criteria = data.configuration.criteria;
  assert.equal(canEnterFirstGrade(makeSheet().bimester, criteria[0], row), false, 'persisted zero is already registered');
  assert.equal(canEnterFirstGrade(makeSheet().bimester, criteria[1], row), true);
  assert.equal(canEnterFirstGrade({ ...makeSheet().bimester, status: 'PLANIFICADO' }, criteria[1], row), false);
  assert.equal(canEnterFirstGrade(makeSheet().bimester, { ...criteria[1], active: false }, row), false);
  assert.equal(canEnterFirstGrade(makeSheet().bimester, criteria[8], row), false, 'PA never editable');
  assert.throws(() => prepareFirstGrades(data, { ...makeSheet().bimester, status: 'PLANIFICADO' }, { '100:2': '15' }));
});

test('dynamic manual columns retain inactive persisted grades and PA is not synthesized', () => {
  const data = evaluation();
  data.configuration.criteria[0].active = false;
  data.configuration.criteria[1].active = false;
  assert.deepEqual(manualSheetColumns(data).map(c => c.id), [1, 3, 4, 5, 6, 7, 8]);
  assert.equal(data.records[0].grades[1], 0);
  const pa = data.configuration.criteria[8];
  assert.equal(participationGrade(data.records[0], pa), null);
  assert.equal(participationGrade({ grades: {}, pa: 0 }, pa), 0);
});

test('only nonblank first notes are submitted with exact DTO keys', () => {
  const data = evaluation();
  assert.deepEqual(prepareFirstGrades(data, makeSheet().bimester, { '100:2': '0', '100:3': '', '100:4': '14.50' }), [
    { enrollmentId: 100, criterionId: 2, grade: 0 }, { enrollmentId: 100, criterionId: 4, grade: 14.5 },
  ]);
  assert.throws(() => prepareFirstGrades(data, makeSheet().bimester, { '100:1': '15' }), /primeras/);
  assert.throws(() => prepareFirstGrades(data, makeSheet().bimester, { '100:9': '15' }), /primeras/);
  assert.throws(() => prepareFirstGrades(data, makeSheet().bimester, { '100:2': '20.01' }), /0 y 20/);
});

test('a successful individual registration reloads persisted notes from the transport', async () => {
  const order = [], commands = [{ enrollmentId: 100, criterionId: 2, grade: 15 }];
  let registeredSheet;
  const count = await registerFirstGrades(commands, async command => { order.push(['POST', command]); }, async () => {
    order.push(['GET']);
    const sheet = makeSheet();
    sheet.students[0].grades.push({ criterionId: 2, gradeId: 501, grade: 15, registeredAt: '2026-10-10T13:00:00Z', updatedAt: null });
    registeredSheet = adaptCriterionGradesSheet(parseCriterionGradesSheetResponse(sheet, expected));
  });
  assert.equal(count, 1);
  assert.deepEqual(order.map(o => o[0]), ['POST', 'GET']);
  assert.equal(canEnterFirstGrade(makeSheet().bimester, registeredSheet.configuration.criteria[1], registeredSheet.records[0]), false);
});

test('duplicate cells are rejected before sending any POST', async () => {
  let calls = 0;
  const command = { enrollmentId: 100, criterionId: 2, grade: 15 };
  await assert.rejects(registerFirstGrades([command, command], async () => { calls++; }, async () => {}), /duplicada/);
  assert.equal(calls, 0);
});

test('403 and 409 stop the batch, reload and preserve the original error without automatic retries', async () => {
  for (const status of [403, 409]) {
    const error = { status };
    let posts = 0, reads = 0;
    await assert.rejects(registerFirstGrades([{ enrollmentId: 100, criterionId: 2, grade: 15 }, { enrollmentId: 100, criterionId: 3, grade: 16 }], async () => { posts++; throw error; }, async () => { reads++; }), e => e === error);
    assert.equal(posts, 1); assert.equal(reads, 1);
    assert.match(manualGradesErrorMessage(status), status === 403 ? /permiso/ : /Conflicto/);
  }
});

test('partial registration is not falsely atomic; later requests stop after a conflict', async () => {
  let posts = 0, reads = 0;
  await assert.rejects(registerFirstGrades([2, 3, 4].map(criterionId => ({ enrollmentId: 100, criterionId, grade: 15 })), async () => { if (++posts === 2) throw new Error('409'); }, async () => { reads++; }), /409/);
  assert.equal(posts, 2); assert.equal(reads, 1);
});

test('failed reload never reports the planilla as confirmed', async () => {
  await assert.rejects(registerFirstGrades([{ enrollmentId: 100, criterionId: 2, grade: 15 }], async () => {}, async () => { throw new Error('offline'); }), /no se pudo recargar/);
});

test('course and bimester changes reject stale response contexts', () => {
  for (const change of [{ sectionCourseId: 11 }, { courseId: 21 }, { bimesterId: 41 }, { academicPeriodId: 31 }]) assert.throws(() => parseCriterionGradesSheetResponse(makeSheet(), { ...expected, ...change }), /contrato N2 documentado/);
});

test('empty data stays empty; incomplete DTOs and duplicate/PA cells are rejected', () => {
  const sheet = makeSheet(); sheet.students = []; sheet.criteria = [];
  const data = adaptCriterionGradesSheet(parseCriterionGradesSheetResponse(sheet, expected));
  assert.deepEqual(data.records, []); assert.deepEqual(manualSheetColumns(data), []);
  assert.deepEqual(parseBimestersResponse([]), []);
  assert.throws(() => parseCriterionGradesSheetResponse({}, expected));
  const bad = makeSheet(); bad.students[0].grades[0].criterionId = 9;
  assert.throws(() => parseCriterionGradesSheetResponse(bad, expected));
  const duplicate = makeSheet(); duplicate.students.push(duplicate.students[0]);
  assert.throws(() => parseCriterionGradesSheetResponse(duplicate, expected));
});
