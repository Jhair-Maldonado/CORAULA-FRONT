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
  managementJustificationErrorMessage,
  etiquetaEstudiante,
} from '../src/services/admin/managementAttendanceJustificationsService';
import { parseAttendanceJustification } from '../src/lib/guardianContract';
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

// ── Cierre FRONT #57 ────────────────────────────────────────────────────────
const SERVER_TEXT = 'texto interno del servidor que nunca se muestra';
const okReply = (config: InternalAxiosRequestConfig, data: unknown) => ({ data, status: 200, statusText: '', headers: {}, config } as AxiosResponse);
function errorReply(config: InternalAxiosRequestConfig, status: number, code?: string): never {
  const response = {
    data: { error: 'Error', message: SERVER_TEXT, ...(code ? { code } : {}) }, status, statusText: '', headers: {}, config,
  } as AxiosResponse;
  throw new AxiosError('error', 'ERR_BAD_REQUEST', config, undefined, response);
}
function axiosFailure(status: number, code?: string) {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  try { errorReply(config, status, code); } catch (error) { return error; }
  throw new Error('unreachable');
}

test('errores de gestión: mensajes propios por acción, sin textos del apoderado ni del servidor', () => {
  const cases: [unknown, Parameters<typeof managementJustificationErrorMessage>[1], RegExp][] = [
    [axiosFailure(403), 'decide', /Solo un directivo puede resolver justificaciones/],
    [axiosFailure(403), 'list', /no tiene permiso para consultar las justificaciones/],
    [axiosFailure(409, 'INVALID_JUSTIFICATION_TRANSITION'), 'decide', /ya fue resuelta o cambió de estado/],
    [axiosFailure(409, 'ATTENDANCE_NOT_ELIGIBLE'), 'decide', /ya no admite justificación/],
    [axiosFailure(400, 'VALIDATION_ERROR'), 'decide', /el comentario es obligatorio/],
    [axiosFailure(404, 'JUSTIFICATION_NOT_FOUND'), 'detail', /La solicitud ya no está disponible/],
    [axiosFailure(500), 'decide', /No se pudo registrar la decisión/],
    [axiosFailure(401), 'list', /La sesión ha expirado/],
  ];
  for (const [error, action, expected] of cases) {
    const message = managementJustificationErrorMessage(error, action);
    assert.match(message, expected, `${action} ${message}`);
    assert.ok(!message.includes(SERVER_TEXT));
    assert.doesNotMatch(message, /apoderado|motivo/i);
  }
});

test('servicio de gestión: una decisión cuya respuesta no refleja el estado pedido es un error de contrato', async () => {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => okReply(config, sampleJustification(30, { status: 'PENDIENTE' }));
  try {
    await assert.rejects(managementAttendanceJustificationsService.decide(30, { decision: 'APROBADA', comment: 'Conforme' }));
  } finally {
    httpClient.defaults.adapter = original;
  }
});

test('parser: studentName y studentCode son opcionales; si llegan con otro tipo rompen el contrato', () => {
  const base = { ...sampleJustification(40) } as Record<string, unknown>;
  assert.equal(parseAttendanceJustification(base).studentName, undefined);
  const withName = parseAttendanceJustification({ ...base, studentName: 'Ana Arias Demo', studentCode: 'C26000057' });
  assert.equal(withName.studentName, 'Ana Arias Demo');
  assert.equal(withName.studentCode, 'C26000057');
  assert.throws(() => parseAttendanceJustification({ ...base, studentName: 57 }));
  assert.deepEqual(etiquetaEstudiante({ studentId: 57 }), { nombre: 'Estudiante #57', codigo: null });
  assert.deepEqual(etiquetaEstudiante({ studentId: 57, studentName: '  ', studentCode: null }), { nombre: 'Estudiante #57', codigo: null });
});

