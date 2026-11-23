import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeKeyOfSection, toGradeTree } from '../src/adapters/vacancyAdapter';
import { studentStatusTone } from '../src/adapters/studentAdapter';
import type { VacancyGradeResponse, VacancySectionResponse } from '../src/types/vacanciesApi';

const sec = (sectionId: number, sectionName: string, activeEnrollmentCount: number, maxCapacity = 30, extra: Partial<VacancySectionResponse> = {}): VacancySectionResponse => ({
  sectionId, sectionName, maxCapacity, activeEnrollmentCount, availableVacancies: Math.max(0, maxCapacity - activeEnrollmentCount), enrollmentOpen: true, active: true, ...extra,
});
const group = (level: string, grade: number, sections: VacancySectionResponse[], academicPeriodId = 1): VacancyGradeResponse => ({
  academicPeriodId, level: level as VacancyGradeResponse['level'], grade, totalCapacity: 0, activeEnrollmentCount: 0, availableVacancies: 0, sections,
});

test('ordena niveles, grados y secciones desde una entrada desordenada', () => {
  const tree = toGradeTree([
    group('SECONDARY', 1, [sec(30, 'A', 1, 35)]),
    group('PRIMARY', 5, [sec(11, 'B', 0), sec(10, 'A', 4)]),
    group('PRIMARY', 2, [sec(21, '10', 1), sec(22, '2', 1), sec(23, 'Sección 1', 1)]),
  ]);
  assert.deepEqual(tree.map(level => level.etiqueta), ['Primaria', 'Secundaria']);
  assert.deepEqual(tree[0].grados.map(grade => grade.nombre), ['2° grado', '5° grado']);
  assert.deepEqual(tree[0].grados[0].secciones.map(s => s.nombre), ['Sección 1', 'Sección 2', 'Sección 10']);
  const grade5 = tree[0].grados[1];
  assert.equal(grade5.etiqueta, '5° grado · Primaria');
  assert.equal(grade5.key, 'PRIMARY:5');
  assert.equal(grade5.matriculados, 4);
  assert.deepEqual(grade5.secciones.map(s => [s.id, s.letra, s.ocupacion, s.ocupacionAria, s.href]), [
    [10, 'A', '4 / 30', '4 de 30 alumnos', '/administrador/alumnos/grado/10'],
    [11, 'B', '0 / 30', '0 de 30 alumnos', '/administrador/alumnos/grado/11'],
  ]);
  assert.equal(tree[1].grados[0].secciones[0].ocupacion, '1 / 35');
});

test('un nivel desconocido se agrupa como «Otro nivel» y nunca muestra el enum crudo', () => {
  const tree = toGradeTree([group('INITIAL', 3, [sec(1, 'A', 2)]), group('PRIMARY', 1, [sec(2, 'A', 2)])]);
  assert.deepEqual(tree.map(level => [level.nivel, level.etiqueta]), [['PRIMARY', 'Primaria'], [null, 'Otro nivel']]);
  assert.equal(tree[1].grados[0].etiqueta, '3° grado · Otro nivel');
  assert.doesNotMatch(JSON.stringify(tree[1]), /INITIAL/);
});

test('capacidad inválida deja solo «n»; la sobreocupación se muestra tal cual', () => {
  const [level] = toGradeTree([group('PRIMARY', 1, [sec(1, 'A', 1, 0), sec(2, 'B', 5, -3), sec(3, 'C', 31, 30), sec(4, 'D', 1, 30.5)])]);
  const rows = level.grados[0].secciones;
  assert.deepEqual(rows.map(s => s.capacidad), [null, null, 30, null]);
  assert.deepEqual(rows.map(s => s.ocupacion), ['1', '5', '31 / 30', '1']);
  assert.equal(rows[0].ocupacionAria, '1 alumno');
  assert.equal(rows[1].ocupacionAria, '5 alumnos');
  assert.equal(rows[2].ocupacionAria, '31 de 30 alumnos');
});

