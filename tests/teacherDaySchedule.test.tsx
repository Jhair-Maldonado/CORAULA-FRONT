import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, type ReactTestRenderer } from 'react-test-renderer';
import VistaCursosDocente from '../feature/docente/vistas/cursos/vistaCursosDocente';
import { buildDaySchedule, toCourseOutcome, type CourseDayResult } from '../src/adapters/teacherDayScheduleAdapter';
import { COURSE_BAR_PALETTE, courseBarClass } from '../src/lib/courseColor';
import { limaMinutes, limaToday } from '../src/lib/limaClock';
import type { TeacherAttendanceSessionResponse } from '../src/types/teacherAttendanceApi';
import type { TeacherCourseSummaryResponse } from '../src/types/teacherCoursesApi';
import { courseOf, httpError, renderWithSession, settle, teacher, text, withAdapter, type Route } from './helpers/docenteView';

// FRONT #157: inicio del docente («Mi horario de hoy»). Datos ficticios; el reloj se inyecta.

const session = (scheduleId: number, startTime: string, endTime: string, over: Partial<TeacherAttendanceSessionResponse> = {}): TeacherAttendanceSessionResponse =>
  ({ scheduleId, startTime, endTime, classroom: 'Aula 5A', totalStudents: 4, presentCount: 0, lateCount: 0, absenceCount: 0, pendingCount: 0, students: [], ...over });
const asCourse = (id: number, over: Record<string, unknown> = {}) => courseOf(id, over) as TeacherCourseSummaryResponse;
const ok = (course: TeacherCourseSummaryResponse, ...sessions: TeacherAttendanceSessionResponse[]): CourseDayResult => ({ course, outcome: { kind: 'ok', sessions } });

const A = asCourse(301, { name: 'Matemática', grade: 5, sectionName: 'A' });
const B = asCourse(302, { name: 'Comunicación', grade: 5, sectionName: 'B', level: 'SECONDARY' });
const C = asCourse(303, { name: 'Ciencias', grade: 4, sectionName: 'A' });
const MIN = (h: number, m = 0) => h * 60 + m;

// ---------- Reloj de Lima y color ----------

test('limaToday y limaMinutes usan America/Lima, también cuando UTC ya cambió de día', () => {
  const utc = new Date('2026-11-03T03:30:00Z');
  assert.equal(limaToday(utc), '2026-11-02');
  assert.equal(limaMinutes(utc), MIN(22, 30));
  assert.equal(limaToday(new Date('2026-11-02T15:05:00Z')), '2026-11-02');
  assert.equal(limaMinutes(new Date('2026-11-02T15:05:00Z')), MIN(10, 5));
  assert.equal(limaMinutes(new Date('2026-11-02T05:00:00Z')), 0);
  assert.equal(limaToday(new Date('2026-11-02T04:59:00Z')), '2026-11-01');
});

test('courseBarClass es estable, usa la paleta de tokens y reparte por sectionCourseId', () => {
  assert.deepEqual(COURSE_BAR_PALETTE, ['bg-accent', 'bg-success-ink', 'bg-warning-ink', 'bg-ink']);
  assert.equal(courseBarClass(301), courseBarClass(301));
  assert.equal(courseBarClass(4), 'bg-accent');
  assert.equal(courseBarClass(5), 'bg-success-ink');
  assert.equal(courseBarClass(302), COURSE_BAR_PALETTE[302 % 4]);
  assert.ok([301, 302, 303, 304].every(id => COURSE_BAR_PALETTE.includes(courseBarClass(id))));
});

// ---------- Adaptador ----------

test('adapter: varios cursos y sesiones salen ordenados por inicio, con la clase en curso y sus minutos', () => {
  const schedule = buildDaySchedule([
    ok(B, session(402, '10:00', '11:00', { pendingCount: 4, classroom: null })),
    ok(A, session(401, '08:00', '09:30'), session(405, '12:00', '13:00', { pendingCount: 4 })),
    ok(C, session(403, '09:45', '10:15', { pendingCount: 2 })),
  ], MIN(10, 30));
  assert.deepEqual(schedule.timeline.map(b => b.scheduleId), [401, 403, 402, 405]);
  assert.deepEqual(schedule.timeline.map(b => b.state), ['past', 'past', 'live', 'upcoming']);
  assert.equal(schedule.current?.scheduleId, 402);
  assert.equal(schedule.current?.minutesLeft, 30);
  assert.equal(schedule.current?.remainingLabel, 'Termina en 30 min');
  assert.equal(schedule.current?.gradeSection, '5.° B');
  assert.equal(schedule.current?.classroom, null, 'classroom null se omite');
  assert.deepEqual(schedule.upcoming.map(b => b.scheduleId), [405]);
  assert.deepEqual(schedule.timeline.map(b => b.key), [401, 403, 402, 405]);
  assert.equal(schedule.isEmpty, false);
  assert.deepEqual(schedule.failedCourses, []);
});

