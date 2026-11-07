import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { PadreProvider, usePadre } from '../src/components/padres/PadreContext';
import VistaIncidencias, { INCIDENTS_EMPTY_MESSAGE } from '../feature/padre/vistas/incidencias/vistaIncidencias';
import IncidenciasPage from '../src/app/padre/incidencias/page';
import { formatLimaDateTime, incidentsDefaultRange, limaDay } from '../src/services/padres/guardianIncidentsService';
import type { GuardianStudentResponse } from '../src/types/guardianApi';

// Vista de incidencias del apoderado (FRONT #59): datos sintéticos, sin red (adaptador HTTP sustituido).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const ANA: GuardianStudentResponse = { studentId: 57, studentCode: 'C26000057', fullName: 'Ana Arias Prueba', grade: 5, sectionName: 'A' };
const LUIS: GuardianStudentResponse = { studentId: 58, studentCode: null, fullName: 'Luis Arias Prueba', grade: null, sectionName: null };
const incident = (id: number, over: Record<string, unknown> = {}) => ({
  id, occurredAt: '2026-10-06T15:05:00Z', severity: 'LEVE', description: `Descripción ${id}`, courseName: 'Arte', ...over,
});
const pageOf = (content: unknown[], over: Record<string, unknown> = {}) => ({
  content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, ...over,
});
function text(n: ReactTestInstance): string { return n.children.map(c => (typeof c === 'string' ? c : text(c))).join(''); }

type Call = { url: string; params?: Record<string, unknown> };
type Reply = { status: number; data: unknown } | 'network';
type Harness = {
  renderer: ReactTestRenderer; calls: Call[]; text: () => string; incidentCalls: () => Call[];
  click: (label: string) => Promise<void>; change: (label: string, value: string) => Promise<void>; select: (id: string) => Promise<void>;
};