test('active=false se conserva como sección inactiva', () => {
  const [level] = toGradeTree([group('PRIMARY', 1, [sec(1, 'A', 1, 30, { active: false }), sec(2, 'B', 1)])]);
  assert.deepEqual(level.grados[0].secciones.map(s => s.activa), [false, true]);
});

test('contadores inválidos cuentan como 0 y el total del grado es la suma de sus secciones', () => {
  const bad = (value: unknown) => sec(1, 'A', value as number);
  for (const value of [-1, 1.5, Number.NaN, '3', null, undefined]) {
    const [level] = toGradeTree([group('PRIMARY', 1, [bad(value), sec(2, 'B', 2)])]);
    assert.equal(level.grados[0].secciones[0].matriculados, 0);
    assert.equal(level.grados[0].matriculados, 2);
  }
});

test('nombre vacío o repetido y secciones inválidas', () => {
  const [level] = toGradeTree([group('PRIMARY', 1, [
    sec(1, '   ', 1), sec(0, 'X', 1), sec(-2, 'Y', 1), sec(1.5, 'Z', 1), sec(3, 'sección b', 1), sec(3, 'duplicada', 1), sec(4, 'Sección', 1),
  ])]);
  const rows = level.grados[0].secciones;
  assert.deepEqual(rows.map(s => s.id).sort(), [1, 3, 4]);
  const byId = (id: number) => rows.find(s => s.id === id)!;
  assert.deepEqual([byId(1).nombre, byId(1).letra], ['Sección sin nombre', '?']);
  assert.deepEqual([byId(3).nombre, byId(3).letra], ['Sección b', 'B']);
  assert.equal(byId(4).nombre, 'Sección sin nombre');
});

test('filtra por periodo, fusiona grupos duplicados y omite grados sin secciones', () => {
  const groups = [
    group('PRIMARY', 5, [sec(10, 'A', 4)], 1),
    group('PRIMARY', 5, [sec(11, 'B', 1)], 1),
    group('PRIMARY', 5, [sec(99, 'A', 9)], 2),
    group('PRIMARY', 6, [], 1),
    group('SECONDARY', 0, [sec(50, 'A', 1)], 1),
  ];
  const tree = toGradeTree(groups, 1);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].grados.length, 1);
  assert.deepEqual(tree[0].grados[0].secciones.map(s => s.id), [10, 11]);
  assert.equal(tree[0].grados[0].matriculados, 5);
  assert.deepEqual(toGradeTree(groups).flatMap(l => l.grados).find(g => g.key === 'PRIMARY:5')!.secciones.map(s => s.id), [10, 99, 11]);
  assert.deepEqual(toGradeTree([], 1), []);
  assert.deepEqual(toGradeTree(null), []);
  assert.deepEqual(toGradeTree(undefined), []);
});

test('gradeKeyOfSection encuentra el grado y tolera vacíos, nulos e ids inválidos', () => {
  const tree = toGradeTree([group('PRIMARY', 5, [sec(10, 'A', 1)]), group('SECONDARY', 1, [sec(30, 'A', 1)])]);
  assert.equal(gradeKeyOfSection(tree, 10), 'PRIMARY:5');
  assert.equal(gradeKeyOfSection(tree, '30'), 'SECONDARY:1');
  for (const id of [999, null, undefined, 'abc', '1.5', '-1', 0, Number.NaN, '']) assert.equal(gradeKeyOfSection(tree, id), null);
  assert.equal(gradeKeyOfSection([], 10), null);
  assert.equal(gradeKeyOfSection(null, 10), null);
});

test('studentStatusTone asigna el tono por estado', () => {
  assert.equal(studentStatusTone('ACTIVE'), 'success');
  assert.equal(studentStatusTone('SUSPENDED'), 'warning');
  for (const status of ['DEACTIVATED', 'WITHDRAWN', 'GRADUATED'] as const) assert.equal(studentStatusTone(status), 'neutral');
});