test('adapter: horas largas, límites del bloque y sin clase en curso', () => {
  const live = buildDaySchedule([ok(A, session(1, '08:00', '10:05'))], MIN(9));
  assert.equal(live.current?.remainingLabel, 'Termina en 1 h 5 min');
  assert.equal(buildDaySchedule([ok(A, session(1, '08:00', '09:00'))], MIN(9)).current, null, 'el fin es exclusivo');
  assert.equal(buildDaySchedule([ok(A, session(1, '08:00', '09:00'))], MIN(8)).current?.scheduleId, 1, 'el inicio es inclusivo');
  const sinCurso = buildDaySchedule([ok(A, session(1, '13:00', '14:00'))], MIN(7));
  assert.equal(sinCurso.current, null);
  assert.equal(sinCurso.upcoming.length, 1);
});

test('adapter: un curso que falla se informa aparte y el resto se muestra', () => {
  const schedule = buildDaySchedule([ok(A, session(401, '08:00', '09:00')), { course: B, outcome: { kind: 'error' } }], MIN(7));
  assert.deepEqual(schedule.failedCourses, [{ sectionCourseId: 302, courseName: 'Comunicación' }]);
  assert.equal(schedule.timeline.length, 1);
  assert.equal(schedule.isEmpty, false);
});

test('adapter: día sin sesiones y cursos fuera de periodo (400) dan el estado vacío', () => {
  assert.equal(buildDaySchedule([ok(A), ok(B)], MIN(9)).isEmpty, true);
  const outOfPeriod = [A, B].map(course => ({ course, outcome: toCourseOutcome({ status: 'rejected', reason: httpError(400) }) }));
  assert.deepEqual(outOfPeriod.map(r => r.outcome.kind), ['outOfPeriod', 'outOfPeriod']);
  const schedule = buildDaySchedule(outOfPeriod, MIN(9));
  assert.equal(schedule.isEmpty, true);
  assert.deepEqual(schedule.failedCourses, []);
});

test('adapter: 500, 403 y errores de red son «error»; las horas inválidas se descartan', () => {
  for (const reason of [httpError(500), httpError(403), new Error('red')]) assert.equal(toCourseOutcome({ status: 'rejected', reason }).kind, 'error');
  assert.equal(toCourseOutcome({ status: 'fulfilled', value: { sessions: [session(1, '08:00', '09:00')] } }).kind, 'ok');
  assert.equal(buildDaySchedule([ok(A, session(1, 'mañana', '09:00'))], MIN(9)).timeline.length, 0);
});

// ---------- Vista ----------

const NOW = new Date('2026-11-02T15:30:00Z'); // 10:30 en Lima
const options = { clock: () => NOW, tickMs: 0 };

function routes(attendance: (id: number) => ReturnType<Route>, courses = [courseOf(301, { name: 'Matemática' }), courseOf(302, { name: 'Comunicación' })]): Route {
  return call => {
    if (call.url === '/v1/teacher/me') return { data: teacher };
    if (call.url === '/v1/teacher/courses') return { data: courses };
    const match = /^\/v1\/teacher\/courses\/(\d+)\/attendance$/.exec(call.url);
    if (match) return attendance(Number(match[1]));
    throw new Error(`inesperada ${call.method} ${call.url}`);
  };
}
const day = (id: number, sessions: TeacherAttendanceSessionResponse[]) => ({ data: { sectionCourseId: id, courseName: `Curso ${id}`, grade: 3, sectionName: 'A', date: '2026-11-02', sessions } });
const view = () => <VistaCursosDocente scheduleOptions={options} />;
const linkTo = (r: ReactTestRenderer, label: string) => r.root.findAll(n => typeof n.type !== 'string' && Boolean(n.props.href) && text(n).includes(label));
const button = (r: ReactTestRenderer, label: string) => r.root.findAll(n => n.type === 'button' && text(n) === label)[0];

test('vista: carga y luego muestra tarjetas, clase en curso y cronograma de hoy', async () => {
  await withAdapter(routes(id => day(id, id === 301 ? [session(401, '08:00', '09:30')] : [session(402, '10:00', '11:00', { pendingCount: 3 })])), async calls => {
    await renderWithSession(view(), async r => {
      const shown = text(r.root);
      assert.match(shown, /Mi horario de hoy/);
      assert.ok(!shown.includes('Tu carga lectiva'));
      assert.match(shown, /Matemática/);
      assert.match(shown, /3\.° A · Primaria/);
      assert.match(shown, /2 alumnos/);
      assert.match(shown, /4 h semanales/);
      assert.match(shown, /Clase en curso ahora/);
      assert.match(shown, /Termina en 30 min/);
      assert.match(shown, /En vivo/);
      assert.match(shown, /3 pendientes de asistencia/);
      assert.ok(!/Sin clases programadas hoy/.test(shown));
      const attendanceCalls = calls.filter(c => c.url.endsWith('/attendance'));
      assert.deepEqual(attendanceCalls.map(c => c.params?.date), ['2026-11-02', '2026-11-02']);
      assert.equal(r.root.findAll(n => typeof n.type === 'string' && String(n.props.className ?? '').includes('w-1.5 h-14')).length, 2);
    });
  });
});