async function view(incidents: (call: Call) => Reply, run: (h: Harness) => Promise<void>, students: GuardianStudentResponse[] = [ANA, LUIS]) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call = { url: String(config.url), params: config.params };
    calls.push(call);
    const reply: Reply = call.url === '/v1/guardian/students' ? { status: 200, data: students } : incidents(call);
    if (reply === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, response);
    return response;
  };
  let ctx!: ReturnType<typeof usePadre>;
  function Probe() { ctx = usePadre(); return null; }
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<React.StrictMode><PadreProvider><Probe /><VistaIncidencias /></PadreProvider></React.StrictMode>); });
    await run({
      renderer, calls, text: () => text(renderer.root),
      incidentCalls: () => calls.filter(c => c.url.endsWith('/incidents')),
      click: async label => {
        const node = renderer.root.findAll(n => n.type === 'button' && text(n) === label)[0];
        assert.ok(node, label);
        await act(async () => { node.props.onClick(); });
      },
      change: async (label, value) => {
        const node = renderer.root.findByProps({ 'aria-label': label });
        await act(async () => { node.props.onChange({ target: { value } }); });
      },
      select: async id => { await act(async () => { ctx.setSelectedHijoId(id); }); },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
}

test('rango por defecto: últimos 30 días hasta hoy en Lima; fecha y hora de Lima', () => {
  assert.deepEqual(incidentsDefaultRange('2026-11-02'), { from: '2026-10-04', to: '2026-11-02' });
  assert.deepEqual(incidentsDefaultRange('2026-03-01'), { from: '2026-01-31', to: '2026-03-01' });
  assert.equal(limaDay(new Date('2026-11-02T04:30:00Z')), '2026-11-01');
  assert.equal(formatLimaDateTime('2026-10-06T15:05:00Z'), '06/10/2026 10:05');
  assert.equal(formatLimaDateTime('2026-10-07T03:30:00Z'), '06/10/2026 22:30');
});

test('lista las incidencias del hijo activo con fecha y hora de Lima, gravedad, curso y descripción', async () => {
  const range = incidentsDefaultRange(limaDay());
  await view(() => ({ status: 200, data: pageOf([
    incident(3, { severity: 'GRAVE', occurredAt: '2026-10-07T03:30:00Z', courseName: 'Matemática', description: 'Pelea en el recreo.' }),
    incident(2, { severity: 'MODERADA' }), incident(1),
  ]) }), async h => {
    const out = h.text();
    assert.match(out, /Ana Arias Prueba/);
    assert.match(out, /06\/10\/2026 22:30Gravedad: GraveCurso: MatemáticaPelea en el recreo\./);
    assert.match(out, /Gravedad: Moderada/); assert.match(out, /Gravedad: Leve/);
    assert.deepEqual(h.incidentCalls().map(c => [c.url, c.params]), [['/v1/guardian/students/57/incidents', { from: range.from, to: range.to, page: 0, size: 20 }]]);
    const badges = h.renderer.root.findAll(n => n.type === 'span' && /^Gravedad: /.test(text(n)));
    // Paleta sincronizada con docente: emerald (leve), amber (moderada), rose (grave)
    assert.deepEqual(badges.map(b => [text(b), /rose/.test(b.props.className), /amber/.test(b.props.className), /emerald/.test(b.props.className)]), [
      ['Gravedad: Grave', true, false, false], ['Gravedad: Moderada', false, true, false], ['Gravedad: Leve', false, false, true],
    ]);
    assert.equal(h.renderer.root.findAll(n => n.props['aria-label'] === 'Paginación de incidencias').length, 0);
  });
});

test('paginación: pide la página siguiente y vuelve a la primera al cambiar de hijo o de rango', async () => {
  await view(call => {
    const page = Number(call.params?.page);
    return { status: 200, data: pageOf([incident(page + 1, { description: `Página ${page + 1}` })], { page, totalElements: 21, totalPages: 2 }) };
  }, async h => {
    assert.match(h.text(), /Página 1 de 2 · 21 incidencias/);
    await h.click('Siguiente');
    assert.match(h.text(), /Página 2 de 2/); assert.match(h.text(), /Descripción|Página 2/);
    assert.equal(h.incidentCalls().at(-1)?.params?.page, 1);
    await h.select('58');
    const last = h.incidentCalls().at(-1)!;
    assert.equal(last.url, '/v1/guardian/students/58/incidents'); assert.equal(last.params?.page, 0);
    assert.match(h.text(), /Luis Arias Prueba/);
    await h.click('Siguiente');
    await h.change('Desde', '2026-09-01');
    assert.equal(h.incidentCalls().at(-1)?.params?.page, 0); assert.equal(h.incidentCalls().at(-1)?.params?.from, '2026-09-01');
  });
});

test('vacío, 404 STUDENT_NOT_FOUND saneado y error con reintento', async () => {
  await view(() => ({ status: 200, data: pageOf([]) }), async h => {
    assert.match(h.text(), new RegExp(INCIDENTS_EMPTY_MESSAGE));
  });
  await view(() => ({ status: 404, data: { error: 'Not Found', message: 'DETALLE INTERNO', code: 'STUDENT_NOT_FOUND' } }), async h => {
    assert.match(h.text(), /El estudiante ya no está vinculado a tu cuenta/); assert.doesNotMatch(h.text(), /DETALLE INTERNO|Gravedad/);
  });
  let fail = true;
  await view(() => (fail ? 'network' : { status: 200, data: pageOf([incident(1)]) }), async h => {
    assert.match(h.text(), /No se pudo conectar con el servidor/);
    fail = false;
    await h.click('Reintentar');
    assert.match(h.text(), /Gravedad: Leve/);
  });
  await view(() => ({ status: 500, data: { message: 'DETALLE INTERNO' } }), async h => {
    assert.match(h.text(), /No se pudieron cargar las incidencias/); assert.doesNotMatch(h.text(), /DETALLE INTERNO/);
  });
  await view(() => ({ status: 200, data: pageOf([incident(1, { severity: 'CRITICA' })]) }), async h => {
    assert.match(h.text(), /No se pudieron cargar las incidencias/); assert.doesNotMatch(h.text(), /CRITICA/);
  });
});

test('rangos inválidos no hacen peticiones; sin hijos no se consulta nada', async () => {
  await view(() => ({ status: 200, data: pageOf([]) }), async h => {
    const before = h.incidentCalls().length;
    await h.change('Desde', '2026-01-01'); await h.change('Hasta', '2026-04-03');
    assert.match(h.text(), /no puede superar 92 días/);
    await h.change('Hasta', '2999-01-01');
    assert.match(h.text(), /no puede ser posterior a hoy/);
    await h.change('Desde', '2026-05-01'); await h.change('Hasta', '2026-04-01');
    assert.match(h.text(), /rango de fechas válido/);
    assert.equal(h.incidentCalls().length, before);
  });
  await view(() => { throw new Error('unexpected'); }, async h => {
    assert.match(h.text(), /No tiene estudiantes vinculados/); assert.equal(h.incidentCalls().length, 0);
  }, []);
});

test('filtro Todos mis hijos consulta en paralelo y muestra el nombre del estudiante en cada tarjeta', async () => {
  await view(call => {
    const isAna = call.url.includes('/57/');
    return {
      status: 200,
      data: pageOf([
        incident(isAna ? 10 : 20, {
          description: isAna ? 'Incidencia de Ana' : 'Incidencia de Luis',
          occurredAt: isAna ? '2026-10-06T15:05:00Z' : '2026-10-07T12:00:00Z',
        }),
      ]),
    };
  }, async h => {
    await h.change('Seleccionar estudiante', 'ALL');
    const urls = h.incidentCalls().slice(-2).map(c => c.url).sort();
    assert.deepEqual(urls, ['/v1/guardian/students/57/incidents', '/v1/guardian/students/58/incidents']);
    assert.match(h.text(), /Estudiante: Ana Arias Prueba/);
    assert.match(h.text(), /Estudiante: Luis Arias Prueba/);
  });
});

test('filtro por gravedad y botón Limpiar filtros', async () => {
  await view(() => ({
    status: 200,
    data: pageOf([
      incident(1, { severity: 'LEVE', description: 'Falta menor' }),
      incident(2, { severity: 'GRAVE', description: 'Falta severa' }),
    ]),
  }), async h => {
    assert.match(h.text(), /Falta menor/);
    assert.match(h.text(), /Falta severa/);
    await h.change('Filtrar por gravedad', 'GRAVE');
    assert.doesNotMatch(h.text(), /Falta menor/);
    assert.match(h.text(), /Falta severa/);

    await h.click('Limpiar filtros');
    assert.match(h.text(), /Falta menor/);
    assert.match(h.text(), /Falta severa/);
  });
});

test('con un solo hijo muestra el nombre sin selector; con múltiples hijos muestra el selector desplegable', async () => {
  // Caso 1: Un solo hijo vinculado
  await view(() => ({ status: 200, data: pageOf([]) }), async h => {
    assert.match(h.text(), /Ana Arias Prueba/);
    assert.match(h.text(), /Ana no tiene incidencias registradas en este periodo|Ana Arias Prueba no tiene incidencias/);
    assert.equal(h.renderer.root.findAll(n => n.props['aria-label'] === 'Seleccionar estudiante').length, 0);
  }, [ANA]);

  // Caso 2: Dos hijos vinculados
  await view(() => ({ status: 200, data: pageOf([]) }), async h => {
    assert.equal(h.renderer.root.findAll(n => n.props['aria-label'] === 'Seleccionar estudiante').length, 1);
    assert.match(h.text(), /Todos mis hijos \(2\)/);
  }, [ANA, LUIS]);
});

test('modal de detalle: se abre al hacer clic en Ver detalle y se cierra con botón Cerrar', async () => {
  await view(() => ({
    status: 200,
    data: pageOf([
      incident(1, {
        description: 'Descripción detallada de la falta.',
        teacherName: 'Prof. Carlos Mendoza',
      }),
    ]),
  }), async h => {
    assert.equal(h.renderer.root.findAll(n => n.props['aria-labelledby'] === 'detalle-incidencia-title').length, 0);
    await h.click('Ver detalle');
    assert.equal(h.renderer.root.findAll(n => n.props['aria-labelledby'] === 'detalle-incidencia-title').length, 1);
    assert.match(h.text(), /Detalle de Incidencia/);
    assert.match(h.text(), /Prof\. Carlos Mendoza/);
    assert.match(h.text(), /Descripción detallada de la falta\./);

    await h.click('Cerrar');
    assert.equal(h.renderer.root.findAll(n => n.props['aria-labelledby'] === 'detalle-incidencia-title').length, 0);
  });
});

// Modos de ejecución (D1): el módulo está registrado, así que en MOCK y fuera de MOCK la página usa la vista
// conectada; en MOCK, el adaptador simulado de httpClient responde el servicio.
test('la página usa la vista conectada en cualquier modo; en MOCK el servicio lo responde el adaptador', async () => {
  process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
  try {
    await view(() => ({ status: 200, data: pageOf([incident(1)]) }), async h => {
      await act(async () => { h.renderer.update(<PadreProvider><IncidenciasPage /></PadreProvider>); });
      // En MOCK, PadreContext también carga el perfil simulado del apoderado (250 ms) antes de exponer los hijos.
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 400)); });
      assert.match(h.text(), /Incidencias del estudiante/); assert.doesNotMatch(h.text(), /no hay información para mostrar/);
      assert.match(h.text(), /Gravedad: Leve/);
      assert.ok(h.incidentCalls().length > 0);
    });
  } finally {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
  }
  await view(() => ({ status: 200, data: pageOf([]) }), async h => {
    await act(async () => { h.renderer.update(<PadreProvider><IncidenciasPage /></PadreProvider>); });
    assert.match(h.text(), /Incidencias del estudiante/); assert.doesNotMatch(h.text(), /no hay información para mostrar/);
  });
});
