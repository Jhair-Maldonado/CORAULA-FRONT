import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { findMockRoute } from '../src/mocks/http/mockAdapter';
import type { MockMethod } from '../src/mocks/http/mockHttp';

// Contrato del MOCK (FRONT #164): toda llamada `httpClient.<método>(ruta)` de src/services debe tener ruta simulada en
// src/mocks/http/fixtures/ o figurar en MOCK_COVERAGE_EXCEPTIONS con su motivo. La prueba lee los services con la API
// de TypeScript (sin ejecutarlos), evalúa la ruta de cada llamada y la busca con findMockRoute.
// Limitaciones conocidas:
// - Compara método y ruta, no roles: que el rol de la ruta simulada coincida con el @PreAuthorize del backend se revisa a mano
//   y se prueba en mockAdapter.test.tsx (solo se exige que toda ruta fuera de /v1/auth declare `roles`).
// - Un valor que TypeScript no resuelve a literales (parámetro, propiedad, llamada) se evalúa como `:param`; al buscarlo se
//   sustituye por `1` y puede casar con una ruta genérica (p. ej. `/x/:id`) aunque el service apunte a otra ruta fija.
// - Solo lee llamadas `httpClient.<método>(ruta)` dentro de src/services; las ramas que no se evalúan estáticamente se anotan en EXPANSIONS.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVICES = path.join(ROOT, 'src', 'services');
const METHODS: readonly MockMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const PARAM = ':param';
/** Mínimo de llamadas esperadas: si baja, la extracción dejó de leer los services. */
const MIN_EXTRACTED_CALLS = 100;

interface MockCoverageException { method: MockMethod; route: string; reason: string }

/**
 * Llamadas sin ruta simulada, con motivo. Las rutas usan `:param` donde el service interpola un valor.
 * Se simulan en memoria las escrituras de las vistas que restaura la épica #151 (sub-issues #152 a #160): estado y matrícula del
 * alumno, apoderados, docentes (alta, edición y cuenta), asignaciones, horario, criterios de evaluación, retiro de materiales del docente,
 * actividades y notas de actividad del docente, asistencia por contingencia. Lo que queda aquí pertenece a vistas que esa épica no toca o tiene un motivo técnico.
 * TODO(#177): reemplazar estas excepciones por fixtures; al agregar la ruta, borrar su excepción
 * (la prueba falla si una excepción queda obsoleta).
 */
const FUERA_DE_151 = (vista: string) => `Escritura de ${vista}, que la épica #151 (#152 a #160) no restaura: sigue sin datos simulados hasta el issue de seguimiento.`;
const PERIODOS = FUERA_DE_151('la vista de periodos académicos');
const PERIODO_ESTADO = 'Activar o desactivar un periodo cambia los bimestres y las matrículas vigentes, y la vista de periodos no está en #152 a #160; pendiente en el issue de seguimiento.';
const MULTIPART = 'Sube un archivo (multipart/form-data): el adaptador del mock no lee archivos ni genera su almacenamiento firmado; pendiente en el issue de seguimiento.';
const CICLO_BIMESTRE = 'Ciclo de vida del bimestre (apertura, revisión, publicación, plazos): la vista de bimestres no está en #152 a #160 y requiere transiciones de estado compartidas con libretas y notas; pendiente en el issue de seguimiento.';
const CORRECCION = 'Corrección de notas de Dirección (vista de notas, fuera de #152 a #160): requiere historial de cambios en el store; pendiente en el issue de seguimiento.';
const exception = (method: MockMethod, route: string, reason: string): MockCoverageException => ({ method, route, reason });

