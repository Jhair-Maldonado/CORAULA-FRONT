import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { PathParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { AxiosError, type AxiosResponse } from 'axios';
import HorarioDelGrado from '../feature/admin/vistas/(administrativo)/horario/horarioDelGrado';
import ScheduleGrid from '../feature/admin/vistas/(administrativo)/horario/components/ScheduleGrid';
import { toScheduleGrid } from '../src/adapters/scheduleGridAdapter';
import VistaDeLosGrados from '../feature/admin/vistas/(administrativo)/horario/vistaDeLosGrados';
import { sectionsService } from '../src/services/admin/sectionsService';
import { sectionCoursesService } from '../src/services/admin/sectionCoursesService';
import { schedulesService } from '../src/services/admin/schedulesService';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { vacanciesService } from '../src/services/management/vacanciesService';
import type { SectionResponse } from '../src/types/sectionApi';
import type { ScheduleResponse, SchoolDay } from '../src/types/scheduleApi';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';
import type { VacancyGradeResponse } from '../src/types/vacanciesApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const section: SectionResponse = { id: 12, academicPeriodId: 1, level: 'SECONDARY', grade: 1, name: 'A', maxCapacity: 35, enrollmentOpen: false, active: true };
const block = (id: number, day: SchoolDay, startTime: string, endTime: string, overrides: Partial<ScheduleResponse> = {}): ScheduleResponse => ({
  id, sectionCourseId: 300 + id, sectionId: 12, courseId: 100 + id, courseName: `Curso ${id}`, teacherId: 201, teacherName: 'Docente Demo',
  day, startTime, endTime, classroom: 'Aula 1S', ...overrides,
});
// Un bloque de 45 min, otro de 90 min y dos que se superponen (solo existen en la prueba: el backend y el MOCK los rechazan).
const blocks: ScheduleResponse[] = [
  block(1, 'LUNES', '08:00', '08:45', { courseName: 'Matemática' }),
  block(2, 'LUNES', '09:00', '10:30', { courseName: 'Comunicación', teacherName: null, classroom: null }),
  block(3, 'MARTES', '08:00', '09:30', { courseName: 'Ciencia' }),
  block(4, 'MARTES', '09:00', '10:00', { courseName: 'Arte' }),
];
const period: AcademicPeriod = { id: 1, name: 'Año escolar 2026', startDate: '2026-03-01', endDate: '2026-12-20', active: true, current: true };
const groups: VacancyGradeResponse[] = [
  { academicPeriodId: 1, level: 'PRIMARY', grade: 5, totalCapacity: 60, activeEnrollmentCount: 4, availableVacancies: 56, sections: [
    { sectionId: 10, sectionName: 'A', maxCapacity: 30, activeEnrollmentCount: 4, availableVacancies: 26, enrollmentOpen: true, active: true },
    { sectionId: 11, sectionName: 'B', maxCapacity: 30, activeEnrollmentCount: 0, availableVacancies: 30, enrollmentOpen: true, active: true }] },
  { academicPeriodId: 1, level: 'SECONDARY', grade: 1, totalCapacity: 35, activeEnrollmentCount: 1, availableVacancies: 34, sections: [
    { sectionId: 12, sectionName: 'A', maxCapacity: 35, activeEnrollmentCount: 1, availableVacancies: 34, enrollmentOpen: false, active: true }] },
];
const httpError = (status?: number) => new AxiosError('private', 'ERR_TEST', undefined, undefined, status ? { status, data: {} } as AxiosResponse : undefined);
const text = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : text(child)).join('');
const button = (r: ReactTestRenderer, label: string) => r.root.findAllByType('button').find(b => text(b) === label);

type Stubs = { section?: () => Promise<SectionResponse>; schedule?: () => Promise<ScheduleResponse[]>; periods?: () => Promise<AcademicPeriod[]>; vacancies?: () => Promise<VacancyGradeResponse[]> };

