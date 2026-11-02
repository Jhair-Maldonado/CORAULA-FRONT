import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, type AxiosResponse } from 'axios';
import { contractErrorCode } from '../src/services/admin/contractErrors';
import { GRADE_CORRECTION_ERROR_CODES, gradeCorrectionErrorCode, gradeCorrectionErrorCodeMessage, gradeCorrectionErrorCodeMessages } from '../src/services/admin/gradeCorrectionErrors';
import { adminGradeCorrectionErrorMessage, adminGradesErrorMessage } from '../src/services/admin/adminGradesService';

const httpError = (status?: number, data: unknown = { message: 'secret detail' }) => new AxiosError('PRIVATE DETAIL', 'ERR_TEST', undefined, undefined,
  status ? { status, data } as AxiosResponse : undefined);
const coded = (status: number, code: unknown) => httpError(status, { error: 'X', message: 'secret detail', code });

const generic = ['VALIDATION_ERROR', 'INTERNAL_ERROR'];
const contract: Record<string, number[]> = {
  VALIDATION_ERROR: [400], REASON_REQUIRED: [400], RESOURCE_NOT_FOUND: [404], BIMESTER_STATE_CONFLICT: [409],
  GRADE_CHANGED_CONCURRENTLY: [409], STRUCTURE_FROZEN: [409], INTERNAL_ERROR: [500],
};

test('catalog holds the #51-A codes plus GRADE_CHANGED_CONCURRENTLY (BACK #100); every specific code has a Spanish text', () => {
  assert.deepEqual([...GRADE_CORRECTION_ERROR_CODES].sort(), Object.keys(contract).sort());
  assert.deepEqual(Object.keys(gradeCorrectionErrorCodeMessages).sort(), Object.keys(contract).filter(code => !generic.includes(code)).sort());
});

test('a code is accepted only as a known string with the contract HTTP status', () => {
  for (const [code, statuses] of Object.entries(contract)) {
    for (const status of [400, 401, 403, 404, 409, 422, 500, 503]) {
      assert.equal(gradeCorrectionErrorCode(coded(status, code)), statuses.includes(status) ? code : null, `${code} ${status}`);
    }
    const message = gradeCorrectionErrorCodeMessage(coded(statuses[0], code));
    if (generic.includes(code)) assert.equal(message, null, code); else assert.ok(message && !/PRIVATE|secret/.test(message), code);
  }
  for (const data of [undefined, null, 'BIMESTER_STATE_CONFLICT', { message: 'x' }, { code: 409 }, { code: null }, { code: '' }, { code: 'bimester_state_conflict' },
    { code: 'UNKNOWN_CODE' }, { code: 'toString' }, { code: '__proto__' }, { code: ['BIMESTER_STATE_CONFLICT'] }]) {
    assert.equal(gradeCorrectionErrorCode(httpError(409, data)), null, JSON.stringify(data));
  }
  assert.equal(gradeCorrectionErrorCode(httpError()), null);
  assert.equal(gradeCorrectionErrorCode(new Error('BIMESTER_STATE_CONFLICT')), null);
  // Student codes are not grade-correction codes.
  assert.equal(gradeCorrectionErrorCode(coded(409, 'STUDENT_STATUS_CONFLICT')), null);
});

test('generic helper reads only the given catalog', () => {
  const statuses = { ONLY_409: [409] } as const;
  assert.equal(contractErrorCode(coded(409, 'ONLY_409'), statuses), 'ONLY_409');
  assert.equal(contractErrorCode(coded(400, 'ONLY_409'), statuses), null);
  assert.equal(contractErrorCode(coded(409, 'BIMESTER_STATE_CONFLICT'), statuses), null);
});

test('correction message: catalog first, then HTTP text; 401/403, network and 5xx unchanged', () => {
  assert.match(adminGradeCorrectionErrorMessage(coded(409, 'BIMESTER_STATE_CONFLICT')), /El bimestre o la nota cambiaron/);
  assert.match(adminGradeCorrectionErrorMessage(coded(409, 'GRADE_CHANGED_CONCURRENTLY')), /Otra persona cambió esta nota/);
  for (const error of [coded(400, 'VALIDATION_ERROR'), coded(409, 'UNKNOWN_CODE'), coded(401, 'BIMESTER_STATE_CONFLICT'), coded(403, 'BIMESTER_STATE_CONFLICT'),
    coded(500, 'INTERNAL_ERROR'), coded(503, 'BIMESTER_STATE_CONFLICT'), httpError(), new Error('x')]) {
    assert.equal(adminGradeCorrectionErrorMessage(error), adminGradesErrorMessage(error));
  }
  assert.match(adminGradeCorrectionErrorMessage(httpError()), /no pudo confirmarse/);
});
