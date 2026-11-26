import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import VistaAsistenciaDocente from '../feature/docente/vistas/asistencia/vistaAsistenciaDocente';
import { effectiveStatus, isAttendanceDirty, planBulkStatus } from '../src/lib/attendanceDraft';
import { ATTENDANCE_STATUS_UI } from '../src/lib/attendanceStatusUi';
import { isRealDay, limaToday } from '../src/lib/limaClock';
import type { TeacherAttendanceStatus } from '../src/types/teacherAttendanceApi';
import type { JustificationStatus } from '../src/types/guardianAttendanceApi';
import { courseOf, httpError, renderWithSession, settle, teacher, text, withAdapter, type Call, type Reply, type Route } from './helpers/docenteView';

// FRONT #158: asistencia del docente (resumen, botones masivos, motivo/causa y «Guardar»). Datos ficticios.

type Row = [status: TeacherAttendanceStatus | null, justification?: JustificationStatus | null];
const NAMES = ['Ana Arias', 'Beto Ríos', 'Carla Soto', 'Diego Paz'];

function sessionOf(rows: Row[], scheduleId = 99) {
  const students = rows.map(([status, justificationStatus], i) => ({
    enrollmentId: 101 + i, studentId: 1 + i, studentCode: i === 3 ? null : `E${101 + i}`, fullName: NAMES[i], attendanceId: status ? 500 + i : null, status, justificationStatus: justificationStatus ?? null
  }));
  const count = (s: TeacherAttendanceStatus | null) => rows.filter(r => r[0] === s).length;
  return { scheduleId, startTime: '08:00', endTime: '09:30', classroom: 'Aula 1', totalStudents: rows.length, presentCount: count('PRESENTE'), lateCount: count('TARDANZA'),
    absenceCount: count('INASISTENCIA'), pendingCount: count(null), students };
}
const dayOf = (id: number, sessions: unknown[]) => ({ sectionCourseId: id, courseName: `Curso ${id}`, grade: 3, sectionName: 'A', date: '2026-11-02', sessions });

interface Server { get: (call: Call) => Reply; put: (call: Call) => Reply }
function routes(server: Partial<Server> & { rows?: Row[] } = {}, courses = [courseOf(301), courseOf(302)]): Route {
  const rows = server.rows ?? [[null], [null]];
  return call => {
    if (call.url === '/v1/teacher/me') return { data: teacher };
    if (call.url === '/v1/teacher/courses') return { data: courses };
    if (/^\/v1\/teacher\/courses\/\d+\/attendance$/.test(call.url)) return server.get ? server.get(call) : { data: dayOf(301, [sessionOf(rows)]) };
    if (/^\/v1\/teacher\/courses\/\d+\/attendance\/\d+$/.test(call.url)) return server.put ? server.put(call) : { status: 204 };
    throw new Error(`inesperada ${call.method} ${call.url}`);
  };
}

const DATE = '2026-11-02';
const view = (props: { initialCourseId?: number; initialDate?: string } = { initialDate: DATE }) => <VistaAsistenciaDocente {...props} />;
const buttons = (r: ReactTestRenderer, label: string) => r.root.findAll(n => n.type === 'button' && text(n).trim() === label);
const mark = (r: ReactTestRenderer, verb: string, student: string) => r.root.findByProps({ 'aria-label': `Marcar ${verb} a ${student}` });
const pressed = (r: ReactTestRenderer, student: string) => ATTENDANCE_STATUS_UI.find(o => mark(r, o.verb, student).props['aria-pressed'])?.status ?? null;
const saveButton = (r: ReactTestRenderer) => r.root.findAll(n => n.type === 'button' && text(n).includes('Guardar Cambios'))[0];
const click = (n: ReactTestInstance) => act(async () => { n.props.onClick(); });
const typeReason = (r: ReactTestRenderer, value: string) => act(async () => { r.root.findByProps({ id: 'attendance-reason-input' }).props.onChange({ target: { value } }); });
const puts = (calls: Call[]) => calls.filter(c => c.method === 'put');
const alerts = (r: ReactTestRenderer) => r.root.findAll(n => n.props.role === 'alert' && typeof n.type === 'string').map(text).join(' | ');
const status = (r: ReactTestRenderer) => r.root.findAll(n => n.props.role === 'status' && typeof n.type === 'string').map(text).join(' | ');

// ---------- Borrador (puro) ----------

test('borrador: «Guardar» solo cuenta cambios reales; sin borrador un alumno sin registro no es PRESENTE', () => {
  const rows = [{ enrollmentId: 1, status: 'TARDANZA' as const }, { enrollmentId: 2, status: null }];
  assert.equal(isAttendanceDirty(rows, {}), false);
  assert.equal(isAttendanceDirty(rows, { 1: 'TARDANZA' }), false, 'elegir lo ya guardado no es un cambio');
  assert.equal(isAttendanceDirty(rows, { 2: 'PRESENTE' }), true);
  assert.equal(isAttendanceDirty(rows, { 1: 'PRESENTE' }), true);
  assert.equal(effectiveStatus(rows[1], {}), null);
});

