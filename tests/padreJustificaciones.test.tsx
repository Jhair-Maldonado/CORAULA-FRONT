import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { PadreProvider } from '../src/components/padres/PadreContext';
import VistaPrincipalJustificacion from '../feature/padre/vistas/justificacion/vistaPrincipalJustificacion';
import { ModalFormularioJustificacion } from '../feature/padre/vistas/justificacion/component/modalFormularioJustificacion';
import type { AttendanceJustification, AttendanceJustificationsPage } from '../src/types/guardianJustificationsApi';
import type { GuardianStudentResponse } from '../src/types/guardianApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
if (typeof globalThis.self === 'undefined') Object.assign(globalThis, { self: globalThis });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const ANA: GuardianStudentResponse = {
  studentId: 57,
  studentCode: 'C26000057',
  fullName: 'Ana Arias Demo',
  grade: 5,
  sectionName: 'A',
};

const sampleJustification = (id = 1, over: Partial<AttendanceJustification> = {}): AttendanceJustification => ({
  id,
  attendanceId: 101,
  studentId: 57,
  date: '2026-05-15',
  courseName: 'Matemática',
  attendanceStatus: 'INASISTENCIA',
  reason: 'Cita médica de emergencia',
  status: 'PENDIENTE',
  attachmentName: 'receta.pdf',
  attachmentMimeType: 'application/pdf',
  attachmentSizeBytes: 2048,
  reviewComment: null,
  response: null,
  createdAt: '2026-05-15T10:00:00Z',
  updatedAt: '2026-05-15T10:00:00Z',
  history: [
    { from: null, to: 'PENDIENTE', comment: 'Presentada', at: '2026-05-15T10:00:00Z' },
  ],
  ...over,
});

function pageOf(items: AttendanceJustification[]): AttendanceJustificationsPage {
  return {
    content: items,
    page: 0,
    size: 20,
    totalElements: items.length,
    totalPages: 1,
  };
}

function textOf(n: ReactTestInstance): string {
  return n.children.map(c => (typeof c === 'string' ? c : textOf(c))).join('');
}

const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;

