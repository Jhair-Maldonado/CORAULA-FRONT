import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import { GradosPanel, GradosSidebar } from '../feature/admin/vistas/(academico)/alumnos/components/GradosSidebar';
import { useGradeTree, type GradeTreeState } from '../src/hooks/useGradeTree';
import { toGradeTree } from '../src/adapters/vacancyAdapter';
import { academicPeriodsService } from '../src/services/admin/academicPeriodsService';
import { vacanciesService } from '../src/services/management/vacanciesService';
import type { AcademicPeriod } from '../src/types/academicPeriodApi';
import type { VacancyGradeResponse, VacancySectionResponse } from '../src/types/vacanciesApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const sec = (sectionId: number, sectionName: string, activeEnrollmentCount: number, maxCapacity: number, active = true): VacancySectionResponse => ({
  sectionId, sectionName, maxCapacity, activeEnrollmentCount, availableVacancies: maxCapacity - activeEnrollmentCount, enrollmentOpen: true, active,
});
// Mismos valores que el fixture MOCK: 5° Primaria A 4/30, B 0/30; 1° Secundaria A 1/35.
const groups = (periodId = 1): VacancyGradeResponse[] => [
  { academicPeriodId: periodId, level: 'PRIMARY', grade: 5, totalCapacity: 60, activeEnrollmentCount: 4, availableVacancies: 56, sections: [sec(10, 'A', 4, 30), sec(11, 'B', 0, 30)] },
  { academicPeriodId: periodId, level: 'SECONDARY', grade: 1, totalCapacity: 35, activeEnrollmentCount: 1, availableVacancies: 34, sections: [sec(30, 'A', 1, 35, false)] },
];
const tree = () => toGradeTree(groups(), 1);
const period = (id: number, overrides: Partial<AcademicPeriod> = {}): AcademicPeriod => ({ id, name: `Periodo ${id}`, startDate: '2026-03-01', endDate: '2026-12-20', active: true, current: false, ...overrides });
const httpError = (status?: number) => new AxiosError('private', 'ERR_BAD_REQUEST', undefined, undefined,
  status ? { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse : undefined);
const text = (node: ReactTestInstance): string => node.children.map(child => typeof child === 'string' ? child : text(child)).join('');

async function withSelf<T>(run: () => Promise<T>): Promise<T> {
  const old = Object.getOwnPropertyDescriptor(globalThis, 'self');
  Object.defineProperty(globalThis, 'self', { configurable: true, value: globalThis });
  try { return await run(); } finally {
    if (old) Object.defineProperty(globalThis, 'self', old); else Reflect.deleteProperty(globalThis, 'self');
  }
}
async function render(element: React.ReactElement, run: (r: ReactTestRenderer) => Promise<void>) {
  await withSelf(async () => {
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(element); });
    try { await run(renderer); } finally { await act(async () => { renderer.unmount(); }); }
  });
}
const gradeButton = (r: ReactTestRenderer, name: string) => r.root.findAllByType('button').find(b => text(b).includes(name))!;
const link = (r: ReactTestRenderer, href: string) => r.root.findAllByType('a').find(a => a.props.href === href)!;
const retryButton = (r: ReactTestRenderer) => r.root.findAllByType('button').find(b => text(b) === 'Reintentar');
const noop = () => {};

test('panel con datos del fixture: grado activo expandido, ocupación y aria-current', async () => {
  await render(<GradosPanel estado="ready" tree={tree()} activeSectionId={10} onRetry={noop} />, async r => {
    const all = text(r.root);
    assert.match(all, /Niveles y Grados/); assert.match(all, /Secciones del plantel/);
    assert.match(all, /Primaria/); assert.match(all, /Secundaria/);
    assert.match(all, /4 \/ 30/); assert.match(all, /0 \/ 30/); assert.match(all, /4 de 30 alumnos/);
    assert.equal(link(r, '/administrador/alumnos/grado/10').props['aria-current'], 'page');
    assert.equal(link(r, '/administrador/alumnos/grado/11').props['aria-current'], undefined);
    assert.equal(gradeButton(r, '5° grado').props['aria-expanded'], true);
    assert.equal(gradeButton(r, '1° grado').props['aria-expanded'], false);
    assert.ok(gradeButton(r, '5° grado').props['aria-controls']);
    assert.equal(link(r, '/administrador/alumnos').props['aria-current'], undefined);
  });
});

test('sin sección activa se expande el primer grado; el acordeón abre y cierra', async () => {
  await render(<GradosPanel estado="ready" tree={tree()} activeSectionId={null} onRetry={noop} />, async r => {
    assert.equal(gradeButton(r, '5° grado').props['aria-expanded'], true);
    await act(async () => { gradeButton(r, '1° grado').props.onClick(); });
    assert.equal(gradeButton(r, '1° grado').props['aria-expanded'], true);
    assert.equal(gradeButton(r, '5° grado').props['aria-expanded'], false);
    await act(async () => { gradeButton(r, '1° grado').props.onClick(); });
    assert.equal(gradeButton(r, '1° grado').props['aria-expanded'], false);
    const panelId = gradeButton(r, '1° grado').props['aria-controls'];
    assert.equal(r.root.findByProps({ id: panelId }).props.inert, true);
  });
});

