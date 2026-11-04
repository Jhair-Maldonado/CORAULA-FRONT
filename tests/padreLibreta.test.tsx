import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { createMockAdapter } from '../src/mocks/http/mockAdapter';
import { createMockStore } from '../src/mocks/http/fixtures/shared';
import { PadreProvider, usePadre } from '../src/components/padres/PadreContext';
import VistaLibreta, { LIBRETA_EMPTY_MESSAGE, LIBRETA_UNAVAILABLE_MESSAGE } from '../feature/padre/vistas/libreta/vistaLibreta';
import LibretaPage from '../src/app/padre/libreta/page';
import {
  formatLimaDate, formatReportGrade, guardianReportFallbackName, guardianReportService, isFailingGrade, sortPublishedBimesters,
} from '../src/services/padres/guardianReportService';
import type { GuardianStudentResponse } from '../src/types/guardianApi';
import type { GuardianPublishedBimester } from '../src/types/guardianReportApi';

// Libreta bimestral del apoderado (FRONT #56): datos sintéticos, sin red (adaptador HTTP sustituido).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const SERVER_TEXT = 'texto interno del servidor que nunca se muestra';
const ANA: GuardianStudentResponse = { studentId: 57, studentCode: 'C26000057', fullName: 'Ana Arias Prueba', grade: 5, sectionName: 'A' };
const LUIS: GuardianStudentResponse = { studentId: 58, studentCode: null, fullName: 'Luis Arias Prueba', grade: 1, sectionName: 'B' };

const bimester = (id: number, number: number, over: Partial<GuardianPublishedBimester> = {}): GuardianPublishedBimester => ({
  bimesterId: id, number, name: `${['I', 'II', 'III', 'IV'][number - 1]} Bimestre`, academicPeriodId: 1, academicPeriodName: 'Año escolar 2026',
  publishedAt: '2026-05-15T10:00:00-05:00', revision: 1, ...over,
});
const ANA_LIST = [bimester(13, 3, { publishedAt: '2026-10-09T23:30:00-05:00', revision: 2 }), bimester(12, 2, { publishedAt: '2026-07-24T10:00:00-05:00' })];
const LUIS_LIST = [bimester(23, 3, { publishedAt: '2026-10-10T10:00:00-05:00' }), bimester(22, 2)];