async function render(element: React.ReactElement, stubs: Stubs, run: (r: ReactTestRenderer) => Promise<void>) {
  const old = {
    getById: sectionsService.getById, courses: sectionCoursesService.list, schedule: schedulesService.listBySection,
    periods: academicPeriodsService.list, vacancies: vacanciesService.list,
  };
  sectionsService.getById = stubs.section ?? (async () => section);
  sectionCoursesService.list = async () => [];
  schedulesService.listBySection = stubs.schedule ?? (async () => blocks);
  academicPeriodsService.list = stubs.periods ?? (async () => [period]);
  vacanciesService.list = stubs.vacancies ?? (async () => groups);
  const globals = ['self', 'document', 'HTMLElement'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const doc = { activeElement: null as unknown, body: { style: { overflow: '' } } };
  class Element { focus() { doc.activeElement = this; } querySelectorAll() { return []; } }
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: Element });
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PathParamsContext.Provider value={{ id: '12' }}>{element}</PathParamsContext.Provider>); });
    await run(renderer);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    sectionsService.getById = old.getById;
    sectionCoursesService.list = old.courses;
    schedulesService.listBySection = old.schedule;
    academicPeriodsService.list = old.periods;
    vacanciesService.list = old.vacancies;
    for (const [name, descriptor] of globals) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
}

const gridButtons = (r: ReactTestRenderer) => r.root.findAll(n => n.type === 'button' && typeof n.props['aria-label'] === 'string' && / de \d\d:\d\d a \d\d:\d\d, /.test(n.props['aria-label']));

test('grilla: región con desplazamiento, un botón por bloque con aria-label y sin sábado', async () => {
  await render(<HorarioDelGrado />, {}, async r => {
    const region = r.root.findAll(n => n.props.role === 'region' && n.props['aria-label'] === 'Horario semanal')[0];
    assert.ok(region);
    assert.equal(region.props.tabIndex, 0);
    assert.match(region.props.className, /overflow-x-auto/);
    assert.deepEqual(gridButtons(r).map(b => b.props['aria-label']), [
      'Matemática, lunes de 08:00 a 08:45, docente Docente Demo, aula Aula 1S',
      'Comunicación, lunes de 09:00 a 10:30, sin docente asignado, sin aula',
      'Ciencia, martes de 08:00 a 09:30, docente Docente Demo, aula Aula 1S',
      'Arte, martes de 09:00 a 10:00, docente Docente Demo, aula Aula 1S',
    ]);
    assert.equal(r.root.findAllByType('section').length, 5);
    assert.doesNotMatch(text(r.root), /Sábado|SÁBADO/i);
    assert.match(text(r.root), /Lunes/);
    assert.match(text(r.root), /Viernes/);
  });
});

test('grilla: los bloques superpuestos reparten el ancho y el de 45 min es compacto', async () => {
  await render(<HorarioDelGrado />, {}, async r => {
    const tuesday = r.root.findAllByType('section')[1];
    const items = tuesday.findAllByType('li');
    assert.deepEqual(items.map(li => li.props.style.width), ['50%', '50%']);
    assert.deepEqual(items.map(li => li.props.style.left), ['0%', '50%']);
    const monday = r.root.findAllByType('section')[0].findAllByType('button');
    assert.match(monday[0].props.className, /\bp-1\b/);
    assert.match(monday[1].props.className, /\bp-2\b/);
    assert.match(monday[1].props.className, /focus-visible:z-10/);
  });
});

test('grilla: el clic en un bloque abre el detalle con su curso', async () => {
  await render(<HorarioDelGrado />, {}, async r => {
    await act(async () => { gridButtons(r)[0].props.onClick(); });
    const dialog = r.root.findAll(n => n.props.role === 'dialog')[0];
    assert.ok(dialog);
    assert.match(text(dialog), /Detalle del bloque/);
    assert.match(text(dialog), /Matemática/);
  });
});

