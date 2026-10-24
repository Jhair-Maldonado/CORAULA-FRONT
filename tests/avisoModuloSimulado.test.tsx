import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AvisoModuloSimulado } from '../src/components/ui/AvisoModuloSimulado';
import { isMockDataEnabled } from '../src/lib/mockMode';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const ALUMNO = 'Módulo en construcción: la información que ves es de demostración y no corresponde a tu cuenta.';
const PADRE = 'Módulo en construcción: la información que ves es de demostración y no corresponde a tus hijos vinculados.';
function text(n: ReactTestInstance): string { return n.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
async function render(element: React.ReactElement) { let r!: ReactTestRenderer; await act(async () => { r = create(element); }); return r; }
async function withEnv<T>(value: string | undefined, fn: () => Promise<T>) {
  const original = process.env.NEXT_PUBLIC_USE_MOCKS;
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCKS; else process.env.NEXT_PUBLIC_USE_MOCKS = value;
  try { return await fn(); } finally { if (original === undefined) delete process.env.NEXT_PUBLIC_USE_MOCKS; else process.env.NEXT_PUBLIC_USE_MOCKS = original; }
}

test('isMockDataEnabled only disables mocks with the exact value "false"', () => {
  assert.equal(isMockDataEnabled(undefined), true);
  assert.equal(isMockDataEnabled('true'), true);
  assert.equal(isMockDataEnabled(''), true);
  assert.equal(isMockDataEnabled('false'), false);
});

test('notice renders an accessible status with the student text when active', async () => {
  const r = await render(<AvisoModuloSimulado activo />);
  const status = r.root.findAll(n => n.props.role === 'status');
  assert.equal(status.length, 1);
  assert.equal(text(status[0]), ALUMNO);
  act(() => r.unmount());
});

test('notice renders nothing when inactive', async () => {
  const r = await render(<AvisoModuloSimulado activo={false} />);
  assert.equal(r.toJSON(), null);
  act(() => r.unmount());
});

test('notice follows NEXT_PUBLIC_USE_MOCKS when activo is omitted', async () => {
  for (const [value, shown] of [[undefined, true], ['true', true], ['false', false]] as const) {
    await withEnv(value, async () => {
      const r = await render(<AvisoModuloSimulado />);
      assert.equal(r.root.findAll(n => n.props.role === 'status').length, shown ? 1 : 0, `value=${value}`);
      act(() => r.unmount());
    });
  }
});

test('guardian notice is shown even when NEXT_PUBLIC_USE_MOCKS is "false"', async () => {
  await withEnv('false', async () => {
    const r = await render(<AvisoModuloSimulado activo={true} detalle="la información que ves es de demostración y no corresponde a tus hijos vinculados." />);
    const status = r.root.findAll(n => n.props.role === 'status');
    assert.equal(status.length, 1);
    assert.equal(text(status[0]), PADRE);
    act(() => r.unmount());
  });
});