function report(studentId: number, bimesterId: number, number: number, over: Record<string, unknown> = {}) {
  const student = studentId === 57 ? { id: 57, code: 'C26000057', fullName: 'Ana Arias Prueba' } : { id: 58, code: null, fullName: 'Luis Arias Prueba' };
  return {
    student,
    section: studentId === 57 ? { id: 10, name: 'A', grade: 5, level: 'PRIMARY' } : { id: 11, name: 'B', grade: 1, level: 'SECONDARY' },
    period: { id: 1, name: 'Año escolar 2026' },
    bimester: { id: bimesterId, number, name: `Bimestre ${number} de ${student.fullName}` },
    courses: [
      { name: 'Matemática', areaName: 'Matemática', criteria: [{ name: 'Desempeño en clase', grade: 8 }, { name: 'Evaluación escrita', grade: null }], grade: 8 },
      { name: 'Comunicación', areaName: 'Comunicación', criteria: [{ name: 'Expresión oral', grade: 10.5 }, { name: 'Producción escrita', grade: 11 }], grade: 10.75 },
      { name: 'Arte y Cultura', areaName: 'Arte', criteria: [{ name: 'Apreciación', grade: 15 }], grade: 11 },
    ],
    areas: [{ name: 'Matemática', grade: 8 }, { name: 'Comunicación', grade: 10.5 }, { name: 'Arte', grade: 11 }],
    publishedAt: '2026-10-09T23:30:00-05:00',
    revision: 1,
    ...over,
  };
}
const PDF_HEADERS = { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="libreta-C26000057-3.pdf"' };
const pdfBlob = () => new Blob(['%PDF-1.4 libreta'], { type: 'application/pdf' });
const errorBlob = (code: string) => new Blob([JSON.stringify({ error: 'Error', message: SERVER_TEXT, code })], { type: 'application/json' });

function text(n: ReactTestInstance): string { return n.children.map(c => (typeof c === 'string' ? c : text(c))).join(''); }

type Call = { url: string; signal?: AbortSignal; responseType?: string };
type Reply = { status: number; data: unknown; headers?: Record<string, string> } | 'network';
type Route = (call: Call) => Reply | Promise<Reply>;
type Harness = {
  renderer: ReactTestRenderer; calls: Call[]; text: () => string;
  callsTo: (suffix: string) => Call[];
  click: (label: string) => Promise<void>; choose: (bimesterId: number) => Promise<void>; selectHijo: (id: string) => Promise<void>;
  failing: () => string[];
};

/** Respuestas por defecto: listas y libretas de Ana y Luis; route permite sustituir cualquiera. */
function defaults(call: Call): Reply {
  const m = /\/students\/(\d+)\/bimesters\/(?:published|(\d+)\/report(\.pdf)?)$/.exec(call.url);
  if (!m) return { status: 404, data: { error: 'Not Found', message: SERVER_TEXT } };
  const studentId = Number(m[1]);
  if (!m[2]) return { status: 200, data: studentId === 57 ? ANA_LIST : LUIS_LIST };
  const id = Number(m[2]);
  if (m[3]) return { status: 200, data: pdfBlob(), headers: PDF_HEADERS };
  return { status: 200, data: report(studentId, id, id % 10) };
}

async function view(route: Route | null, run: (h: Harness) => Promise<void>, students: GuardianStudentResponse[] = [ANA, LUIS]) {
  const original = httpClient.defaults.adapter;
  const calls: Call[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const call = { url: String(config.url), signal: config.signal as AbortSignal | undefined, responseType: config.responseType };
    calls.push(call);
    const reply: Reply = call.url === '/v1/guardian/students' ? { status: 200, data: students } : await (route ?? defaults)(call);
    if (reply === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: reply.headers ?? {}, config } as AxiosResponse;
    if (reply.status >= 400) throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, undefined, response);
    return response;
  };
  let ctx!: ReturnType<typeof usePadre>;
  function Probe() { ctx = usePadre(); return null; }
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<React.StrictMode><PadreProvider><Probe /><VistaLibreta /></PadreProvider></React.StrictMode>); });
    await run({
      renderer, calls, text: () => text(renderer.root),
      callsTo: suffix => calls.filter(c => c.url.endsWith(suffix)),
      click: async label => {
        const node = renderer.root.findAll(n => n.type === 'button' && text(n) === label)[0];
        assert.ok(node, label);
        await act(async () => { node.props.onClick(); });
      },
      choose: async id => {
        const node = renderer.root.findByProps({ 'aria-label': 'Bimestre publicado' });
        await act(async () => { node.props.onChange({ target: { value: String(id) } }); });
      },
      selectHijo: async id => { await act(async () => { ctx.setSelectedHijoId(id); }); },
      failing: () => renderer.root.findAll(n => n.type === 'span' && n.props['data-failing'] === 'true').map(text),
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
  }
}

/** Sustituye document y URL.createObjectURL/revokeObjectURL para observar la descarga sin navegador. */
function stubDownload() {
  const events: string[] = [];
  const links: { href: string; download: string }[] = [];
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const { createObjectURL, revokeObjectURL } = URL;
  let n = 0;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => {
        const link = { href: '', download: '', style: {}, click: () => { events.push(`click:${link.download}`); }, remove: () => { events.push('remove'); } };
        links.push(link);
        return link;
      },
      body: { appendChild: () => { events.push('append'); } },
    },
  });
  URL.createObjectURL = (blob: Blob) => { events.push(`create:${blob.type}:${blob.size}`); return `blob:libreta-${++n}`; };
  URL.revokeObjectURL = (url: string) => { events.push(`revoke:${url}`); };
  return {
    events, links,
    restore: () => {
      if (saved) Object.defineProperty(globalThis, 'document', saved); else Reflect.deleteProperty(globalThis, 'document');
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
    },
  };
}

// ── Formato y servicio ──────────────────────────────────────────────────────