test('grilla: el filtro de día muestra una sola columna', async () => {
  await render(<HorarioDelGrado />, {}, async r => {
    const select = r.root.findByProps({ id: 'schedule-day-filter' });
    await act(async () => { select.props.onChange({ target: { value: 'MARTES' } }); });
    assert.equal(r.root.findAllByType('section').length, 1);
    assert.deepEqual(gridButtons(r).map(b => b.props['aria-label'].split(',')[0]), ['Ciencia', 'Arte']);
  });
});

test('grilla: sin bloques muestra el aviso de vacío y no la grilla', async () => {
  await render(<HorarioDelGrado />, { schedule: async () => [] }, async r => {
    assert.match(text(r.root), /Sin horario registrado/);
    assert.equal(r.root.findAll(n => n.props.role === 'region').length, 0);
  });
});

test('grilla: el error del horario muestra «Reintentar» y recarga', async () => {
  let calls = 0;
  await render(<HorarioDelGrado />, { schedule: async () => { calls += 1; if (calls === 1) throw httpError(500); return blocks; } }, async r => {
    assert.ok(r.root.findAll(n => n.props.role === 'alert').length > 0);
    await act(async () => { button(r, 'Reintentar')!.props.onClick(); });
    assert.equal(calls, 2);
    assert.equal(gridButtons(r).length, 4);
  });
});

test('grilla: 404 de la sección muestra «Sección no encontrada» y no la grilla', async () => {
  await render(<HorarioDelGrado />, { section: async () => { throw httpError(404); } }, async r => {
    assert.match(text(r.root), /Sección no encontrada/);
    assert.equal(r.root.findAll(n => n.props.role === 'region').length, 0);
  });
});

test('grados: con datos muestra una tarjeta por sección con su enlace al horario y la ocupación', async () => {
  await render(<VistaDeLosGrados />, {}, async r => {
    const hrefs = r.root.findAllByType('a').map(a => a.props.href);
    assert.deepEqual(hrefs, ['/administrador/horario/gradoHorario/10', '/administrador/horario/gradoHorario/11', '/administrador/horario/gradoHorario/12']);
    const all = text(r.root);
    assert.match(all, /5°A/);
    assert.match(all, /1°A/);
    assert.match(all, /4 de 30 alumnos/);
    assert.doesNotMatch(all, /Crear Horario/);
  });
});

test('grados: el filtro de nivel y la búsqueda se aplican en el cliente', async () => {
  await render(<VistaDeLosGrados />, {}, async r => {
    await act(async () => { r.root.findByProps({ id: 'schedule-level' }).props.onChange({ target: { value: 'Secundaria' } }); });
    assert.deepEqual(r.root.findAllByType('a').map(a => a.props.href), ['/administrador/horario/gradoHorario/12']);
    await act(async () => { r.root.findByProps({ id: 'schedule-level' }).props.onChange({ target: { value: 'Todos' } }); });
    await act(async () => { r.root.findByProps({ id: 'schedule-search' }).props.onChange({ target: { value: 'sección b' } }); });
    assert.deepEqual(r.root.findAllByType('a').map(a => a.props.href), ['/administrador/horario/gradoHorario/11']);
    await act(async () => { r.root.findByProps({ id: 'schedule-search' }).props.onChange({ target: { value: 'zzz' } }); });
    assert.match(text(r.root), /No se encontraron secciones/);
  });
});

test('grados: 403 muestra el mensaje de permiso y no las tarjetas', async () => {
  await render(<VistaDeLosGrados />, { vacancies: async () => { throw httpError(403); } }, async r => {
    assert.match(text(r.root), /No tienes permiso para consultar los grados y secciones/);
    assert.equal(r.root.findAllByType('a').length, 0);
  });
});

