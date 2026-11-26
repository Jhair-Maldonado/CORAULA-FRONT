import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import VistaTodosLosCursos from '../feature/admin/vistas/(academico)/cursos/vistaTodosLosCursos';
import DetalleDelCurso from '../feature/admin/vistas/(academico)/cursos/detalleDelCurso';
import { toCurso } from '../src/adapters/courseAdapter';
import { coursesService } from '../src/services/admin/coursesService';
import type { CourseResponse, PagedCourseResponse } from '../src/types/courseApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const course = (overrides: Partial<CourseResponse> = {}): CourseResponse => ({
  id: 101, code: 'MAT-P5', name: 'Matemática', level: 'PRIMARY', area: 'Matemática', weeklyHours: 6,
  description: 'Descripción ficticia del curso.', active: true, ...overrides,
});
const page = (content: CourseResponse[], extra: Partial<PagedCourseResponse> = {}): PagedCourseResponse =>
  ({ content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, ...extra });
const httpError = (status: number) => new AxiosError('private', 'ERR_TEST', undefined, undefined, { status, data: {} } as AxiosResponse);
const text = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
const button = (r: ReactTestRenderer, label: string) => r.root.findAllByType('button').find(b => text(b) === label);

async function render(element: React.ReactElement, run: (r: ReactTestRenderer) => Promise<void>) {
  const old = { list: coursesService.list, getById: coursesService.getById };
  const self = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PathParamsContext.Provider value={{ id: '101' }}>{element}</PathParamsContext.Provider>); });
    await run(renderer);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    Object.assign(coursesService, old);
    if (self) Object.defineProperty(globalThis, 'self', self); else Reflect.deleteProperty(globalThis, 'self');
  }
}

test('toCurso: curso completo y con descripción nula', () => {
  assert.deepEqual(toCurso(course()), {
    id: '101', codigo: 'MAT-P5', nombre: 'Matemática', nivel: 'Primaria', area: 'Matemática',
    horasTotalesSemana: 6, descripcion: 'Descripción ficticia del curso.', active: true,
  });
  const sparse = toCurso(course({ level: 'SECONDARY', description: null, active: false }));
  assert.equal(sparse.nivel, 'Secundaria');
  assert.equal(sparse.descripcion, undefined);
  assert.equal(sparse.active, false);
});

test('lista: con datos muestra tarjetas con enlace al detalle, horas y estado', async () => {
  coursesService.list = async () => page([course(), course({ id: 102, code: 'COM-P5', name: 'Comunicación', active: false })]);
  await render(<VistaTodosLosCursos />, async r => {
    const all = text(r.root);
    assert.match(all, /Matemática/);
    assert.match(all, /Comunicación/);
    assert.match(all, /6 hrs\/sem/);
    assert.match(all, /Inactivo/);
    assert.match(all, /2 cursos • Página 1 de 1/);
    assert.ok(r.root.findAllByType('a').some(a => a.props.href === '/administrador/cursos/asignatura/101'));
  });
});

test('lista: vacía muestra el aviso y sin paginación', async () => {
  coursesService.list = async () => page([]);
  await render(<VistaTodosLosCursos />, async r => {
    assert.match(text(r.root), /No hay cursos para los criterios seleccionados/);
    assert.equal(button(r, 'Siguiente'), undefined);
  });
});

test('lista: el error muestra el mensaje del service y «Reintentar» vuelve a consultar', async () => {
  let calls = 0;
  coursesService.list = async () => { calls += 1; if (calls === 1) throw httpError(500); return page([course()]); };
  await render(<VistaTodosLosCursos />, async r => {
    assert.ok(r.root.findAll(n => n.props.role === 'alert').length > 0);
    assert.match(text(r.root), /No se pudo completar la solicitud/);
    const retry = button(r, 'Reintentar');
    assert.ok(retry);
    await act(async () => { retry.props.onClick(); });
    assert.equal(calls, 2);
    assert.match(text(r.root), /Matemática/);
    assert.equal(button(r, 'Reintentar'), undefined);
  });
});

test('lista: la paginación pide la página siguiente y deshabilita «Anterior» en la primera', async () => {
  const pages: (number | undefined)[] = [];
  coursesService.list = async params => { pages.push(params?.page); return page([course()], { page: params?.page ?? 0, totalPages: 3, totalElements: 41 }); };
  await render(<VistaTodosLosCursos />, async r => {
    assert.equal(button(r, 'Anterior')!.props.disabled, true);
    await act(async () => { button(r, 'Siguiente')!.props.onClick(); });
    assert.deepEqual(pages, [0, 1]);
    assert.match(text(r.root), /Página 2 de 3/);
    assert.equal(button(r, 'Anterior')!.props.disabled, false);
  });
});

test('detalle: con datos muestra código, nivel, horas y descripción', async () => {
  coursesService.getById = async () => course();
  await render(<DetalleDelCurso />, async r => {
    const all = text(r.root);
    assert.match(all, /MAT-P5/);
    assert.match(all, /Primaria • Matemática/);
    assert.match(all, /Estructura y horas semanales/);
    assert.match(all, /6 hrs\/sem/);
    assert.match(all, /Descripción ficticia del curso\./);
    assert.match(all, /Activo/);
  });
});

test('detalle: descripción nula muestra «Sin descripción.»', async () => {
  coursesService.getById = async () => course({ description: null });
  await render(<DetalleDelCurso />, async r => { assert.match(text(r.root), /Sin descripción\./); });
});

test('detalle: 404 muestra «Curso no encontrado»', async () => {
  coursesService.getById = async () => { throw httpError(404); };
  await render(<DetalleDelCurso />, async r => {
    assert.match(text(r.root), /Curso no encontrado/);
  });
});

test('detalle: el error genérico permite reintentar y luego carga el curso', async () => {
  let calls = 0;
  coursesService.getById = async () => { calls += 1; if (calls === 1) throw httpError(500); return course(); };
  await render(<DetalleDelCurso />, async r => {
    assert.match(text(r.root), /No se pudo cargar el curso/);
    assert.match(text(r.root), /No se pudo completar la solicitud/);
    await act(async () => { button(r, 'Reintentar')!.props.onClick(); });
    assert.equal(calls, 2);
    assert.match(text(r.root), /Estructura y horas semanales/);
  });
});
