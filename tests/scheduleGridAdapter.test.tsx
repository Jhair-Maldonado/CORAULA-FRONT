import test from 'node:test';
import assert from 'node:assert/strict';
import { toScheduleGrid } from '../src/adapters/scheduleGridAdapter';
import type { ScheduleResponse, SchoolDay } from '../src/types/scheduleApi';

const block = (id: number, day: SchoolDay, startTime: string, endTime: string, overrides: Partial<ScheduleResponse> = {}): ScheduleResponse => ({
  id, sectionCourseId: 300 + id, sectionId: 12, courseId: 100 + id, courseName: `Curso ${id}`,
  teacherId: 201, teacherName: 'Docente Demo', day, startTime, endTime, classroom: 'Aula 1S', ...overrides,
});
const find = (grid: ReturnType<typeof toScheduleGrid>, id: number) => grid.days.flatMap(d => d.blocks).find(b => b.id === id)!;

test('lista vacía: rango mínimo 07:00 a 15:00, cinco días y sin bloques', () => {
  const grid = toScheduleGrid([]);
  assert.equal(grid.start, 7 * 60);
  assert.equal(grid.end, 15 * 60);
  assert.equal(grid.rows, 96);
  assert.deepEqual(grid.hours.map(h => h.label), ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']);
  assert.deepEqual(grid.days.map(d => d.day), ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES']);
  assert.equal(grid.hasBlocks, false);
});

test('rango mínimo cuando los bloques caben dentro de 07:00 a 15:00', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '08:00', '09:30')]);
  assert.equal(grid.start, 420);
  assert.equal(grid.end, 900);
});

test('rango ampliado a la hora en punto anterior al primer inicio y siguiente al último fin', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '06:30', '07:30'), block(2, 'VIERNES', '15:10', '16:30')]);
  assert.equal(grid.start, 6 * 60);
  assert.equal(grid.end, 17 * 60);
  assert.equal(grid.hours[0].label, '06:00');
  assert.equal(grid.hours.at(-1)!.label, '16:00');
  assert.equal(find(grid, 1).rowStart, 7, '(390 - 360) / 5 + 1');
});

test('un fin exacto en hora en punto no agrega una hora más', () => {
  assert.equal(toScheduleGrid([block(1, 'LUNES', '14:00', '16:00')]).end, 16 * 60);
});

test('45 min ocupan 9 unidades y 90 min ocupan 18; solo el de 45 es compacto', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '08:00', '08:45'), block(2, 'MARTES', '08:00', '09:30')]);
  assert.equal(find(grid, 1).rowSpan, 9);
  assert.equal(find(grid, 1).compact, true);
  assert.equal(find(grid, 2).rowSpan, 18);
  assert.equal(find(grid, 2).compact, false);
  assert.equal(find(grid, 1).rowStart, 13, '(480 - 420) / 5 + 1');
});

test('60 min exactos no son compactos', () => {
  assert.equal(find(toScheduleGrid([block(1, 'LUNES', '08:00', '09:00')]), 1).compact, false);
});

test('08:10 cae en la fila 15 y las horas que no son múltiplo de 5 se redondean al más cercano', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '08:10', '09:00'), block(2, 'MARTES', '08:12', '09:03'), block(3, 'MIERCOLES', '08:13', '09:07')]);
  assert.equal(find(grid, 1).rowStart, 15);
  assert.equal(find(grid, 2).startTime, '08:10');
  assert.equal(find(grid, 2).endTime, '09:05');
  assert.equal(find(grid, 3).startTime, '08:15');
  assert.equal(find(grid, 3).endTime, '09:05');
});

test('un bloque cuyo redondeo lo dejaría en cero sigue ocupando una fila', () => {
  const tiny = find(toScheduleGrid([block(1, 'LUNES', '08:01', '08:02')]), 1);
  assert.equal(tiny.rowSpan, 1);
});

test('dos bloques solapados usan dos carriles', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '08:00', '09:30'), block(2, 'LUNES', '09:00', '10:00')]);
  assert.deepEqual([find(grid, 1).lane, find(grid, 1).lanes], [0, 2]);
  assert.deepEqual([find(grid, 2).lane, find(grid, 2).lanes], [1, 2]);
});

test('tres bloques simultáneos usan tres carriles', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '08:00', '09:00'), block(2, 'LUNES', '08:00', '09:00'), block(3, 'LUNES', '08:30', '09:30')]);
  assert.deepEqual([1, 2, 3].map(id => find(grid, id).lane), [0, 1, 2]);
  assert.ok([1, 2, 3].every(id => find(grid, id).lanes === 3));
});

test('el solape es transitivo y un carril liberado se reutiliza', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '08:00', '09:00'), block(2, 'LUNES', '08:30', '10:00'), block(3, 'LUNES', '09:30', '10:30')]);
  assert.deepEqual([1, 2, 3].map(id => [find(grid, id).lane, find(grid, id).lanes]), [[0, 2], [1, 2], [0, 2]]);
});

