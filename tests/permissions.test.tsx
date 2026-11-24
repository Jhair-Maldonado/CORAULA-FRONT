import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { readFileSync } from 'node:fs';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {
  ACTION_ENDPOINTS, ACTION_ROLES, FORBIDDEN_ACTION_MESSAGE, can, canWithSession, isForbidden, rolesFor, type Action,
} from '../src/config/permissions';
import { useCan } from '../src/hooks/useCan';
import { AuthContext } from '../src/contexts/AuthContext';
import { AdminSidebar } from '../layout/admin/adminSidebar';
import { MOCK_ROUTES } from '../src/mocks/http/mockAdapter';
import { cargarMatriz, parseMatriz, type EndpointMatriz } from './helpers/permisosMatriz';
import type { BackendRole } from '../src/types';

// FRONT #167: el catálogo de permisos de la UI debe coincidir con docs/permisos/matriz.yaml del backend (copia en
// tests/fixtures/permisos-matriz.yaml), y el mock debe responder con los mismos roles que esa matriz.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

const matriz = cargarMatriz();
const ACTIONS = Object.keys(ACTION_ROLES) as Action[];
const sorted = (roles: readonly string[]) => [...new Set(roles)].sort();
const find = (metodo: string, ruta: string): EndpointMatriz | undefined => matriz.endpoints.find(e => e.metodo === metodo && e.ruta === ruta);

test('el lector de la matriz rechaza formatos desconocidos', () => {
  assert.throws(() => parseMatriz('version: 1\nroles: [ADMINISTRADOR]\nextra: 1\n'), /desconocida/);
  assert.throws(() => parseMatriz('version: 1\nroles: [ADMINISTRADOR]\nendpoints:\n  - metodo: GET\n    ruta: /x\n    roles: [OTRO]\n'), /Rol fuera/);
  assert.throws(() => parseMatriz('version: 1\nroles: [ADMINISTRADOR]\nendpoints:\n  - metodo: GET\n    ruta: /x\n    roles: [ADMINISTRADOR]\n'), /Solo 1 entradas/);
  assert.ok(matriz.endpoints.length >= 130);
});

test('el lector de la matriz acepta fin de línea CRLF', () => {
  const texto = readFileSync(new URL('./fixtures/permisos-matriz.yaml', import.meta.url), 'utf8').replace(/\r?\n/g, '\r\n');
  assert.ok(texto.includes('\r\n'));
  assert.deepEqual(parseMatriz(texto), matriz);
});

for (const action of ACTIONS) {
  test(`roles de «${action}» coinciden con la matriz del backend`, () => {
    const target = ACTION_ENDPOINTS[action];
    let esperado: string[];
    if ('prefijo' in target) {
      const delPrefijo = matriz.endpoints.filter(e => e.ruta.startsWith(target.prefijo));
      assert.ok(delPrefijo.length > 0, `sin rutas bajo ${target.prefijo}`);
      esperado = sorted(delPrefijo.flatMap(e => e.roles));
    } else {
      assert.ok(target.length > 0, 'la acción no declara endpoints');
      const lists = target.map(t => {
        const e = find(t.metodo, t.ruta);
        assert.ok(e, `${t.metodo} ${t.ruta} no existe en la matriz`);
        return e.roles;
      });
      esperado = sorted(lists.reduce((acc, roles) => acc.filter(r => roles.includes(r))));
    }
    assert.deepEqual(sorted(ACTION_ROLES[action]), esperado);
  });
}

test('cada endpoint de ACTION_ENDPOINTS existe en la matriz', () => {
  for (const action of ACTIONS) {
    const target = ACTION_ENDPOINTS[action];
    if ('prefijo' in target) continue;
    for (const t of target) assert.ok(find(t.metodo, t.ruta), `${action}: ${t.metodo} ${t.ruta}`);
  }
  assert.deepEqual(Object.keys(ACTION_ENDPOINTS).sort(), [...ACTIONS].sort());
});

test('can es falso con rol nulo, desconocido o acción inexistente', () => {
  assert.equal(can(null, 'period.read'), false);
  assert.equal(can(undefined, 'period.read'), false);
  assert.equal(can('', 'period.read'), false);
  assert.equal(can('SUPERADMIN', 'period.read'), false);
  assert.equal(can('__proto__', 'period.read'), false);
  assert.equal(can('constructor', 'period.read'), false);
  assert.equal(can('ADMINISTRADOR', 'no.existe' as Action), false);
  assert.equal(can('ADMINISTRADOR', '__proto__' as Action), false);
  assert.equal(can('ADMINISTRADOR', 'toString' as Action), false);
  assert.deepEqual(rolesFor('no.existe' as Action), []);
  assert.equal(can('ADMINISTRADOR', 'period.manage'), true);
  assert.equal(can('DIRECTIVO', 'period.manage'), false);
  assert.equal(can('DIRECTIVO', 'justification.decide'), true);
  assert.equal(can('DOCENTE', 'portal.admin'), false);
});

