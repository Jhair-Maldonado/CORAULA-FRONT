import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaTodosLosDocentes from '../feature/admin/vistas/(academico)/docente/vistaTodosLosDocentes';
import PerfilDelDocente from '../feature/admin/vistas/(academico)/docente/perfilDelDocente';
import { AuthContext } from '../src/contexts/AuthContext';
import { teachersService } from '../src/services/admin/teachersService';
import type { PagedTeachersResponse, TeacherDetailResponse, TeacherResponse, UpdateTeacherRequest } from '../src/types/teacherApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const teacher = (overrides: Partial<TeacherResponse> = {}): TeacherResponse => ({
  id: 7, dni: '00000007', firstNames: 'Docente', paternalLastName: 'Sintético', maternalLastName: null, fullName: 'Docente Sintético',
  phone: null, specialty: null, active: true, ...overrides,
});
const detail = (overrides: Partial<TeacherDetailResponse> = {}): TeacherDetailResponse => ({ ...teacher(), assignments: [], account: null, ...overrides });
const page = (content: TeacherResponse[]): PagedTeachersResponse => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 });
const httpError = (status: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;
type Harness = { renderer: ReactTestRenderer; text: () => string; dialog: () => ReactTestInstance | undefined; press: (node: ReactTestInstance | undefined) => Promise<void> };

async function render(element: React.ReactElement, options: { active?: boolean; update?: typeof teachersService.update },
  run: (h: Harness, calls: UpdateTeacherRequest[]) => Promise<void>) {
  const old = { list: teachersService.list, getById: teachersService.getById, update: teachersService.update };
  const calls: UpdateTeacherRequest[] = [];
  let active = options.active ?? true;
  teachersService.list = async () => page([teacher({ active })]);
  teachersService.getById = async () => detail({ active });
  teachersService.update = async (id, payload) => {
    calls.push(payload);
    if (options.update) return options.update(id, payload);
    active = payload.active ?? active;
    return teacher({ active });
  };
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  const auth: Auth = { token: 'synthetic', role: 'ADMINISTRADOR', status: 'authenticated', sessionValid: true,
    login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {
      renderer = create(<AuthContext.Provider value={auth}><PathParamsContext.Provider value={{ id: '7' }}>{element}</PathParamsContext.Provider></AuthContext.Provider>);
    });
    await run({
      renderer,
      text: () => text(renderer.root),
      dialog: () => renderer.root.findAll(node => node.props.role === 'dialog')[0],
      press: async node => { assert.ok(node); await act(async () => { node.props.onClick(); }); },
    }, calls);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(teachersService, old);
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

const listSwitch = (h: Harness) => h.renderer.root.findAll(node => node.type === 'button' && node.props.role === 'switch')[0];
const profileToggle = (h: Harness) => h.renderer.root.findAllByType('button').find(node => /^(Desactivar|Reactivar) docente$/.test(text(node)));
const dialogButton = (h: Harness, label: string) => h.dialog()?.findAllByType('button').find(node => text(node) === label);

for (const [name, element, toggle, message] of [
  ['list', <VistaTodosLosDocentes key="list" />, listSwitch, '¿Deseas desactivar al docente Docente Sintético? También se desactivarán sus asignaciones activas.'],
  ['profile', <PerfilDelDocente key="profile" />, profileToggle, 'Al desactivar al docente también se desactivarán sus asignaciones activas. ¿Deseas continuar?'],
] as const) {
  test(`${name}: deactivating asks for confirmation and cancelling does not call the service`, async () => {
    await render(element, {}, async (h, calls) => {
      await h.press(toggle(h));
      assert.ok(h.dialog(), 'confirmation dialog');
      assert.match(text(h.dialog()!), new RegExp(message.replace(/[?¿.]/g, '\\$&')));
      await h.press(dialogButton(h, 'Cancelar'));
      assert.equal(h.dialog(), undefined);
      assert.deepEqual(calls, []);
    });
  });

  test(`${name}: confirming deactivates the teacher`, async () => {
    await render(element, {}, async (h, calls) => {
      await h.press(toggle(h));
      await h.press(dialogButton(h, 'Desactivar docente'));
      assert.equal(h.dialog(), undefined);
      assert.deepEqual(calls, [{ active: false }]);
      assert.match(h.text(), /desactivado/);
      assert.match(h.text(), /Inactivo/);
    });
  });

  test(`${name}: reactivating skips the confirmation`, async () => {
    await render(element, { active: false }, async (h, calls) => {
      await h.press(toggle(h));
      assert.equal(h.dialog(), undefined);
      assert.deepEqual(calls, [{ active: true }]);
    });
  });

  test(`${name}: a failed toggle shows the error inline without leaking backend details`, async () => {
    await render(element, { update: async () => { throw httpError(500); } }, async (h, calls) => {
      await h.press(toggle(h));
      await h.press(dialogButton(h, 'Desactivar docente'));
      assert.deepEqual(calls, [{ active: false }]);
      const alerts = h.renderer.root.findAll(node => node.type === 'div' || node.type === 'p').filter(node => node.props.role === 'alert');
      assert.equal(alerts.length, 1);
      assert.doesNotMatch(h.text(), /PRIVATE DETAIL/);
      assert.match(h.text(), /Activo/);
    });
  });
}
