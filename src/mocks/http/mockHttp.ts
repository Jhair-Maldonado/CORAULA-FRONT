// Tipos y utilidades del adaptador simulado (modo MOCK).
import type { BackendRole } from '@/types';
import type { MockStore } from './fixtures/shared';

export type MockMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface MockSession { email: string; role: BackendRole }

export interface MockRequest {
  method: MockMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  session: MockSession | null;
  store: MockStore;
}

export interface MockReply { status: number; data?: unknown; headers?: Record<string, string> }

export type MockHandler = (request: MockRequest) => MockReply;

export interface MockRoute {
  method: MockMethod;
  pattern: string;
  /** Roles con acceso; ausente = ruta pública. */
  roles?: readonly BackendRole[];
  handler: MockHandler;
}

export const ok = (data: unknown, status = 200, headers?: Record<string, string>): MockReply => ({ status, data, headers });

const ERROR_NAMES: Record<number, string> = {
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 423: 'Locked', 501: 'Not Implemented',
};

/** Cuerpo de error como el del backend: {error, message, code?}. 401/403 nunca llevan code. */
export function fail(status: number, message: string, code?: string): MockReply {
  return { status, data: code ? { error: ERROR_NAMES[status] ?? 'Error', message, code } : { error: ERROR_NAMES[status] ?? 'Error', message } };
}

export function positiveInt(value: string | undefined): number | null {
  if (value === undefined || !/^[1-9]\d{0,15}$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

export function pageParams(query: Record<string, string>, defaultSize = 20): { page: number; size: number } | null {
  const page = query.page === undefined ? 0 : Number(query.page);
  const size = query.size === undefined ? defaultSize : Number(query.size);
  if (!Number.isSafeInteger(page) || page < 0 || !Number.isSafeInteger(size) || size < 1 || size > 100) return null;
  return { page, size };
}

export function pageOf<T>(items: T[], page: number, size: number) {
  return {
    content: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
  };
}

export const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
