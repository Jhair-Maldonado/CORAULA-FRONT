import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAssignedAt, toSectionLabels, toTeacherAssignmentRows } from '../src/adapters/teacherAssignmentAdapter';
import type { SectionResponse } from '../src/types/sectionApi';
import type { TeacherAssignmentResponse } from '../src/types/teacherApi';

const section = (overrides: Partial<SectionResponse> = {}): SectionResponse => ({
  id: 10, academicPeriodId: 1, level: 'PRIMARY', grade: 5, name: 'A', maxCapacity: 30, enrollmentOpen: true, active: true, ...overrides,
});
const assignment = (overrides: Partial<TeacherAssignmentResponse> = {}): TeacherAssignmentResponse => ({
  id: 601, teacherId: 7, sectionCourseId: 1, sectionId: 10, courseId: 3, courseCode: 'MAT', courseName: 'Matemática',
  assignedAt: '2026-02-25T15:00:00Z', active: true, ...overrides,
});
const visible = (rows: ReturnType<typeof toTeacherAssignmentRows>) =>
  rows.flatMap(({ curso, nivelGrado, seccion, asignadoEl, estadoLabel }) => [curso, nivelGrado ?? '', seccion, asignadoEl, estadoLabel]).join(' | ');

test('labels primary and secondary sections with grade, level and section', () => {
  const labels = toSectionLabels([section(), section({ id: 11, level: 'SECONDARY', grade: 2, name: 'Sección B' })]);
  const rows = toTeacherAssignmentRows([assignment(), assignment({ id: 602, sectionId: 11, courseCode: 'COM', courseName: 'Comunicación' })], labels);
  assert.equal(rows[0].curso, 'MAT · Matemática');
  assert.equal(rows[0].nivelGrado, '5° grado · Primaria');
  assert.equal(rows[0].seccion, 'Sección A');
  assert.equal(rows[1].nivelGrado, '2° grado · Secundaria');
  assert.equal(rows[1].seccion, 'Sección B');
});

test('un nivel desconocido no muestra el valor crudo del enum', () => {
  const labels = toSectionLabels([{ ...section(), level: 'OTRO' as SectionResponse['level'] }]);
  const row = toTeacherAssignmentRows([assignment()], labels)[0];
  assert.equal(row.nivelGrado, '5° grado');
  assert.doesNotMatch(visible([row]), /OTRO/);
});

test('a missing section or missing labels show «Sección no disponible»', () => {
  const labels = toSectionLabels([section()]);
  const missing = toTeacherAssignmentRows([assignment({ sectionId: 999 })], labels)[0];
  assert.equal(missing.seccion, 'Sección no disponible');
  assert.equal(missing.nivelGrado, null);
  const none = toTeacherAssignmentRows([assignment()], null)[0];
  assert.equal(none.seccion, 'Sección no disponible');
  assert.equal(none.nivelGrado, null);
});

test('dates are shown in Lima time, date only', () => {
  assert.match(formatAssignedAt('2026-02-25T15:00:00Z'), /^25 feb\.? 2026$/);
  // 03:30 UTC on 1 March is still 28 February in Lima (UTC-5).
  assert.match(formatAssignedAt('2026-03-01T03:30:00Z'), /^28 feb\.? 2026$/);
  assert.doesNotMatch(formatAssignedAt('2026-02-25T15:00:00Z'), /\d{2}:\d{2}/);
});

test('an invalid ISO date shows «Fecha no disponible» and no dateTime', () => {
  assert.equal(formatAssignedAt('no-es-fecha'), 'Fecha no disponible');
  const row = toTeacherAssignmentRows([assignment({ assignedAt: 'no-es-fecha' })], null)[0];
  assert.equal(row.asignadoEl, 'Fecha no disponible');
  assert.equal(row.asignadoElIso, null);
});

test('inactive assignments are labelled «Inactiva»; an empty list gives no rows', () => {
  const row = toTeacherAssignmentRows([assignment({ active: false })], null)[0];
  assert.equal(row.activa, false);
  assert.equal(row.estadoLabel, 'Inactiva');
  assert.equal(toTeacherAssignmentRows([], toSectionLabels([])).length, 0);
});

test('active assignments come first, then the most recent first', () => {
  const rows = toTeacherAssignmentRows([
    assignment({ id: 1, active: false, assignedAt: '2026-04-01T15:00:00Z' }),
    assignment({ id: 2, active: true, assignedAt: '2026-02-01T15:00:00Z' }),
    assignment({ id: 3, active: true, assignedAt: '2026-03-01T15:00:00Z' }),
    assignment({ id: 4, active: false, assignedAt: '2026-01-01T15:00:00Z' }),
  ], null);
  assert.deepEqual(rows.map(row => row.id), [3, 2, 1, 4]);
});

test('visible fields never contain ids or ISO timestamps', () => {
  const labels = toSectionLabels([section()]);
  const text = visible(toTeacherAssignmentRows([assignment(), assignment({ id: 2, sectionId: 5, assignedAt: 'x' })], labels));
  assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}T/);
  assert.doesNotMatch(text, /\bID\b/i);
});
