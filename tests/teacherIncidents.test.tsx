import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import ModalReportarIncidencia from '../feature/docente/vistas/chat/ModalReportarIncidencia';
import VistaIncidenciasDocente from '../feature/docente/vistas/incidencias/vistaIncidenciasDocente';
import VistaChatDocente from '../feature/docente/vistas/chat/vistaChatDocente';
import { DocenteSessionProvider } from '../src/app/docente/components/DocenteSessionContext';
import {
  teacherIncidentsService,
  teacherIncidentsErrorMessage,
  isUncertainIncidentRegistration,
  IncidentInputError,
  limaDateTimeToIso,
  nowLimaDateTimeLocal,
  UNCERTAIN_INCIDENT_MESSAGE
} from '../src/services/teacher/teacherIncidentsService';
import { teacherProfileService } from '../src/services/teacher/teacherProfileService';
import { teacherCoursesService } from '../src/services/teacher/teacherCoursesService';
import httpClient from '../src/services/httpClient';
import type { IncidenciaResponse, RegistrarIncidenciaRequest } from '../src/types/incidenciasApi';

// Fixtures y adaptadores Axios confinados a las pruebas: sin red ni escrituras reales.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
if (typeof globalThis.document === 'undefined') Object.assign(globalThis, { document: { addEventListener() {}, removeEventListener() {} } });

const request: RegistrarIncidenciaRequest = {
  sectionCourseId: 10,
  enrollmentId: 50,
  occurredAt: '2026-10-05T09:30:00-05:00',
  location: '  Patio  ',
  severity: 'MODERADA',
  description: '  Pelea en el patio  ',
  actionsTaken: '   '
};
const incident = (id = 1, overrides: Partial<IncidenciaResponse> = {}): IncidenciaResponse => ({
  id, sectionCourseId: 10, sectionId: 3, enrollmentId: 50, studentId: 5, studentName: 'Ana Torres', studentCode: 'E-5',
  teacherId: 7, teacherName: 'Juan Pérez', occurredAt: '2026-10-05T14:30:00Z', location: 'Patio', severity: 'MODERADA',
  description: 'Pelea en el patio', actionsTaken: null, createdAt: '2026-10-05T15:00:00Z', ...overrides
});
const page = (content: IncidenciaResponse[], p = 0, size = 20, totalElements = content.length) => ({ content, page: p, size, totalElements, totalPages: Math.ceil(totalElements / size) });
const apiError = (status: number, code?: string) => new AxiosError('private', 'ERR_BAD_REQUEST', undefined, undefined, { status, data: { error: 'x', message: 'Detalle técnico', ...(code ? { code } : {}) } } as AxiosResponse);
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK');

type Call = { method?: string; url?: string; params?: Record<string, unknown>; data?: unknown };
type Handler = (call: Call) => { status: number; data: unknown; headers?: Record<string, string> } | Promise<never>;
async function withAdapter(handler: Handler, fn: (calls: Call[]) => Promise<void>) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call = { method: config.method, url: config.url, params: config.params, data: config.data ? JSON.parse(config.data as string) : undefined };
    calls.push(call);
    const res = await handler(call);
    return { config, statusText: 'OK', headers: res.headers ?? {}, status: res.status, data: res.data };
  };
  try { await fn(calls); } finally { httpClient.defaults.adapter = original; }
}
const echo = (call: Call, id = 99) => {
  const body = call.data as RegistrarIncidenciaRequest;
  return incident(id, { sectionCourseId: body.sectionCourseId, enrollmentId: body.enrollmentId, occurredAt: new Date(body.occurredAt).toISOString(), location: body.location, severity: body.severity, description: body.description, actionsTaken: body.actionsTaken });
};

