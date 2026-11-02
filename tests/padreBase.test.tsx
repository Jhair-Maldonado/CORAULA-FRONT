import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import httpClient from '../src/services/httpClient';
import {
  GUARDIAN_MODULOS_CON_BACKEND,
  GUARDIAN_RUTAS_MODULO,
  guardianModuloUsaBackend,
  rutaPadreMuestraAvisoSimulado,
} from '../src/services/padres/guardianModules';
import { mapGuardianStudent } from '../src/services/padres/padreService';
import { formatGradoSeccion } from '../src/components/padres/hijoFormat';
import { PadreSimulationNotice } from '../src/components/padres/PadreSimulationNotice';
import { PadreProvider } from '../src/components/padres/PadreContext';
import { PadreNavbar, padreTituloDeRuta } from '../layout/padre/padreNavbar';
import { MENU_ITEMS } from '../layout/padre/padreSidebar';
import { ACCESOS_HIJO, TarjetaHijoVinculado } from '../feature/padre/vistas/verHijos/component/tarjetaHijoVinculado';
import LibretaPage from '../src/app/padre/libreta/page';
import type { GuardianStudentResponse } from '../src/types/guardianApi';

// APOD-FRONT-CORRECCION — PR A (base del portal del apoderado).
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageExists = (route: string) => existsSync(path.join(ROOT, 'src', 'app', ...route.split('/').filter(Boolean), 'page.tsx'));

const SIN_MATRICULA: GuardianStudentResponse = { studentId: 58, studentCode: null, fullName: 'Luis Retirado', grade: null, sectionName: null };

function text(n: ReactTestInstance): string {
  return n.children.map(c => (typeof c === 'string' ? c : text(c))).join('');
}

// next/link lee `self`; el navbar registra listeners en `document`. Ningún DOM real es necesario.
async function withGlobals<T>(fn: () => Promise<T>): Promise<T> {
  const saved = ['self', 'document'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { addEventListener() {}, removeEventListener() {} } });
  try {
    return await fn();
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

async function render(node: React.ReactNode, pathname = '/padre'): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<PathnameContext.Provider value={pathname}>{node}</PathnameContext.Provider>);
  });
  return r;
}

test('registro: hijos, asistencia e incidencias están conectados en el frontend', () => {
  assert.deepEqual([...GUARDIAN_MODULOS_CON_BACKEND].sort(), ['asistencia', 'hijos', 'incidencias']);
  assert.equal(guardianModuloUsaBackend('hijos', false), true);
  assert.equal(guardianModuloUsaBackend('incidencias', false), true);
  assert.equal(guardianModuloUsaBackend('libreta', false), false);
  assert.equal(guardianModuloUsaBackend('hijos', true), false, 'con mocks activos ningún servicio llama al backend');
});

test('aviso por ruta con mocks apagados: oculto solo en módulos con backend', () => {
  for (const ruta of ['/padre/hijos', '/padre/asistencia', '/padre/incidencias', '/padre/hijos/57']) {
    assert.equal(rutaPadreMuestraAvisoSimulado(ruta, false), false, ruta);
  }
  for (const ruta of ['/padre', '/padre/libreta', '/padre/justificacion', '/padre/avisos', '/padre/mensajeria', '/padre/hijosx', null]) {
    assert.equal(rutaPadreMuestraAvisoSimulado(ruta, false), true, String(ruta));
  }
});

test('aviso por ruta: con mocks activos aparece siempre; al registrar un módulo se oculta en su ruta', () => {
  for (const ruta of ['/padre/hijos', '/padre/asistencia', '/padre/libreta']) {
    assert.equal(rutaPadreMuestraAvisoSimulado(ruta, true), true, ruta);
  }
  const conLibreta = new Set([...GUARDIAN_MODULOS_CON_BACKEND, 'libreta' as const]);
  assert.equal(rutaPadreMuestraAvisoSimulado('/padre/libreta', false, conLibreta), false);
});

test('PadreSimulationNotice usa el registro por ruta', async () => {
  for (const [ruta, visible] of [['/padre/hijos', false], ['/padre/asistencia', false], ['/padre/libreta', true], ['/padre/incidencias', false]] as const) {
    const r = await render(<PadreSimulationNotice />, ruta);
    assert.equal(r.root.findAll(n => n.props.role === 'status').length > 0, visible, ruta);
    act(() => r.unmount());
  }
});

test('rutas del registro, del menú y de los accesos de la tarjeta existen en src/app/padre', () => {
  for (const ruta of Object.keys(GUARDIAN_RUTAS_MODULO)) assert.ok(pageExists(ruta), ruta);
  for (const item of MENU_ITEMS) assert.ok(pageExists(item.path), item.path);
  for (const acceso of ACCESOS_HIJO) assert.ok(pageExists(acceso.href), acceso.href);
  const paths = MENU_ITEMS.map(i => i.path);
  assert.ok(paths.includes('/padre/libreta') && paths.includes('/padre/incidencias'));
});

