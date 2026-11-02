// src/config/appConfig.ts
// Modo de ejecución del frontend. Se elige con NEXT_PUBLIC_APP_MODE (nunca editando este archivo):
//   MOCK        sin backend: el adaptador de src/mocks/http sirve login y datos simulados.
//   LOCAL       backend local (NEXT_PUBLIC_LOCAL_API_URL o http://localhost:8080/api).
//   PRODUCTION  backend desplegado (NEXT_PUBLIC_API_URL, obligatorio).
// Sin NEXT_PUBLIC_APP_MODE: LOCAL en `next dev` y PRODUCTION en `next build`/`next start`. Nunca MOCK por defecto.
// Las variables se leen con acceso literal (process.env.NEXT_PUBLIC_X) para que Next las sustituya en el build.

export const APP_MODES = ['MOCK', 'LOCAL', 'PRODUCTION'] as const;
export type AppMode = (typeof APP_MODES)[number];

export const DEFAULT_LOCAL_API_URL = 'http://localhost:8080/api';
/** PRODUCTION espera más por el arranque en frío del backend en Render. */
export const API_TIMEOUTS: Readonly<Record<AppMode, number>> = { MOCK: 10_000, LOCAL: 10_000, PRODUCTION: 20_000 };

export interface AppEnv {
  appMode?: string;
  /** NEXT_PUBLIC_USE_MOCKS (obsoleto): solo se consulta si falta NEXT_PUBLIC_APP_MODE. */
  useMocks?: string;
  nodeEnv?: string;
  apiUrl?: string;
  localApiUrl?: string;
}

export interface EnvInfo {
  mode: AppMode;
  isMock: boolean;
  isLocal: boolean;
  isProduction: boolean;
  baseURL: string;
  timeout: number;
}

export class AppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppConfigError';
  }
}

export function readAppEnv(): AppEnv {
  return {
    appMode: process.env.NEXT_PUBLIC_APP_MODE,
    useMocks: process.env.NEXT_PUBLIC_USE_MOCKS,
    nodeEnv: process.env.NODE_ENV,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    localApiUrl: process.env.NEXT_PUBLIC_LOCAL_API_URL,
  };
}

function isAppMode(value: string): value is AppMode {
  return (APP_MODES as readonly string[]).includes(value);
}

export function resolveAppMode(env: AppEnv): AppMode {
  const raw = env.appMode?.trim();
  if (raw) {
    if (!isAppMode(raw)) {
      throw new AppConfigError(`NEXT_PUBLIC_APP_MODE="${raw}" no es válido. Usa MOCK, LOCAL o PRODUCTION.`);
    }
    if (raw === 'MOCK' && env.useMocks === 'false') {
      throw new AppConfigError('NEXT_PUBLIC_APP_MODE=MOCK contradice NEXT_PUBLIC_USE_MOCKS=false. Elimina NEXT_PUBLIC_USE_MOCKS (obsoleta) de tu archivo de entorno.');
    }
    return raw;
  }
  // Transición: NEXT_PUBLIC_USE_MOCKS=true sin modo explícito equivale a MOCK; "false" se respeta (modo no simulado).
  if (env.useMocks === 'true') return 'MOCK';
  return env.nodeEnv === 'production' ? 'PRODUCTION' : 'LOCAL';
}

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export function resolveApiBaseUrl(mode: AppMode, env: AppEnv): string {
  if (mode === 'PRODUCTION') {
    const url = env.apiUrl?.trim();
    if (!url) throw new AppConfigError('El modo PRODUCTION requiere NEXT_PUBLIC_API_URL (URL del backend desplegado, incluyendo /api).');
    return withoutTrailingSlash(url);
  }
  if (mode === 'LOCAL') return withoutTrailingSlash(env.localApiUrl?.trim() || DEFAULT_LOCAL_API_URL);
  // MOCK: ninguna petición sale a la red; la base solo sirve para construir URLs.
  return DEFAULT_LOCAL_API_URL;
}

export function resolveEnvInfo(env: AppEnv = readAppEnv()): EnvInfo {
  const mode = resolveAppMode(env);
  return {
    mode,
    isMock: mode === 'MOCK',
    isLocal: mode === 'LOCAL',
    isProduction: mode === 'PRODUCTION',
    baseURL: resolveApiBaseUrl(mode, env),
    timeout: API_TIMEOUTS[mode],
  };
}

export const ENV_INFO: Readonly<EnvInfo> = Object.freeze(resolveEnvInfo());
export const APP_MODE: AppMode = ENV_INFO.mode;
export const API_BASE_URL: string = ENV_INFO.baseURL;
export const API_TIMEOUT: number = ENV_INFO.timeout;

type QueryValue = string | number | boolean | null | undefined;

/** URL absoluta del backend: base + endpoint, con los parámetros definidos codificados. */
export function buildURL(endpoint: string, params: Record<string, QueryValue> = {}, baseURL: string = API_BASE_URL): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.append(key, String(value));
  }
  const search = query.toString();
  return `${withoutTrailingSlash(baseURL)}${path}${search ? `?${search}` : ''}`;
}

if (typeof window !== 'undefined' && APP_MODE !== 'PRODUCTION') {
  console.info(`[CORAULA] Modo ${APP_MODE}${APP_MODE === 'MOCK' ? ': datos simulados, sin backend' : `: ${API_BASE_URL}`}`);
}
