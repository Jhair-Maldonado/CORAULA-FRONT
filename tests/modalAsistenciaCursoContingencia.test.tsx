import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import ModalAsistenciaCurso from '../feature/docente/vistas/cursos/ModalAsistenciaCurso';
import { teacherAttendanceService, teacherAttendanceErrorMessage } from '../src/services/teacher/teacherAttendanceService';
import { teacherCoursesService } from '../src/services/teacher/teacherCoursesService';
import httpClient from '../src/services/httpClient';
import type { TeacherCourseStudentResponse } from '../src/types/teacherCoursesApi';
import type { TeacherAttendanceResponse } from '../src/types/teacherAttendanceApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Call = { method?: string; url?: string; params?: Record<string, unknown>; data?: unknown };
type Handler = (call: Call) => { status: number; data: unknown; headers?: Record<string, string> } | Promise<never>;

async function withAdapter(handler: Handler, fn: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config) => {
    const call: Call = {
      method: config.method?.toUpperCase(),
      url: config.url,
      params: config.params as Record<string, unknown>,
      data: config.data ? JSON.parse(config.data as string) : undefined
    };
    calls.push(call);
    const res = await handler(call);
    return {
      data: res.data,
      status: res.status,
      statusText: 'OK',
      headers: res.headers ?? {},
      config,
    } as AxiosResponse;
  };
  try {
    await fn(calls);
  } finally {
    httpClient.defaults.adapter = original;
  }
}

test('teacherAttendanceErrorMessage sanitizes attendance justification errors', () => {
  const causeError = new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    data: {
      code: 'ATTENDANCE_CONTINGENCY_CAUSE_REQUIRED',
      message: 'Detalle interno'
    }
  } as AxiosResponse);
  assert.equal(
    teacherAttendanceErrorMessage(causeError),
    'La causa de contingencia es obligatoria al registrar asistencia sin lector biométrico.'
  );

  const reasonError = new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    data: {
      code: 'ATTENDANCE_REASON_REQUIRED',
      message: 'Detalle interno'
    }
  } as AxiosResponse);
  assert.equal(
    teacherAttendanceErrorMessage(reasonError),
    'El motivo es obligatorio al registrar o corregir asistencia manualmente.'
  );
});

test('teacherAttendanceService.saveAttendance sends contingencyCause and reason in payload', async () => {
  await withAdapter(
    call => {
      assert.equal(call.method, 'PUT');
      assert.equal(call.url, '/v1/teacher/courses/10/attendance/99');
      assert.deepEqual(call.params, { date: '2026-10-29' });
      assert.deepEqual(call.data, {
        records: [{ enrollmentId: 101, status: 'PRESENTE' }],
        reason: 'Registro regular en aula',
        contingencyCause: 'LECTOR_NO_DISPONIBLE'
      });
      return { status: 200, data: {} };
    },
    async calls => {
      await teacherAttendanceService.saveAttendance(10, 99, '2026-10-29', {
        records: [{ enrollmentId: 101, status: 'PRESENTE' }],
        reason: 'Registro regular en aula',
        contingencyCause: 'LECTOR_NO_DISPONIBLE'
      });
      assert.equal(calls.length, 1);
    }
  );
});

test('ModalAsistenciaCurso displays contingency cause selector with LECTOR_NO_DISPONIBLE by default', async () => {
  const students: TeacherCourseStudentResponse[] = [
    { enrollmentId: 101, studentId: 1, studentCode: 'E101', fullName: 'Carlos Ramos' }
  ];
  const attendance: TeacherAttendanceResponse = {
    sectionCourseId: 10,
    courseName: 'Ciencias',
    grade: 1,
    sectionName: 'A',
    date: '2026-10-29',
    sessions: [
      {
        scheduleId: 99,
        startTime: '08:00',
        endTime: '09:30',
        classroom: 'Aula 1',
        totalStudents: 1,
        presentCount: 0,
        lateCount: 0,
        absenceCount: 0,
        pendingCount: 1,
        students: [
          { enrollmentId: 101, studentId: 1, studentCode: 'E101', fullName: 'Carlos Ramos', attendanceId: null, status: null }
        ]
      }
    ]
  };

  await withAdapter(
    call => {
      if (call.url?.includes('/students')) {
        return { status: 200, data: students };
      }
      if (call.url?.includes('/attendance')) {
        return { status: 200, data: attendance };
      }
      return { status: 200, data: {} };
    },
    async () => {
      let renderer: any;
      await act(async () => {
        renderer = create(
          <ModalAsistenciaCurso
            isOpen={true}
            onClose={() => {}}
            sectionCourseId={10}
            courseName="Ciencias"
            gradeSectionSubtitle="1° A"
          />
        );
      });

      const root = renderer.root;
      const select = root.findByProps({ id: 'contingency-cause-select' });
      assert.equal(select.props.value, 'LECTOR_NO_DISPONIBLE');

      const reasonInput = root.findByProps({ id: 'attendance-reason-input' });
      assert.equal(reasonInput.props.value, '');
      assert.equal(reasonInput.props.maxLength, 255);
    }
  );
});
