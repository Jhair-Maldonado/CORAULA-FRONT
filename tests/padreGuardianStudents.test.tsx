import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import httpClient from '../src/services/httpClient';
import { getHijos } from '../src/services/padres/padreService';
import { PadreProvider } from '../src/components/padres/PadreContext';
import HijosMatriculados from '../feature/padre/vistas/verHijos/hijosMatriculados';
import { MOCK_HIJOS } from '../src/lib/mocks/mockPadres';
import type { GuardianStudentResponse } from '../src/types/guardianApi';

// REL-FIX-123: GET /v1/guardian/students sin datos inventados ni respaldo mock en producción.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_USE_MOCKS = 'false';

type Reply = { status: number; data?: unknown } | 'network';

async function withBackend<T>(reply: Reply, fn: (urls: string[]) => Promise<T>): Promise<T> {
  const original = httpClient.defaults.adapter;
  const urls: string[] = [];
  httpClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    urls.push(config.url || '');
    if (reply === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: reply.data, status: reply.status, statusText: '', headers: {}, config } as AxiosResponse;
    if (reply.status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, undefined, response);
    return response;
  };
  try {
    return await fn(urls);
  } finally {
    httpClient.defaults.adapter = original;
  }
}

function text(n: ReactTestInstance): string {
  return n.children.map(c => (typeof c === 'string' ? c : text(c))).join('');
}

const ANA: GuardianStudentResponse = { studentId: 57, studentCode: 'C26000057', fullName: 'Ana Arias Prueba', grade: 5, sectionName: 'A' };
const SIN_MATRICULA: GuardianStudentResponse = { studentId: 58, studentCode: null, fullName: 'Luis Retirado', grade: null, sectionName: null };

test('getHijos maps only contract fields; no fictitious average, attendance or pension', async () => {
  await withBackend({ status: 200, data: [ANA, SIN_MATRICULA] }, async urls => {
    const hijos = await getHijos();
    assert.deepEqual(urls, ['/v1/guardian/students']);
    const [ana, luis] = hijos;
    assert.equal(ana.id, '57');
    assert.equal(ana.nombreCompleto, 'Ana Arias Prueba');
    assert.equal(ana.codigoEstudiante, 'C26000057');
    assert.equal(ana.grado, '5° Grado');
    assert.equal(ana.seccion, 'A');
    for (const h of hijos) {
      assert.equal(h.promedio, null);
      assert.equal(h.promedioGeneral, null);
      assert.equal(h.asistencia, null);
      assert.equal(h.porcentajeAsistencia, null);
      assert.equal(h.estadoPension, null);
      assert.equal(h.faltasSinJustificar, null);
      assert.equal(h.nivel, null);
      assert.equal(h.estado, null);
      assert.equal(h.tutor, '');
      assert.equal(h.dni, '');
    }
    assert.equal(luis.grado, '');
    assert.equal(luis.seccion, '');
    assert.equal(luis.codigoEstudiante, '');
  });
});

test('getHijos with mocks off: empty list stays empty (no MOCK_HIJOS fallback)', async () => {
  await withBackend({ status: 200, data: [] }, async () => {
    assert.deepEqual(await getHijos(), []);
  });
});

test('getHijos with mocks off: failures become sanitized errors, never mock children', async () => {
  await withBackend({ status: 500, data: { message: 'stack interno' } }, async () => {
    await assert.rejects(getHijos(), { message: 'No se pudo cargar la lista de estudiantes vinculados.' });
  });
  await withBackend({ status: 403, data: {} }, async () => {
    await assert.rejects(getHijos(), { message: 'Tu cuenta no tiene un perfil de apoderado activo.' });
  });
  await withBackend('network', async () => {
    await assert.rejects(getHijos(), { message: 'No se pudo conectar con el servidor. Intenta nuevamente.' });
  });
});

test('getHijos returns MOCK_HIJOS only when isMockDataEnabled() is true', async () => {
  process.env.NEXT_PUBLIC_USE_MOCKS = 'true';
  try {
    await withBackend({ status: 200, data: [ANA] }, async urls => {
      const hijos = await getHijos();
      assert.equal(urls.length, 0);
      assert.deepEqual(hijos.map(h => h.id), MOCK_HIJOS.map(h => h.id));
    });
  } finally {
    process.env.NEXT_PUBLIC_USE_MOCKS = 'false';
  }
});

async function renderHijos(reply: Reply): Promise<string> {
  return withBackend(reply, async () => {
    let r!: ReturnType<typeof create>;
    await act(async () => {
      r = create(
        <PadreProvider>
          <HijosMatriculados />
        </PadreProvider>
      );
    });
    // getPadrePerfil sigue simulado con retardo de 250 ms y PadreContext recarga al autoseleccionar
    // un único hijo: se aplican dos ciclos de carga.
    for (let i = 0; i < 2; i++) {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 400));
      });
    }
    const out = text(r.root);
    act(() => r.unmount());
    return out;
  });
}

test('HijosMatriculados: empty list shows "no linked students" state', async () => {
  const out = await renderHijos({ status: 200, data: [] });
  assert.ok(out.includes('No tiene estudiantes vinculados'), out);
  for (const m of MOCK_HIJOS) assert.ok(!out.includes(m.nombreCompleto));
});

test('HijosMatriculados: backend error shows an error message', async () => {
  const out = await renderHijos({ status: 500, data: {} });
  assert.ok(out.includes('No se pudo cargar la lista de estudiantes vinculados.'), out);
  for (const m of MOCK_HIJOS) assert.ok(!out.includes(m.nombreCompleto));
});

test('HijosMatriculados: real student renders "Sin datos" instead of invented figures', async () => {
  const out = await renderHijos({ status: 200, data: [ANA] });
  assert.ok(out.includes('Ana Arias Prueba'), out);
  assert.ok(out.includes('Sin datos'));
  assert.ok(!out.includes('14.5'));
  assert.ok(!out.includes('16.0'));
  assert.ok(!out.includes('12 cursos'));
});
