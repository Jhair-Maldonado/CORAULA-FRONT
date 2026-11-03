import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { AuthContext } from '../src/contexts/AuthContext';
import VistaBandejaJustificaciones from '../feature/admin/vistas/(administrativo)/justificaciones/vistaBandejaJustificaciones';
import { ModalDetalleJustificacion } from '../feature/admin/vistas/(administrativo)/justificaciones/component/modalDetalleJustificacion';
import {
  managementAttendanceJustificationsService,
  justificationDecisionError,
} from '../src/services/admin/managementAttendanceJustificationsService';
import type { AttendanceJustification, AttendanceJustificationsPage } from '../src/types/guardianJustificationsApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const sampleJustification = (id = 1, over: Partial<AttendanceJustification> = {}): AttendanceJustification => ({
  id,
  attendanceId: 201,
  studentId: 57,
  date: '2026-05-20',
  courseName: 'Ciencias',
  attendanceStatus: 'INASISTENCIA',
  reason: 'Gripe severa con descanso médico',
  status: 'PENDIENTE',
  attachmentName: 'descanso.pdf',
  attachmentMimeType: 'application/pdf',
  attachmentSizeBytes: 15360,
  reviewComment: null,
  response: null,
  createdAt: '2026-05-20T10:00:00Z',
  updatedAt: '2026-05-20T10:00:00Z',
  history: [
    { from: null, to: 'PENDIENTE', comment: 'Presentada', at: '2026-05-20T10:00:00Z' },
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

function authFor(role: 'DIRECTIVO' | 'ADMINISTRADOR' | 'DOCENTE' | 'APODERADO'): any {
  return {
    user: { id: '1', email: 'test@school.edu', role, name: 'Usuario Prueba' } as any,
    role,
    status: 'authenticated',
    sessionValid: true,
    login: async () => {},
    logout: () => {},
    checkSession: async () => true,
    token: 'jwt-token',
  };
}

test('servicio de gestión: list, detail, decide y attachmentUrl', async () => {
  const original = httpClient.defaults.adapter;
  const calls: Array<{ method: string; url: string; data?: unknown }> = [];

  const just = sampleJustification(10);
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push({ method: String(config.method).toUpperCase(), url: String(config.url), data: config.data });
    if (config.url?.endsWith('/decision')) {
      const updated = { ...just, status: 'APROBADA' as const, reviewComment: 'Aprobado conforme' };
      return { data: updated, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    if (config.url?.endsWith('/download-url')) {
      return { data: { url: 'https://example.com/descanso.pdf', expiresInSeconds: 300 }, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    if (config.url?.includes('/attendance-justifications/10')) {
      return { data: just, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    return { data: pageOf([just]), status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  try {
    const listRes = await managementAttendanceJustificationsService.list({ status: 'PENDIENTE' });
    assert.equal(listRes.content.length, 1);
    assert.equal(calls[0].url, '/v1/management/attendance-justifications');

    const detailRes = await managementAttendanceJustificationsService.detail(10);
    assert.equal(detailRes.id, 10);

    const decideRes = await managementAttendanceJustificationsService.decide(10, {
      decision: 'APROBADA',
      comment: 'Aprobado conforme',
    });
    assert.equal(decideRes.status, 'APROBADA');

    const urlRes = await managementAttendanceJustificationsService.attachmentUrl(10);
    assert.equal(urlRes.url, 'https://example.com/descanso.pdf');

    // Validación de decisión
    assert.match(justificationDecisionError('APROBADA', '  ') ?? '', /comentario.*obligatorio/);
    assert.match(justificationDecisionError('INVALID' as any, 'comentario') ?? '', /decisión válida/);
  } finally {
    httpClient.defaults.adapter = original;
  }
});

test('bandeja gestión: DIRECTIVO ve solicitudes con acción Resolver', async () => {
  const original = httpClient.defaults.adapter;
  const just = sampleJustification(15, { status: 'PENDIENTE' });

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    return { data: pageOf([just]), status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <AuthContext.Provider value={authFor('DIRECTIVO')}>
          <VistaBandejaJustificaciones />
        </AuthContext.Provider>
      );
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /Bandeja de justificaciones de asistencia/);
    assert.match(rootText, /Revisa y resuelve las solicitudes/);
    assert.match(rootText, /Resolver/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('bandeja gestión: ADMINISTRADOR ve bandeja solo lectura (Ver detalle)', async () => {
  const original = httpClient.defaults.adapter;
  const just = sampleJustification(16, { status: 'PENDIENTE' });

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    return { data: pageOf([just]), status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <AuthContext.Provider value={authFor('ADMINISTRADOR')}>
          <VistaBandejaJustificaciones />
        </AuthContext.Provider>
      );
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /solo lectura/);
    assert.match(rootText, /Ver detalle/);
    assert.doesNotMatch(rootText, /Resolver/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('bandeja gestión: rol no autorizado muestra mensaje de denegación', async () => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <AuthContext.Provider value={authFor('DOCENTE')}>
        <VistaBandejaJustificaciones />
      </AuthContext.Provider>
    );
  });

  const rootText = textOf(renderer.root);
  assert.match(rootText, /No tienes acceso a la bandeja de justificaciones/);
  act(() => { renderer.unmount(); });
});

test('modal detalle: DIRECTIVO ve sección de resolución y puede aprobar con comentario', async () => {
  const original = httpClient.defaults.adapter;
  const just = sampleJustification(20, { status: 'PENDIENTE' });
  let decisionSent: any = null;

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (config.url?.endsWith('/decision')) {
      decisionSent = JSON.parse(config.data);
      return { data: { ...just, status: 'APROBADA' as const }, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
    }
    return { data: just, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <ModalDetalleJustificacion
          justificationId={20}
          canDecide={true}
          onClose={() => {}}
          onDecisionSuccess={() => {}}
        />
      );
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /Resolución de la solicitud \(Directivo\)/);
    assert.match(rootText, /Aprobar/);
    assert.match(rootText, /Observar/);
    assert.match(rootText, /Rechazar/);

    // Hacer clic en "Aprobar"
    const approveBtn = renderer.root.findAll(n => n.type === 'button' && textOf(n).includes('Aprobar'))[0];
    assert.ok(approveBtn);
    await act(async () => {
      approveBtn.props.onClick();
    });

    // Ingresar comentario
    const textarea = renderer.root.findByProps({ id: 'decision-comment' });
    await act(async () => {
      textarea.props.onChange({ target: { value: 'Comprobante médico verificado y válido.' } });
    });

    // Enviar formulario
    const form = renderer.root.findByType('form');
    await act(async () => {
      await form.props.onSubmit({ preventDefault: () => {} });
    });

    assert.deepEqual(decisionSent, {
      decision: 'APROBADA',
      comment: 'Comprobante médico verificado y válido.',
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('modal detalle: ADMINISTRADOR ve detalle pero NO la sección de resolución', async () => {
  const original = httpClient.defaults.adapter;
  const just = sampleJustification(25, { status: 'PENDIENTE' });

  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    return { data: just, status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };

  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(
        <ModalDetalleJustificacion
          justificationId={25}
          canDecide={false}
          onClose={() => {}}
        />
      );
    });

    const rootText = textOf(renderer.root);
    assert.match(rootText, /Detalle de justificación #25/);
    assert.match(rootText, /Gripe severa con descanso médico/);
    assert.doesNotMatch(rootText, /Resolución de la solicitud \(Directivo\)/);
    assert.doesNotMatch(rootText, /Confirmar aprobada/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});