test('notas: como las entrega el backend (10,50; 11), «—» sin nota; se resalta < 11 sin redondear', () => {
  assert.equal(formatReportGrade(10.5), '10,50');
  assert.equal(formatReportGrade(10.25), '10,25');
  assert.equal(formatReportGrade(11), '11');
  assert.equal(formatReportGrade(0), '0');
  assert.equal(formatReportGrade(null), '—');
  assert.equal(isFailingGrade(10.5), true);
  assert.equal(isFailingGrade(10.99), true);
  assert.equal(isFailingGrade(11), false);
  assert.equal(isFailingGrade(11.0), false);
  assert.equal(isFailingGrade(null), false);
});

test('fecha de publicación en Lima (DD/MM/AAAA) y nombre de respaldo del PDF', () => {
  assert.equal(formatLimaDate('2026-10-09T23:30:00-05:00'), '09/10/2026');
  assert.equal(formatLimaDate('2026-10-10T03:30:00Z'), '09/10/2026');
  assert.equal(guardianReportFallbackName('C26000057', 3), 'libreta-C26000057-3.pdf');
  assert.equal(guardianReportFallbackName(null, 2), 'libreta-alumno-2.pdf');
  assert.equal(guardianReportFallbackName('../C 26/x', 1), 'libreta-C26x-1.pdf');
});

test('lista desordenada: solo se reordena por número desc dentro de cada periodo; los periodos conservan su orden', async () => {
  const p2027 = { academicPeriodId: 2, academicPeriodName: 'Año escolar 2027' };
  const unordered = [
    bimester(21, 1, { ...p2027, publishedAt: '2027-05-14T10:00:00-05:00' }),
    bimester(11, 1, { publishedAt: '2026-05-15T10:00:00-05:00' }),
    bimester(13, 3, { publishedAt: '2026-10-09T10:00:00-05:00' }),
    bimester(22, 2, { ...p2027, publishedAt: '2027-07-23T10:00:00-05:00' }),
    bimester(12, 2, { publishedAt: '2026-07-24T10:00:00-05:00' }),
  ];
  // El periodo 2027 llega primero y se mantiene primero; publishedAt no interviene.
  assert.deepEqual(sortPublishedBimesters(unordered).map(b => b.bimesterId), [22, 21, 13, 12, 11]);
  assert.deepEqual(sortPublishedBimesters(ANA_LIST), ANA_LIST, 'una lista ya ordenada no cambia');
  const periodsAsReceived = [bimester(12, 2), bimester(22, 2, p2027), bimester(21, 1, p2027)];
  assert.deepEqual(sortPublishedBimesters(periodsAsReceived).map(b => b.bimesterId), [12, 22, 21], 'no reordena periodos');
  await view(call => (call.url.endsWith('/published') ? { status: 200, data: unordered } : defaults(call)), async h => {
    assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/57/bimesters/22/report');
    const options = h.renderer.root.findAll(n => n.type === 'option').map(n => n.props.value);
    assert.deepEqual(options, [22, 21, 13, 12, 11]);
  });
});

test('III Bimestre republicado con publishedAt posterior al IV del mismo periodo: por defecto se muestra el IV', async () => {
  const list = [
    bimester(13, 3, { publishedAt: '2026-12-20T10:00:00-05:00', revision: 2 }),
    bimester(14, 4, { publishedAt: '2026-12-18T10:00:00-05:00' }),
  ];
  assert.deepEqual(sortPublishedBimesters(list).map(b => b.bimesterId), [14, 13]);
  await view(call => (call.url.endsWith('/published') ? { status: 200, data: list } : defaults(call)), async h => {
    assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/57/bimesters/14/report');
    assert.match(h.text(), /Bimestre 4 de Ana Arias Prueba/);
  });
});

// ── Vista ───────────────────────────────────────────────────────────────────