test('fin igual a inicio no cuenta como solape; otro día tampoco', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '08:00', '09:00'), block(2, 'LUNES', '09:00', '10:00'), block(3, 'MARTES', '08:30', '09:30')]);
  assert.deepEqual([1, 2, 3].map(id => [find(grid, id).lane, find(grid, id).lanes]), [[0, 1], [0, 1], [0, 1]]);
});

test('colorIndex es courseId % 7 y no depende del orden de entrada', () => {
  const list = [block(1, 'LUNES', '08:00', '09:00', { courseId: 101 }), block(2, 'MARTES', '08:00', '09:00', { courseId: 107 }), block(3, 'MIERCOLES', '08:00', '09:00', { courseId: 105 })];
  const forward = toScheduleGrid(list);
  const reversed = toScheduleGrid([...list].reverse());
  assert.deepEqual([1, 2, 3].map(id => find(forward, id).colorIndex), [3, 2, 0]);
  assert.deepEqual([1, 2, 3].map(id => find(reversed, id).colorIndex), [3, 2, 0]);
});

test('descarta sábado, días desconocidos y horas inválidas o con inicio >= fin', () => {
  const grid = toScheduleGrid([
    block(1, 'LUNES', '08:00', '09:00'),
    block(2, 'SABADO' as SchoolDay, '08:00', '09:00'),
    block(3, 'LUNES', '25:00', '26:00'),
    block(4, 'LUNES', '09:00', '08:00'),
    block(5, 'LUNES', '09:00', '09:00'),
    block(6, 'LUNES', '8:00', '9:00'),
    block(7, 'LUNES', null as unknown as string, '09:00'),
  ]);
  assert.equal(grid.days.flatMap(d => d.blocks).length, 1);
  assert.equal(grid.discarded, 6);
  assert.equal(grid.start, 420);
});

test('ordena por inicio e id dentro del día', () => {
  const grid = toScheduleGrid([block(9, 'LUNES', '10:00', '11:00'), block(3, 'LUNES', '08:00', '09:00'), block(2, 'LUNES', '08:00', '09:00')]);
  assert.deepEqual(grid.days[0].blocks.map(b => b.id), [2, 3, 9]);
});

test('ariaLabel completo y con docente y aula nulos', () => {
  const grid = toScheduleGrid([
    block(1, 'LUNES', '08:00', '09:30', { courseName: 'Matemática', teacherName: 'Rosa Quispe Demo', classroom: 'Aula 5A' }),
    block(2, 'MIERCOLES', '13:00', '13:45', { courseName: 'Comunicación', teacherName: null, classroom: null }),
  ]);
  assert.equal(find(grid, 1).ariaLabel, 'Matemática, lunes de 08:00 a 09:30, docente Rosa Quispe Demo, aula Aula 5A');
  assert.equal(find(grid, 2).ariaLabel, 'Comunicación, miércoles de 13:00 a 13:45, sin docente asignado, sin aula');
});

test('el filtro de día deja una sola columna y conserva el rango de todos los bloques', () => {
  const list = [block(1, 'LUNES', '08:00', '09:00'), block(2, 'JUEVES', '15:00', '16:30')];
  const grid = toScheduleGrid(list, 'LUNES');
  assert.deepEqual(grid.days.map(d => d.day), ['LUNES']);
  assert.equal(grid.hasBlocks, true);
  assert.equal(grid.end, 17 * 60);
  assert.equal(toScheduleGrid(list, 'MARTES').hasBlocks, false);
  assert.equal(toScheduleGrid(list, '').days.length, 5);
});

test('un inicio a las 06:58 se redondea a 07:00 y no agrega una hora vacía antes', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '06:58', '08:00')]);
  assert.equal(grid.start, 7 * 60);
  assert.equal(grid.hours[0].label, '07:00');
  assert.equal(find(grid, 1).startTime, '07:00');
  assert.equal(find(grid, 1).rowStart, 1);
});

test('un fin a las 23:58 se limita a 23:55 y el eje nunca muestra 24:00', () => {
  const grid = toScheduleGrid([block(1, 'LUNES', '22:00', '23:58'), block(2, 'MARTES', '23:57', '23:59')]);
  assert.equal(find(grid, 1).endTime, '23:55');
  assert.equal(grid.end, 24 * 60);
  assert.equal(grid.hours.at(-1)!.label, '23:00');
  assert.ok(!grid.hours.some(h => h.label === '24:00'));
  const late = find(grid, 2);
  assert.ok(late.endMinute > late.startMinute && late.endMinute <= 23 * 60 + 55);
  assert.ok(grid.days.flatMap(d => d.blocks).every(b => b.endTime !== '24:00'));
});
