import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { useMemo, useState } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import httpClient from '../src/services/httpClient';
import { PadreProvider, usePadre } from '../src/components/padres/PadreContext';
import VistaIncidencias, { INCIDENTS_EMPTY_MESSAGE } from '../feature/padre/vistas/incidencias/vistaIncidencias';
import IncidenciasPage from '../src/app/padre/incidencias/page';
import { formatLimaDateTime, incidentsDefaultRange, limaDay } from '../src/services/padres/guardianIncidentsService';
import type { GuardianStudentResponse } from '../src/types/guardianApi';

// Vista de incidencias del apoderado (FRONT #59 y #163): datos sintéticos, sin red (adaptador HTTP sustituido).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const ANA: GuardianStudentResponse = { studentId: 57, studentCode: 'C26000057', fullName: 'Ana Arias Prueba', grade: 5, sectionName: 'A' };
const LUIS: GuardianStudentResponse = { studentId: 58, studentCode: null, fullName: 'Luis Arias Prueba', grade: null, sectionName: null };
const incident = (id: number, over: Record<string, unknown> = {}) => ({
  id, occurredAt: '2026-10-06T15:05:00Z', severity: 'LEVE', description: `Descripción ${id}`, courseName: 'Arte', ...over,
});
const pageOf = (content: unknown[], over: Record<string, unknown> = {}) => ({
  content, page: 0, size: 100, totalElements: content.length, totalPages: content.length ? 1 : 0, ...over,
});
const THREE = () => ({ status: 200, data: pageOf([
  incident(3, { severity: 'GRAVE', occurredAt: '2026-10-07T03:30:00Z', courseName: 'Matemática', description: 'Pelea en el recreo.' }),
  incident(2, { severity: 'MODERADA' }), incident(1),
]) });
function text(n: ReactTestInstance): string { return n.children.map(c => (typeof c === 'string' ? c : text(c))).join(''); }

type Call = { url: string; params?: Record<string, unknown> };
type Reply = { status: number; data: unknown } | 'network';
type Harness = {
  renderer: ReactTestRenderer; calls: Call[]; replaces: string[]; text: () => string; incidentCalls: () => Call[];
  click: (label: string) => Promise<void>; change: (label: string, value: string) => Promise<void>; select: (id: string) => Promise<void>;
  cards: () => ReactTestInstance[]; shell: (children: React.ReactNode) => React.ReactElement;
};