test('lista y bimestre por defecto: el más reciente; render de cursos, criterios, áreas, fecha de Lima y revisión', async () => {
  await view(null, async h => {
    assert.ok(h.callsTo('/v1/guardian/students/57/bimesters/published').length > 0);
    assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/57/bimesters/13/report');
    const out = h.text();
    assert.match(out, /Ana Arias Prueba/);
    assert.match(out, /Código: C26000057/);
    assert.match(out, /5\.° grado «A» · Primaria/);
    assert.match(out, /Año escolar 2026/);
    assert.match(out, /Publicada el 09\/10\/2026/);
    assert.doesNotMatch(out, /Actualizada/, 'revisión 1 no se marca');
    for (const s of ['Matemática', 'Comunicación', 'Arte y Cultura', 'Desempeño en clase', 'Evaluación escrita', 'Expresión oral', 'Producción escrita', 'Apreciación', 'Resumen por área']) {
      assert.ok(out.includes(s), s);
    }
    const options = h.renderer.root.findAll(n => n.type === 'option').map(text);
    assert.deepEqual(options, ['III Bimestre · Año escolar 2026', 'II Bimestre · Año escolar 2026']);
  });
});

test('revisión > 1 muestra «Actualizada (revisión N)»; código null muestra «Sin código»; nivel Secundaria', async () => {
  await view(call => (call.url.endsWith('/23/report') ? { status: 200, data: report(58, 23, 3, { revision: 3 }) } : defaults(call)), async h => {
    await h.selectHijo('58');
    const out = h.text();
    assert.match(out, /Actualizada \(revisión 3\)/);
    assert.match(out, /Código: Sin código/);
    assert.match(out, /1\.° grado «B» · Secundaria/);
  });
});

test('notas < 11 resaltadas en curso, criterio y área (10,50 sí; 11 no); null como «—» sin resaltar', async () => {
  await view(null, async h => {
    assert.deepEqual(h.failing().sort(), ['10,50', '10,50', '10,75', '8', '8', '8'].sort());
    const spans = h.renderer.root.findAll(n => n.type === 'span' && (text(n) === '11' || text(n) === '—'));
    assert.ok(spans.length >= 3, 'hay notas 11 y un criterio sin nota');
    for (const span of spans) assert.equal(span.props['data-failing'], undefined, text(span));
  });
});

test('cambio de bimestre: pide la libreta elegida y la muestra', async () => {
  await view(null, async h => {
    await h.choose(12);
    assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/57/bimesters/12/report');
    assert.match(h.text(), /Bimestre 2 de Ana Arias Prueba/);
    assert.doesNotMatch(h.text(), /Bimestre 3 de Ana/);
  });
});

test('cambio de hijo: la respuesta tardía del anterior se descarta y se toma el bimestre más reciente del nuevo', async () => {
  let releaseAna!: () => void;
  const anaLate = new Promise<void>(resolve => { releaseAna = resolve; });
  await view(async call => {
    if (call.url.endsWith('/57/bimesters/12/report')) { await anaLate; return { status: 200, data: report(57, 12, 2) }; }
    return defaults(call);
  }, async h => {
    await h.choose(12);
    assert.match(h.text(), /Cargando libreta/);
    const pending = h.callsTo('/57/bimesters/12/report').at(-1)!;
    await h.selectHijo('58');
    assert.equal(pending.signal?.aborted, true);
    assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/58/bimesters/23/report', 'Luis vuelve a su más reciente');
    await act(async () => { releaseAna(); await anaLate; });
    const out = h.text();
    assert.match(out, /Bimestre 3 de Luis Arias Prueba/);
    assert.doesNotMatch(out, /Ana Arias Prueba/);
    // Al volver a Ana no se recupera su selección anterior: se toma de nuevo su más reciente.
    await h.selectHijo('57');
    assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/57/bimesters/13/report');
  });
});

test('vacío: sin libretas publicadas se muestra el mensaje y no se pide ninguna libreta', async () => {
  await view(call => (call.url.endsWith('/published') ? { status: 200, data: [] } : defaults(call)), async h => {
    assert.match(h.text(), new RegExp(LIBRETA_EMPTY_MESSAGE));
    assert.equal(h.callsTo('/report').length, 0);
    assert.equal(h.renderer.root.findAll(n => n.type === 'button' && text(n) === 'Descargar PDF').length, 0);
  });
});