test('isForbidden distingue el 403 de permisos del cambio obligatorio de contraseña', () => {
  assert.equal(isForbidden({ response: { status: 403, data: {} } }), true);
  assert.equal(isForbidden({ response: { status: 403, data: { code: 'PASSWORD_CHANGE_REQUIRED' } } }), false);
  assert.equal(isForbidden({ response: { status: 401 } }), false);
  assert.equal(isForbidden(null), false);
  assert.equal(FORBIDDEN_ACTION_MESSAGE, 'No tienes permiso para esta acción.');
});

const auth = (role: BackendRole | null, over: Partial<Auth> = {}): Auth => ({
  token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true, ...over,
});

function probe(session: Auth | undefined, action: Action): boolean {
  let result: boolean | undefined;
  function Probe() { result = useCan(action); return null; }
  let renderer: ReturnType<typeof create> | undefined;
  act(() => { renderer = create(<AuthContext.Provider value={session}><Probe /></AuthContext.Provider>); });
  act(() => { renderer?.unmount(); });
  return result as boolean;
}

test('useCan es falso sin sesión válida y verdadero en el caso válido', () => {
  assert.equal(probe(auth('ADMINISTRADOR', { status: 'loading' }), 'period.manage'), false);
  assert.equal(probe(auth('ADMINISTRADOR', { status: 'unauthenticated' }), 'period.manage'), false);
  assert.equal(probe(auth('ADMINISTRADOR', { sessionValid: false }), 'period.manage'), false);
  assert.equal(probe(auth(null), 'period.manage'), false);
  assert.equal(probe(undefined, 'period.manage'), false);
  assert.equal(probe(auth('DIRECTIVO'), 'period.manage'), false);
  assert.equal(probe(auth('ADMINISTRADOR'), 'period.manage'), true);
  assert.equal(canWithSession(auth('DIRECTIVO'), 'justification.decide'), true);
  assert.equal(canWithSession(null, 'justification.decide'), false);
});

const text = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
// next/link lee `self` al renderizar; se define solo durante la prueba.
function sidebarLabels(session: Auth): string[] {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try { return renderSidebar(session); } finally {
    if (old) Object.defineProperty(globalThis, 'self', old); else Reflect.deleteProperty(globalThis, 'self');
  }
}
function renderSidebar(session: Auth): string[] {
  let renderer: ReturnType<typeof create> | undefined;
  act(() => { renderer = create(<AuthContext.Provider value={session}><PathnameContext.Provider value="/administrador"><AdminSidebar /></PathnameContext.Provider></AuthContext.Provider>); });
  const labels = renderer!.root.findAllByType('a').map(a => text(a));
  act(() => { renderer?.unmount(); });
  return labels;
}

test('la barra lateral muestra solo los ítems permitidos a cada rol', () => {
  const admin = sidebarLabels(auth('ADMINISTRADOR')).join('|');
  const directivo = sidebarLabels(auth('DIRECTIVO')).join('|');
  for (const item of ['Periodos', 'Justificaciones', 'Personal', 'Auditoría']) assert.match(admin, new RegExp(item), `ADMINISTRADOR ve ${item}`);
  for (const item of ['Periodos', 'Justificaciones', 'Auditoría']) assert.match(directivo, new RegExp(item), `DIRECTIVO ve ${item}`);
  assert.doesNotMatch(directivo, /Personal/);
  assert.match(directivo, /Dashboard/);
  assert.doesNotMatch(sidebarLabels(auth('ADMINISTRADOR', { sessionValid: false })).join('|'), /Personal/);
});

// El mock debe responder con los mismos roles que la matriz: una ruta simulada más abierta oculta en MOCK errores 403 reales.
const shape = (ruta: string) => ruta.split('/').map(s => (s.startsWith(':') || s.startsWith('{') ? '*' : s)).join('/');

test('los roles de cada ruta del mock coinciden con la matriz del backend', () => {
  const byKey = new Map(matriz.endpoints.map(e => [`${e.metodo} ${shape(e.ruta)}`, e]));
  const diferencias: string[] = [];
  let comparadas = 0;
  for (const route of MOCK_ROUTES) {
    if (!route.pattern.startsWith('/v1/management/')) continue;
    const entry = byKey.get(`${route.method} ${shape(`/api${route.pattern}`)}`);
    if (!entry) { diferencias.push(`${route.method} ${route.pattern}: no está en la matriz`); continue; }
    comparadas++;
    const mock = sorted(route.roles ?? []);
    if (JSON.stringify(mock) !== JSON.stringify(sorted(entry.roles))) diferencias.push(`${route.method} ${route.pattern}: mock [${mock}] vs matriz [${sorted(entry.roles)}]`);
  }
  assert.ok(comparadas >= 40, `solo se compararon ${comparadas} rutas`);
  assert.deepEqual(diferencias, []);
});