test('bandeja gestión: muestra nombre y código si vienen; si no, «Estudiante #id»', async () => {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => okReply(config, pageOf([
    sampleJustification(50, { studentName: 'Ana Arias Demo', studentCode: 'C26000057' } as Partial<AttendanceJustification>),
    sampleJustification(51, { studentId: 58 }),
  ]));
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<AuthContext.Provider value={authFor('DIRECTIVO')}><VistaBandejaJustificaciones /></AuthContext.Provider>);
    });
    const out = textOf(renderer.root);
    assert.match(out, /Ana Arias Demo/);
    assert.match(out, /C26000057/);
    assert.match(out, /Estudiante #58/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

test('bandeja gestión: ADMINISTRADOR abre una PENDIENTE desde la bandeja y no ve botones de decisión', async () => {
  const original = httpClient.defaults.adapter;
  const just = sampleJustification(52, { status: 'PENDIENTE' });
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) =>
    String(config.url).endsWith('/52') ? okReply(config, just) : okReply(config, pageOf([just]));
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<AuthContext.Provider value={authFor('ADMINISTRADOR')}><VistaBandejaJustificaciones /></AuthContext.Provider>);
    });
    const open = renderer.root.find(n => n.type === 'button' && textOf(n) === 'Ver detalle');
    await act(async () => { open.props.onClick(); });
    const out = textOf(renderer.root);
    assert.match(out, /Detalle de justificación #52/);
    assert.equal(renderer.root.findAll(n => n.type === 'button' && /Aprobar|Observar|Rechazar/.test(textOf(n))).length, 0);
    assert.equal(renderer.root.findAll(n => n.type === 'form' || n.type === 'textarea').length, 0);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

async function decideWith(status: number, code?: string): Promise<{ text: string; successCalls: number }> {
  const original = httpClient.defaults.adapter;
  const just = sampleJustification(60, { status: 'PENDIENTE' });
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) =>
    config.url?.endsWith('/decision') ? errorReply(config, status, code) : okReply(config, just);
  let renderer!: ReactTestRenderer;
  let successCalls = 0;
  try {
    await act(async () => {
      renderer = create(<ModalDetalleJustificacion justificationId={60} canDecide onClose={() => {}} onDecisionSuccess={() => { successCalls++; }} />);
    });
    const reject = renderer.root.find(n => n.type === 'button' && textOf(n).includes('Rechazar'));
    await act(async () => { reject.props.onClick(); });
    await act(async () => { renderer.root.findByProps({ id: 'decision-comment' }).props.onChange({ target: { value: 'No procede.' } }); });
    await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault: () => {} }); });
    const alertNode = renderer.root.find(n => n.props.role === 'alert');
    return { text: textOf(alertNode), successCalls };
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
}

test('modal detalle: una decisión rechazada (409/403) muestra un mensaje fijo de gestión', async () => {
  const conflict = await decideWith(409, 'INVALID_JUSTIFICATION_TRANSITION');
  assert.match(conflict.text, /ya fue resuelta o cambió de estado/);
  assert.ok(!conflict.text.includes(SERVER_TEXT));
  assert.equal(conflict.successCalls, 0);
  const forbidden = await decideWith(403);
  assert.match(forbidden.text, /Solo un directivo puede resolver justificaciones/);
  assert.doesNotMatch(forbidden.text, /apoderado/);
});

test('modal detalle: un error de descarga se muestra en el modal, sin alert()', async () => {
  const original = httpClient.defaults.adapter;
  const alerts: unknown[] = [];
  const originalAlert = globalThis.alert;
  Object.assign(globalThis, { alert: (m: unknown) => { alerts.push(m); } });
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) =>
    String(config.url).endsWith('/download-url') ? errorReply(config, 503, 'FILE_STORAGE_UNAVAILABLE') : okReply(config, sampleJustification(61));
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<ModalDetalleJustificacion justificationId={61} canDecide={false} onClose={() => {}} />); });
    const download = renderer.root.find(n => n.type === 'button' && textOf(n).includes('Descargar'));
    await act(async () => { await download.props.onClick(); });
    assert.match(textOf(renderer.root.find(n => n.props.role === 'alert')), /almacenamiento de archivos no está disponible/);
    assert.equal(alerts.length, 0);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
    Object.assign(globalThis, { alert: originalAlert });
  }
});

test('bandeja gestión: cambiar de pestaña cancela la consulta anterior y su respuesta no pisa a la nueva', async () => {
  const original = httpClient.defaults.adapter;
  let releaseFirst!: () => void;
  const signals: AbortSignal[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    signals.push(config.signal as AbortSignal);
    if (config.params?.status === 'PENDIENTE') {
      await new Promise<void>(resolve => { releaseFirst = resolve; });
      return okReply(config, pageOf([sampleJustification(70, { courseName: 'Curso viejo' })]));
    }
    return okReply(config, pageOf([sampleJustification(71, { status: 'APROBADA', courseName: 'Curso nuevo' })]));
  };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<AuthContext.Provider value={authFor('DIRECTIVO')}><VistaBandejaJustificaciones /></AuthContext.Provider>);
    });
    const tab = renderer.root.find(n => n.type === 'button' && textOf(n) === 'Aprobadas');
    await act(async () => { tab.props.onClick(); });
    assert.equal(signals[0].aborted, true);
    await act(async () => { releaseFirst(); });
    const out = textOf(renderer.root);
    assert.match(out, /Curso nuevo/);
    assert.doesNotMatch(out, /Curso viejo/);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});