test('STUDENT_NOT_FOUND: mensaje fijo, sin el texto del servidor y sin reintento', async () => {
  await view(call => (call.url.endsWith('/published') ? { status: 404, data: { error: 'Not Found', message: SERVER_TEXT, code: 'STUDENT_NOT_FOUND' } } : defaults(call)), async h => {
    assert.match(h.text(), /El estudiante ya no está vinculado a tu cuenta\./);
    assert.ok(!h.text().includes(SERVER_TEXT));
    assert.equal(h.renderer.root.findAll(n => n.type === 'button' && text(n) === 'Reintentar').length, 0);
  });
});

for (const [code, status] of [['REPORT_NOT_FOUND', 404], ['REPORT_NOT_PUBLISHED', 409]] as const) {
  test(`${code} en la libreta: «Esta libreta ya no está disponible» y se recarga la lista una sola vez`, async () => {
    let gone = false;
    await view(call => {
      if (call.url.endsWith('/57/bimesters/12/report')) return { status, data: { error: 'Error', message: SERVER_TEXT, code } };
      if (call.url.endsWith('/57/bimesters/published') && gone) return { status: 200, data: [ANA_LIST[0]] };
      return defaults(call);
    }, async h => {
      const before = h.callsTo('/published').length;
      gone = true;
      await h.choose(12);
      assert.equal(h.callsTo('/published').length, before + 1, 'la lista se recarga');
      const out = h.text();
      assert.match(out, new RegExp(LIBRETA_UNAVAILABLE_MESSAGE));
      assert.ok(!out.includes(SERVER_TEXT));
      assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/57/bimesters/13/report', 'vuelve al más reciente');
      assert.match(out, /Bimestre 3 de Ana/);
    });
  });
}

test('libreta no disponible tras recargar: el error queda en la vista y no se recarga en bucle', async () => {
  await view(call => (call.url.endsWith('/report') ? { status: 409, data: { error: 'Conflict', message: SERVER_TEXT, code: 'REPORT_NOT_PUBLISHED' } } : defaults(call)), async h => {
    const lists = h.callsTo('/published').length;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    assert.ok(h.callsTo('/published').length <= lists + 1, 'como mucho una recarga');
    assert.match(h.text(), new RegExp(LIBRETA_UNAVAILABLE_MESSAGE));
    assert.ok(!h.text().includes(SERVER_TEXT));
  });
});

test('sin conexión: mensaje propio y «Reintentar» vuelve a pedir la libreta', async () => {
  let offline = true;
  await view(call => (call.url.endsWith('/report') && offline ? 'network' : defaults(call)), async h => {
    assert.match(h.text(), /No se pudo conectar con el servidor/);
    offline = false;
    await h.click('Reintentar');
    assert.match(h.text(), /Bimestre 3 de Ana/);
  });
});

test('500: mensaje genérico sin el texto del servidor y reintento de la lista', async () => {
  let fail = true;
  await view(call => (call.url.endsWith('/published') && fail ? { status: 500, data: { error: 'Internal', message: SERVER_TEXT } } : defaults(call)), async h => {
    assert.match(h.text(), /No se pudieron cargar las libretas publicadas/);
    assert.ok(!h.text().includes(SERVER_TEXT));
    fail = false;
    await h.click('Reintentar');
    assert.match(h.text(), /Bimestre 3 de Ana/);
  });
});

// ── Descarga del PDF ────────────────────────────────────────────────────────

test('descarga: Blob con el JWT, nombre de Content-Disposition y revokeObjectURL en el ciclo siguiente al clic', async () => {
  const dl = stubDownload();
  try {
    await view(null, async h => {
      mock.timers.enable({ apis: ['setTimeout'] });
      try {
        await h.click('Descargar PDF');
        const call = h.callsTo('/report.pdf').at(-1)!;
        assert.equal(call.url, '/v1/guardian/students/57/bimesters/13/report.pdf');
        assert.equal(call.responseType, 'blob');
        assert.deepEqual(dl.events, ['create:application/pdf:16', 'append', 'click:libreta-C26000057-3.pdf', 'remove']);
        assert.equal(dl.links[0].href, 'blob:libreta-1');
        mock.timers.tick(0);
        assert.deepEqual(dl.events.at(-1), 'revoke:blob:libreta-1', 'se revoca después del clic');
      } finally {
        mock.timers.reset();
      }
    });
  } finally {
    dl.restore();
  }
});