export const MOCK_COVERAGE_EXCEPTIONS: MockCoverageException[] = [
  exception('POST', '/v1/management/academic-periods', PERIODOS),
  exception('PATCH', '/v1/management/academic-periods/:param', PERIODOS),
  exception('POST', '/v1/management/academic-periods/:param/deactivate', PERIODO_ESTADO),
  exception('POST', '/v1/management/academic-periods/:param/reactivate', PERIODO_ESTADO),
  exception('POST', '/v1/management/academic-periods/:param/bimesters', CICLO_BIMESTRE),
  exception('PATCH', '/v1/management/bimesters/:param', CICLO_BIMESTRE),
  exception('POST', '/v1/management/bimesters/:param/open', CICLO_BIMESTRE),
  exception('POST', '/v1/management/bimesters/:param/annul', CICLO_BIMESTRE),
  exception('POST', '/v1/management/bimesters/:param/review', CICLO_BIMESTRE),
  exception('POST', '/v1/management/bimesters/:param/publish', CICLO_BIMESTRE),
  exception('POST', '/v1/management/bimesters/:param/reopen', CICLO_BIMESTRE),
  exception('PUT', '/v1/management/bimesters/:param/grade-window/registration-date', CICLO_BIMESTRE),
  exception('POST', '/v1/management/bimesters/:param/grade-window/extension', CICLO_BIMESTRE),
  exception('POST', '/v1/management/bimesters/:param/early-alerts/evaluate', 'Recalcula las alertas desde las notas del bimestre: el mock solo lee las alertas ya sembradas.'),
  exception('PATCH', '/v1/management/criterion-grades/:param', CORRECCION),
  exception('PATCH', '/v1/management/activity-grades/:param', CORRECCION),
  exception('POST', '/v1/management/staff', FUERA_DE_151('la vista de personal (cuentas de Secretaría)')),
  exception('POST', '/v1/management/sections/:param/courses', FUERA_DE_151('el detalle de sección (detalleSeccion.tsx)')),
  exception('DELETE', '/v1/management/sections/:param/courses/:param', FUERA_DE_151('el detalle de sección (detalleSeccion.tsx)')),
  exception('POST', '/v1/management/students/import/preview', MULTIPART),
  exception('POST', '/v1/management/students/import/confirm', MULTIPART),
  exception('PATCH', '/v1/management/vacancies/sections/:param', FUERA_DE_151('la pantalla de vacantes (#152 solo lee GET /vacancies para el panel de grados)')),
  exception('POST', '/v1/teacher/courses/:param/bimesters/:param/registration', 'Registrar el curso exige resultados sin pendientes y el mock los deja pendientes (dos criterios MANUAL, mínimo cinco); pendiente en el issue de seguimiento.'),
  exception('POST', '/v1/teacher/courses/:param/materials', MULTIPART),
  exception('GET', ':param', 'URL absoluta del archivo (material.urlDescarga de materialesService, portal Alumno): no es una ruta de /api y el MOCK no abre dominios externos.'),
];

/**
 * Valores de variables que no son constantes ni uniones de literales para TypeScript, pero que el service toma de una
 * tabla cerrada. Clave: `<archivo>:<variable>`. Al cambiar la tabla del service, actualizar aquí.
 */
const EXPANSIONS: Record<string, readonly string[]> = {
  // accountStateService.ts: transitions[action].path con action DEACTIVATE | REACTIVATE.
  'accountStateService.ts:path': ['deactivate', 'reactivate'],
  // studentStateService.ts: transitions[action].path con action SUSPEND | REACTIVATE | DEACTIVATE.
  'studentStateService.ts:path': ['suspend', 'reactivate', 'deactivate'],
};

/** Funciones locales que construyen la ruta: se evalúa su cuerpo. Cualquier otra llamada produce `:param`. */
const ROUTE_BUILDERS = new Set(['endpoint', 'base', 'path', 'studentPath']);

interface ExtractedCall { method: MockMethod; route: string; where: string }

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const product = (parts: string[][]): string[] => parts.reduce<string[]>((acc, options) => acc.flatMap(prefix => options.map(option => prefix + option)), ['']);

function extractServiceCalls(): { calls: ExtractedCall[]; problems: string[] } {
  const configFile = ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
  const program = ts.createProgram(listFiles(SERVICES), { ...options, noEmit: true, incremental: false, tsBuildInfoFile: undefined });
  const checker = program.getTypeChecker();
  const calls: ExtractedCall[] = [];
  const problems: string[] = [];

  const declarationOf = (identifier: ts.Identifier): ts.Declaration | undefined => {
    let symbol = checker.getSymbolAtLocation(identifier);
    if (!symbol) return undefined;
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    return symbol.valueDeclaration ?? symbol.declarations?.[0];
  };

  /** Unión de literales de string (o literal único) según el tipo de TypeScript; null si no lo es. */
  const literalsByType = (node: ts.Node): string[] | null => {
    const type = checker.getTypeAtLocation(node);
    if (type.isStringLiteral()) return [type.value];
    if (type.isUnion() && type.types.every(member => member.isStringLiteral())) return type.types.map(member => (member as ts.StringLiteralType).value);
    return null;
  };

  const functionBody = (declaration: ts.Declaration): ts.Expression | undefined => {
    const fn = ts.isVariableDeclaration(declaration) ? declaration.initializer : declaration;
    if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn))) return undefined;
    if (!fn.body) return undefined;
    if (!ts.isBlock(fn.body)) return fn.body;
    return fn.body.statements.find(ts.isReturnStatement)?.expression;
  };

  const evaluate = (node: ts.Expression, file: string, depth = 0): string[] => {
    if (depth > 10) throw new Error(`Expresión demasiado profunda: ${node.getText()}`);
    const next = (child: ts.Expression) => evaluate(child, file, depth + 1);
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node)) return next(node.expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
    if (ts.isTemplateExpression(node)) return product([[node.head.text], ...node.templateSpans.flatMap(span => [next(span.expression), [span.literal.text]])]);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return product([next(node.left), next(node.right)]);
    if (ts.isConditionalExpression(node)) return [...next(node.whenTrue), ...next(node.whenFalse)];
    if (ts.isIdentifier(node)) {
      const declaration = declarationOf(node);
      const expansion = EXPANSIONS[`${path.basename(file)}:${node.text}`];
      if (expansion) return [...expansion];
      if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer
        && ts.isVariableDeclarationList(declaration.parent) && (declaration.parent.flags & ts.NodeFlags.Const)) return next(declaration.initializer);
      return literalsByType(node) ?? [PARAM];
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ROUTE_BUILDERS.has(node.expression.text)) {
      const declaration = declarationOf(node.expression);
      const body = declaration && functionBody(declaration);
      if (!body) throw new Error(`No se pudo leer la función ${node.expression.text}`);
      return next(body);
    }
    // Valores de entrada (parámetros, propiedades, llamadas auxiliares): un literal por tipo o un parámetro de ruta.
    if (ts.isCallExpression(node) || ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) return literalsByType(node) ?? [PARAM];
    throw new Error(`Expresión de ruta no soportada (${ts.SyntaxKind[node.kind]}): ${node.getText()}`);
  };

  for (const sourceFile of program.getSourceFiles().filter(file => path.resolve(file.fileName).startsWith(SERVICES + path.sep))) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText() === 'httpClient'
        && METHODS.includes(node.expression.name.text.toUpperCase() as MockMethod) && node.arguments[0]) {
        const where = `${path.relative(ROOT, sourceFile.fileName).replaceAll('\\', '/')}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
        try {
          for (const raw of evaluate(node.arguments[0], sourceFile.fileName)) {
            calls.push({ method: node.expression.name.text.toUpperCase() as MockMethod, route: raw.split('?')[0], where });
          }
        } catch (error) {
          problems.push(`${where}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return { calls, problems };
}