const noop = { push() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
// Router con estado: replace(url) actualiza el query que lee useSearchParams, igual que el App Router.
function Shell({ children, onReplace, initialQuery }: { children: React.ReactNode; onReplace: (url: string) => void; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useMemo(() => ({ ...noop, replace(url: string) { onReplace(url); setQuery(url.includes('?') ? url.slice(url.indexOf('?')) : ''); } }) as unknown as AppRouterInstance, [onReplace]);
  return <AppRouterContext.Provider value={router}><SearchParamsContext.Provider value={new URLSearchParams(query)}>{children}</SearchParamsContext.Provider></AppRouterContext.Provider>;
}

async function view(incidents: (call: Call) => Reply, run: (h: Harness) => Promise<void>, students: GuardianStudentResponse[] = [ANA, LUIS], initialQuery = '') {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  const replaces: string[] = [];
  const onReplace = (url: string) => { replaces.push(url); };
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call = { url: String(config.url), params: config.params };
    calls.push(call);
    const reply: Reply = call.url === '/v1/guardian/students' ? { status: 200, data: students } : incidents(call);
    if (reply === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, response);
    return response;
  };
  const holder: { current?: ReturnType<typeof usePadre> } = {};
  function Probe() { const padre = usePadre(); React.useEffect(() => { holder.current = padre; }); return null; }
  const shell = (children: React.ReactNode) => <Shell onReplace={onReplace} initialQuery={initialQuery}>{children}</Shell>;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<React.StrictMode>{shell(<PadreProvider><Probe /><VistaIncidencias /></PadreProvider>)}</React.StrictMode>); });
    await run({
      renderer, calls, replaces, shell, text: () => text(renderer.root),
      incidentCalls: () => calls.filter(c => c.url.endsWith('/incidents')),
      cards: () => renderer.root.findAll(n => n.type === 'li' && n.props['aria-label'] === undefined),
      click: async label => {
        const node = renderer.root.findAll(n => n.type === 'button' && (text(n) === label || n.props['aria-label'] === label))[0];
        assert.ok(node, label);
        await act(async () => { node.props.onClick(); });
      },
      change: async (label, value) => {
        const node = renderer.root.findByProps({ 'aria-label': label });
        await act(async () => { node.props.onChange({ target: { value } }); });
      },
      select: async id => { await act(async () => { holder.current!.setSelectedHijoId(id); }); },
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

test('lista las incidencias del hijo activo: curso como encabezado, gravedad con tokens, fecha de Lima y descripción', async () => {
  const range = incidentsDefaultRange(limaDay());
  await view(THREE, async h => {
    const out = h.text();
    assert.match(out, /Ana Arias Prueba/);
    assert.match(out, /MatemáticaGravedad: GravePelea en el recreo\.06\/10\/2026 22:30Ver detalle/);
    assert.match(out, /Gravedad: Moderada/); assert.match(out, /Gravedad: Leve/);
    // Una sola petición del hijo activo, primera página de 100: los KPI y el filtro de gravedad se calculan en cliente.
    assert.deepEqual(h.incidentCalls().map(c => [c.url, c.params]), [['/v1/guardian/students/57/incidents', { from: range.from, to: range.to, page: 0, size: 100 }]]);
    const badges = h.renderer.root.findAll(n => n.type === 'span' && /^Gravedad: /.test(text(n)));
    const classes = badges.map(b => [text(b), String(b.props.className)] as const);
    assert.match(classes[0][1], /bg-accent-soft text-accent border-accent\/30/);
    assert.match(classes[1][1], /bg-white text-warning-ink border-warning-ink\/30/);
    assert.match(classes[2][1], /bg-success text-success-ink border-success-ink\/30/);
    const kpis = text(h.renderer.root.findByProps({ 'aria-label': 'Resumen de incidencias' }));
    assert.equal(kpis, 'Total3Leves1Moderadas1Graves1');
    assert.equal(h.renderer.root.findAll(n => n.props['aria-label'] === 'Paginación de incidencias').length, 0);
    assert.doesNotMatch(out, /Todos mis hijos|Registro Disciplinario/);
    assert.doesNotMatch(out, /Conteo de las primeras 100/);
  });
});

test('ni la vista ni sus componentes usan colores crudos de Tailwind ni valores hex', () => {
  const files = ['vistaIncidencias.tsx', 'component/incidenciaCard.tsx', 'component/incidenciasKpiBanner.tsx', 'component/incidenciasFiltros.tsx', 'component/modalDetalleIncidencia.tsx'];
  for (const file of files) {
    const source = readFileSync(new URL(`../feature/padre/vistas/incidencias/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\b(emerald|amber|rose|slate|sky|red|purple)-\d{2,3}\b/, file);
    assert.doesNotMatch(source, /(bg|text|border)-\[#/, file);
  }
});

test('más de una página: avisa que el conteo cubre las primeras 100 y el total sale del backend', async () => {
  await view(() => ({ status: 200, data: pageOf([incident(1), incident(2, { severity: 'GRAVE' })], { totalElements: 150, totalPages: 2 }) }), async h => {
    assert.match(h.text(), /Conteo de las primeras 100 incidencias/);
    assert.equal(text(h.renderer.root.findByProps({ 'aria-label': 'Resumen de incidencias' })), 'Total150Leves1Moderadas0Graves1');
    assert.equal(h.incidentCalls()[0].params?.size, 100);
    assert.equal(h.incidentCalls()[0].params?.page, 0);
  });
});

test('filtro de gravedad por botones sin nueva petición; «Limpiar filtros» vuelve a todas; el estado vive en la URL', async () => {
  await view(THREE, async h => {
    assert.equal(h.cards().length, 3);
    await h.click('Grave');
    assert.deepEqual(h.replaces.at(-1), '/padre/incidencias?gravedad=GRAVE');
    assert.equal(h.cards().length, 1);
    assert.match(h.text(), /Mostrando 1 de 3 incidencias/);
    const pressed = h.renderer.root.findAll(n => n.type === 'button' && n.props['aria-pressed'] === true).map(text);
    assert.deepEqual(pressed, ['Grave']);
    await h.click('Leve');
    assert.equal(h.cards().length, 1); assert.match(h.text(), /Descripción 1/);
    await h.click('Limpiar filtros');
    assert.equal(h.replaces.at(-1), '/padre/incidencias');
    assert.equal(h.cards().length, 3);
    assert.equal(h.incidentCalls().length, 1, 'cambiar de gravedad no vuelve a consultar');
  });
  // El enlace compartido conserva los filtros.
  await view(THREE, async h => {
    assert.equal(h.cards().length, 1);
    assert.equal(h.incidentCalls()[0].params?.from, '2026-09-01'); assert.equal(h.incidentCalls()[0].params?.to, limaDay());
  }, [ANA, LUIS], '?gravedad=GRAVE&desde=2026-09-01');
});

test('sin coincidencias con la gravedad elegida muestra un mensaje y no tarjetas', async () => {
  await view(() => ({ status: 200, data: pageOf([incident(1)]) }), async h => {
    await h.click('Grave');
    assert.equal(h.cards().length, 0);
    assert.match(h.text(), /No hay incidencias con esa gravedad/);
  });
});

test('el detalle abre y cierra con «Cerrar» o Escape y nunca muestra «Registrado por»', async () => {
  const handlers: Array<(event: { key: string }) => void> = [];
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    addEventListener(_: string, fn: (event: { key: string }) => void) { handlers.push(fn); },
    removeEventListener(_: string, fn: (event: { key: string }) => void) { handlers.splice(handlers.indexOf(fn), 1); },
  } });
  try {
    await view(THREE, async h => {
      const dialogs = () => h.renderer.root.findAll(n => n.type === 'div' && n.props.role === 'dialog');
      assert.equal(dialogs().length, 0);
      await h.click('Ver detalle de Matemática, 06/10/2026 22:30');
      assert.equal(dialogs().length, 1);
      assert.match(h.text(), /Detalle de incidencia/); assert.match(h.text(), /Pelea en el recreo\./);
      assert.doesNotMatch(h.text(), /Registrado por/);
      await act(async () => { handlers.forEach(handler => handler({ key: 'Enter' })); });
      assert.equal(dialogs().length, 1, 'otra tecla no cierra');
      await act(async () => { handlers.forEach(handler => handler({ key: 'Escape' })); });
      assert.equal(dialogs().length, 0);
      await h.click('Ver detalle de Matemática, 06/10/2026 22:30');
      await h.click('Cerrar');
      assert.equal(dialogs().length, 0);
    });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else delete (globalThis as Record<string, unknown>).document;
  }
});

test('al cambiar de hijo vuelve a consultar su propia lista', async () => {
  await view(() => ({ status: 200, data: pageOf([incident(1)]) }), async h => {
    await h.select('58');
    const last = h.incidentCalls().at(-1)!;
    assert.equal(last.url, '/v1/guardian/students/58/incidents'); assert.equal(last.params?.page, 0);
    assert.match(h.text(), /Luis Arias Prueba/);
    await h.change('Desde', '2026-09-01');
    assert.equal(h.incidentCalls().at(-1)?.params?.from, '2026-09-01');
  });
});

test('vacío nombra al hijo con KPI en 0; 404, 403 y errores se sanean y ofrecen reintento', async () => {
  await view(() => ({ status: 200, data: pageOf([]) }), async h => {
    assert.match(h.text(), new RegExp(INCIDENTS_EMPTY_MESSAGE));
    assert.match(h.text(), /para Ana/);
    assert.equal(text(h.renderer.root.findByProps({ 'aria-label': 'Resumen de incidencias' })), 'Total0Leves0Moderadas0Graves0');
  });
  await view(() => ({ status: 404, data: { error: 'Not Found', message: 'DETALLE INTERNO', code: 'STUDENT_NOT_FOUND' } }), async h => {
    assert.match(h.text(), /El estudiante ya no está vinculado a tu cuenta/); assert.doesNotMatch(h.text(), /DETALLE INTERNO|Gravedad: /);
  });
  await view(() => ({ status: 403, data: { message: 'DETALLE INTERNO' } }), async h => {
    assert.match(h.text(), /Tu cuenta no tiene un perfil de apoderado activo/); assert.doesNotMatch(h.text(), /DETALLE INTERNO|Gravedad: /);
    assert.ok(h.renderer.root.findAll(n => n.type === 'button' && text(n) === 'Reintentar').length > 0);
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

// Modos de ejecución (D1): el módulo está registrado, así que en MOCK y fuera de MOCK la página usa la vista
// conectada; en MOCK, el adaptador simulado de httpClient responde el servicio.
test('la página usa la vista conectada en cualquier modo; en MOCK el servicio lo responde el adaptador', async () => {
  process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
  try {
    await view(() => ({ status: 200, data: pageOf([incident(1)]) }), async h => {
      await act(async () => { h.renderer.update(h.shell(<PadreProvider><IncidenciasPage /></PadreProvider>)); });
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
    await act(async () => { h.renderer.update(h.shell(<PadreProvider><IncidenciasPage /></PadreProvider>)); });
    assert.match(h.text(), /Incidencias del estudiante/); assert.doesNotMatch(h.text(), /no hay información para mostrar/);
  });
});
