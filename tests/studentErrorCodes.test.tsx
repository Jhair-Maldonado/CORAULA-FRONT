import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AxiosError, type AxiosResponse } from 'axios';
import StudentEditForm from '../feature/admin/vistas/(academico)/alumnos/components/StudentEditForm';
import { toAdminStudentDetail } from '../src/adapters/studentAdapter';
import { STUDENT_ERROR_CODES, studentErrorCode, studentErrorCodeMessage, studentErrorCodeMessages } from '../src/services/admin/studentErrors';
import { studentErrorMessage, studentUpdateErrorMessage } from '../src/services/admin/studentsService';
import type { StudentDetailResponse, UpdateStudentRequest } from '../src/types/studentApi';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const httpError = (status?: number, data: unknown = { message: 'Mensaje del backend' }) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data } as AxiosResponse : undefined);
const coded = (status: number, code: unknown) => httpError(status, { error: 'X', message: 'Mensaje del backend', code });
function text(node: ReactTestInstance): string { return node.children.map(child => typeof child === 'string' ? child : text(child)).join(''); }

const generic = ['VALIDATION_ERROR', 'INVALID_REQUEST_BODY', 'INVALID_PARAMETER', 'INTERNAL_ERROR'];
const contract: Record<string, number[]> = {
  VALIDATION_ERROR: [400], INVALID_REQUEST_BODY: [400], INVALID_PARAMETER: [400, 500], INTERNAL_ERROR: [500],
  STUDENT_NOT_FOUND: [404], STUDENT_INACTIVE: [409], DNI_ALREADY_EXISTS: [409], STUDENT_CODE_ALREADY_EXISTS: [409],
  STUDENT_CODE_EXHAUSTED: [409], STUDENT_PERSON_ALREADY_EXISTS: [409], PERSON_NOT_FOUND: [404], GUARDIAN_ALREADY_LINKED: [409],
  PRIMARY_GUARDIAN_ALREADY_EXISTS: [409], GUARDIAN_REGISTRATION_CONFLICT: [409], ACADEMIC_PERIOD_NOT_FOUND: [404],
  ACADEMIC_PERIOD_INACTIVE: [409], SECTION_NOT_FOUND: [404], SECTION_INACTIVE: [409], SECTION_NOT_IN_PERIOD: [409],
  ENROLLMENT_CLOSED: [409], SECTION_FULL: [409], ACTIVE_ENROLLMENT_EXISTS: [409], ENROLLMENT_DATE_REQUIRED: [400],
  ENROLLMENT_DATE_OUT_OF_PERIOD: [400], ENROLLMENT_NOT_FOUND: [404], ENROLLMENT_NOT_OF_STUDENT: [409],
  ENROLLMENT_STATUS_CONFLICT: [409], WITHDRAWAL_DATE_REQUIRED: [400], WITHDRAWAL_DATE_BEFORE_ENROLLMENT: [400],
  STUDENT_STATUS_CONFLICT: [409], STUDENT_HAS_ACTIVE_ENROLLMENT: [409],
};

test('catalog holds the 31 contract codes (#75 + #41); every specific code has a Spanish text', () => {
  assert.equal(STUDENT_ERROR_CODES.length, 31);
  assert.deepEqual([...STUDENT_ERROR_CODES].sort(), Object.keys(contract).sort());
  assert.deepEqual(Object.keys(studentErrorCodeMessages).sort(), Object.keys(contract).filter(code => !generic.includes(code)).sort());
  assert.match(studentErrorCodeMessage(coded(409, 'STUDENT_HAS_ACTIVE_ENROLLMENT'))!, /Retírala con «Retirar matrícula»/);
});