test('al navegar a una sección de otro grado se expande su grado', async () => {
  await render(<GradosPanel estado="ready" tree={tree()} activeSectionId={10} onRetry={noop} />, async r => {
    await act(async () => { r.update(<GradosPanel estado="ready" tree={tree()} activeSectionId={30} onRetry={noop} />); });
    assert.equal(gradeButton(r, '1° grado').props['aria-expanded'], true);
    assert.equal(gradeButton(r, '5° grado').props['aria-expanded'], false);
    assert.equal(link(r, '/administrador/alumnos/grado/30').props['aria-current'], 'page');
  });
});

test('sección inactiva se atenúa con texto «Inactiva»', async () => {
  await render(<GradosPanel estado="ready" tree={tree()} activeSectionId={30} onRetry={noop} />, async r => {
    const row = link(r, '/administrador/alumnos/grado/30');
    assert.match(row.props.className, /opacity-60/); assert.match(text(row), /Inactiva/);
    assert.doesNotMatch(link(r, '/administrador/alumnos/grado/10').props.className, /opacity-60/);
  });
});

test('«Ver todo alumnado» se marca activo solo con todoActivo', async () => {
  await render(<GradosPanel estado="ready" tree={tree()} activeSectionId={null} todoActivo onRetry={noop} />, async r => {
    assert.equal(link(r, '/administrador/alumnos').props['aria-current'], 'page');
    assert.match(text(link(r, '/administrador/alumnos')), /Ver todo alumnado/);
  });
});

test('estados de carga, error con reintento, vacío, sin permiso y sin periodo', async () => {
  await render(<GradosPanel estado="loading" tree={[]} activeSectionId={null} onRetry={noop} />, async r => {
    assert.ok(r.root.findAllByProps({ role: 'status' }).length > 0);
    assert.ok(r.root.findAll(n => typeof n.props.className === 'string' && n.props.className.includes('animate-pulse')).length >= 1);
  });
  let retries = 0;
  await render(<GradosPanel estado="error" tree={[]} activeSectionId={null} mensaje="No se pudo conectar." onRetry={() => { retries++; }} />, async r => {
    assert.match(text(r.root.findByProps({ role: 'alert' })), /No se pudo conectar/);
    await act(async () => { retryButton(r)!.props.onClick(); });
    assert.equal(retries, 1);
  });
  await render(<GradosPanel estado="ready" tree={[]} activeSectionId={null} onRetry={noop} />, async r => {
    assert.match(text(r.root), /No hay secciones activas en el periodo vigente/);
  });
  await render(<GradosPanel estado="forbidden" tree={[]} activeSectionId={null} mensaje="No tienes permiso." onRetry={noop} />, async r => {
    assert.match(text(r.root.findByProps({ role: 'alert' })), /No tienes permiso/);
    assert.equal(retryButton(r), undefined);
  });
  await render(<GradosPanel estado="no-period" tree={[]} activeSectionId={null} mensaje="No hay un periodo académico vigente." onRetry={noop} />, async r => {
    assert.match(text(r.root), /No hay un periodo académico vigente/);
  });
});

async function withServices(options: { periods?: typeof academicPeriodsService.list; vacancies?: typeof vacanciesService.list }, run: () => Promise<void>) {
  const old = { periods: academicPeriodsService.list, vacancies: vacanciesService.list };
  academicPeriodsService.list = options.periods ?? (async () => [period(1), period(2, { current: true })]);
  vacanciesService.list = options.vacancies ?? (async () => groups(2));
  try { await run(); } finally { academicPeriodsService.list = old.periods; vacanciesService.list = old.vacancies; }
}

test('contenedor: consulta las vacantes del periodo vigente y pinta el árbol', async () => {
  const calls: (number | undefined)[] = [];
  await withServices({ vacancies: async id => { calls.push(id); return groups(2); } }, async () => {
    await render(<GradosSidebar />, async r => {
      assert.deepEqual(calls, [2]);
      assert.match(text(r.root), /4 \/ 30/);
      assert.match(text(r.root), /1 \/ 35/);
    });
  });
});

test('contenedor: error con mensaje saneado y reintento vuelve a llamar', async () => {
  let calls = 0;
  await withServices({ vacancies: async () => { if (++calls === 1) throw httpError(500); return groups(2); } }, async () => {
    await render(<GradosSidebar />, async r => {
      assert.ok(r.root.findAllByProps({ role: 'alert' }).length > 0);
      assert.doesNotMatch(text(r.root), /PRIVATE DETAIL/);
      await act(async () => { retryButton(r)!.props.onClick(); });
      assert.equal(calls, 2);
      assert.match(text(r.root), /4 \/ 30/);
    });
  });
});