test('borrador: el plan de «Todos X» separa a quien se llena, a quien se pregunta y a quien se excluye', () => {
  const rows = [
    { enrollmentId: 1, status: null }, { enrollmentId: 2, status: 'TARDANZA' as const },
    { enrollmentId: 3, status: 'PRESENTE' as const }, { enrollmentId: 4, status: 'INASISTENCIA' as const, justificationStatus: 'APROBADA' as const }
  ];
  assert.deepEqual(planBulkStatus(rows, {}, 'PRESENTE'), { fill: [1], overwrite: [2], locked: [4] });
  assert.deepEqual(planBulkStatus(rows, { 1: 'TARDANZA' }, 'PRESENTE'), { fill: [], overwrite: [1, 2], locked: [4] });
});

test('borrador: una fila APROBADA que ya tiene el estado pedido no cuenta como bloqueada', () => {
  const rows = [{ enrollmentId: 1, status: 'INASISTENCIA' as const, justificationStatus: 'APROBADA' as const }, { enrollmentId: 2, status: null }];
  assert.deepEqual(planBulkStatus(rows, {}, 'INASISTENCIA'), { fill: [2], overwrite: [], locked: [] });
  assert.deepEqual(planBulkStatus(rows, {}, 'PRESENTE'), { fill: [2], overwrite: [], locked: [1] });
});

test('isRealDay: acepta fechas del calendario y rechaza las que no existen', () => {
  assert.equal(isRealDay('2026-02-28'), true);
  assert.equal(isRealDay('2028-02-29'), true);
  for (const bad of ['2026-02-31', '2026-13-01', '2026-00-10', '2027-02-29', '02/11/2026', '']) assert.equal(isRealDay(bad), false, bad);
});

// ---------- Estados de la vista ----------

test('vista: carga, muestra resumen de la sesión, filas con iniciales y sin «Registro:»', async () => {
  let release!: () => void;
  const gate = new Promise<void>(res => { release = res; });
  const rows: Row[] = [['PRESENTE'], ['TARDANZA'], ['INASISTENCIA'], [null]];
  await withAdapter(async call => { if (call.url.endsWith('/attendance')) await gate; return routes({ rows })(call); }, async () => {
    await renderWithSession(view(), async r => {
      assert.match(text(r.root), /Cargando asistencia/);
      release(); await settle();
      const shown = text(r.root);
      assert.match(shown, /2 de noviembre de 2026/);
      for (const label of ['Presentes', 'Tardanzas', 'Inasistencias', 'Pendientes']) assert.match(shown, new RegExp(label));
      assert.match(shown, /Código: E101/);
      assert.match(shown, /Código: No registrado/);
      assert.ok(!shown.includes('Registro:'));
      assert.ok(!shown.includes('Pendiente de guardar'));
      assert.equal(r.root.findAll(n => n.type === 'span' && text(n) === 'AA').length, 1, 'avatar con iniciales');
      assert.equal(pressed(r, 'Ana Arias'), 'PRESENTE');
      assert.equal(pressed(r, 'Diego Paz'), null);
    });
  });
});

test('vista: error de carga con «Reintentar», 400 fuera de periodo sin texto del servidor, y 403', async () => {
  let reply: Reply = httpError(500);
  await withAdapter(routes({ get: () => reply }), async () => {
    await renderWithSession(view(), async r => {
      assert.match(alerts(r), /No se pudo completar la solicitud/);
      reply = { data: dayOf(301, [sessionOf([[null]])]) };
      await click(buttons(r, 'Reintentar')[0]); await settle();
      assert.equal(alerts(r), '');
      assert.match(text(r.root), /Guardar Cambios/);
    });
  });
  for (const [error, expected] of [[httpError(400), /fuera del periodo académico/], [httpError(403), /No tienes permiso/]] as const) {
    await withAdapter(routes({ get: () => error }), async () => {
      await renderWithSession(view(), async r => {
        assert.match(alerts(r), expected);
        assert.ok(!alerts(r).includes('detalle del servidor'));
        assert.ok(buttons(r, 'Reintentar').length > 0);
      });
    });
  }
});

test('vista: sin sesiones el día elegido muestra el estado vacío', async () => {
  await withAdapter(routes({ get: () => ({ data: dayOf(301, []) }) }), async () => {
    await renderWithSession(view(), async r => {
      assert.match(text(r.root), /No hay clases programadas para este curso/);
      assert.equal(saveButton(r).props.disabled, true);
    });
  });
});