test('Libreta muestra el estado pendiente sin datos y con aviso', async () => {
  for (const [Page, ruta] of [[LibretaPage, '/padre/libreta']] as const) {
    const r = await render(<><PadreSimulationNotice /><Page /></>, ruta);
    const out = text(r.root);
    assert.ok(out.includes('Módulo en construcción'), out);
    assert.ok(out.includes('no hay información para mostrar'), out);
    act(() => r.unmount());
  }
});

test('títulos del navbar según las rutas reales', () => {
  for (const item of MENU_ITEMS) assert.notEqual(padreTituloDeRuta(item.path), 'Portal de Padres', item.path);
  assert.equal(padreTituloDeRuta('/padre'), 'Panel General');
  assert.equal(padreTituloDeRuta('/padre/avisos'), 'Centro de Comunicados');
  assert.equal(padreTituloDeRuta('/padre/mensajeria'), 'Mensajería');
  assert.equal(padreTituloDeRuta('/padre/libreta'), 'Libreta de Calificaciones');
  assert.equal(padreTituloDeRuta('/padre/incidencias'), 'Incidencias');
  assert.equal(padreTituloDeRuta('/otra'), 'Portal de Padres');
});

test('formatGradoSeccion: sin matrícula muestra «Sin sección», nunca « - » ni null', () => {
  assert.equal(formatGradoSeccion({ grado: '', seccion: '' }), 'Sin sección');
  assert.equal(formatGradoSeccion({ grado: '5° Grado', seccion: 'A' }), '5° Grado "A"');
  assert.equal(formatGradoSeccion({ grado: '5° Grado', seccion: '' }), '5° Grado');
  assert.equal(formatGradoSeccion({ grado: '', seccion: 'B' }), 'Sección "B"');
  assert.equal(formatGradoSeccion(mapGuardianStudent(SIN_MATRICULA)), 'Sin sección');
});

test('navbar: el selector muestra «Sin sección» para un estudiante sin matrícula', async () => {
  const original = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    if (config.url !== '/v1/guardian/students') throw new AxiosError('unexpected', 'ERR_BAD_REQUEST', config);
    return { data: [SIN_MATRICULA], status: 200, statusText: '', headers: {}, config } as AxiosResponse;
  };
  try {
    await withGlobals(async () => {
      const r = await render(<PadreProvider><PadreNavbar /></PadreProvider>, '/padre/hijos');
      for (let i = 0; i < 2; i++) await act(async () => { await new Promise(res => setTimeout(res, 400)); });
      const trigger = r.root.findAll(n => n.type === 'div' && typeof n.props.onClick === 'function')[0];
      act(() => trigger.props.onClick());
      const out = text(r.root);
      assert.ok(out.includes('Mis Estudiantes'), out);
      assert.ok(out.includes('Luis Retirado'), out);
      assert.ok(out.includes('Sin sección'), out);
      assert.ok(!out.includes(' - '), out);
      act(() => r.unmount());
    });
  } finally {
    httpClient.defaults.adapter = original;
  }
});

test('TarjetaHijoVinculado: campos null sin «null», sin periodo fijo ni id interno', async () => {
  await withGlobals(async () => {
    let selecciones = 0;
    const r = await render(
      <TarjetaHijoVinculado hijo={mapGuardianStudent(SIN_MATRICULA)} seleccionado={false} onSeleccionar={() => { selecciones++; }} />,
      '/padre/hijos',
    );
    const out = text(r.root);
    assert.ok(out.includes('Luis Retirado'), out);
    assert.ok(out.includes('Sin código') && out.includes('Sin sección') && out.includes('Sin datos'), out);
    for (const prohibido of ['null', 'undefined', 'ID #', '#58', '2026', 'Periodo', 'Editar Ficha']) {
      assert.ok(!out.includes(prohibido), `${prohibido} en: ${out}`);
    }
    const hrefs = r.root.findAll(n => n.type === 'a').map(a => a.props.href);
    assert.deepEqual(hrefs, ACCESOS_HIJO.map(a => a.href));
    const boton = r.root.findAll(n => n.type === 'button' && n.props['aria-pressed'] === false);
    assert.equal(boton.length, 1);
    act(() => boton[0].props.onClick());
    assert.equal(selecciones, 1);
    act(() => r.unmount());
  });
});

test('TarjetaHijoVinculado: seleccionado y edición solo cuando se pasa onEditar (modo demostración)', async () => {
  await withGlobals(async () => {
    let ediciones = 0;
    const hijo = mapGuardianStudent({ studentId: 57, studentCode: 'C26000057', fullName: 'Ana Arias Prueba', grade: 5, sectionName: 'A' });
    const r = await render(<TarjetaHijoVinculado hijo={hijo} seleccionado onSeleccionar={() => {}} onEditar={() => { ediciones++; }} />);
    const out = text(r.root);
    assert.ok(out.includes('Seleccionado') && out.includes('5° Grado "A"') && out.includes('C26000057'), out);
    const editar = r.root.findAll(n => n.type === 'button' && text(n).includes('Editar Ficha'));
    act(() => editar[0].props.onClick());
    assert.equal(ediciones, 1);
    act(() => r.unmount());
  });
});
