// Protección del modo de ejecución, evaluada por next.config.mjs antes de `next dev` y `next build`.
// La resolución completa del modo vive en src/config/appConfig.ts; aquí solo se corta lo que nunca debe compilar.

export const APP_MODES = ['MOCK', 'LOCAL', 'PRODUCTION'];

/**
 * Lanza un error claro si el entorno no es válido.
 * @param {Record<string, string | undefined>} env
 */
export function assertAppModeEnv(env) {
  const mode = env.NEXT_PUBLIC_APP_MODE?.trim();
  if (mode && !APP_MODES.includes(mode)) {
    throw new Error(`[CORAULA] NEXT_PUBLIC_APP_MODE="${mode}" no es válido. Usa MOCK, LOCAL o PRODUCTION.`);
  }
  if (env.VERCEL_ENV === 'production' && mode !== 'PRODUCTION') {
    throw new Error('[CORAULA] El despliegue de producción en Vercel exige NEXT_PUBLIC_APP_MODE=PRODUCTION. Configúrala en Settings → Environment Variables (Production).');
  }
  if (mode === 'PRODUCTION' && !env.NEXT_PUBLIC_API_URL?.trim()) {
    throw new Error('[CORAULA] El modo PRODUCTION requiere NEXT_PUBLIC_API_URL (URL del backend desplegado, incluyendo /api).');
  }
}