// ---------- Parámetros iniciales ----------

test('props iniciales: curso del docente y fecha válida se respetan; curso ajeno o fecha mal formada vuelven al comportamiento habitual', async () => {
  const dateOf = (calls: Call[]) => calls.filter(c => c.url.endsWith('/attendance')).map(c => `${c.url.split('/')[4]}@${c.params?.date}`);
  await withAdapter(routes(), async calls => {
    await renderWithSession(view({ initialCourseId: 302, initialDate: DATE }), async () => {
      assert.deepEqual(dateOf(calls), [`302@${DATE}`]);
    });
  });
  await withAdapter(routes(), async calls => {
    await renderWithSession(view({ initialCourseId: 999, initialDate: '02/11/2026' }), async () => {
      assert.deepEqual(dateOf(calls), [`301@${limaToday()}`], 'curso inexistente → primer curso; fecha inválida → hoy en Lima');
    });
  });
  await withAdapter(routes(), async calls => {
    await renderWithSession(view({ initialCourseId: 301, initialDate: '2026-02-31' }), async () => {
      assert.deepEqual(dateOf(calls), [`301@${limaToday()}`], 'fecha con formato válido pero inexistente → hoy en Lima');
    });
  });
});

// ---------- Botones masivos ----------

test('masivo: asigna a quien no tiene estado y pide confirmación antes de pisar a otros', async () => {
  const rows: Row[] = [['TARDANZA'], [null], [null]];
  for (const choice of ['Mantener', 'Cambiar']) {
    await withAdapter(routes({ rows }), async () => {
      await renderWithSession(view(), async r => {
        await click(buttons(r, 'Todos Presentes')[0]);
        assert.match(text(r.root), /1 estudiante ya tiene estado\. ¿Cambiarlos también a Presente\?/);
        assert.equal(pressed(r, 'Ana Arias'), 'TARDANZA', 'nadie con estado se pisa sin confirmar');
        assert.equal(pressed(r, 'Beto Ríos'), 'PRESENTE');
        assert.equal(pressed(r, 'Carla Soto'), 'PRESENTE');
        await click(buttons(r, choice)[0]);
        assert.equal(pressed(r, 'Ana Arias'), choice === 'Cambiar' ? 'PRESENTE' : 'TARDANZA');
        assert.ok(!text(r.root).includes('ya tiene estado'));
      });
    });
  }
});

test('masivo: sin nadie que pisar no se pregunta, y la justificación APROBADA nunca se modifica', async () => {
  const rows: Row[] = [[null], ['INASISTENCIA', 'APROBADA'], ['INASISTENCIA', 'PENDIENTE']];
  await withAdapter(routes({ rows }), async () => {
    await renderWithSession(view(), async r => {
      assert.equal(mark(r, 'Falta', 'Beto Ríos').props.disabled, true, 'la fila aprobada no se cambia a mano');
      assert.match(text(r.root), /Justificación aprobada/);
      await click(buttons(r, 'Todos Inasistencia')[0]);
      assert.ok(!text(r.root).includes('ya tiene estado'));
      assert.equal(pressed(r, 'Ana Arias'), 'INASISTENCIA');
      await click(buttons(r, 'Todos Presentes')[0]);
      assert.match(text(r.root), /2 estudiantes ya tienen estado/, 'Ana (borrador) y Carla; Beto, con justificación aprobada, queda fuera');
    });
  });
  await withAdapter(routes({ rows }), async () => {
    await renderWithSession(view(), async r => {
      await click(buttons(r, 'Todos Presentes')[0]);
      assert.match(text(r.root), /1 estudiante ya tiene estado/);
      await click(buttons(r, 'Cambiar')[0]);
      assert.equal(pressed(r, 'Beto Ríos'), 'INASISTENCIA', 'APROBADA intacta');
      assert.equal(pressed(r, 'Carla Soto'), 'PRESENTE');
      assert.match(status(r), /1 estudiante con justificación aprobada no se modificó/);
    });
  });
});

// ---------- Guardar ----------

test('masivo: el aviso de bloqueadas solo cuenta a quien tiene un estado distinto al pedido', async () => {
  const rows: Row[] = [[null], ['INASISTENCIA', 'APROBADA']];
  await withAdapter(routes({ rows }), async () => {
    await renderWithSession(view(), async r => {
      await click(buttons(r, 'Todos Inasistencia')[0]);
      assert.equal(pressed(r, 'Ana Arias'), 'INASISTENCIA');
      assert.ok(!/justificación aprobada no se modific/.test(status(r)), 'Beto ya está en INASISTENCIA: no se avisa');
      await click(buttons(r, 'Todos Presentes')[0]);
      await click(buttons(r, 'Cambiar')[0]);
      assert.match(status(r), /1 estudiante con justificación aprobada no se modificó/);
      assert.equal(pressed(r, 'Beto Ríos'), 'INASISTENCIA');
    });
  });
});

