// src/lib/mockMode.ts
// Determina si se usan mocks o backend real según variable de entorno
export function isMockDataEnabled(value = process.env.NEXT_PUBLIC_USE_MOCKS): boolean {
  return value !== 'false';
}
