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

// ── Cierre FRONT #57 ────────────────────────────────────────────────────────
const SERVER_TEXT = 'texto interno del servidor que nunca se muestra';
function errorReply(config: InternalAxiosRequestConfig, status: number, code?: string): never {
  const response = {
    data: { error: 'Error', message: SERVER_TEXT, ...(code ? { code } : {}) }, status, statusText: '', headers: {}, config,
  } as AxiosResponse;
  throw new AxiosError('error', 'ERR_BAD_REQUEST', config, undefined, response);
}

async function submitWith(code: string, status: number): Promise<string> {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => errorReply(config, status, code);
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<ModalFormularioJustificacion mode="submit" studentId="57" attendanceId={202} onClose={() => {}} onSuccess={() => {}} />);
    });
    await act(async () => { renderer.root.findByProps({ id: 'justificacion-texto' }).props.onChange({ target: { value: 'Motivo válido.' } }); });
    await act(async () => { await renderer.root.findByType('form').props.onSubmit({ preventDefault: () => {} }); });
    return textOf(renderer.root);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
}

test('modal formulario: mensajes fijos para ALREADY_ACTIVE, NOT_ELIGIBLE y STUDENT_NOT_FOUND, sin el texto del servidor', async () => {
  const cases: [string, number, RegExp][] = [
    ['JUSTIFICATION_ALREADY_ACTIVE', 409, /Ya existe una solicitud vigente para esta sesión/],
    ['ATTENDANCE_NOT_ELIGIBLE', 409, /Esta sesión ya no admite justificación/],
    ['STUDENT_NOT_FOUND', 404, /El estudiante ya no está vinculado a tu cuenta/],
    ['JUSTIFICATION_DEADLINE_EXPIRED', 409, /Venció el plazo para justificar esta sesión/],
  ];
  for (const [code, status, expected] of cases) {
    const out = await submitWith(code, status);
    assert.match(out, expected, code);
    assert.ok(!out.includes(SERVER_TEXT), code);
  }
});

test('modal formulario: rechaza en el cliente archivos de más de 15 MB o de tipo no permitido, sin enviar', async () => {
  const original = httpClient.defaults.adapter;
  let calls = 0;
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => { calls++; throw new Error(`unexpected ${config.url}`); };
  const big = new File(['x'], 'constancia.pdf', { type: 'application/pdf' });
  Object.defineProperty(big, 'size', { value: 15 * 1024 * 1024 + 1 });
  const exe = new File(['x'], 'programa.exe', { type: 'application/x-msdownload' });
  const disfrazado = new File(['x'], 'foto.png', { type: 'application/pdf' });
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<ModalFormularioJustificacion mode="submit" studentId="57" attendanceId={202} onClose={() => {}} onSuccess={() => {}} />);
    });
    const cases: [File, RegExp][] = [[big, /supera los 15 MB/], [exe, /Solo se admiten archivos PDF, JPEG o PNG/], [disfrazado, /Solo se admiten archivos PDF, JPEG o PNG/]];
    for (const [file, expected] of cases) {
      const input = renderer.root.find(n => n.type === 'input' && n.props.type === 'file');
      await act(async () => { input.props.onChange({ target: { files: [file], value: 'x' } }); });
      assert.match(textOf(renderer.root), expected, file.name);
    }
    assert.equal(calls, 0);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
});

async function renderVista(params: string, adapter: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>, replaced: string[] = []) {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = adapter;
  const spyRouter = { ...router, replace: (href: string) => { replaced.push(href); } } as unknown as AppRouterInstance;
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(
      <AppRouterContext.Provider value={spyRouter}>
        <SearchParamsContext.Provider value={new URLSearchParams(params)}>
          <PadreProvider>
            <VistaPrincipalJustificacion />
          </PadreProvider>
        </SearchParamsContext.Provider>
      </AppRouterContext.Provider>
    );
  });
  return {
    renderer,
    cleanup: async () => { await act(async () => { renderer.unmount(); }); httpClient.defaults.adapter = original; },
  };
}

const okReply = (config: InternalAxiosRequestConfig, data: unknown) => ({ data, status: 200, statusText: '', headers: {}, config } as AxiosResponse);