test('guardar: desactivado sin cambios y con pendientes; con cambios exige el motivo', async () => {
  await withAdapter(routes({ rows: [['PRESENTE'], ['TARDANZA']] }), async () => {
    await renderWithSession(view(), async r => {
      assert.equal(saveButton(r).props.disabled, true, 'sin cambios');
      await click(mark(r, 'Presente', 'Beto Ríos'));
      assert.equal(saveButton(r).props.disabled, true, 'falta el motivo');
      await typeReason(r, 'Llegó a tiempo');
      assert.equal(saveButton(r).props.disabled, false);
      await click(mark(r, 'Tardanza', 'Beto Ríos'));
      assert.equal(saveButton(r).props.disabled, true, 'volvió a lo guardado: no hay cambios');
    });
  });
  await withAdapter(routes({ rows: [[null], [null]] }), async () => {
    await renderWithSession(view(), async r => {
      await typeReason(r, 'Sin lector');
      await click(mark(r, 'Presente', 'Ana Arias'));
      assert.equal(saveButton(r).props.disabled, true, 'quedan pendientes');
      await click(mark(r, 'Presente', 'Beto Ríos'));
      assert.equal(saveButton(r).props.disabled, false);
    });
  });
});

test('guardar: primera toma envía causa y motivo; una corrección solo el motivo; el éxito aparece tras el 2xx y limpia el motivo', async () => {
  const saved: Row[] = [[null], [null]];
  await withAdapter(routes({ rows: saved }), async calls => {
    await renderWithSession(view(), async r => {
      await click(buttons(r, 'Todos Presentes')[0]);
      await typeReason(r, '  Lector sin energía  ');
      assert.ok(!text(r.root).includes('se guardó correctamente'));
      await act(async () => { await saveButton(r).props.onClick(); }); await settle();
      assert.deepEqual(puts(calls).map(c => c.body), [{ records: [{ enrollmentId: 101, status: 'PRESENTE' }, { enrollmentId: 102, status: 'PRESENTE' }], reason: 'Lector sin energía', contingencyCause: 'LECTOR_NO_DISPONIBLE' }]);
      assert.deepEqual(puts(calls).map(c => c.params), [{ date: DATE }]);
      assert.match(status(r), /La asistencia se guardó correctamente/);
      assert.equal(r.root.findByProps({ id: 'attendance-reason-input' }).props.value, '', 'el motivo se limpia');
    });
  });
  await withAdapter(routes({ rows: [['PRESENTE'], ['TARDANZA']] }), async calls => {
    await renderWithSession(view(), async r => {
      await click(mark(r, 'Falta', 'Ana Arias'));
      await typeReason(r, 'Salió antes');
      await act(async () => { await saveButton(r).props.onClick(); }); await settle();
      assert.deepEqual(puts(calls).map(c => c.body), [{ records: [{ enrollmentId: 101, status: 'INASISTENCIA' }, { enrollmentId: 102, status: 'TARDANZA' }], reason: 'Salió antes' }]);
      assert.ok(!('contingencyCause' in (puts(calls)[0].body as object)));
    });
  });
});

test('guardar: con 400 o 409 se muestra el error con texto propio y nunca el éxito ni el mensaje del servidor', async () => {
  const cases: [Reply, RegExp][] = [
    [httpError(400, { message: 'detalle del servidor', code: 'OTRO' }), /No se pudo guardar\. Revisa/],
    [httpError(400, { message: 'detalle del servidor', code: 'ATTENDANCE_REASON_REQUIRED' }), /El motivo es obligatorio/],
    [httpError(409, { message: 'detalle del servidor', code: 'ATTENDANCE_JUSTIFICATION_APPROVED' }), /justificación aprobada/],
    [httpError(409, { message: 'detalle del servidor' }), /Conflicto al guardar/]
  ];
  for (const [reply, expected] of cases) {
    await withAdapter(routes({ rows: [['PRESENTE'], ['TARDANZA']], put: () => reply }), async calls => {
      await renderWithSession(view(), async r => {
        await click(mark(r, 'Falta', 'Ana Arias'));
        await typeReason(r, 'Corrección');
        await act(async () => { await saveButton(r).props.onClick(); }); await settle();
        assert.equal(puts(calls).length, 1);
        assert.match(alerts(r), expected);
        assert.ok(!alerts(r).includes('detalle del servidor'));
        assert.ok(!text(r.root).includes('se guardó correctamente'));
        assert.equal(r.root.findByProps({ id: 'attendance-reason-input' }).props.value, 'Corrección', 'el motivo se conserva para reintentar');
      });
    });
  }
});