test('vista: «Tomar lista» lleva al curso y la fecha de hoy', async () => {
  await withAdapter(routes(id => day(id, id === 302 ? [session(402, '10:00', '11:00')] : [])), async () => {
    await renderWithSession(view(), async r => {
      const links = linkTo(r, 'Tomar lista');
      assert.ok(links.length > 0);
      assert.equal(links[0].props.href, '/docente/asistencia?curso=302&fecha=2026-11-02');
    });
  });
});

test('vista: error de todos los cursos muestra «Reintentar» y al reintentar carga', async () => {
  let fail = true;
  await withAdapter(routes(id => (fail ? httpError(500) : day(id, [session(400 + id, '10:00', '11:00')]))), async () => {
    await renderWithSession(view(), async r => {
      assert.match(text(r.root), /No se pudo cargar tu horario de hoy/);
      assert.ok(!text(r.root).includes('detalle del servidor'));
      fail = false;
      await act(async () => { button(r, 'Reintentar').props.onClick(); });
      await settle();
      assert.match(text(r.root), /Clase en curso ahora/);
    });
  });
});

test('vista: si un curso falla, los demás se muestran y ese indica «No se pudo cargar»', async () => {
  await withAdapter(routes(id => (id === 301 ? httpError(500) : day(id, [session(402, '10:00', '11:00')]))), async () => {
    await renderWithSession(view(), async r => {
      const shown = text(r.root);
      assert.match(shown, /No se pudo cargar:/);
      assert.match(shown, /Clase en curso ahora/);
      assert.ok(button(r, 'Reintentar'));
    });
  });
});

test('vista: día sin sesiones y todos los cursos fuera de periodo (400) muestran «Sin clases programadas hoy»', async () => {
  for (const attendance of [(id: number) => day(id, []), () => httpError(400)]) {
    await withAdapter(routes(attendance), async () => {
      await renderWithSession(view(), async r => {
        assert.match(text(r.root), /Sin clases programadas hoy/);
        assert.ok(!text(r.root).includes('No se pudo cargar'));
        assert.equal(linkTo(r, 'Tomar lista').length, 0);
      });
    });
  }
});

test('vista: mientras carga muestra el estado de carga', async () => {
  let release!: () => void;
  const gate = new Promise<void>(res => { release = res; });
  await withAdapter(async call => { if (call.url.endsWith('/attendance')) await gate; return routes(id => day(id, []))(call); }, async () => {
    await renderWithSession(view(), async r => {
      assert.match(text(r.root), /Cargando tu horario/);
      release();
      await settle();
      assert.match(text(r.root), /Sin clases programadas hoy/);
    });
  });
});

test('medianoche: el tick detecta el cambio de día en Lima y recarga; el intervalo se limpia al desmontar', async () => {
  let instant = new Date('2026-11-03T04:59:00Z'); // 23:59 del 2 de noviembre en Lima
  const active = new Set<unknown>();
  const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
  globalThis.setInterval = ((fn: () => void, ms?: number) => { const id = realSet(fn, ms); active.add(id); return id; }) as typeof setInterval;
  globalThis.clearInterval = ((id: Parameters<typeof clearInterval>[0]) => { active.delete(id); realClear(id); }) as typeof clearInterval;
  try {
    await withAdapter(routes(id => day(id, [session(400 + id, '08:00', '09:00')])), async calls => {
      const dates = () => calls.filter(c => c.url.endsWith('/attendance')).map(c => c.params?.date);
      await renderWithSession(<VistaCursosDocente scheduleOptions={{ clock: () => instant, tickMs: 15 }} />, async () => {
        assert.deepEqual([...new Set(dates())], ['2026-11-02']);
        const before = dates().length;
        await settle();
        assert.equal(dates().length, before, 'sin cambio de día no se vuelve a pedir');
        instant = new Date('2026-11-03T05:01:00Z'); // 00:01 del 3 de noviembre
        await settle(); await settle();
        assert.deepEqual([...new Set(dates())], ['2026-11-02', '2026-11-03']);
        assert.equal(dates().filter(d => d === '2026-11-03').length, 2, 'una sola recarga: una llamada por curso');
        assert.ok(active.size > 0, 'el intervalo está activo mientras la vista existe');
      });
      assert.equal(active.size, 0, 'el intervalo se limpia al desmontar');
    });
  } finally { globalThis.setInterval = realSet; globalThis.clearInterval = realClear; }
});
