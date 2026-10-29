import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import ActividadesDocente from '../feature/docente/vistas/cursos/ActividadesDocente';
import VistaMaterialesAlumno from '../feature/alumno/vistas/materiales/vistaMaterialesAlumno';
import VistaDetalleMateriales from '../feature/alumno/vistas/materiales/vistaDetalleMateriales';
import { teacherActivitiesService } from '../src/services/teacher/teacherActivitiesService';
import { teacherGradesService } from '../src/services/teacher/teacherGradesService';
import httpClient from '../src/services/httpClient';

// Stubs confined to tests: no network, no real writes.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// next/link programa su prefetch con self.requestIdleCallback.
if (typeof globalThis.self === 'undefined') Object.assign(globalThis, { self: globalThis });
if (typeof globalThis.document === 'undefined') Object.assign(globalThis, { document: { addEventListener() {}, removeEventListener() {} } });
httpClient.defaults.adapter = async () => { throw new Error('sin red en pruebas'); };

const MATERIAL_DOCENTE = 'Módulo en construcción: los materiales todavía no se guardan en el servidor; los que envíes aquí son de demostración y se pierden al recargar.';
const MATERIAL_ALUMNO = 'Módulo en construcción: los materiales de estudio son de demostración y no pueden descargarse.';
const MATERIAL_SIMULADO = 'Simulación: el material no se subió (módulo en construcción).';
const router ={ push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} } as unknown as AppRouterInstance;

function text(n: ReactTestInstance): string { return n.children.map(c => typeof c === 'string' ? c : text(c)).join(''); }
const notices = (r: ReactTestRenderer) => r.root.findAll(n => n.props.role === 'status' && typeof n.type === 'string' && text(n).startsWith('Módulo en construcción')).map(text);
const wait = (ms: number) => act(async () => { await new Promise(res => setTimeout(res, ms)); });
async function waitFor(check: () => boolean, ms = 3000) { for (let t = 0; t < ms && !check(); t += 50) await wait(50); }
async function withEnv(value: string | undefined, fn: () => Promise<void>) {
  const original = process.env.NEXT_PUBLIC_USE_MOCKS;
  if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCKS; else process.env.NEXT_PUBLIC_USE_MOCKS = value;
  try { await fn(); } finally { if (original === undefined) delete process.env.NEXT_PUBLIC_USE_MOCKS; else process.env.NEXT_PUBLIC_USE_MOCKS = original; }
}

// #121: the upload is not connected (FRONT #52), so the notice no longer depends on NEXT_PUBLIC_USE_MOCKS.
test('teacher material tab always shows the notice, also with NEXT_PUBLIC_USE_MOCKS=false', async () => {
  const original = { getActivities: teacherActivitiesService.getActivities, getBimesters: teacherGradesService.getBimesters };
  teacherActivitiesService.getActivities = async () => [];
  teacherGradesService.getBimesters = async () => [{ id: 1, academicPeriodId: 30, number: 1, name: 'Bimestre 1', startDate: '2026-03-01', endDate: '2026-04-30', status: 'PLANIFICADO' }];
  try {
    for (const value of [undefined, 'true', 'false'] as const) {
      await withEnv(value, async () => {
        let r!: ReactTestRenderer;
        await act(async () => { r = create(<ActividadesDocente sectionCourseId={10} />); });
        try {
          await act(async () => { r.root.findByProps({ 'aria-label': 'Bimestre de actividades' }).props.onChange({ target: { value: '1' } }); });
          assert.deepEqual(notices(r), [], `actividad, value=${value}`);
          const tab = r.root.findAllByType('button').find(b => text(b).trim() === 'Subir material');
          assert.ok(tab);
          await act(async () => { tab.props.onClick(); });
          assert.deepEqual(notices(r), [MATERIAL_DOCENTE], `material, value=${value}`);
          // La subida es local: el toast dice que es una simulación, nunca éxito.
          await act(async () => { r.root.findByProps({ 'aria-label': 'Crear actividad académica' }).findByProps({ maxLength: 255 }).props.onChange({ target: { value: 'Separata 1' } }); });
          await act(async () => { r.root.findByProps({ type: 'file' }).props.onChange({ target: { files: [{ name: 'separata.pdf', size: 2048, type: 'application/pdf' }] } }); });
          await act(async () => { r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
          const body = text(r.root);
          assert.ok(body.includes(MATERIAL_SIMULADO), `toast, value=${value}`);
          assert.doesNotMatch(body, /enviada con éxito/);
        } finally { await act(async () => { r.unmount(); }); }
      });
    }
  } finally { Object.assign(teacherActivitiesService, { getActivities: original.getActivities }); teacherGradesService.getBimesters = original.getBimesters; }
});

test('student materials views always show the notice and the detail never downloads a fake file', async () => {
  await withEnv(undefined, async () => {
    let r!: ReactTestRenderer;
    await act(async () => { r = create(<AppRouterContext.Provider value={router}><VistaMaterialesAlumno /></AppRouterContext.Provider>); });
    await waitFor(() => notices(r).length > 0);
    try { assert.deepEqual(notices(r), [MATERIAL_ALUMNO]); } finally { await act(async () => { r.unmount(); }); }

    await act(async () => { r = create(<AppRouterContext.Provider value={router}><VistaDetalleMateriales slug="matematica" /></AppRouterContext.Provider>); });
    await waitFor(() => r.root.findAll(n => String(n.props['aria-label']).startsWith('Descargar archivo')).length > 0);
    try {
      assert.deepEqual(notices(r), [MATERIAL_ALUMNO]);
      const download = r.root.findAllByType('button').find(b => String(b.props['aria-label']).startsWith('Descargar archivo'));
      assert.ok(download);
      await act(async () => { await download.props.onClick(); });
      await wait(0);
      const body = text(r.root);
      assert.ok(body.includes('Descarga no disponible: módulo en construcción'));
      assert.doesNotMatch(body, /Descarga completada/);
    } finally { await act(async () => { r.unmount(); }); }
  });
  await withEnv('false', async () => {
    let r!: ReactTestRenderer;
    await act(async () => { r = create(<AppRouterContext.Provider value={router}><VistaMaterialesAlumno /></AppRouterContext.Provider>); });
    await waitFor(() => notices(r).length > 0);
    try { assert.deepEqual(notices(r), [MATERIAL_ALUMNO]); } finally { await act(async () => { r.unmount(); }); }
  });
});
