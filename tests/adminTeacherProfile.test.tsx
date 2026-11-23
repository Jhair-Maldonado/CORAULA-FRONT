import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import PerfilDelDocente from '../feature/admin/vistas/(academico)/docente/perfilDelDocente';
import { AuthContext } from '../src/contexts/AuthContext';
import { teachersService } from '../src/services/admin/teachersService';
import { sectionsService } from '../src/services/admin/sectionsService';
import { formatAssignedAt } from '../src/adapters/teacherAssignmentAdapter';
import type { SectionResponse } from '../src/types/sectionApi';
import type { TeacherAssignmentResponse, TeacherDetailResponse } from '../src/types/teacherApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const assignedAt = '2026-02-25T15:00:00Z';
const assignment = (overrides: Partial<TeacherAssignmentResponse> = {}): TeacherAssignmentResponse => ({
  id: 601, teacherId: 7, sectionCourseId: 1, sectionId: 10, courseId: 3, courseCode: 'MAT', courseName: 'Matemática', assignedAt, active: true, ...overrides,
});
const detail = (assignments: TeacherAssignmentResponse[] = [assignment()]): TeacherDetailResponse => ({
  id: 7, dni: '00000007', firstNames: 'Docente', paternalLastName: 'Sintético', maternalLastName: null, fullName: 'Docente Sintético',
  phone: null, specialty: 'Matemática', active: true, assignments, account: null,
});
const section: SectionResponse = { id: 10, academicPeriodId: 1, level: 'PRIMARY', grade: 5, name: 'A', maxCapacity: 30, enrollmentOpen: true, active: true };
const httpError = (status: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined, { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

async function profile(options: { read?: typeof teachersService.getById; sections?: typeof sectionsService.list },
  run: (h: { root: ReactTestInstance; text: () => string; calls: { sections: number; detail: number };
    click: (label: string) => Promise<void>; unmount: () => Promise<void> }) => Promise<void>) {
  const old = { getById: teachersService.getById, sections: sectionsService.list };
  const calls = { sections: 0, detail: 0 };
  teachersService.getById = async (...args) => { calls.detail++; return (options.read ?? (async () => detail()))(...args); };
  sectionsService.list = async (...args) => { calls.sections++; return (options.sections ?? (async () => [section]))(...args); };
  const oldSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  const auth: Auth = { token: 'synthetic', role: 'ADMINISTRADOR', status: 'authenticated', sessionValid: true,
    login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  let renderer!: ReactTestRenderer;
  let unmounted = false;
  try {
    await act(async () => {
      renderer = create(<AuthContext.Provider value={auth}><PathParamsContext.Provider value={{ id: '7' }}><PerfilDelDocente /></PathParamsContext.Provider></AuthContext.Provider>);
    });
    await run({
      unmount: async () => { unmounted = true; await act(async () => { renderer.unmount(); }); },
      root: renderer.root, text: () => text(renderer.root), calls,
      click: async label => {
        const node = renderer.root.findAllByType('button').find(button => text(button) === label);
        assert.ok(node, label);
        await act(async () => { node.props.onClick(); });
      },
    });
  } finally {
    if (renderer && !unmounted) await act(async () => { renderer.unmount(); });
    teachersService.getById = old.getById; sectionsService.list = old.sections;
    if (oldSelf) Object.defineProperty(globalThis, 'self', oldSelf); else Reflect.deleteProperty(globalThis, 'self');
  }
}

test('shows readable grade, section and date, with no ids or ISO dates', async () => {
  await profile({}, async h => {
    const content = h.text();
    assert.match(content, /MAT · Matemática/);
    assert.match(content, /5° grado · Primaria/);
    assert.match(content, /Sección A/);
    assert.ok(content.includes(formatAssignedAt(assignedAt)));
    assert.doesNotMatch(content, /ID de sección/);
    assert.doesNotMatch(content, /\d{4}-\d{2}-\d{2}T/);
    assert.equal(h.root.findByType('time').props.dateTime, assignedAt);
    assert.equal(h.calls.sections, 1);
  });
});

test('keeps the two-column layout (7 left, 5 right) and the profile actions', async () => {
  await profile({}, async h => {
    const classes = h.root.findAll(node => typeof node.type === 'string' && typeof node.props.className === 'string').map(node => node.props.className as string);
    assert.ok(classes.some(c => c.includes('lg:col-span-7')));
    assert.ok(classes.some(c => c.includes('lg:col-span-5')));
    assert.ok(classes.some(c => c.includes('lg:grid-cols-12')));
    assert.match(h.text(), /Editar docente/);
    assert.match(h.text(), /Desactivar docente \(no afecta su cuenta de acceso\)/);
    assert.match(h.text(), /Datos personales/);
    assert.match(h.text(), /El docente no tiene cuenta de acceso\./);
  });
});

test('when sections fail the profile stays visible with an alert and Reintentar reloads them', async () => {
  let fail = true;
  await profile({ sections: async () => { if (fail) throw httpError(500); return [section]; } }, async h => {
    assert.match(h.text(), /Docente Sintético/);
    assert.match(h.text(), /Sección no disponible/);
    assert.match(h.text(), /No se pudieron cargar los grados y secciones/);
    assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
    assert.ok(h.root.findAll(node => node.props.role === 'alert').length > 0);
    fail = false;
    await h.click('Reintentar');
    assert.equal(h.calls.sections, 2);
    assert.equal(h.calls.detail, 1);
    assert.match(h.text(), /5° grado · Primaria/);
    assert.doesNotMatch(h.text(), /No se pudieron cargar los grados y secciones/);
  });
});

test('an assignment pointing to a missing section shows «Sección no disponible»', async () => {
  await profile({ read: async () => detail([assignment({ sectionId: 999 })]) }, async h => {
    assert.match(h.text(), /Sección no disponible/);
    assert.doesNotMatch(h.text(), /999/);
  });
});

test('shows the empty state when there are no assignments', async () => {
  await profile({ read: async () => detail([]) }, async h => {
    assert.match(h.text(), /Sin asignaciones registradas\./);
  });
});

test('a load error offers Reintentar, which reads the detail again', async () => {
  let fail = true;
  await profile({ read: async () => { if (fail) throw httpError(500); return detail(); } }, async h => {
    assert.match(h.text(), /No se pudo cargar el docente/);
    assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
    fail = false;
    await h.click('Reintentar');
    assert.match(h.text(), /Docente Sintético/);
    assert.equal(h.calls.detail, 2);
  });
});

test('a 404 shows «Docente no encontrado»', async () => {
  await profile({ read: async () => { throw httpError(404); } }, async h => {
    assert.match(h.text(), /Docente no encontrado/);
  });
});

test('mientras las secciones están pendientes se muestra el estado de carga y desmontar antes de que resuelvan no falla', async () => {
  let resolve!: (sections: SectionResponse[]) => void;
  const pending = new Promise<SectionResponse[]>(done => { resolve = done; });
  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) errors.push(args); };
  try {
    await profile({ sections: () => pending }, async h => {
      assert.match(h.text(), /Docente Sintético/);
      assert.match(h.text(), /Cargando asignaciones\.\.\./);
      assert.ok(h.root.findAll(node => node.props.role === 'status' && /Cargando asignaciones/.test(text(node))).length > 0);
      assert.doesNotMatch(h.text(), /Sección no disponible/);
      await h.unmount();
      await act(async () => { resolve([section]); await pending; });
    });
  } finally {
    console.error = originalError;
  }
  assert.deepEqual(errors, []);
});
