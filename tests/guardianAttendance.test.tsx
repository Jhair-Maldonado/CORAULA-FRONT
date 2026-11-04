import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { attendanceRangeError, getGuardianAttendance } from '../src/services/padres/guardianAttendanceService';
import { GuardianAttendanceReport } from '../feature/padre/vistas/asistencia/vistaPrincipalAsistencia';
import type { GuardianAttendanceResponse } from '../src/types/guardianAttendanceApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// Fuera del App Router, next/link usa requestIdleCallback (self) aunque prefetch={false}: mismo patrón que el resto de pruebas.
if (typeof globalThis.self === 'undefined') Object.assign(globalThis, { self: globalThis });

const RESPONSE: GuardianAttendanceResponse = {
  studentId: 57,
  from: '2026-10-01',
  to: '2026-10-31',
  summary: { total: 2, present: 1, late: 0, absent: 1 },
  records: [
    { date: '2026-10-05', courseName: 'Matemática', startTime: '08:00', endTime: '09:30', status: 'PRESENTE', attendanceId: 501, justified: false, justification: null },
    { date: '2026-10-06', courseName: 'Historia', startTime: '10:00', endTime: '11:30', status: 'INASISTENCIA', attendanceId: 502, justified: false, justification: null },
  ],
};

function text(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
}

test('consulta asistencia con el contrato real y muestra el resumen y sesiones del backend', async () => {
  const original = httpClient.defaults.adapter;
  const requests: { url?: string; params?: unknown }[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    requests.push({ url: config.url, params: config.params });
    return { data: RESPONSE, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };
  try {
    const data = await getGuardianAttendance('57', '2026-10-01', '2026-10-31');
    assert.deepEqual(requests, [{
      url: '/v1/guardian/students/57/attendance',
      params: { from: '2026-10-01', to: '2026-10-31' },
    }]);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<GuardianAttendanceReport data={data} />); });
    const output = text(renderer.root);
    assert.match(output, /Presentes1/);
    assert.match(output, /Inasistencias1/);
    assert.match(output, /Matemática · 08:00–09:30/);
    assert.match(output, /Historia · 10:00–11:30/);
    assert.ok(output.indexOf('2026-10-06') < output.indexOf('2026-10-05'));
    // «Justificar» solo en la inasistencia; el enlace lleva el hijo y no se precarga.
    const links = renderer.root.findAll(n => typeof n.props.href === 'string' && n.props.href.startsWith('/padre/justificacion'));
    const hrefs = [...new Set(links.map(n => n.props.href as string))];
    assert.deepEqual(hrefs, ['/padre/justificacion?studentId=57&attendanceId=502&date=2026-10-06&course=Historia&status=INASISTENCIA']);
    assert.ok(links.every(n => n.props.prefetch === false || n.type === 'a'));
    act(() => renderer.unmount());
  } finally {
    httpClient.defaults.adapter = original;
  }
});

test('valida 92 días inclusive y evita llamadas con rangos o estudiantes inválidos', async () => {
  assert.equal(attendanceRangeError('2026-01-01', '2026-04-02'), null);
  assert.equal(attendanceRangeError('2026-01-01', '2026-04-03'), 'El rango no puede superar 92 días.');
  assert.equal(attendanceRangeError('2026-02-30', '2026-03-01'), 'Seleccione un rango de fechas válido.');
  const original = httpClient.defaults.adapter;
  let calls = 0;
  httpClient.defaults.adapter = async config => { calls++; throw new Error(`unexpected ${config.url}`); };
  try {
    await assert.rejects(getGuardianAttendance('57', '2026-01-01', '2026-04-03'), /92 días/);
    await assert.rejects(getGuardianAttendance('hijo-002', '2026-10-01', '2026-10-31'), /estudiante vinculado/);
    assert.equal(calls, 0);
  } finally {
    httpClient.defaults.adapter = original;
  }
});

test('una revocación de vínculo no muestra datos ni mensajes internos del servidor', async () => {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    const response = { data: { message: 'detalle sensible' }, status: 404, statusText: '', headers: {}, config } as AxiosResponse;
    throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, response);
  };
  try {
    await assert.rejects(getGuardianAttendance('57', '2026-10-01', '2026-10-31'), {
      message: 'El estudiante ya no está vinculado a tu cuenta.',
    });
  } finally {
    httpClient.defaults.adapter = original;
  }
});
