// src/lib/mockMode.ts
// true solo en modo MOCK (src/config/appConfig.ts). Se evalúa en cada llamada.
// `value` es el valor obsoleto de NEXT_PUBLIC_USE_MOCKS: "true" sin NEXT_PUBLIC_APP_MODE equivale a MOCK.
import { readAppEnv, resolveAppMode } from '@/config/appConfig';

export function isMockDataEnabled(value = process.env.NEXT_PUBLIC_USE_MOCKS): boolean {
  return resolveAppMode({ ...readAppEnv(), useMocks: value }) === 'MOCK';
}