function text(n: ReactTestInstance): string { return n.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
const wait = (ms: number) => act(async () => { await new Promise(res => setTimeout(res, ms)); });
async function waitFor(check: () => boolean, ms = 3000) { for (let t = 0; t < ms && !check(); t += 25) await wait(25); }
const notices = (r: ReactTestRenderer) => r.root.findAll(n => n.props.role === 'status' && typeof n.type === 'string' && text(n).startsWith('Módulo en construcción')).map(text);

// ---------- Servicio ----------

test('service POSTs the exact trimmed DTO to /v1/teacher/incidents and validates the 201 response', async () => {
  await withAdapter(call => ({ status: 201, data: echo(call), headers: { location: '/api/v1/teacher/incidents/99' } }), async calls => {
    const saved = await teacherIncidentsService.registerIncident({ ...request, studentId: 5, evidenceMessageId: 'm1' } as RegistrarIncidenciaRequest);
    assert.equal(saved.id, 99);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'post');
    assert.equal(calls[0].url, '/v1/teacher/incidents');
    assert.deepEqual(calls[0].data, { sectionCourseId: 10, enrollmentId: 50, occurredAt: '2026-10-05T09:30:00-05:00', location: 'Patio', severity: 'MODERADA', description: 'Pelea en el patio', actionsTaken: null });
  });
});

test('service confirms a 201 by the body id whether Location is hidden by CORS or matches', async () => {
  const cases: [Record<string, string | null> | undefined, string][] = [
    [undefined, 'sin cabeceras'],
    [{}, 'Location no expuesta'],
    [{ location: '' }, 'Location vacía'],
    [{ location: null } as unknown as Record<string, string>, 'Location nula'],
    [{ location: '/api/v1/teacher/incidents/99' }, 'Location relativa coincidente'],
    [{ location: 'https://api.coraula.pe/api/v1/teacher/incidents/99' }, 'Location absoluta coincidente']
  ];
  for (const [headers, label] of cases) {
    await withAdapter(call => ({ status: 201, data: echo(call, 99), headers: headers as Record<string, string> | undefined }), async calls => {
      const result = await teacherIncidentsService.registerIncident(request).then(saved => saved, err => err);
      assert.ok(!(result instanceof Error), `${label}: ${result instanceof Error ? result.message : ''}`);
      assert.equal(result.id, 99, label);
      assert.equal(calls.length, 1, label);
    });
  }
  // Si Location llega y apunta a otro id, el resultado no puede confirmarse.
  await withAdapter(call => ({ status: 201, data: echo(call, 99), headers: { location: '/api/v1/teacher/incidents/100' } }), async () => {
    const err = await teacherIncidentsService.registerIncident(request).catch(e => e);
    assert.ok(err instanceof Error);
    assert.equal(isUncertainIncidentRegistration(err), true);
  });
});

test('service treats an unverifiable 201 as uncertain and rejects invalid input without calling the backend', async () => {
  const unverifiable: Handler[] = [
    call => ({ status: 200, data: echo(call) }),
    call => ({ status: 201, data: { ...echo(call), severity: 'MUY_GRAVE' } }),
    call => ({ status: 201, data: { ...echo(call), description: 'otra cosa' } }),
    call => ({ status: 201, data: { ...echo(call), enrollmentId: 51 } }),
    call => ({ status: 201, data: echo(call, 1), headers: { location: '/api/v1/teacher/incidents/2' } })
  ];
  for (const handler of unverifiable) {
    await withAdapter(handler, async () => {
      const err = await teacherIncidentsService.registerIncident(request).catch(e => e);
      assert.ok(err instanceof Error);
      assert.equal(isUncertainIncidentRegistration(err), true);
    });
  }
  await withAdapter(() => { throw new Error('no debe llamarse'); }, async calls => {
    for (const invalid of [{ location: ' ' }, { location: 'x'.repeat(121) }, { description: '' }, { description: 'x'.repeat(1001) }, { actionsTaken: 'x'.repeat(1001) }, { enrollmentId: 0 }, { severity: 'OTRA' }, { occurredAt: '2026-10-05T09:30' }]) {
      const err = await teacherIncidentsService.registerIncident({ ...request, ...invalid } as RegistrarIncidenciaRequest).catch(e => e);
      assert.ok(err instanceof IncidentInputError, JSON.stringify(invalid));
      assert.equal(isUncertainIncidentRegistration(err), false);
    }
    assert.equal(calls.length, 0);
  });
  // Límites aceptados: 120 y 1000 caracteres.
  await withAdapter(call => ({ status: 201, data: echo(call) }), async () => {
    const saved = await teacherIncidentsService.registerIncident({ ...request, location: 'l'.repeat(120), description: 'd'.repeat(1000), actionsTaken: 'a'.repeat(1000) });
    assert.equal(saved.location.length, 120);
  });
});

