import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import AlumnoPorSeccion from '../feature/admin/vistas/(academico)/alumnos/alumnoPorSeccion';
import SeccionPage from '../src/app/administrador/(academico)/alumnos/grado/[id]/page';
import { sectionsService } from '../src/services/admin/sectionsService';
import { studentsService } from '../src/services/admin/studentsService';
import type { SectionResponse } from '../src/types/sectionApi';
import type { PagedStudentsResponse, StudentListParams, StudentSummaryResponse } from '../src/types/studentApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const section = (id: number): SectionResponse => ({ id, academicPeriodId: 1, level: 'PRIMARY', grade: 2, name: String(id), maxCapacity: 30, enrollmentOpen: true, active: true });
const student = (id = 10, name = 'Alumno sintético'): StudentSummaryResponse => ({
  studentId: id, studentCode: 'TEST-' + id, dni: null, firstNames: name, paternalLastName: 'Prueba', maternalLastName: null,
  birthDate: null, studentStatus: 'ACTIVE', enrollmentId: id, enrollmentStatus: 'ACTIVE', academicPeriodId: 1, academicPeriodName: 'Sintético',
  sectionId: 1, level: 'PRIMARY', grade: 2, sectionName: '1',
});
const page = (content: StudentSummaryResponse[] = [student()], index = 0, totalPages = 1): PagedStudentsResponse => ({
  content, page: index, size: 20, totalElements: totalPages > 1 ? 21 : content.length, totalPages: content.length ? totalPages : 0,
});
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const httpError = (status?: number) => new AxiosError('private', 'ERR_BAD_REQUEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse : undefined);
function text(node: ReactTestInstance): string {
  return node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
}

async function view(overrides: { section?: typeof sectionsService.getById; list?: typeof studentsService.list; id?: string },
  run: (h: { renderer: ReactTestRenderer; text: () => string; changeSection: (id: string) => Promise<void>; search: (value: string) => Promise<void>; click: (label: string) => Promise<void> }) => Promise<void>) {
  const oldSection = sectionsService.getById, oldList = studentsService.list;
  const oldSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  sectionsService.getById = overrides.section ?? (async id => section(Number(id)));
  studentsService.list = overrides.list ?? (async () => page());
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AlumnoPorSeccion sectionId={overrides.id ?? '1'} />); });
    await run({
      renderer, text: () => text(renderer.root),
      changeSection: async id => { await act(async () => { renderer.update(<AlumnoPorSeccion sectionId={id} />); }); },
      search: async value => {
        await act(async () => { renderer.root.findByProps({ 'aria-label': 'Buscar alumnos' }).props.onChange({ target: { value } }); });
        await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
      },
      click: async label => {
        const button = renderer.root.findAllByType('button').find(node => node.props['aria-label'] === label || text(node) === label);
        assert.ok(button); assert.equal(!!button.props.disabled, false);
        await act(async () => { button.props.onClick(); });
      },
    });
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    sectionsService.getById = oldSection; studentsService.list = oldList;
    if (oldSelf) Object.defineProperty(globalThis, 'self', oldSelf);
    else Reflect.deleteProperty(globalThis, 'self');
  }
}

test('page awaits promised id and passes the section ID to the client component', async () => {
  const result = await SeccionPage({ params: Promise.resolve({ id: '23' }) });
  assert.equal(result.type, AlumnoPorSeccion);
  assert.equal(result.props.sectionId, '23');
});

test('invalid IDs never query either service', async () => {
  for (const id of ['sec-1a', '0', '-1', '1.5', 'abc', '', '1e2', 'Infinity', '9007199254740992']) {
    await view({ id, section: async () => { assert.fail('section query'); }, list: async () => { assert.fail('student query'); } }, async h => {
      assert.match(h.text(), /Sección no válida/);
    });
  }
});

test('loads section before students, renders loading and real profile link', async () => {
  const pendingSection = deferred<SectionResponse>(), pendingList = deferred<PagedStudentsResponse>();
  let calls = 0;
  await view({ section: () => pendingSection.promise, list: async params => {
    calls++; assert.deepEqual(params, { sectionId: 1, search: undefined, page: 0, size: 20 }); return pendingList.promise;
  } }, async h => {
    assert.match(h.text(), /Cargando sección/); assert.equal(calls, 0);
    await act(async () => { pendingSection.resolve(section(1)); });
    assert.match(h.text(), /Cargando alumnos/); assert.equal(calls, 1);
    await act(async () => { pendingList.resolve(page()); });
    assert.match(h.text(), /Alumno sintético/);
    assert.ok(h.renderer.root.findAllByType('a').some(a => a.props.href === '/administrador/alumnos/estudiante/10'));
  });
});

test('empty section and empty search are distinct; search resets page and keeps section filter', async () => {
  const calls: StudentListParams[] = [];
  await view({ list: async params => { calls.push(params!); return params?.search ? page([]) : page([student()], params?.page ?? 0, 2); } }, async h => {
    await h.click('Página siguiente');
    assert.equal(calls.at(-1)?.page, 1);
    await h.search('  inexistente  ');
    assert.deepEqual(calls.at(-1), { sectionId: 1, search: 'inexistente', page: 0, size: 20 });
    assert.match(h.text(), /No se encontraron alumnos con esta búsqueda/);
  });
  await view({ list: async () => page([]) }, async h => { assert.match(h.text(), /No hay alumnos registrados en esta sección/); });
});

