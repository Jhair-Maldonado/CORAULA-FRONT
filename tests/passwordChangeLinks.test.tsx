import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AuthContext } from '../src/contexts/AuthContext';
import { AdminSidebar } from '../layout/admin/adminSidebar';
import { DocenteSidebar } from '../src/app/docente/components/DocenteSidebar';
import { DocenteNav } from '../src/app/docente/components/DocenteNav';
import { DocenteSessionProvider } from '../src/app/docente/components/DocenteSessionContext';
import { PadreSidebar } from '../layout/padre/padreSidebar';
import { PadreProvider } from '../src/components/padres/PadreContext';
import { AlumnoSidebar } from '../layout/alumno/alumnoSidebar';
import { AlumnoNavbar } from '../layout/alumno/alumnoNavbar';
import { AlumnoSessionProvider } from '../src/components/alumno/AlumnoSessionContext';
import httpClient from '../src/services/httpClient';
import { teacherProfileService } from '../src/services/teacher/teacherProfileService';
import { teacherCoursesService } from '../src/services/teacher/teacherCoursesService';
import { CHANGE_PASSWORD_ROUTE } from '../src/utils/authRoutes';
import type { BackendRole } from '../src/types';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

function auth(role: BackendRole | null, status: Auth['status'] = 'authenticated'): Auth {
  return {
    token: role ? 'synthetic-token' : null, role, status, sessionValid: status === 'authenticated', passwordChangeRequired: false,
    login() {}, logout() {}, validateSession: () => status === 'authenticated', isSessionPhysicallyValid: () => status === 'authenticated',
  } as Auth;
}

const router: AppRouterInstance = { back() {}, forward() {}, refresh() {}, prefetch() {}, push() {}, replace() {}, bfcacheId: 'password-links-test' };

async function render(node: React.ReactNode, options: { session: Auth; pathname: string; alumnoMock?: boolean }, check: (r: ReactTestRenderer) => void) {
  const globals = ['window', 'localStorage', 'self'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const values = new Map<string, string>();
  if (options.alumnoMock) values.set('coraula_alumno_session', JSON.stringify({ id: 'alu-1', nombre: 'Alumno Simulado', nombres: 'Alumno', apellidos: 'Simulado', usuario: 'sim', grado: '5to', seccion: 'B', codigoEstudiante: 'X-1' }));
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: Object.assign(new EventTarget(), { localStorage: storage }) });
  // next/link prefetch schedules work through self.requestIdleCallback.
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  const originalAdapter = httpClient.defaults.adapter;
  // Portal providers load profile data; no real backend is reached.
  httpClient.defaults.adapter = async () => { throw new Error('Synthetic offline backend'); };
  const originalError = console.error;
  console.error = () => {};
  let renderer: ReactTestRenderer | undefined;
  try {
    await act(async () => {
      renderer = create(
        <AppRouterContext.Provider value={router}>
          <PathnameContext.Provider value={options.pathname}>
            <AuthContext.Provider value={options.session}>{node}</AuthContext.Provider>
          </PathnameContext.Provider>
        </AppRouterContext.Provider>
      );
    });
    check(renderer!);
  } finally {
    if (renderer) await act(async () => { renderer!.unmount(); });
    console.error = originalError;
    httpClient.defaults.adapter = originalAdapter;
    for (const [name, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

const passwordLinks = (r: ReactTestRenderer): ReactTestInstance[] =>
  r.root.findAll(node => node.type === 'a' && node.props.href === CHANGE_PASSWORD_ROUTE);
const logoutButtons = (r: ReactTestRenderer) =>
  r.root.findAll(node => node.type === 'button' && typeof node.props.title === 'string' && node.props.title.startsWith('Cerrar sesión'));

function assertLink(r: ReactTestRenderer, expected = 1) {
  const links = passwordLinks(r);
  assert.equal(links.length, expected);
  for (const link of links) assert.equal(link.props.title, 'Cambiar contraseña');
  assert.ok(logoutButtons(r).length > 0, 'the link sits beside the existing logout action');
}

test('admin sidebar links to the password change page, expanded and collapsed', async () => {
  await render(<AdminSidebar />, { session: auth('ADMINISTRADOR'), pathname: '/administrador' }, r => {
    assertLink(r);
    act(() => { r.root.findByProps({ title: 'Contraer sidebar' }).props.onClick(); });
    assertLink(r);
  });
});

test('teacher sidebar and teacher nav link to the password change page', async () => {
  const original = { getMe: teacherProfileService.getMe, getCourses: teacherCoursesService.getCourses };
  teacherProfileService.getMe = async () => ({ id: 7, personId: 1, dni: '1', firstNames: 'Juan', paternalLastName: 'Pérez', maternalLastName: null, fullName: 'Juan Pérez', phone: null, specialty: null, active: true });
  teacherCoursesService.getCourses = async () => [];
  try {
    await render(<DocenteSessionProvider><DocenteSidebar /></DocenteSessionProvider>, { session: auth('DOCENTE'), pathname: '/docente' }, r => assertLink(r));
  } finally {
    teacherProfileService.getMe = original.getMe;
    teacherCoursesService.getCourses = original.getCourses;
  }
  await render(<DocenteNav />, { session: auth('DOCENTE'), pathname: '/docente' }, r => assertLink(r));
});

test('guardian sidebar links to the password change page', async () => {
  await render(<PadreProvider><PadreSidebar /></PadreProvider>, { session: auth('APODERADO'), pathname: '/padre' }, r => assertLink(r));
});

test('student menus link to the password change page only with a real ESTUDIANTE session', async () => {
  for (const menu of [<AlumnoSidebar key="s" />, <AlumnoNavbar key="n" />]) {
    await render(<AlumnoSessionProvider>{menu}</AlumnoSessionProvider>, { session: auth('ESTUDIANTE'), pathname: '/alumno', alumnoMock: true }, r => assertLink(r));
    // Simulated alumno session without a backend account: no password change.
    await render(<AlumnoSessionProvider>{menu}</AlumnoSessionProvider>, { session: auth(null, 'unauthenticated'), pathname: '/alumno', alumnoMock: true }, r => {
      assert.equal(passwordLinks(r).length, 0);
      assert.ok(logoutButtons(r).length > 0);
    });
    // Another role's JWT does not count as a student session.
    await render(<AlumnoSessionProvider>{menu}</AlumnoSessionProvider>, { session: auth('DOCENTE'), pathname: '/alumno', alumnoMock: true }, r => assert.equal(passwordLinks(r).length, 0));
  }
});