test('vista apoderado: «Justificar» abre el formulario solo si el enlace es del hijo activo; cerrar limpia la URL', async () => {
  const adapter = async (config: InternalAxiosRequestConfig) =>
    config.url === '/v1/guardian/students' ? okReply(config, [ANA]) : okReply(config, pageOf([]));
  const ajeno = await renderVista('studentId=58&attendanceId=202&date=2026-05-20&course=Historia&status=INASISTENCIA', adapter);
  try {
    assert.equal(ajeno.renderer.root.findAll(n => n.props.id === 'justificacion-texto').length, 0);
  } finally { await ajeno.cleanup(); }

  const replaced: string[] = [];
  const propio = await renderVista('studentId=57&attendanceId=202&date=2026-05-20&course=Historia&status=INASISTENCIA', adapter, replaced);
  try {
    assert.equal(propio.renderer.root.findAll(n => n.props.id === 'justificacion-texto').length, 1);
    assert.match(textOf(propio.renderer.root), /Historia/);
    const modal = propio.renderer.root.findByType(ModalFormularioJustificacion);
    await act(async () => { modal.props.onClose(); });
    assert.deepEqual(replaced, ['/padre/justificacion']);
    assert.equal(propio.renderer.root.findAll(n => n.props.id === 'justificacion-texto').length, 0);
  } finally { await propio.cleanup(); }
});

test('vista apoderado: «Ver justificación» muestra la solicitud destacada aunque no esté en la página', async () => {
  const destacada = sampleJustification(77, { status: 'OBSERVADA', reason: 'Motivo de la solicitud enlazada', reviewComment: 'Adjunte constancia' });
  const requested: string[] = [];
  const view = await renderVista('studentId=57&justificationId=77', async (config: InternalAxiosRequestConfig) => {
    requested.push(String(config.url));
    if (config.url === '/v1/guardian/students') return okReply(config, [ANA]);
    if (config.url === '/v1/guardian/students/57/justifications/77') return okReply(config, destacada);
    return okReply(config, pageOf([]));
  });
  try {
    const section = view.renderer.root.find(n => n.type === 'section' && n.props['aria-label'] === 'Solicitud seleccionada');
    assert.match(textOf(section), /Motivo de la solicitud enlazada/);
    assert.match(textOf(section), /Subsanar observación/);
    assert.ok(requested.includes('/v1/guardian/students/57/justifications/77'));
  } finally { await view.cleanup(); }
});

test('vista apoderado: un error de descarga se muestra en la tarjeta, sin alert()', async () => {
  const alerts: unknown[] = [];
  const originalAlert = globalThis.alert;
  Object.assign(globalThis, { alert: (m: unknown) => { alerts.push(m); } });
  const view = await renderVista('', async (config: InternalAxiosRequestConfig) => {
    if (config.url === '/v1/guardian/students') return okReply(config, [ANA]);
    if (String(config.url).endsWith('/attachment/download-url')) return errorReply(config, 404, 'FILE_NOT_FOUND');
    return okReply(config, pageOf([sampleJustification(5)]));
  });
  try {
    const download = view.renderer.root.find(n => n.type === 'button' && n.props.title === 'Descargar documento de sustento');
    await act(async () => { await download.props.onClick(); });
    const alertNode = view.renderer.root.find(n => n.props.role === 'alert');
    assert.match(textOf(alertNode), /El archivo adjunto ya no está disponible/);
    assert.equal(alerts.length, 0);
  } finally {
    await view.cleanup();
    Object.assign(globalThis, { alert: originalAlert });
  }
});

test('vista apoderado: cambiar de filtro cancela la consulta anterior y su respuesta no pisa a la nueva', async () => {
  let releaseFirst!: () => void;
  const signals: AbortSignal[] = [];
  const view = await renderVista('', async (config: InternalAxiosRequestConfig) => {
    if (config.url === '/v1/guardian/students') return okReply(config, [ANA]);
    signals.push(config.signal as AbortSignal);
    if (!config.params?.status) {
      await new Promise<void>(resolve => { releaseFirst = resolve; });
      return okReply(config, pageOf([sampleJustification(1, { reason: 'Respuesta vieja' })]));
    }
    return okReply(config, pageOf([sampleJustification(2, { status: 'OBSERVADA', reason: 'Respuesta nueva' })]));
  });
  try {
    const tab = view.renderer.root.find(n => n.type === 'button' && textOf(n) === 'Observadas');
    await act(async () => { tab.props.onClick(); });
    assert.equal(signals[0].aborted, true);
    await act(async () => { releaseFirst(); });
    const out = textOf(view.renderer.root);
    assert.match(out, /Respuesta nueva/);
    assert.doesNotMatch(out, /Respuesta vieja/);
  } finally { await view.cleanup(); }
});
