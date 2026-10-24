import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import HuellaPorGrado from '../feature/admin/vistas/(sistema)/huella/huellasPorGrado';
import ChatAdministrativo from '../feature/admin/vistas/(sistema)/mensajeria/chatAdministrativo';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const HUELLA = 'Módulo en construcción: el registro de huellas no está conectado a lectores reales; los datos son de demostración.';
const CHAT = 'Módulo en construcción: la mensajería no está conectada; los contactos y mensajes son de demostración.';
function text(n: ReactTestInstance): string { return n.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }

// activo={true}: the notice is shown even with NEXT_PUBLIC_USE_MOCKS="false".
for (const [name, View, expected] of [['huellasPorGrado', HuellaPorGrado, HUELLA], ['chatAdministrativo', ChatAdministrativo, CHAT]] as const) {
  test(`${name} shows the under-construction notice`, async () => {
    const original = process.env.NEXT_PUBLIC_USE_MOCKS;
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
    let r!: ReactTestRenderer;
    try {
      await act(async () => { r = create(<View />, { createNodeMock: () => ({ scrollTop: 0, scrollHeight: 0 }) }); });
      const notices = r.root.findAll(n => n.props.role === 'status' && text(n).startsWith('Módulo en construcción'));
      assert.equal(notices.length, 1);
      assert.equal(text(notices[0]), expected);
    } finally {
      if (r) await act(async () => { r.unmount(); });
      if (original === undefined) delete process.env.NEXT_PUBLIC_USE_MOCKS; else process.env.NEXT_PUBLIC_USE_MOCKS = original;
    }
  });
}