test('descarga: sin Content-Disposition usa el nombre de respaldo (código o «alumno»)', async () => {
  const dl = stubDownload();
  try {
    const noHeader: Route = call => (call.url.endsWith('.pdf') ? { status: 200, data: pdfBlob(), headers: { 'content-type': 'application/pdf' } } : defaults(call));
    await view(noHeader, async h => {
      await h.click('Descargar PDF');
      assert.ok(dl.events.includes('click:libreta-C26000057-3.pdf'), dl.events.join());
      await h.selectHijo('58');
      await h.click('Descargar PDF');
      assert.ok(dl.events.includes('click:libreta-alumno-3.pdf'), dl.events.join());
    });
  } finally {
    dl.restore();
  }
});

test('descarga: doble clic hace una sola petición y el botón queda deshabilitado mientras descarga', async () => {
  const dl = stubDownload();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await view(async call => {
      if (call.url.endsWith('.pdf')) { await gate; }
      return defaults(call);
    }, async h => {
      const button = () => h.renderer.root.findAll(n => n.type === 'button' && /Descargar PDF|Descargando/.test(text(n)))[0];
      await act(async () => { button().props.onClick(); button().props.onClick(); });
      assert.equal(button().props.disabled, true);
      assert.equal(text(button()), 'Descargando…');
      assert.equal(h.callsTo('/report.pdf').length, 1);
      await act(async () => { release(); await gate; });
      assert.equal(h.callsTo('/report.pdf').length, 1);
      assert.equal(button().props.disabled, false);
      assert.equal(dl.events.filter(e => e.startsWith('click:')).length, 1);
    });
  } finally {
    dl.restore();
  }
});

test('descarga: un error se muestra en la vista, sin alert() ni texto del servidor; el cuerpo Blob se lee por code', async () => {
  const dl = stubDownload();
  const alerts: unknown[] = [];
  const originalAlert = globalThis.alert;
  Object.assign(globalThis, { alert: (m: unknown) => { alerts.push(m); } });
  try {
    await view(call => (call.url.endsWith('.pdf') ? { status: 500, data: new Blob([SERVER_TEXT]) } : defaults(call)), async h => {
      await h.click('Descargar PDF');
      const alertNode = h.renderer.root.findAll(n => n.props.role === 'alert').at(-1)!;
      assert.match(text(alertNode), /No se pudo descargar la libreta en PDF/);
      assert.ok(!h.text().includes(SERVER_TEXT));
      assert.equal(alerts.length, 0);
      assert.equal(dl.events.length, 0, 'no se crea ningún enlace');
    });
    let gone = false;
    await view(call => {
      if (call.url.endsWith('.pdf')) return { status: 409, data: errorBlob('REPORT_NOT_PUBLISHED') };
      if (call.url.endsWith('/published') && gone) return { status: 200, data: [ANA_LIST[1]] };
      return defaults(call);
    }, async h => {
      const before = h.callsTo('/published').length;
      gone = true;
      await h.click('Descargar PDF');
      assert.equal(h.callsTo('/published').length, before + 1, 'la lista se recarga');
      assert.match(h.text(), new RegExp(LIBRETA_UNAVAILABLE_MESSAGE));
      assert.ok(!h.text().includes(SERVER_TEXT));
      assert.equal(h.callsTo('/report').at(-1)?.url, '/v1/guardian/students/57/bimesters/12/report');
    });
  } finally {
    dl.restore();
    Object.assign(globalThis, { alert: originalAlert });
  }
});

test('servicio: el cuerpo de error Blob se convierte a objeto (code legible); si no es JSON queda en null', async () => {
  for (const [data, expected] of [[errorBlob('REPORT_NOT_FOUND'), 'REPORT_NOT_FOUND'], [new Blob(['<html>']), undefined]] as const) {
    await view(call => (call.url.endsWith('.pdf') ? { status: 404, data } : defaults(call)), async () => {
      await assert.rejects(guardianReportService.reportPdf('57', 13), (error: unknown) => {
        assert.ok(error instanceof AxiosError);
        assert.equal((error.response?.data as { code?: string } | null)?.code, expected);
        return true;
      });
    });
  }
});

