import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import ModalReportarIncidencia from '../feature/docente/vistas/chat/ModalReportarIncidencia';
import VistaIncidenciasDocente from '../feature/docente/vistas/incidencias/vistaIncidenciasDocente';
import ActividadesDocente from '../feature/docente/vistas/cursos/ActividadesDocente';
import VistaChatDocente from '../feature/docente/vistas/chat/vistaChatDocente';
import VistaMaterialesAlumno from '../feature/alumno/vistas/materiales/vistaMaterialesAlumno';
import VistaDetalleMateriales from '../feature/alumno/vistas/materiales/vistaDetalleMateriales';
import { DocenteSessionProvider } from '../src/app/docente/components/DocenteSessionContext';
import { teacherProfileService } from '../src/services/teacher/teacherProfileService';
import { teacherCoursesService } from '../src/services/teacher/teacherCoursesService';
import { teacherActivitiesService } from '../src/services/teacher/teacherActivitiesService';
import { teacherGradesService } from '../src/services/teacher/teacherGradesService';
import httpClient from '../src/services/httpClient';

// Stubs confined to tests: no network, no real writes.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// next/link programa su prefetch con self.requestIdleCallback.
if (typeof globalThis.self === 'undefined') Object.assign(globalThis, { self: globalThis });
if (typeof globalThis.document === 'undefined') Object.assign(globalThis, { document: { addEventListener() {}, removeEventListener() {} } });
httpClient.defaults.adapter = async () => { throw new Error('sin red en pruebas'); };

const SIMULACION = 'Simulación: la incidencia no se guardó (módulo en construcción).';
const INCIDENCIAS = 'Módulo en construcción: el registro de incidencias aún no está conectado; los registros son de demostración y no se guardan.';
const REPORTE = 'Módulo en construcción: el reporte de incidencias aún no está conectado; el reporte no se guarda.';
const MATERIAL_DOCENTE = 'Módulo en construcción: la subida de materiales aún no está conectada; los materiales son de demostración y no se guardan.';
const MATERIAL_ALUMNO = 'Módulo en construcción: los materiales de estudio son de demostración y no pueden descargarse.';
const MATERIAL_SIMULADO = 'Simulación: el material no se subió (módulo en construcción).';
const CHAT_SIMULADO = 'Simulación: la incidencia no se registró (módulo en construcción).';
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