test('grados: sin periodo vigente muestra el aviso', async () => {
  await render(<VistaDeLosGrados />, { periods: async () => [] }, async r => {
    assert.match(text(r.root), /No hay un periodo académico vigente/);
    assert.equal(r.root.findAllByType('a').length, 0);
  });
});

test('grados: el error permite reintentar y luego muestra las tarjetas', async () => {
  let calls = 0;
  await render(<VistaDeLosGrados />, { vacancies: async () => { calls += 1; if (calls === 1) throw httpError(500); return groups; } }, async r => {
    assert.ok(r.root.findAll(n => n.props.role === 'alert').length > 0);
    await act(async () => { button(r, 'Reintentar')!.props.onClick(); });
    assert.equal(calls, 2);
    assert.equal(r.root.findAllByType('a').length, 3);
  });
});

test('grilla: las líneas visibles dependen de la duración (45, 60 y 90 min)', async () => {
  const list = [
    block(1, 'LUNES', '08:00', '08:45', { courseName: 'Corto' }),
    block(2, 'MARTES', '08:00', '09:00', { courseName: 'Medio' }),
    block(3, 'MIERCOLES', '08:00', '09:30', { courseName: 'Largo' }),
    block(4, 'JUEVES', '08:00', '09:27', { courseName: 'Casi largo' }),
  ];
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<ScheduleGrid grid={toScheduleGrid(list)} onSelect={() => {}} />); });
  try {
    const item = (name: string) => renderer.root.findAllByType('li').find(li => text(li).startsWith(name))!;
    const badge = (li: ReactTestInstance) => li.findAll(n => n.type === 'span' && /rounded-full/.test(n.props.className ?? ''));
    const short = item('Corto'), medium = item('Medio'), long = item('Largo'), almost = item('Casi largo');
    assert.equal(short.props['data-detail'], 'compact');
    assert.equal(medium.props['data-detail'], 'medium');
    assert.equal(almost.props['data-detail'], 'medium', '85 min (09:27 se redondea a 09:25) sigue sin docente');
    assert.equal(long.props['data-detail'], 'full');
    assert.equal(text(short), 'Corto08:00 – 08:45 · Aula 1S');
    assert.equal(text(medium), 'Medio08:00 – 09:00 · Aula 1S');
    assert.equal(text(long), 'Largo08:00 – 09:30Docente DemoAula 1S');
    assert.equal(badge(short).length + badge(medium).length, 0, 'sin insignia de aula en bloques de menos de 90 min');
    assert.equal(badge(long).length, 1);
    assert.ok(!text(short).includes('Docente Demo') && !text(medium).includes('Docente Demo'));
    // El docente sigue disponible para lectores de pantalla.
    assert.match(short.findByType('button').props['aria-label'], /docente Docente Demo/);
    assert.match(short.findByType('button').props.className, /\bp-1\b/);
    assert.match(long.findByType('button').props.className, /\bp-2\b/);
  } finally { await act(async () => { renderer.unmount(); }); }
});

test('grilla: si todos los bloques son inválidos no dice «Sin clases para el día seleccionado»', async () => {
  const invalid = [block(1, 'LUNES', '09:00', '08:00'), block(2, 'MARTES', '25:00', '26:00')];
  await render(<HorarioDelGrado />, { schedule: async () => invalid }, async r => {
    assert.match(text(r.root), /No hay bloques válidos para mostrar\./);
    assert.doesNotMatch(text(r.root), /Sin clases para el día seleccionado/);
    assert.match(text(r.root), /2 bloques no se muestran/);
  });
});

test('grilla: con un día filtrado sin clases sí dice «Sin clases para el día seleccionado»', async () => {
  await render(<HorarioDelGrado />, {}, async r => {
    await act(async () => { r.root.findByProps({ id: 'schedule-day-filter' }).props.onChange({ target: { value: 'VIERNES' } }); });
    assert.match(text(r.root), /Sin clases para el día seleccionado/);
  });
});
