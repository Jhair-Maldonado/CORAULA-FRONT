import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import type { AxiosResponse } from 'axios';
import ModalAsistenciaCurso from '../feature/docente/vistas/cursos/ModalAsistenciaCurso';
import httpClient from '../src/services/httpClient';
import type { TeacherCourseStudentResponse } from '../src/types/teacherCoursesApi';
import type { TeacherAttendanceResponse, TeacherAttendanceStatus } from '../src/types/teacherAttendanceApi';

// REL-FIX-123: sin simulación biométrica, estado inicial sin INASISTENCIA y payloads de contingencia.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

function text(n: ReactTestInstance): string {
  return n.children.map(c => (typeof c === 'string' ? c : text(c))).join('');
}

const STUDENTS: TeacherCourseStudentResponse[] = [
  { enrollmentId: 101, studentId: 1, studentCode: 'E101', fullName: 'Alumno 1' },
  { enrollmentId: 102, studentId: 2, studentCode: 'E102', fullName: 'Alumno 2' }
];

function attendanceWith(statuses: (TeacherAttendanceStatus | null)[]): TeacherAttendanceResponse {
  return {
    sectionCourseId: 10,
    courseName: 'Ciencias',
    grade: 1,
    sectionName: 'A',
    date: '2026-10-31',
    sessions: [
      {
        scheduleId: 99,
        startTime: '08:00',
        endTime: '09:30',
        classroom: 'Aula 1',
        totalStudents: statuses.length,
        presentCount: 0,
        lateCount: 0,
        absenceCount: 0,
        pendingCount: 0,
        students: statuses.map((status, i) => ({
          enrollmentId: 101 + i,
          studentId: 1 + i,
          studentCode: `E${101 + i}`,
          fullName: `Alumno ${i + 1}`,
          attendanceId: status ? 500 + i : null,
          status
        }))
      }
    ]
  };
}

async function withModal(
  attendance: TeacherAttendanceResponse,
  fn: (root: ReactTestInstance, bodies: unknown[]) => Promise<void>
) {
  const original = httpClient.defaults.adapter;
  const bodies: unknown[] = [];
  httpClient.defaults.adapter = async config => {
    let data: unknown = {};
    if (config.method === 'put') bodies.push(JSON.parse(config.data as string));
    else if (config.url?.includes('/students')) data = STUDENTS;
    else if (config.url?.includes('/attendance')) data = attendance;
    return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
  };
  let renderer!: ReturnType<typeof create>;
  try {
    await act(async () => {
      renderer = create(
        <ModalAsistenciaCurso isOpen onClose={() => {}} sectionCourseId={10} courseName="Ciencias" gradeSectionSubtitle="1° A" />
      );
    });
    await fn(renderer.root, bodies);
  } finally {
    act(() => renderer?.unmount());
    httpClient.defaults.adapter = original;
  }
}

const saveButton = (root: ReactTestInstance) =>
  root.find(n => n.type === 'button' && text(n).includes('Guardar asistencia'));

async function typeReason(root: ReactTestInstance, value: string) {
  await act(async () => {
    root.findByProps({ id: 'attendance-reason-input' }).props.onChange({ target: { value } });
  });
}

async function save(root: ReactTestInstance) {
  await act(async () => {
    await saveButton(root).props.onClick();
  });
}

test('no biometric simulation with NEXT_PUBLIC_USE_MOCKS=false', async () => {
  await withModal(attendanceWith([null, null]), async root => {
    assert.equal(root.findAll(n => n.props.id === 'biometric-switch').length, 0);
    assert.equal(root.findAll(n => n.props.title === 'Simular lectura de huella').length, 0);
    const all = text(root);
    assert.ok(!all.includes('Registro biométrico'));
    assert.ok(!all.includes('Huella reconocida'));
    assert.equal(root.findByProps({ id: 'contingency-cause-select' }).props.value, 'LECTOR_NO_DISPONIBLE');
  });
});

test('first capture: nobody starts as INASISTENCIA, reason required, sends cause + trimmed reason', async () => {
  await withModal(attendanceWith([null, null]), async (root, bodies) => {
    const faltaSelected = root.findAll(
      n => n.type === 'button' && n.props.title === 'Falta / Inasistencia' && String(n.props.className).includes('bg-rose-600')
    );
    assert.equal(faltaSelected.length, 0);
    assert.equal(saveButton(root).props.disabled, true);

    await typeReason(root, '  Lector sin energía  ');
    assert.equal(saveButton(root).props.disabled, false);
    await save(root);

    assert.deepEqual(bodies, [
      {
        records: [
          { enrollmentId: 101, status: 'PRESENTE' },
          { enrollmentId: 102, status: 'PRESENTE' }
        ],
        reason: 'Lector sin energía',
        contingencyCause: 'LECTOR_NO_DISPONIBLE'
      }
    ]);
  });
});

test('no session scheduled today: shows a clear error and never announces a saved attendance', async () => {
  const noSession: TeacherAttendanceResponse = { ...attendanceWith([]), sessions: [] };
  await withModal(noSession, async (root, bodies) => {
    await typeReason(root, 'Lector sin energía');
    await save(root);

    assert.deepEqual(bodies, []);
    const all = text(root);
    assert.ok(all.includes('Este curso no tiene una sesión de clase programada para hoy. La asistencia no se registró.'), all);
    assert.ok(!all.includes('Asistencia registrada'));
    assert.equal(saveButton(root).props.disabled, false, 'el botón vuelve a habilitarse');
  });
});

test('correction: keeps saved statuses, no cause, reason required only after a change', async () => {
  await withModal(attendanceWith(['INASISTENCIA', 'TARDANZA']), async (root, bodies) => {
    assert.equal(root.findAll(n => n.props.id === 'contingency-cause-select').length, 0);
    assert.equal(saveButton(root).props.disabled, false);

    await act(async () => {
      root.findByProps({ 'aria-label': 'Marcar Presente a Alumno 1' }).props.onClick();
    });
    assert.equal(saveButton(root).props.disabled, true);

    await typeReason(root, 'Ingreso justificado');
    await save(root);

    assert.deepEqual(bodies, [
      {
        records: [
          { enrollmentId: 101, status: 'PRESENTE' },
          { enrollmentId: 102, status: 'TARDANZA' }
        ],
        reason: 'Ingreso justificado'
      }
    ]);
  });
});