test('service lists with backend filters, validates the page and rejects bad filters locally', async () => {
  let data: unknown = page([incident(2, { severity: 'GRAVE' }), incident(1, { severity: 'GRAVE' })], 1, 10, 12);
  await withAdapter(() => ({ status: 200, data }), async calls => {
    const result = await teacherIncidentsService.getIncidents({ severity: 'GRAVE', sectionId: 3, dateFrom: '2026-10-01', dateTo: '2026-10-31', page: 1, size: 10 });
    assert.deepEqual(result.content.map(i => i.id), [2, 1]);
    assert.equal(result.totalPages, 2);
    assert.equal(calls[0].url, '/v1/teacher/incidents');
    assert.deepEqual(calls[0].params, { severity: 'GRAVE', sectionId: 3, dateFrom: '2026-10-01', dateTo: '2026-10-31', page: 1, size: 10 });

    await teacherIncidentsService.getIncidents().catch(() => {});
    assert.deepEqual(calls[1].params, { page: 0, size: 20 });

    for (const bad of [page([incident(1), incident(1)]), { ...page([]), page: 3 }, { content: null }, page([{ ...incident(), studentId: -1 }]), page([{ ...incident(), occurredAt: '2026-10-05T09:30:00' }])]) {
      data = bad;
      await assert.rejects(teacherIncidentsService.getIncidents());
    }
    // Un registro que no cumple el filtro pedido invalida la página.
    data = page([incident(1, { severity: 'LEVE' })]);
    await assert.rejects(teacherIncidentsService.getIncidents({ severity: 'GRAVE' }));
    data = page([incident(1, { sectionId: 4 })]);
    await assert.rejects(teacherIncidentsService.getIncidents({ sectionId: 3 }));
    const before = calls.length;
    for (const filters of [{ dateFrom: '2026-10-31', dateTo: '2026-10-01' }, { size: 101 }, { size: 0 }, { page: -1 }, { dateFrom: '2026-02-30' }, { sectionId: 0 }]) {
      await assert.rejects(teacherIncidentsService.getIncidents(filters), IncidentInputError);
    }
    assert.equal(calls.length, before);
  });
});

test('service reads the detail and validates its id', async () => {
  await withAdapter(() => ({ status: 200, data: incident(5) }), async calls => {
    assert.equal((await teacherIncidentsService.getIncident(5)).id, 5);
    assert.equal(calls[0].url, '/v1/teacher/incidents/5');
    await assert.rejects(teacherIncidentsService.getIncident(6));
    await assert.rejects(teacherIncidentsService.getIncident(0), IncidentInputError);
  });
});

test('service maps backend error codes to Spanish messages and flags uncertain POSTs', () => {
  const expected: [string, number, RegExp][] = [
    ['INCIDENT_VALIDATION_ERROR', 400, /Revisa los datos/],
    ['INCIDENT_DATE_IN_FUTURE', 400, /posterior al momento actual/],
    ['INCIDENT_DATE_OUT_OF_RANGE', 400, /fuera del periodo académico/],
    ['TEACHER_CONTEXT_NOT_AVAILABLE', 404, /ya no está asignado/],
    ['ENROLLMENT_NOT_AVAILABLE', 404, /matrícula activa/],
    ['INCIDENT_NOT_FOUND', 404, /no existe/],
    ['INCIDENT_INTERNAL_ERROR', 500, /error en el servidor/]
  ];
  for (const [code, status, message] of expected) {
    const msg = teacherIncidentsErrorMessage(apiError(status, code));
    assert.match(msg, message, code);
    assert.doesNotMatch(msg, /Detalle técnico/);
  }
  assert.match(teacherIncidentsErrorMessage(apiError(401)), /sesión ha expirado/);
  assert.match(teacherIncidentsErrorMessage(apiError(403)), /No tienes permiso/);
  assert.match(teacherIncidentsErrorMessage(networkError()), /No se pudo conectar/);
  assert.equal(isUncertainIncidentRegistration(networkError()), true);
  assert.equal(isUncertainIncidentRegistration(apiError(500, 'INCIDENT_INTERNAL_ERROR')), true);
  assert.equal(isUncertainIncidentRegistration(apiError(400, 'INCIDENT_DATE_IN_FUTURE')), false);
  assert.equal(isUncertainIncidentRegistration(apiError(404, 'ENROLLMENT_NOT_AVAILABLE')), false);
});