test('contenedor: 403 sin reintento, sin periodo vigente y carga con respuesta pendiente', async () => {
  await withServices({ vacancies: async () => { throw httpError(403); } }, async () => {
    await render(<GradosSidebar />, async r => {
      assert.match(text(r.root), /No tienes permiso para consultar los grados/);
      assert.equal(retryButton(r), undefined);
    });
  });
  await withServices({ periods: async () => [], vacancies: async () => { assert.fail('sin periodo no se consultan vacantes'); } }, async () => {
    await render(<GradosSidebar />, async r => { assert.match(text(r.root), /No hay un periodo académico vigente/); });
  });
  let release!: (value: VacancyGradeResponse[]) => void;
  await withServices({ vacancies: () => new Promise<VacancyGradeResponse[]>(resolve => { release = resolve; }) }, async () => {
    await render(<GradosSidebar />, async r => {
      assert.ok(r.root.findAllByProps({ role: 'status' }).length > 0);
      await act(async () => { release([]); });
      assert.match(text(r.root), /No hay secciones activas en el periodo vigente/);
    });
  });
});

test('contenedor: periodo vigente inactivo sin otro activo muestra sin periodo, no error', async () => {
  await withServices({ periods: async () => [period(2, { current: true, active: false })], vacancies: async () => { assert.fail('no se consultan vacantes'); } }, async () => {
    await render(<GradosSidebar />, async r => {
      assert.match(text(r.root), /No hay un periodo académico vigente/);
      assert.equal(retryButton(r), undefined);
      assert.equal(r.root.findAllByProps({ role: 'alert' }).length, 0);
    });
  });
});

test('contenedor: periodo vigente inactivo se omite a favor del activo más reciente', async () => {
  const calls: (number | undefined)[] = [];
  const periods = [period(1, { current: true, active: false }), period(3, { startDate: '2026-04-01' })];
  await withServices({ periods: async () => periods, vacancies: async id => { calls.push(id); return groups(3); } }, async () => {
    await render(<GradosSidebar />, async r => {
      assert.deepEqual(calls, [3]);
      assert.match(text(r.root), /4 \/ 30/);
    });
  });
});

function Probe({ onState }: { onState: (state: GradeTreeState) => void }) {
  onState(useGradeTree());
  return null;
}

test('hook: la respuesta de una carga anterior (retry previo) no sobrescribe la carga nueva', async () => {
  const pending: { resolve: (v: VacancyGradeResponse[]) => void; reject: (e: unknown) => void }[] = [];
  await withServices({ vacancies: () => new Promise<VacancyGradeResponse[]>((resolve, reject) => { pending.push({ resolve, reject }); }) }, async () => {
    const out: { current?: GradeTreeState } = {};
    const onState = (state: GradeTreeState) => { out.current = state; };
    await render(<Probe onState={onState} />, async () => {
      assert.equal(out.current!.status, 'loading');
      assert.equal(pending.length, 1);
      await act(async () => { out.current!.retry(); });
      assert.equal(pending.length, 2);
      await act(async () => { out.current!.retry(); });
      assert.equal(pending.length, 3);
      await act(async () => { pending[2].resolve(groups(2)); });
      assert.equal(out.current!.status, 'ready');
      assert.equal(out.current!.tree.length, 2);
      // Respuestas tardías de cargas anteriores: la 2 con datos vacíos y la 1 con fallo no pisan la carga 3.
      await act(async () => { pending[1].resolve([]); });
      assert.equal(out.current!.status, 'ready');
      assert.equal(out.current!.tree.length, 2);
      await act(async () => { pending[0].reject(httpError(403)); });
      assert.equal(out.current!.status, 'ready');
      assert.equal(out.current!.tree.length, 2);
    });
  });
});

test('hook: sin errores tras desmontar con una respuesta pendiente (prueba de humo)', async () => {
  const pending: ((v: VacancyGradeResponse[]) => void)[] = [];
  const errors: unknown[] = [];
  const oldError = console.error;
  console.error = (...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) errors.push(args); };
  try {
    await withServices({ vacancies: () => new Promise<VacancyGradeResponse[]>(resolve => { pending.push(resolve); }) }, async () => {
      const out: { current?: GradeTreeState } = {};
      const onState = (state: GradeTreeState) => { out.current = state; };
      await withSelf(async () => {
        let renderer!: ReactTestRenderer;
        await act(async () => { renderer = create(<Probe onState={onState} />); });
        await act(async () => { renderer.unmount(); });
        await act(async () => { pending[0](groups(2)); });
      });
      assert.equal(out.current!.status, 'loading');
    });
  } finally { console.error = oldError; }
  assert.deepEqual(errors, []);
});