test('report modal shows the notice and a simulation message instead of success', async () => {
  await withEnv('false', async () => {
    let submitted = 0, r!: ReactTestRenderer;
    await act(async () => {
      r = create(<ModalReportarIncidencia isOpen onClose={() => {}} studentName="Ana" mensaje={{ id: 'm1', remitente: 'contacto', texto: 'hola', hora: '10:00' }} onSubmitReport={async () => { submitted++; }} />);
    });
    try {
      assert.deepEqual(notices(r), [REPORTE]);
      await act(async () => { r.root.findByType('textarea').props.onChange({ target: { value: 'Insulto en el chat' } }); });
      await act(async () => { await r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
      assert.equal(submitted, 1);
      const body = text(r.root);
      assert.ok(body.includes(SIMULACION));
      assert.doesNotMatch(body, /registrada y vinculada/);
    } finally { await act(async () => { r.unmount(); }); }
  });
});

test('teacher chat feedback after reporting says the incident was not registered', async () => {
  let r!: ReactTestRenderer;
  await act(async () => { r = create(<VistaChatDocente />, { createNodeMock: () => ({ scrollIntoView() {} }) }); });
  try {
    await waitFor(() => r.root.findAll(n => String(n.props['aria-label']).startsWith('Reportar incidencia para')).length > 0);
    const flag = r.root.findAll(n => typeof n.type === 'string' && String(n.props['aria-label']).startsWith('Reportar incidencia para'))[0];
    assert.ok(flag);
    await act(async () => { flag.props.onClick(); });
    const reportForm = r.root.findAll(n => n.type === 'form' && n.findAll(c => c.type === 'textarea').length > 0)[0];
    await act(async () => { reportForm.findByType('textarea').props.onChange({ target: { value: 'Insulto en el chat' } }); });
    await act(async () => { await r.root.findAll(n => n.type === 'form' && n.findAll(c => c.type === 'textarea').length > 0)[0].props.onSubmit({ preventDefault() {} }); });
    const body = text(r.root);
    assert.ok(body.includes(CHAT_SIMULADO));
    assert.doesNotMatch(body, /registrada para/);
  } finally { await act(async () => { r.unmount(); }); }
});

test('incidents view shows the notice and never reports a successful save', async () => {
  const original = { getMe: teacherProfileService.getMe, getCourses: teacherCoursesService.getCourses, getStudents: teacherCoursesService.getStudents };
  teacherProfileService.getMe = async () => ({ id: 7, personId: 1, dni: '1', firstNames: 'Juan', paternalLastName: 'Pérez', maternalLastName: null, fullName: 'Juan Pérez', phone: null, specialty: null, active: true });
  teacherCoursesService.getCourses = async () => [{ sectionCourseId: 10, assignmentId: 1, courseId: 1, code: 'MAT', name: 'Matemática', level: 'SECONDARY', area: 'Ciencias', weeklyHours: 4, sectionId: 1, grade: 3, sectionName: 'A', studentCount: 1 }];
  teacherCoursesService.getStudents = async () => [{ studentId: 5, studentCode: 'E-5', fullName: 'Ana Torres', enrollmentId: 50 }];
  let r!: ReactTestRenderer;
  try {
    await withEnv('false', async () => {
      await act(async () => { r = create(<DocenteSessionProvider><VistaIncidenciasDocente /></DocenteSessionProvider>); });
      await wait(0);
      assert.deepEqual(notices(r), [INCIDENCIAS]);
      await act(async () => { r.root.findByProps({ placeholder: 'Escribe para buscar por nombre o código...' }).props.onFocus(); });
      const option = r.root.findAllByType('button').find(b => text(b).includes('Ana Torres'));
      assert.ok(option);
      await act(async () => { option.props.onClick(); });
      await act(async () => { r.root.findAllByType('textarea')[0].props.onChange({ target: { value: 'Pelea en el patio' } }); });
      await act(async () => { r.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
      await wait(450);
      const body = text(r.root);
      assert.ok(body.includes(SIMULACION));
      assert.doesNotMatch(body, /con éxito/);
    });
  } finally {
    if (r) await act(async () => { r.unmount(); });
    Object.assign(teacherProfileService, { getMe: original.getMe });
    Object.assign(teacherCoursesService, { getCourses: original.getCourses, getStudents: original.getStudents });
  }
});

test('teacher material tab shows the notice only while NEXT_PUBLIC_USE_MOCKS enables mocks', async () => {
  const original = { getActivities: teacherActivitiesService.getActivities, getBimesters: teacherGradesService.getBimesters };
  teacherActivitiesService.getActivities = async () => [];
  teacherGradesService.getBimesters = async () => [{ id: 1, academicPeriodId: 30, number: 1, name: 'Bimestre 1', startDate: '2026-03-01', endDate: '2026-04-30', status: 'PLANIFICADO' }];
  try {
    for (const [value, shown] of [[undefined, true], ['true', true], ['false', false]] as const) {
      await withEnv(value, async () => {
        let r!: ReactTestRenderer;
        await act(async () => { r = create(<ActividadesDocente sectionCourseId={10} />); });
        try {
          await act(async () => { r.root.findByProps({ 'aria-label': 'Bimestre de actividades' }).props.onChange({ target: { value: '1' } }); });
          assert.deepEqual(notices(r), [], `actividad, value=${value}`);
          const tab = r.root.findAllByType('button').find(b => text(b).trim() === 'Subir material');
          assert.ok(tab);
          await act(async () => { tab.props.onClick(); });
          assert.deepEqual(notices(r), shown ? [MATERIAL_DOCENTE] : [], `material, value=${value}`);
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

test('student materials views show the notice with mocks and the detail never downloads a fake file', async () => {
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
    await wait(0);
    try { assert.deepEqual(notices(r), []); } finally { await act(async () => { r.unmount(); }); }
  });
});
