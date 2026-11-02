import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { MOCK_BANNER_TEXT, ModoEntornoBanner } from '../src/components/ui/ModoEntornoBanner';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function text(n: ReactTestInstance): string { return n.children.map(c => (typeof c === 'string' ? c : text(c))).join(''); }
async function render(element: React.ReactElement) { let r!: ReactTestRenderer; await act(async () => { r = create(element); }); return r; }

test('MOCK: banda fija abajo, que no intercepta clics ni tapa modales (z-50)', async () => {
  const r = await render(<ModoEntornoBanner mode="MOCK" />);
  const band = r.root.findByProps({ role: 'status' });
  assert.equal(text(band), 'MODO SIMULADO: datos de prueba, sin backend');
  assert.equal(MOCK_BANNER_TEXT, text(band));
  for (const cls of ['fixed', 'bottom-0', 'inset-x-0', 'pointer-events-none', 'z-30']) assert.ok(band.props.className.split(' ').includes(cls), cls);
  act(() => r.unmount());
});

test('LOCAL: etiqueta pequeña en la esquina inferior derecha; PRODUCTION: nada', async () => {
  const local = await render(<ModoEntornoBanner mode="LOCAL" />);
  const tag = local.root.findByProps({ 'aria-label': 'Modo local' });
  assert.equal(text(tag), 'LOCAL');
  for (const cls of ['fixed', 'bottom-2', 'right-2', 'pointer-events-none']) assert.ok(tag.props.className.split(' ').includes(cls), cls);
  assert.doesNotMatch(text(local.root), /MODO SIMULADO/);
  act(() => local.unmount());

  const prod = await render(<ModoEntornoBanner mode="PRODUCTION" />);
  assert.equal(prod.toJSON(), null);
  act(() => prod.unmount());
});

test('sin prop usa el modo del entorno de pruebas (LOCAL, nunca MOCK por defecto)', async () => {
  const r = await render(<ModoEntornoBanner />);
  assert.doesNotMatch(JSON.stringify(r.toJSON()), /MODO SIMULADO/);
  act(() => r.unmount());
});
