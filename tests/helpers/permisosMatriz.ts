import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Lector mínimo de la copia de `docs/permisos/matriz.yaml` del backend (FRONT #167). Sin dependencias: solo entiende el
 * formato real del archivo y falla ante cualquier línea o clave desconocida, para que un cambio de formato no pase en silencio.
 */
export interface EndpointMatriz {
  metodo: string;
  ruta: string;
  /** Vacío cuando el endpoint es público. */
  roles: string[];
  publico: boolean;
}

export interface MatrizPermisos {
  roles: string[];
  endpoints: EndpointMatriz[];
}

/** Mínimo de entradas esperadas: si baja, el lector dejó de leer la matriz completa. */
export const MIN_ENDPOINTS = 130;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'permisos-matriz.yaml');

const parseLista = (valor: string, linea: string): string[] => {
  const m = /^\[([A-Z_, ]*)\]$/.exec(valor);
  if (!m) throw new Error(`Lista no reconocida: ${linea}`);
  return m[1].split(',').map((r) => r.trim()).filter(Boolean);
};

/** Interpreta el texto de la matriz; lanza ante formato desconocido o roles fuera del encabezado. */
export function parseMatriz(texto: string): MatrizPermisos {
  let roles: string[] | null = null;
  let version = false;
  let enEndpoints = false;
  const endpoints: Partial<EndpointMatriz>[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    if (!linea.trim() || linea.startsWith('#')) continue;
    if (!enEndpoints) {
      if (linea === 'version: 1') version = true;
      else if (linea.startsWith('fuente: "') && linea.endsWith('"')) continue;
      else if (linea.startsWith('roles: ')) roles = parseLista(linea.slice(7), linea);
      else if (linea === 'endpoints:') enEndpoints = true;
      else throw new Error(`Línea desconocida: ${linea}`);
      continue;
    }
    let m = /^  - metodo: (GET|POST|PUT|PATCH|DELETE)$/.exec(linea);
    if (m) { endpoints.push({ metodo: m[1], roles: [], publico: false }); continue; }
    const actual = endpoints[endpoints.length - 1];
    if (!actual) throw new Error(`Línea fuera de una entrada: ${linea}`);
    if ((m = /^    ruta: (\/\S+)$/.exec(linea))) actual.ruta = m[1];
    else if ((m = /^    roles: (\[.*\])$/.exec(linea))) actual.roles = parseLista(m[1], linea);
    else if (linea === '    publico: true') actual.publico = true;
    else if (linea !== '    fuera_de_mvc: true') throw new Error(`Línea desconocida: ${linea}`);
  }
  if (!version || !roles) throw new Error('Faltan version o roles en el encabezado');
  for (const e of endpoints) {
    if (!e.ruta) throw new Error(`Entrada sin ruta: ${e.metodo}`);
    if (!e.publico && e.roles!.length === 0) throw new Error(`Entrada sin roles ni publico: ${e.metodo} ${e.ruta}`);
    for (const r of e.roles!) if (!roles.includes(r)) throw new Error(`Rol fuera del encabezado (${r}): ${e.ruta}`);
  }
  if (endpoints.length < MIN_ENDPOINTS) throw new Error(`Solo ${endpoints.length} entradas (mínimo ${MIN_ENDPOINTS})`);
  return { roles, endpoints: endpoints as EndpointMatriz[] };
}

/** Carga y valida la copia local de la matriz. */
export const cargarMatriz = (): MatrizPermisos => parseMatriz(readFileSync(FIXTURE, 'utf8'));