test('a code is accepted only as a known string with the contract HTTP status', () => {
  for (const [code, statuses] of Object.entries(contract)) {
    for (const status of [400, 401, 403, 404, 409, 422, 500, 503]) {
      assert.equal(studentErrorCode(coded(status, code)), statuses.includes(status) ? code : null, code + ' ' + status);
    }
    const message = studentErrorCodeMessage(coded(statuses[0], code));
    if (generic.includes(code)) assert.equal(message, null, code); else assert.ok(message && !/PRIVATE|backend/.test(message), code);
  }
  for (const data of [undefined, null, 'DNI_ALREADY_EXISTS', { message: 'x' }, { code: 409 }, { code: null }, { code: '' }, { code: 'dni_already_exists' },
    { code: 'UNKNOWN_CODE' }, { code: 'toString' }, { code: '__proto__' }, { code: ['DNI_ALREADY_EXISTS'] }]) {
    assert.equal(studentErrorCode(httpError(409, data)), null, JSON.stringify(data));
  }
  assert.equal(studentErrorCode(httpError()), null);
  assert.equal(studentErrorCode(new Error('DNI_ALREADY_EXISTS')), null);
});

test('student edit: a known code shows the catalog; without a code or with a generic one the backend message stays', () => {
  assert.equal(studentUpdateErrorMessage(coded(409, 'STUDENT_CODE_ALREADY_EXISTS')), 'El código de alumno ya pertenece a otro alumno.');
  assert.equal(studentUpdateErrorMessage(coded(409, 'DNI_ALREADY_EXISTS')), 'El DNI ya está registrado para otra persona.');
  assert.equal(studentUpdateErrorMessage(coded(404, 'STUDENT_NOT_FOUND')), 'El alumno ya no existe. Vuelve al listado.');
  for (const [status, code] of [[400, 'VALIDATION_ERROR'], [400, 'INVALID_REQUEST_BODY'], [409, 'UNKNOWN_CODE'], [409, undefined], [409, 'SECTION_NOT_FOUND'], [500, 'INVALID_PARAMETER'], [500, 'INTERNAL_ERROR']] as const) {
    assert.equal(studentUpdateErrorMessage(coded(status, code)), studentErrorMessage(coded(status, code)), String(code));
  }
  assert.equal(studentUpdateErrorMessage(coded(400, 'VALIDATION_ERROR')), 'Mensaje del backend');
  for (const status of [401, 403]) assert.equal(studentUpdateErrorMessage(coded(status, 'DNI_ALREADY_EXISTS')), studentErrorMessage(httpError(status)));
  assert.match(studentUpdateErrorMessage(httpError()), /No se pudo conectar/);
  // GETs keep using studentErrorMessage, which never reads the code.
  assert.equal(studentErrorMessage(coded(409, 'DNI_ALREADY_EXISTS')), 'Mensaje del backend');
});

test('StudentEditForm shows the catalog text and sends the PATCH once', async () => {
  const student = toAdminStudentDetail({
    studentId: 1, personId: 1, studentCode: 'TEST-1', dni: '12345678', firstNames: 'Ana', paternalLastName: 'Sintética', maternalLastName: null,
    birthDate: null, phone: null, studentStatus: 'ACTIVE', enrollmentId: null, enrollmentStatus: null, academicPeriodId: null, academicPeriodName: null,
    sectionId: null, sectionName: null, grade: null, level: null, enrollmentDate: null, guardians: [],
  } as StudentDetailResponse);
  const patches: UpdateStudentRequest[] = [];
  let failure: unknown = coded(409, 'STUDENT_CODE_ALREADY_EXISTS');
  let renderer!: ReactTestRenderer;
  await act(async () => { renderer = create(<StudentEditForm student={student} onCancel={() => {}} onSave={async patch => { patches.push(patch); throw failure; }} />); });
  try {
    const [code] = renderer.root.findAllByType('input');
    await act(async () => { code.props.onChange({ target: { value: 'TEST-2' } }); });
    await act(async () => { renderer.root.findByType('textarea').props.onChange({ target: { value: 'Corrección' } }); });
    const submit = () => act(async () => { renderer.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    await submit();
    assert.deepEqual(patches, [{ studentCode: 'TEST-2', reason: 'Corrección' }]);
    assert.match(text(renderer.root), /El código de alumno ya pertenece a otro alumno\./);
    assert.doesNotMatch(text(renderer.root), /Mensaje del backend|PRIVATE/);
    failure = coded(409, 'UNKNOWN_CODE');
    await submit();
    assert.equal(patches.length, 2);
    assert.match(text(renderer.root), /Mensaje del backend/);
  } finally { await act(async () => { renderer.unmount(); }); }
});
