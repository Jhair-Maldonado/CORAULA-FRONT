# Guía de contribución — CORAULA Frontend

## Requisitos y puesta en marcha
- Node.js 22 (la misma versión que usa CI) y npm.
- Backend `coraula-backend` en local (puerto 8080) si vas a trabajar sin mocks.

```bash
npm install
```

Copia la plantilla de variables de entorno a `.env.local` (no versionado):

| Terminal | Comando |
| --- | --- |
| bash / Git Bash | `cp .env.example .env.local` |
| CMD | `copy .env.example .env.local` |
| PowerShell | `Copy-Item .env.example .env.local` |

Reinicia `npm run dev` cada vez que cambies `.env.local`. Detalle de cada variable: sección «Variables de Entorno» del [README](README.md).

| Script | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` (modo `LOCAL`, contra el backend) |
| `npm run dev:mock` | Servidor de desarrollo en modo `MOCK`: responde con datos simulados, sin backend |
| `npm run lint` | ESLint |
| `npm test` | Pruebas de `tests/*.test.mjs` y `tests/*.test.tsx`; incluye la cobertura del MOCK (`tests/mockCoverage.test.tsx`) |
| `npm run build` | Build de producción |

CI (`.github/workflows/ci.yml`) ejecuta `npm test`, `npm run lint` y `npm run build` en cada PR a `dev` o `main`.

## Flujo de trabajo
1. **Nada sin issue.** Todo cambio parte de un issue asignado.
2. Crea la rama desde `dev` actualizado:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/<n.º issue>-<descripcion>   # o fix/… o docs/…
   ```
   Ejemplo: `feat/81-asistencia-docente`.
3. PR pequeño: entre 1 y 3 días de trabajo. Si crece, divide el issue.
4. Antes de abrir el PR, integra lo último de `dev` (`git pull origin dev`) y vuelve a correr lint, test y build.
5. Abre el PR **hacia `dev`** usando la plantilla. En la descripción incluye `Closes #n` (cierra el issue) o `Refs #n` (avance parcial).
6. `main` solo recibe PRs desde `dev`, y los abre Coordinación.

## Cómo se toman las tareas
- Los issues ya asignados se mantienen con su responsable.
- Los issues sin asignar son libres: para tomar uno, asígnatelo y comenta «lo tomo» en el issue.
- Busca trabajo libre filtrando por la etiqueta `listo`.
- Un issue en curso por persona. Si llevas 3 días sin avance, suéltalo: quita tu asignación y comenta por qué.
- No tomes issues con la etiqueta `bloqueado` (su comentario indica de cuál dependen) ni con `requiere-CAB`. Los de `coordinación` los lleva Coordinación técnica.
- **Zonas compartidas**, siempre con aviso previo en el issue y esperando respuesta de Coordinación: seguridad y autenticación, `src/services/httpClient.ts`, `src/lib/`, `src/types/` y `src/adapters/` compartidos, configuración y matriz de permisos.
- Ningún integrante fusiona su propio PR: Coordinación revisa y fusiona.
- Si una vista aún no tiene backend, debe mostrar el aviso de módulo en construcción (patrón del nodo #74) y no simular éxitos sin indicarlo.

Cada módulo incluye también sus piezas asociadas: la ruta en `src/app/<rol>/`, sus servicios en `src/services/<área>/` y sus componentes en `src/components/<rol>/`.

## Datos y seguridad
- No versiones `.env`, `.env.local` ni ningún secreto (tokens, contraseñas, claves). Solo `.env.example` está versionado.
- Usa únicamente datos ficticios. Nada de datos reales de alumnos, apoderados ni docentes, tampoco en capturas.
- No uses cuentas de producción para probar.
- El modo se fija con `NEXT_PUBLIC_APP_MODE` (`MOCK`, `LOCAL`, `PRODUCTION`; ver `src/config/appConfig.ts`). `npm run dev:mock` arranca en `MOCK`; `NEXT_PUBLIC_USE_MOCKS` es obsoleta. Indica en el PR si probaste con mocks (`npm run dev:mock`) o con el backend real.

## Convenciones

### Commits
[Conventional Commits](https://www.conventionalcommits.org/es/) en español, con el ámbito del módulo y el número de issue:

```
<tipo>(<ámbito>): <descripción en minúsculas> (#n)
```

Tipos: `feat`, `fix`, `docs`, `test`, `refactor`. Ejemplos del historial:
- `feat(admin): alta individual de alumno y matrícula en sección (#72)`
- `docs: plantilla .env.example y variables de entorno en README (#79)`

### Estructura del código
- **Rutas** (`src/app/<rol>/…/page.tsx`): App Router de Next.js. La página solo importa y renderiza la vista del módulo, por ejemplo `feature/docente/vistas/cursos/vistaCursosDocente`.
- **Vistas** (`feature/<módulo>/vistas/`): pantallas y lógica de UI de cada módulo.
- **Servicios** (`src/services/<área>/*Service.ts`): objetos que llaman al backend con `httpClient` (`@/services/httpClient`) usando rutas relativas como `/v1/management/teachers`. Devuelven el `data` tipado de la respuesta.
- **Tipos** (`src/types/`): los contratos del backend van en `*Api.ts` (por ejemplo `teacherApi.ts`); los modelos de la UI van en archivos propios (por ejemplo `adminTeacher.ts`).
- **Adaptadores** (`src/adapters/*Adapter.ts`): funciones puras `toX` que convierten entre los tipos del backend y los modelos de la UI o los formularios (ver `teacherAdapter.ts`).
- **Datos simulados HTTP**: `src/mocks/http/fixtures/` (rutas por rol y estado en memoria del modo MOCK). Otros datos simulados: `src/data/mock*.ts` y `src/lib/mocks/`.
- **Pruebas**: `tests/<nombre>.test.tsx` o `.test.mjs` con `node:test`, ejecutadas con `tsx`.
- Usa el alias `@/` para importar desde `src/`.
- `src/lib/api.ts` es un cliente heredado que usan los portales Alumno y parte de Docente. Para integraciones nuevas, usa `httpClient` y coordina en el issue.

## Contrato de integración UI ↔ backend
Toda vista nueva, integrada o restaurada cumple R1–R12 de [FRONT #151](https://github.com/Jhair-Maldonado/coraula-front/issues/151):

| Regla | Qué exige |
| --- | --- |
| **R1. Partir del diseño** | Abre la referencia con `git show <commit>:<ruta>`. Integrar es cambiar la fuente de los datos, no reescribir el JSX. |
| **R2. Capas** | `vista → hook → adapter (src/adapters) → service (src/services, httpClient) → tipos *Api.ts`. La vista no importa `httpClient` ni los tipos `*Api.ts`. |
| **R3. Origen de cada dato** | Tabla elemento de UI → campo del backend → endpoint. Si no hay campo: omitir, mostrar «Sin dato» o abrir un issue de backend. Nunca un valor fijo, un arreglo simulado en la vista ni un éxito simulado. |
| **R4. Endpoints reales** | Todo endpoint usado existe en los controladores del backend o está en un issue de backend ya fusionado. |
| **R5. MOCK completo** | Cada endpoint nuevo lleva su ruta en `src/mocks/http/fixtures/` en el mismo PR; la vista se ve completa con `npm run dev:mock`, sin «no tiene datos simulados». `npm test` lo comprueba (ver abajo). |
| **R6. Estados** | Carga, error con «Reintentar», vacío y sin permiso (403) con el estilo de la vista. |
| **R7. Tokens** | Solo los tokens de `globals.css` (`accent`, `accent-soft`, `ink`, `muted`, `line`, `canvas`, `success`, `success-ink`, `warning-ink`); nada de `bg-[#…]` nuevo. |
| **R8. Nada técnico en pantalla** | Sin IDs, fechas ISO ni enums crudos; fechas en `es-PE` y traducciones en el adapter. |
| **R9. No restaurar lo retirado** | Contraseñas visibles, login social, biometría simulada o datos inventados quedan fuera; lo que no tiene backend muestra el aviso de módulo en construcción. |
| **R10. Sin huérfanos** | Borra los componentes y mocks que dejen de usarse. |
| **R11. Pruebas** | Adapter con datos completos y con nulos; render con fixture, incluidos error y vacío. |
| **R12. Evidencia** | Captura antes y después a 1440×900 y lista de clases del diseño que no se conservaron, con su motivo. |

### Cobertura del MOCK
`tests/mockCoverage.test.tsx` lee cada llamada `httpClient.<método>(ruta)` de `src/services/` y comprueba que exista una ruta simulada en `src/mocks/http/fixtures/`. Corre en `npm test` y en CI. Falla si:
- un service llama a una ruta sin mock y sin excepción: agrega la ruta al fixture del rol (con sus errores 400/403/404 y su estado vacío) o, solo si no cabe en el PR, una entrada en `MOCK_COVERAGE_EXCEPTIONS` con el motivo y un `TODO(#n)`;
- una excepción quedó obsoleta (la ruta ya tiene mock o el service ya no la llama): bórrala;
- no puede evaluar la ruta de una llamada: usa una constante, una plantilla o los constructores locales (`endpoint`, `base`, `path`, `studentPath`); si la ruta sale de una tabla cerrada, agrégala a `EXPANSIONS` de la prueba.

Límites de la prueba: compara método y ruta, no roles (solo exige que toda ruta fuera de `/v1/auth` declare `roles`), y un valor que TypeScript no resuelve a literales se evalúa como `:param`, así que puede casar con una ruta genérica. Copia los roles del `@PreAuthorize` del backend y cubre el 403 en `tests/mockAdapter.test.tsx`. Los roles de las rutas `/v1/management` simuladas se comparan con la matriz del backend en `tests/permissions.test.tsx`.

### Permisos en la interfaz
Los roles de cada acción de la UI viven solo en `src/config/permissions.ts` (ver [docs/permisos.md](docs/permisos.md)): no escribas `role === '…'` en vistas ni componentes. Un cambio de `docs/permisos/matriz.yaml` en el backend abre un issue en el frontend para actualizar `tests/fixtures/permisos-matriz.yaml` y el catálogo.

### Datos de `dev:mock` que conviene conocer
- **Asistencia del docente**: solo hay sesiones de lunes a viernes dentro del periodo académico (hasta el 2026-12-18), igual que el backend. Sábados, domingos y fechas fuera del periodo salen sin sesiones o con error de fecha, no es una falla del mock.
- **Horario**: los bloques viven en memoria (crear, mover y borrar funcionan y detectan choques de sección, docente y aula); la asistencia no los lee y sigue identificando la sesión por el `scheduleId` del curso.
- **Criterios de evaluación**: viven en memoria y alimentan la planilla y los resultados. Como en el backend, si algún bimestre del periodo está publicado (lo está en `dev:mock`), crear o editar un criterio responde 409 `STRUCTURE_FROZEN`.
- Las escrituras viven en memoria hasta recargar la página.

## Revisión
Coordinación revisa cada PR antes del merge y comprueba que:
- el cambio se ajuste al alcance del issue enlazado y, si toca zonas compartidas, que se haya avisado en el issue;
- CI esté en verde (test, lint y build);
- no haya `.env`, secretos ni datos reales;
- se hayan agregado o actualizado las pruebas que correspondan;
- incluya capturas o GIF si cambia la interfaz;
- respete los contratos (`src/types/`, servicios) y la estructura descrita arriba;
- cumpla R1–R12 del contrato de integración UI ↔ backend.