test('network/server errors support retry for section and list', async () => {
  for (const source of ['section', 'list'] as const) {
    for (const status of [undefined, 500]) {
      let calls = 0;
      await view({
        section: async id => { if (source === 'section' && ++calls === 1) throw httpError(status); return section(Number(id)); },
        list: async () => { if (source === 'list' && ++calls === 1) throw httpError(status); return page(); },
      }, async h => {
        assert.equal(h.renderer.root.findAllByProps({ role: 'alert' }).length, 1);
        assert.doesNotMatch(h.text(), /PRIVATE DETAIL|Alumno sintético/);
        await h.click('Reintentar'); assert.match(h.text(), /Alumno sintético/);
      });
    }
  }
});

test('401/403 render sanitized errors at either stage; missing section never lists students', async () => {
  for (const source of ['section', 'list'] as const) {
    for (const status of [401, 403]) {
      await view({
        section: async id => { if (source === 'section') throw httpError(status); return section(Number(id)); },
        list: async () => { if (source === 'section') assert.fail('list after failed section'); throw httpError(status); },
      }, async h => {
        assert.match(h.text(), status === 401 ? /Tu sesión/ : /No tienes autorización/);
        assert.doesNotMatch(h.text(), /PRIVATE DETAIL|Alumno sintético/);
      });
    }
  }
  await view({ section: async () => { throw httpError(404); }, list: async () => { assert.fail('list after 404'); } }, async h => {
    assert.match(h.text(), /Sección no encontrada/); assert.doesNotMatch(h.text(), /Alumno no encontrado/);
  });
});

test('late section success or failure cannot overwrite another section or trigger its list', async () => {
  for (const failure of [false, true]) {
    const pending = deferred<SectionResponse>(), calls: number[] = [];
    await view({
      section: async id => Number(id) === 1 ? pending.promise : section(Number(id)),
      list: async params => { calls.push(params!.sectionId!); return page([student(20, 'SECCION B')]); },
    }, async h => {
      await h.changeSection('2'); assert.match(h.text(), /SECCION B/);
      await act(async () => { if (failure) pending.reject(httpError(403)); else pending.resolve(section(1)); });
      assert.deepEqual(calls, [2]); assert.match(h.text(), /SECCION B/); assert.doesNotMatch(h.text(), /No tienes autorización/);
    });
  }
});

test('late student success or failure cannot overwrite another section; search resets on section change', async () => {
  for (const failure of [false, true]) {
    const pending = deferred<PagedStudentsResponse>();
    await view({ list: async params => params?.sectionId === 1 ? pending.promise : page([student(20, 'SECCION B')]) }, async h => {
      await h.search('anterior'); await h.changeSection('2');
      assert.equal(h.renderer.root.findByProps({ 'aria-label': 'Buscar alumnos' }).props.value, '');
      await act(async () => { if (failure) pending.reject(httpError(403)); else pending.resolve(page([student(10, 'OBSOLETO')])); });
      assert.match(h.text(), /SECCION B/); assert.doesNotMatch(h.text(), /OBSOLETO|No tienes autorización/);
    });
  }
});

test('changing section hides loaded students immediately while the next section loads', async () => {
  const pending = deferred<SectionResponse>();
  await view({ section: async id => Number(id) === 2 ? pending.promise : section(1) }, async h => {
    assert.match(h.text(), /Alumno sintético/);
    await h.changeSection('2');
    assert.match(h.text(), /Cargando sección/); assert.doesNotMatch(h.text(), /Alumno sintético/);
  });
});

test('search and pagination ignore late successes and failures and hide previous results during load', async () => {
  for (const failure of [false, true]) {
    const pending = deferred<PagedStudentsResponse>();
    let calls = 0;
    await view({ list: async params => {
      calls++;
      if (params?.search === 'lenta') return pending.promise;
      return page([student(10, 'VIGENTE')], params?.page ?? 0, 2);
    } }, async h => {
      await h.search('lenta');
      assert.match(h.text(), /Cargando alumnos/); assert.doesNotMatch(h.text(), /VIGENTE/);
      await h.search('actual'); await h.click('Página siguiente');
      await act(async () => { if (failure) pending.reject(httpError(403)); else pending.resolve(page([student(30, 'OBSOLETO')])); });
      assert.match(h.text(), /VIGENTE/); assert.match(h.text(), /Página 2 de 2/);
      assert.doesNotMatch(h.text(), /OBSOLETO|No tienes autorización/); assert.equal(calls, 4);
    });
    const pendingPage = deferred<PagedStudentsResponse>();
    await view({ list: async params => params?.page === 1 ? pendingPage.promise : page([student(10, 'VIGENTE')], 0, 2) }, async h => {
      await h.click('Página siguiente'); await h.search('actual');
      await act(async () => { if (failure) pendingPage.reject(httpError(403)); else pendingPage.resolve(page([student(30, 'OBSOLETO')], 1, 2)); });
      assert.match(h.text(), /Página 1 de 2/); assert.doesNotMatch(h.text(), /OBSOLETO|No tienes autorización/);
    });
  }
});

test('unmount invalidates pending section and student requests', async () => {
  for (const stage of ['section', 'list'] as const) {
    for (const failure of [false, true]) {
      const pendingSection = deferred<SectionResponse>(), pendingList = deferred<PagedStudentsResponse>();
      let listCalls = 0;
      await view({
        section: async () => stage === 'section' ? pendingSection.promise : section(1),
        list: async () => { listCalls++; return pendingList.promise; },
      }, async h => {
        await act(async () => { h.renderer.unmount(); });
        await act(async () => {
          if (stage === 'section') { if (failure) pendingSection.reject(httpError(500)); else pendingSection.resolve(section(1)); }
          else { if (failure) pendingList.reject(httpError(500)); else pendingList.resolve(page()); }
        });
        assert.equal(listCalls, stage === 'section' ? 0 : 1);
        assert.equal(h.renderer.toJSON(), null);
      });
    }
  }
});