test('descarga en curso al cambiar de hijo: se cancela y no se descarga el PDF del anterior', async () => {
  const dl = stubDownload();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  try {
    await view(async call => {
      if (call.url.endsWith('/57/bimesters/13/report.pdf')) { await gate; }
      return defaults(call);
    }, async h => {
      await h.click('Descargar PDF');
      const pending = h.callsTo('.pdf').at(-1)!;
      await h.selectHijo('58');
      assert.equal(pending.signal?.aborted, true);
      await act(async () => { release(); await gate; });
      assert.equal(dl.events.length, 0);
      assert.match(h.text(), /Luis Arias Prueba/);
    });
  } finally {
    dl.restore();
  }
});

// ── Página por modo ─────────────────────────────────────────────────────────

test('página en MOCK: el adaptador simulado responde la libreta de Ana con notas < 11 y un criterio sin nota', async () => {
  const saved = { mode: process.env.NEXT_PUBLIC_APP_MODE, mocks: process.env.NEXT_PUBLIC_USE_MOCKS };
  const globals = (['window', 'localStorage'] as const).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const original = httpClient.defaults.adapter;
  process.env.NEXT_PUBLIC_APP_MODE = 'MOCK';
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
  const adapter = createMockAdapter({ latencyMs: 0, store: createMockStore(() => new Date('2026-11-02T15:00:00Z')), warn: () => {} });
  httpClient.defaults.adapter = adapter;
  let renderer!: ReactTestRenderer;
  try {
    const { data } = await httpClient.post('/v1/auth/login', { email: 'padre@demo.local', password: 'cualquier-clave' });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { dispatchEvent() { return true; } } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => (k === 'token' ? data.token : null) } });
    await act(async () => { renderer = create(<PadreProvider><LibretaPage /></PadreProvider>); });
    // En MOCK, PadreContext carga además el perfil simulado del apoderado (250 ms).
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 400)); });
    const out = text(renderer.root);
    assert.match(out, /Libreta de calificaciones/);
    assert.doesNotMatch(out, /no hay información para mostrar/);
    assert.match(out, /III Bimestre/);
    assert.match(out, /Ana Arias Demo/);
    const failing = renderer.root.findAll(n => n.type === 'span' && n.props['data-failing'] === 'true').map(text);
    assert.ok(failing.includes('9') && failing.includes('10,50'), failing.join());
    assert.ok(out.includes('—'), 'criterio sin nota');
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    httpClient.defaults.adapter = original;
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
    if (saved.mode === undefined) delete process.env.NEXT_PUBLIC_APP_MODE; else process.env.NEXT_PUBLIC_APP_MODE = saved.mode;
    process.env.NEXT_PUBLIC_USE_MOCKS = saved.mocks;
  }
});

test('página en PRODUCTION: usa la vista conectada con el backend, sin datos simulados', async () => {
  const saved = { mode: process.env.NEXT_PUBLIC_APP_MODE, mocks: process.env.NEXT_PUBLIC_USE_MOCKS };
  process.env.NEXT_PUBLIC_APP_MODE = 'PRODUCTION';
  delete process.env.NEXT_PUBLIC_USE_MOCKS;
  try {
    await view(null, async h => {
      await act(async () => { h.renderer.update(<PadreProvider><LibretaPage /></PadreProvider>); });
      const out = h.text();
      assert.match(out, /Libreta de calificaciones/);
      assert.doesNotMatch(out, /no hay información para mostrar|Demo/);
      assert.match(out, /Bimestre 3 de Ana Arias Prueba/);
      assert.ok(h.callsTo('/v1/guardian/students/57/bimesters/published').length > 0);
    });
  } finally {
    if (saved.mode === undefined) delete process.env.NEXT_PUBLIC_APP_MODE; else process.env.NEXT_PUBLIC_APP_MODE = saved.mode;
    process.env.NEXT_PUBLIC_USE_MOCKS = saved.mocks;
  }
});