const keyOf = (method: string, route: string) => `${method} ${route}`;
/** Una ruta que no empieza por `/` (p. ej. una URL absoluta tomada de la respuesta) no puede estar en el MOCK. */
const hasMock = (call: { method: MockMethod; route: string }) => call.route.startsWith('/') && !!findMockRoute(call.method, call.route.replaceAll(PARAM, '1'));

test('cobertura del MOCK: toda llamada httpClient de src/services tiene ruta simulada o excepción documentada', () => {
  const { calls, problems } = extractServiceCalls();
  assert.deepEqual(problems, [], `Llamadas no evaluables:\n${problems.join('\n')}`);
  assert.ok(calls.length >= MIN_EXTRACTED_CALLS, `Se extrajeron ${calls.length} llamadas (mínimo ${MIN_EXTRACTED_CALLS}): la extracción no está leyendo los services.`);

  const byKey = new Map<string, ExtractedCall & { places: string[] }>();
  for (const call of calls) {
    const key = keyOf(call.method, call.route);
    const known = byKey.get(key);
    if (known) known.places.push(call.where); else byKey.set(key, { ...call, places: [call.where] });
  }
  const exceptionKeys = new Set(MOCK_COVERAGE_EXCEPTIONS.map(e => keyOf(e.method, e.route)));
  assert.equal(exceptionKeys.size, MOCK_COVERAGE_EXCEPTIONS.length, 'Hay excepciones duplicadas.');
  assert.ok(MOCK_COVERAGE_EXCEPTIONS.every(e => e.reason.trim().length >= 10), 'Cada excepción necesita un motivo.');

  const uncovered = [...byKey.values()].filter(call => !hasMock(call) && !exceptionKeys.has(keyOf(call.method, call.route)));
  assert.ok(uncovered.length === 0,
    `Rutas de services sin mock ni excepción (agrega la ruta en src/mocks/http/fixtures/ o una excepción con motivo):\n${uncovered.map(c => `  ${c.method} ${c.route}  (${c.places.join(', ')})`).join('\n')}`);

  const withoutRoles = [...byKey.values()].filter(call => hasMock(call) && !call.route.startsWith('/v1/auth/')
    && !findMockRoute(call.method, call.route.replaceAll(PARAM, '1'))!.roles);
  assert.deepEqual(withoutRoles.map(c => keyOf(c.method, c.route)), [], 'Rutas simuladas fuera de /v1/auth sin `roles`: declara los roles del @PreAuthorize del backend.');

  const stale = MOCK_COVERAGE_EXCEPTIONS.filter(e => {
    const call = byKey.get(keyOf(e.method, e.route));
    return !call || hasMock(call);
  });
  assert.deepEqual(stale.map(e => keyOf(e.method, e.route)), [], 'Excepciones obsoletas: la ruta ya tiene mock o ya no existe en los services; bórralas de MOCK_COVERAGE_EXCEPTIONS.');
});
