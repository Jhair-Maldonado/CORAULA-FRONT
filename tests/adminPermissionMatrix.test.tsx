import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import StudentEditForm from '../feature/admin/vistas/(academico)/alumnos/components/StudentEditForm';
import ImportadorMatricula from '../src/feature/admin/component/ImportadorMatricula';
import { AuthContext } from '../src/contexts/AuthContext';
import { studentEditValidation, toAdminStudentDetail, toStudentEditValues, toUpdateStudent } from '../src/adapters/studentAdapter';
import { studentImportService } from '../src/services/admin/studentImportService';
import type { StudentDetailResponse, UpdateStudentRequest } from '../src/types/studentApi';
import type { StudentImportPreview } from '../src/types/studentImport';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
type Auth = NonNullable<React.ContextType<typeof AuthContext>>;

const student = toAdminStudentDetail({
  studentId: 1, personId: 1, studentCode: 'TEST-1', dni: null, firstNames: 'Alumno', paternalLastName: 'Sintético',
  maternalLastName: null, birthDate: null, phone: null, studentStatus: 'ACTIVE', enrollmentId: null, enrollmentStatus: null,
  academicPeriodId: null, academicPeriodName: null, sectionId: null, sectionName: null, grade: null, level: null,
  enrollmentDate: null, guardians: [],
} satisfies StudentDetailResponse);
const preview: StudentImportPreview = {
  totalRows: 1, validRows: 1, invalidRows: 0,
  rows: [{ rowNumber: 2, valid: true, errors: [], warnings: [], data: {
    studentDni: '12345678', studentEmail: null, studentFirstNames: 'Alumno', studentLastNamePaternal: 'Sintético', studentLastNameMaternal: null,
    studentBirthDate: '2015-01-01', studentPhone: null, guardianDni: '87654321', guardianEmail: null, guardianFirstNames: 'Rosa',
    guardianLastNamePaternal: 'Sintética', guardianLastNameMaternal: null, guardianPhone: null, guardianRelationship: 'MOTHER',
    guardianPrimary: true, guardianAuthorizedPickup: true, academicPeriod: '2026', level: 'PRIMARY', grade: 1, section: 'A',
    enrollmentDate: '2026-03-01', studentCode: null,
  } }],
};
const auth = (role: Auth['role']): Auth => ({ token: 'synthetic', role, status: 'authenticated', sessionValid: true,
  login() {}, logout() {}, validateSession() {}, isSessionPhysicallyValid: () => true });
const httpError = (status: number) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  { status, data: { message: 'PRIVATE DETAIL' } } as AxiosResponse);
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }
const button = (renderer: ReactTestRenderer, label: string) => renderer.root.findAllByType('button').find(node => text(node) === label);

test('edit reason is mandatory: blank blocks, valid reason is trimmed and never null', () => {
  const changed = { ...toStudentEditValues(student), phone: '999888777' };
  for (const reason of ['', '   ']) assert.equal(studentEditValidation({ ...changed, reason }, student), 'Indica el motivo de la actualización.');
  assert.equal(studentEditValidation({ ...changed, reason: 'Corrección de teléfono' }, student), null);
  assert.deepEqual(toUpdateStudent({ ...changed, reason: '  Corrección de teléfono  ' }, student), { phone: '999888777', reason: 'Corrección de teléfono' });
  assert.equal(toUpdateStudent({ ...toStudentEditValues(student), reason: 'Sin cambios' }, student), null);
});

test('edit form blocks submit without reason, sends trimmed reason and closes when nothing changed', async () => {
  const sent: UpdateStudentRequest[] = [];
  let cancelled = 0;
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<StudentEditForm student={student} onSave={async patch => { sent.push(patch); }} onCancel={() => { cancelled++; }} />); });
  const submit = async () => { await act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); }); };
  const phone = renderer.root.findAllByType('input')[6];
  const reason = renderer.root.findByType('textarea');
  assert.match(text(renderer.root), /Motivo de actualización \*/);
  assert.doesNotMatch(text(renderer.root), /opcional/);

  await submit();
  assert.equal(cancelled, 1);

  await act(async () => { phone.props.onChange({ target: { value: '999888777' } }); });
  await act(async () => { reason.props.onChange({ target: { value: '   ' } }); });
  await submit();
  assert.equal(sent.length, 0);
  assert.match(text(renderer.root), /Indica el motivo de la actualización\./);

  await act(async () => { reason.props.onChange({ target: { value: '  Corrección de teléfono ' } }); });
  await submit();
  assert.deepEqual(sent, [{ phone: '999888777', reason: 'Corrección de teléfono' }]);
  await act(async () => { renderer.unmount(); });
});

async function importer(role: Auth['role'], confirm: typeof studentImportService.confirm, run: (renderer: ReactTestRenderer, calls: () => number) => Promise<void>) {
  const oldPreview = studentImportService.preview, oldConfirm = studentImportService.confirm;
  let confirmCalls = 0;
  studentImportService.preview = async () => preview;
  studentImportService.confirm = async file => { confirmCalls++; return confirm(file); };
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AuthContext.Provider value={auth(role)}><ImportadorMatricula /></AuthContext.Provider>); });
    const file = new File(['synthetic'], 'matricula.xlsx');
    await act(async () => { renderer.root.findByType('input').props.onChange({ target: { files: [file], value: '' } }); });
    await act(async () => { button(renderer, 'Obtener preview')!.props.onClick(); });
    assert.match(text(renderer.root), /Total: 1 · Válidas: 1 · Inválidas: 0/);
    await run(renderer, () => confirmCalls);
  } finally {
    if (renderer) await act(async () => { renderer.unmount(); });
    studentImportService.preview = oldPreview; studentImportService.confirm = oldConfirm;
  }
}

test('DIRECTIVO gets the preview but neither sees nor can use the confirm button', async () => {
  await importer('DIRECTIVO', async () => { throw new Error('must not confirm'); }, async (renderer, calls) => {
    assert.equal(button(renderer, 'Confirmar matrícula'), undefined);
    assert.match(text(renderer.root), /La confirmación de la importación la realiza el Director\./);
    assert.equal(calls(), 0);
  });
});

test('ADMINISTRADOR sees an enabled confirm button and no Director notice', async () => {
  await importer('ADMINISTRADOR', async () => { throw new Error('not clicked'); }, async renderer => {
    const confirm = button(renderer, 'Confirmar matrícula');
    assert.ok(confirm);
    assert.equal(!!confirm.props.disabled, false);
    assert.doesNotMatch(text(renderer.root), /la realiza el Director/);
  });
});

test('403 on confirm shows the Director message and does not retry', async () => {
  await importer('ADMINISTRADOR', async () => { throw httpError(403); }, async (renderer, calls) => {
    await act(async () => { button(renderer, 'Confirmar matrícula')!.props.onClick(); });
    assert.match(text(renderer.root), /Solo el Director puede confirmar la importación\./);
    assert.doesNotMatch(text(renderer.root), /PRIVATE DETAIL/);
    assert.equal(button(renderer, 'Confirmar matrícula')!.props.disabled, true);
    await act(async () => { button(renderer, 'Confirmar matrícula')!.props.onClick(); });
    assert.equal(calls(), 1);
  });
});
