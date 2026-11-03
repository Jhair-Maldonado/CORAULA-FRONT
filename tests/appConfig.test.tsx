import test from 'node:test';
import assert from 'node:assert/strict';
import {
  API_TIMEOUTS, AppConfigError, DEFAULT_LOCAL_API_URL, buildURL, resolveApiBaseUrl, resolveAppMode, resolveEnvInfo,
} from '../src/config/appConfig';
import { assertAppModeEnv } from '../src/config/buildGuard.mjs';
import { isMockDataEnabled } from '../src/lib/mockMode';

// Modos de ejecución MOCK / LOCAL / PRODUCTION: funciones puras, sin red.

test('modo por defecto: LOCAL en next dev (y en tests), PRODUCTION en next build; nunca MOCK', () => {
  assert.equal(resolveAppMode({ nodeEnv: 'development' }), 'LOCAL');
  assert.equal(resolveAppMode({ nodeEnv: 'production' }), 'PRODUCTION');
  assert.equal(resolveAppMode({}), 'LOCAL');
  assert.equal(resolveAppMode({ appMode: '  ', nodeEnv: 'production' }), 'PRODUCTION');
  for (const appMode of ['MOCK', 'LOCAL', 'PRODUCTION'] as const) assert.equal(resolveAppMode({ appMode, nodeEnv: 'production' }), appMode);
});

test('un valor inválido lanza un error claro', () => {
  for (const appMode of ['mock', 'DEV', 'production', 'TEST']) {
    assert.throws(() => resolveAppMode({ appMode }), (e: unknown) => e instanceof AppConfigError && /no es válido.*MOCK, LOCAL o PRODUCTION/.test((e as Error).message), appMode);
  }
});

test('PRODUCTION sin NEXT_PUBLIC_API_URL falla; LOCAL usa su URL o localhost y nunca la de producción', () => {
  assert.throws(() => resolveEnvInfo({ appMode: 'PRODUCTION' }), /requiere NEXT_PUBLIC_API_URL/);
  assert.throws(() => resolveEnvInfo({ nodeEnv: 'production', apiUrl: '  ' }), /requiere NEXT_PUBLIC_API_URL/);
  const prod = resolveEnvInfo({ appMode: 'PRODUCTION', apiUrl: 'https://api.ejemplo.test/api/' });
  assert.deepEqual(prod, { mode: 'PRODUCTION', isMock: false, isLocal: false, isProduction: true, baseURL: 'https://api.ejemplo.test/api', timeout: 20_000 });
  const local = resolveEnvInfo({ appMode: 'LOCAL', apiUrl: 'https://api.ejemplo.test/api' });
  assert.equal(local.baseURL, DEFAULT_LOCAL_API_URL);
  assert.equal(local.timeout, 10_000);
  assert.equal(resolveApiBaseUrl('LOCAL', { localApiUrl: 'http://127.0.0.1:9090/api/' }), 'http://127.0.0.1:9090/api');
  const mock = resolveEnvInfo({ appMode: 'MOCK' });
  assert.equal(mock.isMock, true);
  assert.deepEqual(API_TIMEOUTS, { MOCK: 10_000, LOCAL: 10_000, PRODUCTION: 20_000 });
});

test('compatibilidad con NEXT_PUBLIC_USE_MOCKS (obsoleta)', () => {
  assert.equal(resolveAppMode({ useMocks: 'true' }), 'MOCK');
  assert.equal(resolveAppMode({ useMocks: 'true', nodeEnv: 'production' }), 'MOCK');
  assert.equal(resolveAppMode({ useMocks: 'false' }), 'LOCAL');
  assert.equal(resolveAppMode({ useMocks: 'false', nodeEnv: 'production' }), 'PRODUCTION');
  assert.equal(resolveAppMode({ useMocks: '' }), 'LOCAL', 'una variable vacía ya no activa los mocks');
  assert.equal(resolveAppMode({ useMocks: 'sí' }), 'LOCAL');
  assert.equal(resolveAppMode({ appMode: 'LOCAL', useMocks: 'true' }), 'LOCAL', 'el modo explícito manda');
  assert.throws(() => resolveAppMode({ appMode: 'MOCK', useMocks: 'false' }), /contradice NEXT_PUBLIC_USE_MOCKS=false/);
  // isMockDataEnabled conserva su firma: el argumento es el valor obsoleto.
  const mode = process.env.NEXT_PUBLIC_APP_MODE;
  delete process.env.NEXT_PUBLIC_APP_MODE;
  try {
    assert.equal(isMockDataEnabled('true'), true);
    assert.equal(isMockDataEnabled('false'), false);
    assert.equal(isMockDataEnabled(''), false);
  } finally {
    if (mode !== undefined) process.env.NEXT_PUBLIC_APP_MODE = mode;
  }
});

test('buildURL: base + endpoint con parámetros definidos codificados', () => {
  const base = 'https://api.ejemplo.test/api/';
  assert.equal(buildURL('/v1/teacher/me', {}, base), 'https://api.ejemplo.test/api/v1/teacher/me');
  assert.equal(buildURL('v1/guardian/students', undefined, base), 'https://api.ejemplo.test/api/v1/guardian/students');
  assert.equal(
    buildURL('/v1/management/students', { search: 'Ana María', page: 0, sectionId: undefined, active: true, level: null }, base),
    'https://api.ejemplo.test/api/v1/management/students?search=Ana+Mar%C3%ADa&page=0&active=true',
  );
});

test('protección del build: valor inválido, producción en Vercel sin PRODUCTION y PRODUCTION sin URL', () => {
  assert.throws(() => assertAppModeEnv({ NEXT_PUBLIC_APP_MODE: 'demo' }), /no es válido/);
  assert.throws(() => assertAppModeEnv({ VERCEL_ENV: 'production' }), /exige NEXT_PUBLIC_APP_MODE=PRODUCTION/);
  assert.throws(() => assertAppModeEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_MODE: 'MOCK' }), /exige NEXT_PUBLIC_APP_MODE=PRODUCTION/);
  assert.throws(() => assertAppModeEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_MODE: 'PRODUCTION' }), /requiere NEXT_PUBLIC_API_URL/);
  assert.doesNotThrow(() => assertAppModeEnv({ VERCEL_ENV: 'production', NEXT_PUBLIC_APP_MODE: 'PRODUCTION', NEXT_PUBLIC_API_URL: 'https://api.ejemplo.test/api' }));
  assert.doesNotThrow(() => assertAppModeEnv({ VERCEL_ENV: 'preview', NEXT_PUBLIC_APP_MODE: 'MOCK' }));
  assert.doesNotThrow(() => assertAppModeEnv({}));
});