test('vista apoderado: lista justificaciones y muestra badges de estado', async () => {
  const original = httpClient.defaults.adapter;
  const just1 = sampleJustification(1, { status: 'PENDIENTE' });
  const just2 = sampleJustification(2, { status: 'OBSERVADA', reviewComment: 'Falta certificado' });

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = String(config.url);
    if (url === '/v1/guardian/students') {
      return { data: [ANA], status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/justifications')) {
      return { data: pageOf([just1, just2]), status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    return { data: {}, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <SearchParamsContext.Provider value={new URLSearchParams()}>
            <PadreProvider>
              <VistaPrincipalJustificacion />
            </PadreProvider>
          </SearchParamsContext.Provider>
        </AppRouterContext.Provider>
      );
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /Justificaciones de asistencia/);
    assert.match(rootText, /Ana Arias Demo/);
    assert.match(rootText, /Cita médica de emergencia/);
    assert.match(rootText, /Pendiente/);
    assert.match(rootText, /Observada/);
    assert.match(rootText, /Falta certificado/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('vista apoderado: estado vacío nombra al hijo activo', async () => {
  const original = httpClient.defaults.adapter;

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = String(config.url);
    if (url === '/v1/guardian/students') {
      return { data: [ANA], status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    if (url.includes('/justifications')) {
      return { data: pageOf([]), status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    return { data: {}, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <SearchParamsContext.Provider value={new URLSearchParams()}>
            <PadreProvider>
              <VistaPrincipalJustificacion />
            </PadreProvider>
          </SearchParamsContext.Provider>
        </AppRouterContext.Provider>
      );
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /Ana.*no tiene solicitudes de justificación registradas/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('modal formulario: valida motivo requerido y envía POST con multipart', async () => {
  const original = httpClient.defaults.adapter;
  let postedUrl = '';
  let postedBody: any = null;

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    postedUrl = String(config.url);
    postedBody = config.data as FormData;
    const created = sampleJustification(5, { attendanceId: 202 });
    return { data: created, status: 201, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  let successResult: any = null;

  try {
    await act(async () => {
      renderer = create(
        <ModalFormularioJustificacion
          mode="submit"
          studentId="57"
          attendanceId={202}
          sessionInfo={{ date: '2026-05-18', courseName: 'Comunicación', status: 'INASISTENCIA' }}
          onClose={() => {}}
          onSuccess={(r) => { successResult = r; }}
        />
      );
    });

    // Validar título y sesión
    const rootText = textOf(renderer.root);
    assert.match(rootText, /Justificar inasistencia o tardanza/);
    assert.match(rootText, /2026-05-18/);

    // Escribir motivo
    const textarea = renderer.root.findByProps({ id: 'justificacion-texto' });
    await act(async () => {
      textarea.props.onChange({ target: { value: 'Problemas de salud con reposo médico domiciliario.' } });
    });

    // Enviar formulario
    const form = renderer.root.findByType('form');
    await act(async () => {
      await form.props.onSubmit({ preventDefault: () => {} });
    });

    assert.equal(postedUrl, '/v1/guardian/students/57/attendance/202/justifications');
    assert.ok(postedBody);
    assert.equal(postedBody.get('reason'), 'Problemas de salud con reposo médico domiciliario.');
    assert.equal(successResult?.id, 5);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('modal formulario: responder a justificación observada envía a endpoint /response', async () => {
  const original = httpClient.defaults.adapter;
  let postedUrl = '';
  let postedBody: any = null;

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    postedUrl = String(config.url);
    postedBody = config.data as FormData;
    const updated = sampleJustification(10, { status: 'PENDIENTE', response: 'Adjunto constancia rectificada' });
    return { data: updated, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  let successResult: any = null;

  try {
    await act(async () => {
      renderer = create(
        <ModalFormularioJustificacion
          mode="respond"
          studentId="57"
          justificationId={10}
          sessionInfo={{ date: '2026-05-10', courseName: 'Historia', status: 'TARDANZA' }}
          observationComment="Por favor adjuntar certificado oficial."
          onClose={() => {}}
          onSuccess={(r) => { successResult = r; }}
        />
      );
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /Subsanar observación de justificación/);
    assert.match(rootText, /Por favor adjuntar certificado oficial/);

    const textarea = renderer.root.findByProps({ id: 'justificacion-texto' });
    await act(async () => {
      textarea.props.onChange({ target: { value: 'Se adjunta la constancia oficial del policlínico.' } });
    });

    const form = renderer.root.findByType('form');
    await act(async () => {
      await form.props.onSubmit({ preventDefault: () => {} });
    });

    assert.equal(postedUrl, '/v1/guardian/students/57/justifications/10/response');
    assert.ok(postedBody);
    assert.equal(postedBody.get('response'), 'Se adjunta la constancia oficial del policlínico.');
    assert.equal(successResult?.id, 10);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('modal formulario: muestra mensaje específico si vence el plazo (409 JUSTIFICATION_DEADLINE_EXPIRED)', async () => {
  const original = httpClient.defaults.adapter;

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const errorResponse = {
      data: {
        error: 'Conflict',
        message: 'Deadline expired',
        code: 'JUSTIFICATION_DEADLINE_EXPIRED',
      },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config,
    } as AxiosResponse;
    throw new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, undefined, errorResponse);
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <ModalFormularioJustificacion
          mode="submit"
          studentId="57"
          attendanceId={202}
          onClose={() => {}}
          onSuccess={() => {}}
        />
      );
    });

    const textarea = renderer.root.findByProps({ id: 'justificacion-texto' });
    await act(async () => {
      textarea.props.onChange({ target: { value: 'Motivo de prueba tardío.' } });
    });

    const form = renderer.root.findByType('form');
    await act(async () => {
      await form.props.onSubmit({ preventDefault: () => {} });
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /Venció el plazo para justificar esta sesión/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});
