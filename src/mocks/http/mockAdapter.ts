// Adaptador de axios del modo MOCK: responde desde una tabla de rutas por método y patrón, sin salir a la red.
// Solo se carga con NEXT_PUBLIC_APP_MODE=MOCK (src/services/httpClient.ts). Las escrituras viven en memoria
// durante la sesión del navegador; al recargar la página se vuelve a los datos iniciales.
import { AxiosError, AxiosHeaders, CanceledError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { sessionFromAuthorization, authRoutes } from './mockAuth';
import { fail, type MockMethod, type MockReply, type MockRoute } from './mockHttp';
import { createMockStore, type MockStore } from './fixtures/shared';
import { adminRoutes } from './fixtures/admin';
import { docenteRoutes } from './fixtures/docente';
import { apoderadoRoutes } from './fixtures/apoderado';

export const MOCK_ROUTES: readonly MockRoute[] = [...authRoutes, ...adminRoutes, ...docenteRoutes, ...apoderadoRoutes];
export const DEFAULT_MOCK_LATENCY_MS = 300;

interface CompiledRoute extends MockRoute { regex: RegExp; names: string[] }

function compile(route: MockRoute): CompiledRoute {
  const names: string[] = [];
  const source = route.pattern
    .split('/')
    .map(part => (part.startsWith(':') ? (names.push(part.slice(1)), '([^/]+)') : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return { ...route, regex: new RegExp(`^${source}$`), names };
}

/** Ruta relativa a /api: acepta '/v1/...' o una URL absoluta del backend. */
function requestPath(config: InternalAxiosRequestConfig): { path: string; query: Record<string, string> } {
  const url = new URL(config.url ?? '', 'http://mock.local');
  const path = url.pathname.replace(/^\/api(?=\/v1\/)/, '');
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => { query[key] = value; });
  for (const [key, value] of Object.entries((config.params ?? {}) as Record<string, unknown>)) {
    if (value !== undefined && value !== null) query[key] = String(value);
  }
  return { path, query };
}

function parseBody(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try { return JSON.parse(data); } catch { return data; }
}

function wait(ms: number, signal?: InternalAxiosRequestConfig['signal']): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new CanceledError()); return; }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener?.('abort', () => { clearTimeout(timer); reject(new CanceledError()); });
  });
}

export interface MockAdapterOptions {
  latencyMs?: number;
  store?: MockStore;
  routes?: readonly MockRoute[];
  warn?: (message: string) => void;
}

function resolveMockReply(config: InternalAxiosRequestConfig, store: MockStore, routes: readonly CompiledRoute[], warn: (m: string) => void): MockReply {
  const method = (config.method ?? 'get').toUpperCase() as MockMethod;
  const { path, query } = requestPath(config);
  for (const route of routes) {
    if (route.method !== method) continue;
    const match = route.regex.exec(path);
    if (!match) continue;
    const session = sessionFromAuthorization(AxiosHeaders.from(config.headers ?? {}).get('Authorization'));
    if (route.roles) {
      if (!session) return fail(401, 'Se requiere autenticación.');
      if (!route.roles.includes(session.role)) return fail(403, 'No tienes permiso para este recurso.');
    }
    const params = Object.fromEntries(route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]));
    return route.handler({ method, path, params, query, body: parseBody(config.data), session, store });
  }
  warn(`[CORAULA MOCK] Ruta sin mock: ${method} ${path}`);
  return fail(501, `La ruta ${method} ${path} no tiene datos simulados.`, 'MOCK_NOT_IMPLEMENTED');
}

export function createMockAdapter(options: MockAdapterOptions = {}): AxiosAdapter {
  const store = options.store ?? createMockStore();
  const routes = (options.routes ?? MOCK_ROUTES).map(compile);
  const latency = options.latencyMs ?? DEFAULT_MOCK_LATENCY_MS;
  const warn = options.warn ?? ((message: string) => console.warn(message));
  return async (config) => {
    if (latency > 0) await wait(latency, config.signal);
    else if (config.signal?.aborted) throw new CanceledError();
    const reply = resolveMockReply(config, store, routes, warn);
    const response: AxiosResponse = {
      data: reply.data, status: reply.status, statusText: String(reply.status),
      headers: new AxiosHeaders({ 'content-type': 'application/json', ...reply.headers }), config, request: {},
    };
    const valid = config.validateStatus ? config.validateStatus(reply.status) : reply.status >= 200 && reply.status < 300;
    if (!valid) {
      const code = reply.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
      throw new AxiosError(`Request failed with status code ${reply.status}`, code, config, response.request, response);
    }
    return response;
  };
}

function configuredLatency(): number {
  const raw = process.env.NEXT_PUBLIC_MOCK_LATENCY_MS?.trim();
  if (!raw) return DEFAULT_MOCK_LATENCY_MS;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_MOCK_LATENCY_MS;
}

/** Adaptador de la sesión del navegador: un único almacén en memoria. */
export const mockAdapter: AxiosAdapter = createMockAdapter({ latencyMs: configuredLatency() });