test('Lima helpers produce ISO with the fixed -05:00 offset', () => {
  assert.equal(limaDateTimeToIso('2026-10-05T09:30'), '2026-10-05T09:30:00-05:00');
  assert.throws(() => limaDateTimeToIso('2026-10-05'), IncidentInputError);
  assert.equal(nowLimaDateTimeLocal(new Date('2026-10-06T03:15:00Z')), '2026-10-05T22:15');
});

// ---------- Vista ----------

async function withTeacherStubs(fn: () => Promise<void>) {
  const original = { getMe: teacherProfileService.getMe, getCourses: teacherCoursesService.getCourses, getStudents: teacherCoursesService.getStudents };
  teacherProfileService.getMe = async () => ({ id: 7, personId: 1, dni: '1', firstNames: 'Juan', paternalLastName: 'Pérez', maternalLastName: null, fullName: 'Juan Pérez', phone: null, specialty: null, active: true });
  teacherCoursesService.getCourses = async () => [
    { sectionCourseId: 10, assignmentId: 1, courseId: 1, code: 'MAT', name: 'Matemática', level: 'SECONDARY', area: 'Ciencias', weeklyHours: 4, sectionId: 3, grade: 3, sectionName: 'A', studentCount: 1 },
    { sectionCourseId: 11, assignmentId: 2, courseId: 2, code: 'COM', name: 'Comunicación', level: 'SECONDARY', area: 'Letras', weeklyHours: 4, sectionId: 3, grade: 3, sectionName: 'A', studentCount: 1 }
  ];
  teacherCoursesService.getStudents = async () => [{ studentId: 5, studentCode: 'E-5', fullName: 'Ana Torres', enrollmentId: 50 }];
  try { await fn(); } finally {
    teacherProfileService.getMe = original.getMe;
    Object.assign(teacherCoursesService, { getCourses: original.getCourses, getStudents: original.getStudents });
  }
}
async function renderView() {
  let r!: ReactTestRenderer;
  await act(async () => { r = create(<DocenteSessionProvider><VistaIncidenciasDocente /></DocenteSessionProvider>); });
  await waitFor(() => r.root.findAll(n => n.props.placeholder === 'Escribe para buscar por nombre o código...').length > 0 && !text(r.root).includes('Cargando historial'));
  return r;
}
async function fillAndSubmit(r: ReactTestRenderer) {
  await act(async () => { r.root.findByProps({ placeholder: 'Escribe para buscar por nombre o código...' }).props.onFocus(); });
  const option = r.root.findAllByType('button').find(b => text(b).includes('Ana Torres'));
  assert.ok(option);
  await act(async () => { option.props.onClick(); });
  await act(async () => { r.root.findByProps({ list: 'incidencia-lugares' }).props.onChange({ target: { value: 'Biblioteca' } }); });
  await act(async () => { r.root.findAllByType('textarea')[0].props.onChange({ target: { value: '  Pelea en la biblioteca  ' } }); });
  await act(async () => { await r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  await wait(0);
}
const history = (r: ReactTestRenderer) => r.root.find(n => n.type === 'section' && n.props['aria-labelledby'] === 'historial-incidencia-title');

test('incidents view registers against the backend, shows real history and no simulation notice', async () => {
  await withTeacherStubs(async () => {
    let listed = [incident(1, { description: 'Interrupción de clase' })];
    await withAdapter(call => {
      if (call.method === 'post') { const saved = echo(call, 2); listed = [saved, ...listed]; return { status: 201, data: saved }; }
      return { status: 200, data: page(listed, 0, 10) };
    }, async calls => {
      const r = await renderView();
      try {
        assert.deepEqual(notices(r), []);
        assert.doesNotMatch(text(r.root), /Simulación|demostración/);
        assert.ok(text(history(r)).includes('Interrupción de clase'));
        assert.deepEqual(calls[0].params, { page: 0, size: 10 });
        await fillAndSubmit(r);
        const posts = calls.filter(c => c.method === 'post');
        assert.equal(posts.length, 1);
        const body = posts[0].data as Record<string, unknown>;
        assert.deepEqual(Object.keys(body).sort(), ['actionsTaken', 'description', 'enrollmentId', 'location', 'occurredAt', 'sectionCourseId', 'severity']);
        assert.equal(body.sectionCourseId, 10);
        assert.equal(body.enrollmentId, 50);
        assert.equal(body.location, 'Biblioteca');
        assert.equal(body.description, 'Pelea en la biblioteca');
        assert.equal(body.actionsTaken, null);
        assert.match(body.occurredAt as string, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-05:00$/);
        await waitFor(() => text(history(r)).includes('Pelea en la biblioteca'));
        assert.ok(text(r.root).includes('Incidencia registrada para Ana Torres.'));
        assert.ok(text(history(r)).includes('Pelea en la biblioteca'));
        assert.ok(calls.filter(c => c.method === 'get').length >= 2, 'el historial se recarga tras registrar');
      } finally { await act(async () => { r.unmount(); }); }
    });
  });
});

test('incidents view sends severity, section and date filters to the backend and paginates', async () => {
  await withTeacherStubs(async () => {
    await withAdapter(call => ({ status: 200, data: page([incident(1, { severity: (call.params?.severity as IncidenciaResponse['severity']) ?? 'MODERADA' })], (call.params?.page as number) ?? 0, 10, 25) }), async calls => {
      const r = await renderView();
      try {
        const lastGet = () => calls.filter(c => c.method === 'get').at(-1)?.params;
        const pill = history(r).findAllByType('button').find(b => text(b) === 'Grave');
        assert.ok(pill);
        await act(async () => { pill.props.onClick(); });
        await waitFor(() => lastGet()?.severity === 'GRAVE');
        assert.deepEqual(lastGet(), { severity: 'GRAVE', page: 0, size: 10 });
        await act(async () => { r.root.findByProps({ 'aria-label': 'Filtrar por sección' }).props.onChange({ target: { value: '3' } }); });
        await act(async () => { r.root.findByProps({ 'aria-label': 'Fecha desde' }).props.onChange({ target: { value: '2026-10-01' } }); });
        await act(async () => { r.root.findByProps({ 'aria-label': 'Fecha hasta' }).props.onChange({ target: { value: '2026-10-31' } }); });
        await waitFor(() => lastGet()?.dateTo === '2026-10-31');
        assert.deepEqual(lastGet(), { severity: 'GRAVE', sectionId: 3, dateFrom: '2026-10-01', dateTo: '2026-10-31', page: 0, size: 10 });
        // Solo hay una sección distinta aunque existan dos cursos en ella.
        assert.equal(r.root.findByProps({ 'aria-label': 'Filtrar por sección' }).findAllByType('option').length, 2);
        await waitFor(() => text(r.root).includes('Página 1 de 3'));
        const next = r.root.findAllByType('button').find(b => text(b) === 'Siguiente');
        assert.ok(next);
        await act(async () => { next.props.onClick(); });
        await waitFor(() => lastGet()?.page === 1);
        assert.equal(lastGet()?.page, 1);
        // Rango invertido: se valida localmente y no se consulta.
        const before = calls.length;
        await act(async () => { r.root.findByProps({ 'aria-label': 'Fecha desde' }).props.onChange({ target: { value: '2026-11-15' } }); });
        await wait(0);
        assert.equal(calls.length, before);
        assert.ok(text(r.root).includes('La fecha inicial no puede ser posterior a la fecha final.'));
      } finally { await act(async () => { r.unmount(); }); }
    });
  });
});

test('incidents view shows Spanish messages per backend code and keeps the form', async () => {
  for (const [code, status, message] of [
    ['INCIDENT_DATE_IN_FUTURE', 400, 'no puede ser posterior al momento actual'],
    ['INCIDENT_DATE_OUT_OF_RANGE', 400, 'fuera del periodo académico'],
    ['ENROLLMENT_NOT_AVAILABLE', 404, 'ya no tiene una matrícula activa']
  ] as const) {
    await withTeacherStubs(async () => {
      await withAdapter(call => call.method === 'post' ? Promise.reject(apiError(status, code)) : { status: 200, data: page([], 0, 10) }, async calls => {
        const r = await renderView();
        try {
          await fillAndSubmit(r);
          const body = text(r.root);
          assert.ok(body.includes(message), code);
          assert.doesNotMatch(body, /Detalle técnico|Incidencia registrada/);
          assert.equal(r.root.findAllByType('textarea')[0].props.value, '  Pelea en la biblioteca  ');
          assert.equal(calls.filter(c => c.method === 'post').length, 1);
        } finally { await act(async () => { r.unmount(); }); }
      });
    });
  }
});

test('incidents view reports an uncertain result when the POST gets no response and never retries', async () => {
  await withTeacherStubs(async () => {
    await withAdapter(call => call.method === 'post' ? Promise.reject(networkError()) : { status: 200, data: page([], 0, 10) }, async calls => {
      const r = await renderView();
      try {
        await fillAndSubmit(r);
        await wait(50);
        assert.ok(text(r.root).includes(UNCERTAIN_INCIDENT_MESSAGE));
        assert.doesNotMatch(text(r.root), /Incidencia registrada/);
        assert.equal(calls.filter(c => c.method === 'post').length, 1);
        assert.ok(calls.filter(c => c.method === 'get').length >= 2, 'refresca el historial para verificar');
      } finally { await act(async () => { r.unmount(); }); }
    });
  });
});

test('incidents view shows history load errors with a retry', async () => {
  await withTeacherStubs(async () => {
    let fail = true;
    await withAdapter(() => fail ? Promise.reject(apiError(403)) : { status: 200, data: page([incident(4, { description: 'Recuperado' })], 0, 10) }, async () => {
      const r = await renderView();
      try {
        assert.ok(text(history(r)).includes('No tienes permiso para gestionar incidencias.'));
        fail = false;
        const retry = history(r).findAllByType('button').find(b => text(b) === 'Reintentar');
        assert.ok(retry);
        await act(async () => { retry.props.onClick(); });
        await waitFor(() => text(history(r)).includes('Recuperado'));
        assert.ok(text(history(r)).includes('Recuperado'));
      } finally { await act(async () => { r.unmount(); }); }
    });
  });
});

// ---------- Modal del chat ----------

const mensaje = { id: 'm1', remitente: 'contacto' as const, texto: 'hola', hora: '10:00' };
const MENSAJERIA = 'Módulo en construcción: la mensajería del chat es de demostración; el mensaje no se adjunta como evidencia de la incidencia.';

test('chat report modal registers in the backend without evidenceMessageId and keeps the notice only for messaging', async () => {
  await withTeacherStubs(async () => {
    await withAdapter(call => ({ status: 201, data: echo(call, 7) }), async calls => {
      const reported: [IncidenciaResponse, string][] = [];
      let r!: ReactTestRenderer;
      await act(async () => { r = create(<ModalReportarIncidencia isOpen onClose={() => {}} studentName="ana torres" mensaje={mensaje} onReported={(i, id) => { reported.push([i, id]); }} />); });
      try {
        await waitFor(() => r.root.findByProps({ 'aria-label': 'Estudiante de la incidencia' }).props.value === 50);
        assert.deepEqual(notices(r), [MENSAJERIA]);
        assert.doesNotMatch(text(r.root), /no se guarda|Simulación/);
        await act(async () => { r.root.findByType('textarea').props.onChange({ target: { value: 'Insulto en el chat' } }); });
        await act(async () => { await r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
        assert.equal(calls.length, 1);
        const body = calls[0].data as Record<string, unknown>;
        assert.equal(calls[0].url, '/v1/teacher/incidents');
        assert.equal(body.evidenceMessageId, undefined);
        assert.equal(body.studentId, undefined);
        assert.deepEqual({ ...body, occurredAt: undefined }, { sectionCourseId: 10, enrollmentId: 50, occurredAt: undefined, location: 'Chat / Canal virtual', severity: 'MODERADA', description: 'Insulto en el chat', actionsTaken: null });
        assert.equal(reported.length, 1);
        assert.equal(reported[0][0].id, 7);
        assert.equal(reported[0][1], 'm1');
        assert.ok(text(r.root).includes('Incidencia registrada en el historial.'));
      } finally { await act(async () => { r.unmount(); }); }
    });
  });
});

test('chat report modal requires a real student and handles code errors and uncertain results', async () => {
  await withTeacherStubs(async () => {
    let failure: AxiosError = apiError(404, 'ENROLLMENT_NOT_AVAILABLE');
    await withAdapter(() => Promise.reject(failure), async calls => {
      let reported = 0;
      let r!: ReactTestRenderer;
      // El contacto simulado no coincide con ningún alumno: no hay preselección.
      await act(async () => { r = create(<ModalReportarIncidencia isOpen onClose={() => {}} studentName="Contacto Demo" mensaje={mensaje} onReported={() => { reported++; }} />); });
      try {
        await waitFor(() => r.root.findByProps({ 'aria-label': 'Estudiante de la incidencia' }).findAllByType('option').length > 1);
        await act(async () => { r.root.findByType('textarea').props.onChange({ target: { value: 'Insulto' } }); });
        await act(async () => { await r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
        assert.ok(text(r.root).includes('Selecciona el curso y el estudiante implicado.'));
        assert.equal(calls.length, 0);
        await act(async () => { r.root.findByProps({ 'aria-label': 'Estudiante de la incidencia' }).props.onChange({ target: { value: '50' } }); });
        await act(async () => { await r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
        assert.ok(text(r.root).includes('ya no tiene una matrícula activa'));
        failure = networkError();
        await act(async () => { await r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
        assert.ok(text(r.root).includes(UNCERTAIN_INCIDENT_MESSAGE));
        assert.equal(calls.length, 2, 'un intento por envío, sin reintento automático');
        assert.equal(reported, 0);
      } finally { await act(async () => { r.unmount(); }); }
    });
  });
});

test('teacher chat marks the message and confirms only after the backend registers the incident', async () => {
  await withTeacherStubs(async () => {
    await withAdapter(call => ({ status: 201, data: echo(call, 8) }), async calls => {
      let r!: ReactTestRenderer;
      await act(async () => { r = create(<VistaChatDocente />, { createNodeMock: () => ({ scrollIntoView() {} }) }); });
      try {
        const flags = () => r.root.findAll(n => typeof n.type === 'string' && String(n.props['aria-label']).startsWith('Reportar incidencia para'));
        await waitFor(() => flags().length > 0);
        await act(async () => { flags()[0].props.onClick(); });
        const select = () => r.root.findByProps({ 'aria-label': 'Estudiante de la incidencia' });
        await waitFor(() => select().findAllByType('option').length > 1);
        await act(async () => { select().props.onChange({ target: { value: '50' } }); });
        const form = () => r.root.findAll(n => n.type === 'form' && n.findAll(c => c.type === 'textarea').length > 0)[0];
        await act(async () => { form().findByType('textarea').props.onChange({ target: { value: 'Insulto en el chat' } }); });
        await act(async () => { await form().props.onSubmit({ preventDefault() {} }); });
        assert.equal(calls.filter(c => c.method === 'post').length, 1);
        const body = text(r.root);
        assert.ok(body.includes('Incidencia registrada para Ana Torres.'));
        assert.doesNotMatch(body, /Simulación: la incidencia no se registró/);
      } finally { await act(async () => { r.unmount(); }); }
    });
  });
});
