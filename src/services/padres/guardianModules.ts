// src/services/padres/guardianModules.ts
// Registro de módulos del portal del apoderado CONECTADOS en el frontend: su vista consume el backend real.
// Que exista el endpoint no basta: un módulo entra al registro en el PR que conecta su vista (libreta #56,
// justificaciones #57, incidencias #59, notificaciones #58). Una ruta cuyo módulo no está registrado no muestra
// datos reales y conserva el aviso de módulo simulado. En modo MOCK, los módulos registrados usan igualmente sus
// servicios reales y el adaptador simulado de httpClient los responde (src/mocks/http); en LOCAL y PRODUCTION, el backend.
// A diferencia de MODULOS_CON_BACKEND de src/lib/api.ts, aquí no se sirven datos de demostración como reales.

export type GuardianModulo =
  | 'hijos' // GET /v1/guardian/students (#33, FRONT #54)
  | 'asistencia' // GET /v1/guardian/students/{studentId}/attendance (#55)
  | 'libreta' // FRONT #56: GET .../bimesters/published, .../report y .../report.pdf
  | 'incidencias' // FRONT #59, BACK #117: GET .../incidents
  | 'justificaciones' // FRONT #57: .../attendance/{attendanceId}/justifications y .../justifications
  | 'notificaciones'; // FRONT #58

export const GUARDIAN_MODULOS_CON_BACKEND: ReadonlySet<GuardianModulo> = new Set<GuardianModulo>(['hijos', 'asistencia', 'incidencias']);

// Rutas reales bajo /padre/* y el módulo que consumen. Las rutas sin módulo (/padre, /padre/mensajeria) son simuladas.
export const GUARDIAN_RUTAS_MODULO: Readonly<Record<string, GuardianModulo>> = {
  '/padre/hijos': 'hijos',
  '/padre/asistencia': 'asistencia',
  '/padre/libreta': 'libreta',
  '/padre/incidencias': 'incidencias',
  '/padre/justificacion': 'justificaciones',
  '/padre/avisos': 'notificaciones',
};

export function guardianModuloDeRuta(pathname: string | null | undefined): GuardianModulo | null {
  if (!pathname) return null;
  for (const [ruta, modulo] of Object.entries(GUARDIAN_RUTAS_MODULO)) {
    if (pathname === ruta || pathname.startsWith(`${ruta}/`)) return modulo;
  }
  return null;
}

/** true si la vista usa los servicios reales (backend, o el adaptador simulado en MOCK): el módulo está registrado. */
export function guardianModuloUsaBackend(
  modulo: GuardianModulo,
  registro: ReadonlySet<GuardianModulo> = GUARDIAN_MODULOS_CON_BACKEND,
): boolean {
  return registro.has(modulo);
}

/** El aviso de módulo simulado se oculta solo en rutas cuyo módulo usa los servicios reales. */
export function rutaPadreMuestraAvisoSimulado(
  pathname: string | null | undefined,
  registro: ReadonlySet<GuardianModulo> = GUARDIAN_MODULOS_CON_BACKEND,
): boolean {
  const modulo = guardianModuloDeRuta(pathname);
  return !modulo || !guardianModuloUsaBackend(modulo, registro);
}
